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

// ---------- error log ----------
export async function logError(db, source, message) {
  try {
    await db.query(`insert into error_log (source, message) values ($1,$2)`, [String(source).slice(0, 60), String(message || '').slice(0, 1000)])
    if (Math.random() < 0.05) await db.query(`delete from error_log where created_at < now() - interval '30 days'`)
  } catch { /* never let logging break a request */ }
}

// ---------- users ----------
export async function adminUserDetail(ctx, id) {
  const p = (await ctx.db.query(`select * from profiles where id=$1`, [String(id || '')])).rows[0]
  if (!p) throw err(404, 'not_found', 'User not found.')
  const q = (t, a) => ctx.db.query(t, a).then(r => r.rows)
  const [ent] = await q(`select credits from entitlements where user_id=$1`, [p.id])
  const docs = await q(`select id, name, status, sent_at, completed_at, created_at, billing_source from documents where owner_id=$1 and not is_template order by created_at desc limit 50`, [p.id])
  const pays = await q(`select stripe_session_id, kind, amount_cents, created_at from payments where user_id=$1 order by created_at desc`, [p.id])
  const promos = await q(`select code, docs_used, docs_granted, redeemed_at, last_used_at from promo_redemptions where user_id=$1 order by redeemed_at`, [p.id])
  return {
    id: p.id, name: p.full_name, email: p.email, created: iso(p.created_at), verified: !!p.email_verified_at,
    blocked: !!p.blocked_at, createdIp: p.created_ip || '', firstSendIp: p.first_send_ip || '',
    freeUsed: !!p.free_claimed_at, stripeCustomer: p.stripe_customer_id || '', credits: num(ent?.credits),
    documents: docs.map(d => ({ id: d.id, name: d.name, status: d.status, sent: iso(d.sent_at), completed: iso(d.completed_at), created: iso(d.created_at), billing: d.billing_source || '' })),
    payments: pays.map(x => ({ session: x.stripe_session_id, kind: x.kind, amount: num(x.amount_cents) / 100, created: iso(x.created_at) })),
    promos: promos.map(x => ({ code: x.code, used: num(x.docs_used), granted: num(x.docs_granted), redeemed: iso(x.redeemed_at), lastUsed: iso(x.last_used_at) }))
  }
}

export async function adminAdjustCredits(ctx, id, delta) {
  const n = Math.trunc(Number(delta))
  if (!Number.isFinite(n) || n === 0 || Math.abs(n) > 100000) throw err(400, 'delta', 'Enter a whole number of credits to add or remove, like 10 or -5.')
  const row = (await ctx.db.query(
    `update entitlements set credits = greatest(0, credits + $2) where user_id=$1 returning credits`, [String(id || ''), n]
  )).rows[0]
  if (!row) throw err(404, 'not_found', 'User not found.')
  return { ok: true, id, credits: num(row.credits) }
}

// ---------- documents ----------
export async function adminListDocuments(ctx, { q: search = '', status = '' } = {}) {
  const docs = (await ctx.db.query(
    `select d.id, d.name, d.status, d.created_at, d.sent_at, d.completed_at, d.updated_at, d.billing_source, p.full_name as owner_name, p.email as owner_email
       from documents d join profiles p on p.id = d.owner_id
      where not d.is_template
        and ($1 = '' or d.status = $1)
        and ($2 = '' or d.name ilike '%' || $2 || '%' or p.email ilike '%' || $2 || '%')
      order by d.created_at desc limit 300`,
    [String(status || ''), String(search || '').slice(0, 80)]
  )).rows
  const ids = docs.map(d => d.id)
  const signers = ids.length ? (await ctx.db.query(
    `select document_id, full_name, email, role, sort_index, viewed_at, signed_at, declined_at from signers where document_id = any($1::uuid[]) order by sort_index`, [ids]
  )).rows : []
  const by = new Map()
  for (const s of signers) { if (!by.has(s.document_id)) by.set(s.document_id, []); by.get(s.document_id).push(s) }
  return docs.map(d => ({
    id: d.id, name: d.name, status: d.status, created: iso(d.created_at), sent: iso(d.sent_at), completed: iso(d.completed_at), updated: iso(d.updated_at),
    billing: d.billing_source || '', owner: { name: d.owner_name, email: d.owner_email },
    recipients: (by.get(d.id) || []).map(s => ({ name: s.full_name, email: s.email, role: s.role, state: s.declined_at ? 'declined' : s.signed_at ? 'signed' : s.viewed_at ? 'viewed' : 'pending' }))
  }))
}

