import { canonicalEmail } from './crypto.js'
import { isVoipLine } from './providers.js'
import { isDisposableEmail } from './disposable-domains.js'
import { num } from './db.js'

// These checks decide the free document only. Callers must still allow a
// paid send when `ok` is false.

export const FREE_MESSAGES = {
  already_used: 'Your free document has already been used.',
  email: 'Verify your email before you can send the free document.',
  phone: 'Verify a mobile number to unlock your free document.',
  voip: 'This phone number looks like a virtual or internet line, so it can’t unlock the free document. You can still pay per document or subscribe.',
  phone_reuse: 'This phone number was already used for a free document. You can still send documents by paying $1 each or subscribing.',
  device_reuse: 'This browser was already used for a free document. You can still send documents by paying $1 each or subscribing.',
  device_required: 'Allow cookies and site storage so we can protect the free document, or send by paying $1 each or subscribing.',
  email_reuse: 'This email was already used for a free document. You can still send documents by paying $1 each or subscribing.',
  disposable: 'This email domain can’t be used for an account.',
  ip_threshold: 'Several free documents have already been sent from this network. You can still send documents by paying $1 each or subscribing.',
  card_fingerprint: 'A payment card on this account was already used elsewhere, so the free document isn’t available. Paying still works.',
  email_unverified: 'Verify your email before sending a document.'
}

export async function assertSignupAllowed(q, { ip, email, limits }) {
  if (isDisposableEmail(email)) {
    return { ok: false, status: 400, error: 'disposable', message: FREE_MESSAGES.disposable }
  }
  await q(`insert into signup_attempts (ip) values ($1)`, [ip || 'unknown'])
  const hour = await q(
    `select count(*)::int as n from signup_attempts where ip=$1 and created_at > now() - interval '1 hour'`,
    [ip || 'unknown']
  )
  const day = await q(
    `select count(*)::int as n from signup_attempts where ip=$1 and created_at > now() - interval '1 day'`,
    [ip || 'unknown']
  )
  if (num(hour.rows[0].n) > limits.signupPerHour || num(day.rows[0].n) > limits.signupPerDay) {
    return { ok: false, status: 429, error: 'rate_limit', message: 'Too many signups from this network. Try again later, or use an account you already created.' }
  }
  return { ok: true }
}

export async function evaluateFree(q, profile, { localId, cookieId, ip, limit, allowMissingDevice, phoneRequired = true }) {
  if (profile.free_claimed_at) return block('already_used')
  if (profile.free_block_reason && FREE_MESSAGES[profile.free_block_reason]) return block(profile.free_block_reason)
  if (!profile.email_verified_at) return block('email')
  if (phoneRequired) {
    if (!profile.phone_verified_at) return block('phone')
    if (isVoipLine(profile.phone_line_type)) return block('voip')
    const phone = await q(`select user_id from free_phone_claims where phone_e164=$1`, [profile.phone_e164])
    if (phone.rows[0] && phone.rows[0].user_id !== profile.id) return block('phone_reuse')
    if (phone.rows[0] && phone.rows[0].user_id === profile.id) return block('already_used')
  }
  if (isDisposableEmail(profile.email)) return block('disposable')

  const canon = canonicalEmail(profile.email)
  const email = await q(`select user_id from free_email_claims where canonical_email=$1`, [canon])
  if (email.rows[0] && email.rows[0].user_id !== profile.id) return block('email_reuse')

  if (!localId && !cookieId) {
    if (!allowMissingDevice) return block('device_required')
  }
  for (const key of deviceKeys(localId, cookieId)) {
    const hit = await q(`select user_id from free_device_claims where device_key=$1`, [key])
    if (hit.rows[0] && hit.rows[0].user_id !== profile.id) return block('device_reuse')
  }

  if (ip) {
    const count = await q(
      `select count(distinct user_id)::int as n from free_ip_claims where ip=$1 and created_at > now() - interval '30 days'`,
      [ip]
    )
    const mine = await q(
      `select 1 from free_ip_claims where ip=$1 and user_id=$2 limit 1`,
      [ip, profile.id]
    )
    if (!mine.rows[0] && num(count.rows[0].n) >= limit) return block('ip_threshold')
  }

  const cards = await q(`select fingerprint from card_fingerprints where user_id=$1`, [profile.id])
  for (const row of cards.rows) {
    const other = await q(`select user_id from card_fingerprints where fingerprint=$1 and user_id<>$2`, [row.fingerprint, profile.id])
    if (other.rows[0]) return block('card_fingerprint')
  }
  return { ok: true }
}

function block(error) {
  return { ok: false, error, message: FREE_MESSAGES[error] || 'The free document isn’t available on this account.' }
}

export function deviceKeys(localId, cookieId) {
  const keys = []
  if (localId) keys.push('l:' + String(localId).slice(0, 80))
  if (cookieId) keys.push('c:' + String(cookieId).slice(0, 80))
  return keys
}

export async function recordFreeClaim(q, profile, { localId, cookieId, ip }) {
  if (profile.phone_e164) await q(`insert into free_phone_claims (phone_e164, user_id) values ($1,$2)`, [profile.phone_e164, profile.id])
  await q(`insert into free_email_claims (canonical_email, user_id) values ($1,$2)`, [canonicalEmail(profile.email), profile.id])
  for (const key of deviceKeys(localId, cookieId)) {
    await q(`insert into free_device_claims (device_key, user_id) values ($1,$2)`, [key, profile.id])
  }
  if (ip) await q(`insert into free_ip_claims (ip, user_id) values ($1,$2)`, [ip, profile.id])
  await q(`update profiles set free_claimed_at=now(), free_block_reason=null where id=$1`, [profile.id])
}

export async function noteCardFingerprint(q, { fingerprint, userId }) {
  if (!fingerprint) return
  const existing = await q(`select user_id from card_fingerprints where fingerprint=$1`, [fingerprint])
  if (!existing.rows[0]) {
    await q(`insert into card_fingerprints (fingerprint, user_id) values ($1,$2)`, [fingerprint, userId])
    return
  }
  if (existing.rows[0].user_id === userId) return
  // Same card on a second account. Block that account's free document if it
  // has not been claimed yet. A document already sent is left as-is.
  await q(
    `update profiles set free_block_reason='card_fingerprint' where id=$1 and free_claimed_at is null`,
    [userId]
  )
}
