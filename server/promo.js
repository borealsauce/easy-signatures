import { num } from './db.js'

export const PROMO_MESSAGES = {
  empty: 'Enter a promo code.',
  invalid: 'That promo code isn’t valid. Check the spelling and try again.',
  off: 'That promo code has been turned off and can’t be used.',
  already: 'You’ve already redeemed this promo code on your account.'
}

export function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 40)
}

function promoError(status, error) {
  const err = new Error(PROMO_MESSAGES[error])
  err.status = status
  err.code = error
  err.publicMessage = PROMO_MESSAGES[error]
  return err
}

// Throws a clear error if the code can't be used. Returns the code row.
export async function checkCode(q, raw) {
  const code = normalizeCode(raw)
  if (!code) throw promoError(400, 'empty')
  const row = (await q(`select * from promo_codes where code=$1`, [code])).rows[0]
  if (!row) throw promoError(404, 'invalid')
  if (!row.active) throw promoError(410, 'off')
  return row
}

export async function redeemCode(db, userId, raw) {
  return db.tx(async q => {
    const row = await checkCode(q, raw)
    const ins = await q(
      `insert into promo_redemptions (user_id, code, docs_granted) values ($1,$2,$3)
       on conflict (user_id, code) do nothing returning *`,
      [userId, row.code, num(row.free_docs_per_user)]
    )
    if (!ins.rows[0]) throw promoError(409, 'already')
    return { ok: true, code: row.code, granted: num(row.free_docs_per_user) }
  })
}

// Promo documents still usable: only redemptions whose code is active count.
export async function promoUsage(q, userId) {
  const rows = (await q(
    `select r.code, r.docs_granted, r.docs_used, c.active
       from promo_redemptions r join promo_codes c on c.code = r.code
      where r.user_id=$1 order by r.redeemed_at`,
    [userId]
  )).rows
  const codes = rows.map(r => ({
    code: r.code,
    active: !!r.active,
    granted: num(r.docs_granted),
    used: num(r.docs_used),
    remaining: r.active ? Math.max(0, num(r.docs_granted) - num(r.docs_used)) : 0
  }))
  return { promoCredits: codes.reduce((a, c) => a + c.remaining, 0), promoCodes: codes }
}

// Inside a send transaction: consume one promo document if any active code has room.
export async function consumePromo(q, userId) {
  const pick = (await q(
    `select r.id, r.code from promo_redemptions r join promo_codes c on c.code = r.code
      where r.user_id=$1 and c.active and r.docs_used < r.docs_granted
      order by r.redeemed_at limit 1 for update of r`,
    [userId]
  )).rows[0]
  if (!pick) return null
  const upd = await q(
    `update promo_redemptions set docs_used = docs_used + 1, last_used_at = now()
      where id=$1 and docs_used < docs_granted returning code`,
    [pick.id]
  )
  return upd.rows[0] ? upd.rows[0].code : null
}

export function isAdmin(config, user) {
  if (!user || !user.email_verified_at) return false
  return config.adminEmails.includes(String(user.email || '').toLowerCase())
}

export async function adminListCodes(db) {
  const codes = (await db.query(`select * from promo_codes order by created_at desc, code`)).rows
  const reds = (await db.query(
    `select r.code, r.user_id, r.docs_granted, r.docs_used, r.redeemed_at, r.last_used_at,
            p.full_name, p.email,
            (select max(d.updated_at) from documents d where d.owner_id = r.user_id) as last_doc_at
       from promo_redemptions r join profiles p on p.id = r.user_id
      order by r.redeemed_at desc`
  )).rows
  const iso = v => v ? new Date(v).toISOString() : null
  return codes.map(c => {
    const mine = reds.filter(r => r.code === c.code)
    return {
      code: c.code,
      freeDocs: num(c.free_docs_per_user),
      active: !!c.active,
      created: iso(c.created_at),
      redemptions: mine.length,
      docsUsed: mine.reduce((a, r) => a + num(r.docs_used), 0),
      redeemers: mine.map(r => {
        const times = [r.last_used_at, r.last_doc_at, r.redeemed_at].filter(Boolean).map(v => new Date(v).getTime())
        return {
          name: r.full_name,
          email: r.email,
          redeemed: iso(r.redeemed_at),
          used: num(r.docs_used),
          granted: num(r.docs_granted),
          lastActivity: times.length ? new Date(Math.max(...times)).toISOString() : null
        }
      })
    }
  })
}

export async function adminCreateCode(db, { code: raw, freeDocs }) {
  const code = normalizeCode(raw)
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    const err = new Error('Use 3–40 letters, numbers, dashes or underscores.'); err.status = 400; err.code = 'code'; throw err
  }
  const n = Math.floor(Number(freeDocs))
  if (!Number.isFinite(n) || n < 1 || n > 100000) {
    const err = new Error('Free documents must be between 1 and 100,000.'); err.status = 400; err.code = 'free_docs'; throw err
  }
  const ins = await db.query(
    `insert into promo_codes (code, free_docs_per_user, active) values ($1,$2,true) on conflict (code) do nothing returning code`,
    [code, n]
  )
  if (!ins.rows[0]) { const err = new Error('That code already exists.'); err.status = 409; err.code = 'exists'; throw err }
  return { ok: true, code, freeDocs: n }
}

export async function adminSetActive(db, raw, active) {
  const code = normalizeCode(raw)
  const upd = await db.query(`update promo_codes set active=$2 where code=$1 returning code, active`, [code, !!active])
  if (!upd.rows[0]) { const err = new Error('Code not found.'); err.status = 404; err.code = 'not_found'; throw err }
  return { ok: true, code, active: !!upd.rows[0].active }
}