export async function adminVoidDocument(ctx, id) {
  const doc = (await ctx.db.query(`select id, status from documents where id=$1`, [String(id || '')])).rows[0]
  if (!doc) throw err(404, 'not_found', 'Document not found.')
  if (!['sent', 'waiting', 'draft'].includes(doc.status)) throw err(409, 'status', `This document is ${doc.status} and can’t be voided.`)
  await ctx.db.tx(async q => {
    await q(`update documents set status='voided', updated_at=now() where id=$1`, [doc.id])
    await q(`update signers set token=null, token_hash=null where document_id=$1 and signed_at is null`, [doc.id])
    await q(`insert into audit_events (document_id, event_type, actor) values ($1,'Voided by site admin','Admin')`, [doc.id])
  })
  return { ok: true, id: doc.id, status: 'voided' }
}

// ---------- activity ----------
export async function adminActivity(ctx) {
  const q = (t, a) => ctx.db.query(t, a).then(r => r.rows)
  const tz = 'America/Los_Angeles'
  const signups = await q(`select to_char(date_trunc('day', created_at at time zone $1), 'YYYY-MM-DD') as day, count(*)::int as n from profiles where created_at > now() - interval '30 days' group by 1 order by 1`, [tz])
  const sent = await q(`select to_char(date_trunc('day', sent_at at time zone $1), 'YYYY-MM-DD') as day, count(*)::int as n from documents where sent_at > now() - interval '30 days' group by 1 order by 1`, [tz])
  const ipFlags = await q(`select created_ip as ip, count(*)::int as accounts, string_agg(email, ', ' order by created_at) as emails from profiles where created_ip is not null group by created_ip having count(*) >= 3 order by 2 desc limit 50`)
  const bulkFlags = await q(`select p.email, p.full_name as name, count(*)::int as sent from documents d join profiles p on p.id = d.owner_id where d.sent_at > now() - interval '24 hours' group by p.email, p.full_name having count(*) >= 20 order by 3 desc limit 50`)
  const attempts = await q(`select ip, count(*)::int as n from signup_attempts where created_at > now() - interval '24 hours' group by ip having count(*) >= 5 order by 2 desc limit 50`)
  const totals = (await q(`select (select count(*)::int from profiles) users, (select count(*)::int from documents where sent_at is not null) sent, (select count(*)::int from documents where status='completed') completed`))[0]
  return { signups, sent, flags: { ipFlags, bulkFlags, signupBursts: attempts }, totals }
}

// ---------- support ----------
export async function adminSupport(ctx) {
  const rows = (await ctx.db.query(`select kind, name, email, document_id, message, created_at from support_messages order by created_at desc limit 300`)).rows
  return rows.map(r => ({ kind: r.kind, name: r.name || '', email: r.email || '', documentId: r.document_id || '', message: r.message, created: iso(r.created_at) }))
}

// ---------- health ----------
export async function adminHealth(ctx) {
  const out = { email: {}, stripe: {}, storage: {}, database: {}, sms: { mode: ctx.config.smsMode }, errors: [], emailFailures: [] }
  try { await ctx.db.query('select 1'); out.database = { ok: true } } catch (e) { out.database = { ok: false, detail: String(e.message).slice(0, 200) } }
  out.email.mode = ctx.config.emailMode
  if (ctx.config.resendKey) {
    try {
      const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: 'Bearer ' + ctx.config.resendKey } })
      const j = await r.json()
      const doms = (j.data || []).map(d => ({ name: d.name, status: d.status }))
      out.email.domains = doms
      out.email.ok = r.ok && doms.some(d => d.status === 'verified')
      if (!r.ok) out.email.detail = j.message || ('HTTP ' + r.status)
    } catch (e) { out.email.ok = false; out.email.detail = String(e.message).slice(0, 200) }
  }
  out.stripe.mode = ctx.config.stripeMode
  if (ctx.config.stripeMode === 'stripe') {
    try {
      const s = await ctx.payments.client()
      const bal = await s.balance.retrieve()
      out.stripe.ok = true
      out.stripe.live = bal.livemode
      out.stripe.available = (bal.available || []).map(b => ({ amount: b.amount / 100, currency: b.currency }))
      out.stripe.pending = (bal.pending || []).map(b => ({ amount: b.amount / 100, currency: b.currency }))
    } catch (e) { out.stripe.ok = false; out.stripe.detail = String(e.message).slice(0, 200) }
  }
  out.storage.mode = ctx.storage.mode
  if (ctx.storage.mode === 'supabase') {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(ctx.config.supabaseUrl, ctx.config.supabaseServiceKey, { auth: { persistSession: false } })
      const { data, error } = await sb.storage.getBucket('documents')
      out.storage.ok = !error && !!data
      out.storage.public = data?.public ?? null
      if (error) out.storage.detail = error.message
    } catch (e) { out.storage.ok = false; out.storage.detail = String(e.message).slice(0, 200) }
  } else out.storage.ok = true
  out.errors = (await ctx.db.query(`select source, message, created_at from error_log order by created_at desc limit 50`)).rows.map(r => ({ source: r.source, message: r.message, created: iso(r.created_at) }))
  out.emailFailures = (await ctx.db.query(`select e.meta, e.created_at, d.name from audit_events e join documents d on d.id = e.document_id where e.event_type='Email failed' order by e.created_at desc limit 20`)).rows.map(r => ({ document: r.name, detail: r.meta?.error || '', email: r.meta?.email || '', created: iso(r.created_at) }))
  return out
}

