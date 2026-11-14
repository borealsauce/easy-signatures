import { num } from './db.js'
import { isAdmin } from './promo.js'

export const DISABLED_MESSAGE = 'This account has been disabled. Contact support if you think this is a mistake.'

function err(status, code, message) {
  const e = new Error(message); e.status = status; e.code = code; e.publicMessage = message; return e
}
const iso = v => v ? new Date(v).toISOString() : null

export async function adminListUsers(ctx) {
  const rows = (await ctx.db.query(
    `select p.id, p.full_name, p.email, p.created_at, p.email_verified_at, p.blocked_at, p.free_claimed_at,
            coalesce(e.credits, 0) as credits,
            (select count(*)::int from documents d where d.owner_id = p.id and d.sent_at is not null and not d.is_template) as docs_sent,
            (select max(d.updated_at) from documents d where d.owner_id = p.id) as last_doc_at,
            (select string_agg(r.code || ' (' || r.docs_used || '/' || r.docs_granted || ')', ', ' order by r.redeemed_at)
               from promo_redemptions r where r.user_id = p.id) as promo
       from profiles p left join entitlements e on e.user_id = p.id
      order by p.created_at desc`
  )).rows
  return rows.map(r => ({
    id: r.id,
    name: r.full_name,
    email: r.email,
    created: iso(r.created_at),
    verified: !!r.email_verified_at,
    blocked: !!r.blocked_at,
    blockedAt: iso(r.blocked_at),
    docsSent: num(r.docs_sent),
    credits: num(r.credits),
    freeUsed: !!r.free_claimed_at,
    promo: r.promo || '',
    lastActivity: iso(r.last_doc_at),
    status: r.blocked_at ? 'blocked' : r.email_verified_at ? 'active' : 'unconfirmed',
    protected: isAdmin({ adminEmails: ctx.config.adminEmails }, { email: r.email, email_verified_at: true })
  }))
}

async function target(ctx, id) {
  const row = (await ctx.db.query(`select * from profiles where id=$1`, [String(id || '')])).rows[0]
  if (!row) throw err(404, 'not_found', 'User not found.')
  if (ctx.config.adminEmails.includes(String(row.email).toLowerCase())) throw err(403, 'protected', 'Owner accounts can’t be blocked or deleted here.')
  return row
}

export async function adminSetBlocked(ctx, id, blocked) {
  const row = await target(ctx, id)
  await ctx.db.query(`update profiles set blocked_at=${blocked ? 'now()' : 'null'} where id=$1`, [row.id])
  return { ok: true, id: row.id, email: row.email, blocked: !!blocked }
}

export async function deleteUserCompletely(ctx, row) {
  const docs = (await ctx.db.query(`select original_path, final_path from documents where owner_id=$1`, [row.id])).rows
  const keys = docs.flatMap(d => [d.original_path, d.final_path]).filter(Boolean)
  if (keys.length && ctx.storage.remove) {
    try { await ctx.storage.remove(keys) } catch (e) { console.error('storage cleanup failed:', String(e?.message || e).slice(0, 200)) }
  }
  if (ctx.config.authMode === 'supabase') {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(ctx.config.supabaseUrl, ctx.config.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await admin.auth.admin.deleteUser(row.id)
    if (error && !/not.?found/i.test(error.message || '')) throw err(502, 'auth_delete', 'Could not delete the sign-in account: ' + error.message)
  }
  await ctx.db.tx(async q => {
    for (const t of ['free_phone_claims', 'free_email_claims', 'free_device_claims', 'free_ip_claims', 'card_fingerprints']) {
      await q(`delete from ${t} where user_id=$1`, [row.id])
    }
    // profiles cascade: entitlements, documents (signers, audit events), signing links, payments, otps, promo redemptions
    await q(`delete from profiles where id=$1`, [row.id])
  })
  return { ok: true, id: row.id, email: row.email, deleted: true }
}

export async function adminDeleteUser(ctx, id) {
  return deleteUserCompletely(ctx, await target(ctx, id))
}