// ---------- income (Stripe, server-side) ----------
function laStart(kind) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()).map(p => [p.type, p.value]))
  const now = Date.now()
  const msIntoDay = ((Number(parts.hour) % 24) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000
  const dayStart = Math.floor((now - msIntoDay) / 1000) * 1000
  if (kind === 'day') return dayStart
  return dayStart - (Number(parts.day) - 1) * 864e5
}

export async function adminIncome(ctx) {
  if (ctx.config.stripeMode !== 'stripe') return { mode: ctx.config.stripeMode, purchases: [], refunds: [], failed: [], totals: { today: 0, month: 0, all: 0, refunded: 0 } }
  const s = await ctx.payments.client()
  const test = String(ctx.config.stripeKey).startsWith('sk_test') || String(ctx.config.stripeKey).startsWith('rk_test')
  const dash = id => `https://dashboard.stripe.com/${test ? 'test/' : ''}payments/${id}`
  const charges = []
  for await (const c of s.charges.list({ limit: 100 })) { charges.push(c); if (charges.length >= 1000) break }
  const kinds = new Map()
  const local = (await ctx.db.query(`select p.stripe_session_id, p.kind, pr.email from payments p left join profiles pr on pr.id = p.user_id`)).rows
  const bySession = new Map(local.map(r => [r.stripe_session_id, r]))
  try {
    let n = 0
    for await (const sess of s.checkout.sessions.list({ limit: 100 })) {
      if (sess.payment_intent) kinds.set(typeof sess.payment_intent === 'string' ? sess.payment_intent : sess.payment_intent.id, { kind: sess.metadata?.kind || bySession.get(sess.id)?.kind || '', email: sess.customer_details?.email || bySession.get(sess.id)?.email || '' })
      if (++n >= 1000) break
    }
  } catch { /* sessions are optional context */ }
  const PACK = { doc1: '1 document', doc10: '10 documents', doc50: '50 documents' }
  const dayStart = laStart('day'), monthStart = laStart('month')
  const totals = { today: 0, month: 0, all: 0, refunded: 0 }
  const purchases = [], refunds = [], failed = []
  for (const c of charges) {
    const pi = typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id
    const meta = kinds.get(pi) || {}
    const row = {
      id: c.id, created: new Date(c.created * 1000).toISOString(), amount: c.amount / 100, currency: c.currency,
      email: c.billing_details?.email || c.receipt_email || meta.email || '', pack: PACK[meta.kind] || meta.kind || '',
      link: dash(pi || c.id)
    }
    if (c.status === 'succeeded' && c.paid) {
      const net = (c.amount - (c.amount_refunded || 0)) / 100
      totals.all += net
      if (c.created * 1000 >= monthStart) totals.month += net
      if (c.created * 1000 >= dayStart) totals.today += net
      purchases.push({ ...row, refunded: (c.amount_refunded || 0) / 100 })
      if (c.amount_refunded) { totals.refunded += c.amount_refunded / 100; refunds.push({ ...row, refunded: c.amount_refunded / 100 }) }
    } else if (c.status === 'failed') {
      failed.push({ ...row, reason: c.failure_message || c.outcome?.seller_message || '' })
    }
  }
  for (const k of Object.keys(totals)) totals[k] = Math.round(totals[k] * 100) / 100
  return { mode: 'stripe', live: !test, totals, purchases: purchases.slice(0, 200), refunds, failed: failed.slice(0, 100), truncated: charges.length >= 1000 }
}
