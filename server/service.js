import crypto from 'node:crypto'
import { FIELD_TYPES, ROLES, visible, validate } from '../shared/fields.js'
import { CONSENT_TEXT, CONSENT_VERSION } from '../shared/consent.js'
import { PACKS } from './config.js'
import {
  canonicalEmail, clientIp, hashPassword, hashSecret, normalizePhone, randomToken,
  readCookie, readJwt, seal, sha256, signJwt, unseal, verifyPassword
} from './crypto.js'
import { num } from './db.js'
import { FREE_MESSAGES, assertSignupAllowed, evaluateFree, noteCardFingerprint, recordFreeClaim } from './abuse.js'
import { assertReadablePdf, blankPdf, imageToPdf, sealPdf } from './pdf.js'
import { htmlEmail, isVoipLine } from './providers.js'
import { DISABLED_MESSAGE } from './admin.js'
import { checkCode, consumePromo, normalizeCode, promoUsage, redeemCode } from './promo.js'

export const REMIND_OPTIONS = [0, 2, 3, 7]
export const MAX_AUTO_REMINDERS = 5
export const REMIND_GAP_MS = 24 * 60 * 60 * 1000
function cadence(v, fallback = 3) { const n = Number(v); return REMIND_OPTIONS.includes(n) ? n : fallback }
const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2']

export function fail(status, error, message) {
  const err = new Error(message)
  err.status = status
  err.code = error
  err.publicMessage = message
  return err
}

function iso(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function asJson(v, fallback) {
  if (v == null) return fallback
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return fallback }
  }
  return v
}

function emailOk(v) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v || '')
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

function constraintReason(err) {
  const c = `${err.constraint || ''} ${err.detail || ''} ${err.message || ''}`
  if (!String(err.code || '').includes('23505') && !/duplicate key|unique/i.test(c)) return null
  if (c.includes('free_phone')) return 'phone_reuse'
  if (c.includes('free_email')) return 'email_reuse'
  if (c.includes('free_device')) return 'device_reuse'
  return null
}

export function deviceFrom(req, res, config) {
  let cookieId = readCookie(req, 'eds_did')
  let fresh = false
  if (!cookieId || !/^[A-Za-z0-9_-]{16,80}$/.test(cookieId)) {
    cookieId = randomToken(18)
    fresh = true
  }
  const rawLocal = String(req.headers['x-device-local'] || '')
  const localId = /^[A-Za-z0-9_-]{8,80}$/.test(rawLocal) ? rawLocal : ''
  if (fresh) {
    const secure = config.appUrl.startsWith('https') ? '; Secure' : ''
    res.append('Set-Cookie', `eds_did=${cookieId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`)
  }
  return {
    // A cookie minted on this same request is not stable yet. Ignoring it stops
    // a client that throws cookies away from looking like a new device forever.
    cookieId: fresh ? '' : cookieId,
    localId,
    ip: clientIp(req, config),
    ua: String(req.headers['user-agent'] || '').slice(0, 400)
  }
}

async function supabaseAdmin(config) {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

function mapSigner(row, secret, reveal) {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    color: row.color,
    done: !!row.signed_at,
    doneAt: iso(row.signed_at),
    viewed: !!row.viewed_at,
    declined: !!row.declined_at,
    token: reveal && row.token ? unseal(row.token, secret) : undefined,
    signIp: row.sign_ip || null,
    signUa: row.sign_ua || null,
    viewIp: row.view_ip || null,
    consentAt: iso(row.consent_at),
    consentIp: row.consent_ip || null
  }
}

function mapDoc(row, signers, events, secret, reveal) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    folder: row.folder,
    created: iso(row.created_at),
    ordered: row.ordered_sign,
    expiresDays: row.expires_days,
    remindDays: row.remind_days,
    lastReminded: iso(row.last_reminded_at),
    autoReminders: num(row.auto_reminders),
    message: row.message,
    idv: row.idv,
    tpl: row.is_template,
    hashOrig: row.original_sha256,
    hashContent: row.content_sha256,
    hashFinal: row.final_sha256,
    sent: iso(row.sent_at),
    completed: iso(row.completed_at),
    billingSource: row.billing_source,
    fields: asJson(row.fields, []),
    comments: asJson(row.comments, []),
    signers: signers.map(s => mapSigner(s, secret, reveal)),
    events: (events || []).map(e => ({
      t: e.event_type,
      ts: iso(e.created_at),
      who: e.actor,
      ip: e.ip,
      ua: e.user_agent,
      email: e.email
    }))
  }
}

async function audit(q, docId, { type, actor, email, ip, ua, signerId, meta }) {
  await q(
    `insert into audit_events (document_id, signer_id, event_type, actor, email, ip, user_agent, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [docId, signerId || null, type, actor || null, email || null, ip || null, ua || null, JSON.stringify(meta || null)]
  )
}

function cleanSigners(list) {
  if (!Array.isArray(list) || list.length < 1 || list.length > 20) return null
  return list.map((s, i) => ({
    id: /^[0-9a-f-]{36}$/i.test(s.id || '') ? s.id : crypto.randomUUID(),
    name: String(s.name || s.full_name || '').slice(0, 120),
    email: String(s.email || '').trim().toLowerCase().slice(0, 200),
    role: ROLES.includes(s.role) ? s.role : 'signer',
    color: /^#[0-9a-fA-F]{6}$/.test(s.color || '') ? s.color : COLORS[i % COLORS.length]
  }))
}

function cleanFields(list, signerIds) {
  if (!Array.isArray(list) || list.length > 300) return null
  const fallback = [...signerIds][0]
  return list.map(f => {
    const type = FIELD_TYPES.includes(f.type) ? f.type : 'text'
    const clamp = (v, d) => {
      const n = Number(v)
      if (!Number.isFinite(n)) return d
      return Math.min(1, Math.max(0, n))
    }
    return {
      id: /^[0-9a-f-]{36}$/i.test(f.id || '') ? f.id : crypto.randomUUID(),
      page: Math.max(0, Math.min(40, Number(f.page) || 0)),
      type,
      signer: signerIds.has(f.signer) ? f.signer : fallback,
      x: clamp(f.x, 0.1),
      y: clamp(f.y, 0.1),
      w: Math.max(0.02, clamp(f.w, 0.2)),
      h: Math.max(0.015, clamp(f.h, 0.04)),
      required: type === 'checkbox' ? !!f.required : f.required !== false,
      label: String(f.label || type).slice(0, 80),
      value: null,
      ...(type === 'dropdown' ? { options: (Array.isArray(f.options) ? f.options : ['Option A', 'Option B']).map(o => String(o).slice(0, 80)).slice(0, 30) } : {}),
      ...(type === 'formula' ? { formula: String(f.formula || '').slice(0, 200) } : {}),
      ...(type === 'payment' ? { amount: Math.max(0, Math.min(1000000, Number(f.amount) || 0)) } : {}),
      ...(f.cond ? { cond: String(f.cond).slice(0, 40) } : {}),
      ...(['none', 'email', 'number', 'zip', 'phone'].includes(f.valid) ? { valid: f.valid } : {})
    }
  })
}

async function insertSigners(q, documentId, signers) {
  await q(`delete from signers where document_id=$1`, [documentId])
  for (let i = 0; i < signers.length; i++) {
    const s = signers[i]
    await q(
      `insert into signers (id, document_id, full_name, email, role, color, sort_index)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [s.id, documentId, s.name, s.email, s.role, s.color, i]
    )
  }
}

export async function createProfile(ctx, { id, email, name, passwordHash, ip }) {
  const canon = canonicalEmail(email)
  await ctx.db.query(
    `insert into profiles (id, email, canonical_email, full_name, password_hash, created_ip)
     values ($1,$2,$3,$4,$5,$6)`,
    [id, email, canon, name, passwordHash, ip || null]
  )
  await ctx.db.query(`insert into entitlements (user_id) values ($1)`, [id])
}

export async function signup(ctx, { name, email, password, ip, promo }) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanName = String(name || '').trim().slice(0, 120)
  if (!cleanName) throw fail(400, 'name', 'Enter your name.')
  if (!emailOk(cleanEmail)) throw fail(400, 'email', 'Enter a valid email address.')
  if (String(password || '').length < 8) throw fail(400, 'password', 'Use at least 8 characters.')
  const promoCode = normalizeCode(promo)
  if (promoCode) await checkCode(ctx.db.query.bind(ctx.db), promoCode)

  const gate = await ctx.db.tx(q => assertSignupAllowed(q, {
    ip,
    email: cleanEmail,
    limits: { signupPerHour: ctx.config.signupPerHour, signupPerDay: ctx.config.signupPerDay }
  }))
  if (!gate.ok) throw fail(gate.status, gate.error, gate.message)

  const existing = await ctx.db.query(`select id, email_verified_at, full_name from profiles where email=$1`, [cleanEmail])
  if (existing.rows[0]) {
    if (!existing.rows[0].email_verified_at) {
      const resent = await safeResend(ctx, existing.rows[0].id)
      throw fail(409, 'exists_unverified', resent
        ? 'An account with that email is waiting for confirmation. We sent the confirmation link again. Open it, then log in with the password you chose.'
        : 'An account with that email is waiting for confirmation. Log in with the password you chose, or use “Resend confirmation” on the login page.')
    }
    throw fail(409, 'exists', 'An account with that email already exists. Log in instead.')
  }

  if (ctx.config.authMode === 'supabase') {
    const admin = await supabaseAdmin(ctx.config)
    const makeLink = () => admin.auth.admin.generateLink({
      type: 'signup',
      email: cleanEmail,
      password,
      options: { data: { full_name: cleanName }, redirectTo: `${ctx.config.appUrl}/auth/confirmed` }
    })
    let { data, error } = await makeLink()
    if (error && /registered|already/i.test(error.message || '')) {
      // Auth user exists but we have no profile: a leftover from a failed signup. Remove it and start clean.
      const orphan = await findAuthUserByEmail(admin, cleanEmail)
      if (orphan && !orphan.email_confirmed_at) {
        await admin.auth.admin.deleteUser(orphan.id)
        ;({ data, error } = await makeLink())
      }
    }
    if (error) {
      if (/registered|already/i.test(error.message || '')) throw fail(409, 'exists', 'An account with that email already exists. Log in instead, or use “Forgot password” on the login page.')
      throw fail(400, 'signup', error.message)
    }
    try {
      await createProfile(ctx, { id: data.user.id, email: cleanEmail, name: cleanName, passwordHash: null, ip })
    } catch (err) {
      await admin.auth.admin.deleteUser(data.user.id).catch(() => {})
      if (constraintReason(err) || /duplicate|unique/i.test(err.message || '')) throw fail(409, 'exists', 'An account with that email already exists. Log in instead.')
      throw err
    }
    const promoResult = await signupPromo(ctx, data.user.id, promoCode)
    const emailSent = await trySend(() => sendVerifyEmail(ctx, cleanEmail, cleanName, data.properties.action_link), ctx)
    return { id: data.user.id, email: cleanEmail, emailSent, promo: promoResult }
  }

  const id = crypto.randomUUID()
  const token = randomToken(32)
  await createProfile(ctx, { id, email: cleanEmail, name: cleanName, passwordHash: hashPassword(password), ip })
  await ctx.db.query(`update profiles set email_verify_token=$2 where id=$1`, [id, hashSecret(token, ctx.config.jwtSecret)])
  const promoResult = await signupPromo(ctx, id, promoCode)
  const emailSent = await trySend(() => sendVerifyEmail(ctx, cleanEmail, cleanName, `${ctx.config.appUrl}/auth/verify?token=${token}`), ctx)
  return { id, email: cleanEmail, emailSent, promo: promoResult }
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const hit = data.users.find(u => String(u.email || '').toLowerCase() === email)
    if (hit) return hit
    if (data.users.length < 1000) return null
  }
  return null
}

async function trySend(fn, ctx) {
  try { await fn(); return true } catch (err) {
    console.error('verification email failed:', String(err?.message || err).slice(0, 300))
    await ctx?.logError?.('email.verify', String(err?.message || err))
    return false
  }
}

async function signupPromo(ctx, userId, code) {
  if (!code) return null
  try { return await redeemCode(ctx.db, userId, code) } catch (err) {
    return { ok: false, code, message: err.publicMessage || 'That promo code could not be applied.' }
  }
}

async function safeResend(ctx, userId) {
  const row = (await ctx.db.query(`select * from profiles where id=$1`, [userId])).rows[0]
  if (!row || row.email_verified_at) return false
  try { await resendVerification(ctx, row); return true } catch (err) {
    console.error('resend verification failed:', String(err?.message || err).slice(0, 300))
    return false
  }
}

// ---------- password reset ----------
function resetFingerprint(user) { return sha256(String(user.password_hash || 'none') + ':' + user.id).slice(0, 16) }

export async function requestPasswordReset(ctx, email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!emailOk(cleanEmail)) throw fail(400, 'email', 'Enter a valid email address.')
  const generic = { ok: true, message: 'If an account exists for that email, we sent a link to reset your password.' }
  const user = (await ctx.db.query(`select * from profiles where email=$1`, [cleanEmail])).rows[0]
  if (!user || user.blocked_at) return generic
  let url
  if (ctx.config.authMode === 'supabase') {
    const admin = await supabaseAdmin(ctx.config)
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: cleanEmail })
    if (error) { await ctx.logError?.('auth.reset', error.message); return generic }
    url = `${ctx.config.appUrl}/#/reset/${encodeURIComponent(data.properties.hashed_token)}`
  } else {
    const token = signJwt({ uid: user.id, purpose: 'reset', fp: resetFingerprint(user) }, ctx.config.jwtSecret, 60 * 60 * 1000)
    url = `${ctx.config.appUrl}/#/reset/${encodeURIComponent(token)}`
  }
  const sent = await trySend(() => ctx.email.send({
    to: cleanEmail,
    subject: 'Reset your Easy Digital Signatures password',
    text: `Hi ${user.full_name || ''}, reset your password here (link works for 1 hour): ${url}\n\nIf you didn’t ask for this, ignore this email.`,
    html: htmlEmail({
      title: 'Reset your password',
      intro: `Hi ${esc(user.full_name || '')}, use the button below to choose a new password. The link works for 1 hour.`,
      button: 'Choose a new password',
      href: url,
      note: 'If you didn’t ask for this, you can ignore this email.',
      brand: { company: 'Easy Digital Signatures', color: '#0f766e' }
    })
  }), ctx)
  if (!sent) throw fail(503, 'email', 'We couldn’t send the reset email right now. Try again in a few minutes.')
  return generic
}

export async function resetPassword(ctx, { token, password }) {
  if (String(password || '').length < 8) throw fail(400, 'password', 'Use at least 8 characters.')
  const bad = () => fail(400, 'reset_invalid', 'This reset link is invalid or has expired. Request a new one from the login page.')
  if (!token) throw bad()
  let userId
  if (ctx.config.authMode === 'supabase') {
    const admin = await supabaseAdmin(ctx.config)
    const { data, error } = await admin.auth.verifyOtp({ type: 'recovery', token_hash: String(token) })
    if (error || !data?.user) throw bad()
    userId = data.user.id
    const upd = await admin.auth.admin.updateUserById(userId, { password: String(password) })
    if (upd.error) throw fail(400, 'password', upd.error.message)
    await ctx.db.query(`update profiles set email_verified_at=coalesce(email_verified_at, now()) where id=$1`, [userId])
  } else {
    const payload = readJwt(String(token), ctx.config.jwtSecret)
    if (!payload || payload.purpose !== 'reset') throw bad()
    const user = (await ctx.db.query(`select * from profiles where id=$1`, [payload.uid])).rows[0]
    if (!user || resetFingerprint(user) !== payload.fp) throw bad()
    userId = user.id
    await ctx.db.query(`update profiles set password_hash=$2, email_verified_at=coalesce(email_verified_at, now()) where id=$1`, [userId, hashPassword(String(password))])
  }
  const user = (await ctx.db.query(`select blocked_at from profiles where id=$1`, [userId])).rows[0]
  if (user?.blocked_at) throw fail(403, 'account_disabled', DISABLED_MESSAGE)
  return { ok: true, message: 'Password updated. Log in with your new password.' }
}

export async function logout(ctx, token) {
  if (ctx.config.authMode !== 'supabase' || !token) return { ok: true }
  try {
    const admin = await supabaseAdmin(ctx.config)
    await admin.auth.admin.signOut(token, 'local')
  } catch { /* token already invalid */ }
  return { ok: true }
}

// Public "resend confirmation" from the login page. Never reveals whether the email exists.
export async function resendByEmail(ctx, email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!emailOk(cleanEmail)) throw fail(400, 'email', 'Enter a valid email address.')
  const row = (await ctx.db.query(`select id from profiles where email=$1 and email_verified_at is null`, [cleanEmail])).rows[0]
  if (row) await safeResend(ctx, row.id)
  return { ok: true, message: 'If that account is waiting for confirmation, we sent the link again.' }
}

async function sendVerifyEmail(ctx, email, name, url) {
  await ctx.email.send({
    to: email,
    subject: 'Confirm your Easy Digital Signatures email',
    text: `Hi ${name}, confirm your email: ${url}`,
    html: htmlEmail({
      title: 'Confirm your email',
      intro: `Hi ${esc(name)}, confirm this address so you can send documents.`,
      button: 'Confirm email',
      href: url,
      brand: { company: 'Easy Digital Signatures', color: '#0f766e' }
    })
  })
}

export async function resendVerification(ctx, user) {
  if (user.email_verified_at) return { ok: true }
  if (ctx.config.authMode === 'supabase') {
    const admin = await supabaseAdmin(ctx.config)
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: { redirectTo: `${ctx.config.appUrl}/auth/confirmed` }
    })
    if (error) throw fail(400, 'email', error.message)
    await sendVerifyEmail(ctx, user.email, user.full_name, data.properties.action_link)
    return { ok: true }
  }
  const token = randomToken(32)
  await ctx.db.query(`update profiles set email_verify_token=$2 where id=$1`, [user.id, hashSecret(token, ctx.config.jwtSecret)])
  await sendVerifyEmail(ctx, user.email, user.full_name, `${ctx.config.appUrl}/auth/verify?token=${token}`)
  return { ok: true }
}

export async function verifyEmailToken(ctx, token) {
  if (!token) return false
  const hash = hashSecret(token, ctx.config.jwtSecret)
  const row = await ctx.db.query(`select id from profiles where email_verify_token=$1`, [hash])
  if (!row.rows[0]) return false
  await ctx.db.query(`update profiles set email_verified_at=now(), email_verify_token=null where id=$1`, [row.rows[0].id])
  return true
}

export async function login(ctx, { email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (ctx.config.authMode === 'supabase') {
    const { createClient } = await import('@supabase/supabase-js')
    const key = ctx.config.supabaseAnonKey || ctx.config.supabaseServiceKey
    const client = createClient(ctx.config.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.signInWithPassword({ email: cleanEmail, password })
    if (error) {
      if (/confirm/i.test(error.message || '')) throw fail(403, 'email_unverified', 'Confirm your email first. We can send the link again from the login page.')
      throw fail(401, 'login', 'Email or password is incorrect.')
    }
    const prof = (await ctx.db.query(`select blocked_at from profiles where id=$1`, [data.user.id])).rows[0]
    if (prof?.blocked_at) throw fail(403, 'account_disabled', DISABLED_MESSAGE)
    return { token: data.session.access_token, userId: data.user.id }
  }
  const found = await ctx.db.query(`select * from profiles where email=$1`, [cleanEmail])
  const user = found.rows[0]
  if (!user || !verifyPassword(password, user.password_hash)) throw fail(401, 'login', 'Email or password is incorrect.')
  if (user.blocked_at) throw fail(403, 'account_disabled', DISABLED_MESSAGE)
  return { token: signJwt({ uid: user.id }, ctx.config.jwtSecret), userId: user.id }
}

export async function userFromAuth(ctx, token) {
  if (!token) return null
  if (ctx.config.authMode === 'supabase') {
    const admin = await supabaseAdmin(ctx.config)
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) return null
    let row = await ctx.db.query(`select * from profiles where id=$1`, [data.user.id])
    if (!row.rows[0] && data.user.email) {
      // Auth user exists but the profile insert never happened (e.g. an earlier failed signup).
      try {
        await createProfile(ctx, { id: data.user.id, email: String(data.user.email).toLowerCase(), name: data.user.user_metadata?.full_name || '', passwordHash: null, ip: null })
      } catch (err) { console.error('profile backfill failed:', String(err?.message || err).slice(0, 200)) }
      row = await ctx.db.query(`select * from profiles where id=$1`, [data.user.id])
    }
    const profile = row.rows[0]
    if (!profile) return null
    if (data.user.email_confirmed_at && !profile.email_verified_at) {
      await ctx.db.query(`update profiles set email_verified_at=$2 where id=$1`, [profile.id, data.user.email_confirmed_at])
      profile.email_verified_at = data.user.email_confirmed_at
    }
    return profile
  }
  const payload = readJwt(token, ctx.config.jwtSecret)
  if (!payload?.uid) return null
  const row = await ctx.db.query(`select * from profiles where id=$1`, [payload.uid])
  return row.rows[0] || null
}

function phoneRequired(ctx) {
  return ctx.config.smsMode !== 'off'
}

export async function startPhone(ctx, user, phoneRaw) {
  if (!phoneRequired(ctx)) throw fail(404, 'sms_disabled', 'Phone verification is not enabled.')
  const phone = normalizePhone(phoneRaw)
  if (!phone) throw fail(400, 'phone', 'Enter a mobile number with country code, for example +1 415 555 0100.')
  const recent = await ctx.db.query(
    `select count(*)::int as n from phone_otps where user_id=$1 and created_at > now() - interval '1 hour'`,
    [user.id]
  )
  if (num(recent.rows[0].n) >= 5) throw fail(429, 'rate_limit', 'Too many code requests. Wait a bit and try again.')
  let lineType = 'unknown'
  try {
    lineType = await ctx.sms.lookup(phone)
  } catch {
    lineType = 'unknown'
  }
  await ctx.sms.start({ userId: user.id, phone, lineType, db: ctx.db })
  return {
    ok: true,
    phone,
    voip: isVoipLine(lineType),
    message: isVoipLine(lineType)
      ? 'Code sent. This number looks virtual, so it can verify your account but not the free document.'
      : 'Code sent.'
  }
}

export async function checkPhone(ctx, user, phoneRaw, code) {
  if (!phoneRequired(ctx)) throw fail(404, 'sms_disabled', 'Phone verification is not enabled.')
  const phone = normalizePhone(phoneRaw)
  if (!phone) throw fail(400, 'phone', 'Enter the same phone number you requested a code for.')
  const result = await ctx.sms.check({ userId: user.id, phone, code, db: ctx.db })
  if (!result.ok) throw fail(400, 'code', result.message)
  await ctx.db.query(
    `update profiles set phone_e164=$2, phone_verified_at=now(), phone_line_type=$3 where id=$1`,
    [user.id, phone, result.lineType || null]
  )
  return { ok: true, phone, voip: isVoipLine(result.lineType) }
}

export async function usageFor(ctx, user, device) {
  const entRow = await ctx.db.query(`select * from entitlements where user_id=$1`, [user.id])
  const ent = entRow.rows[0]
  const free = await evaluateFree(ctx.db.query.bind(ctx.db), user, {
    localId: device?.localId || '',
    cookieId: device?.cookieId || '',
    ip: device?.ip || '',
    limit: ctx.config.ipFreeLimit,
    phoneRequired: phoneRequired(ctx)
  })
  return {
    freeAvailable: !!free.ok,
    freeReason: free.ok ? null : free.error,
    freeMessage: free.ok ? 'Your free document is ready to send.' : free.message,
    credits: num(ent?.credits),
    ...(await promoUsage(ctx.db.query.bind(ctx.db), user.id)),
    emailVerified: !!user.email_verified_at,
    phoneVerified: !!user.phone_verified_at,
    phone: user.phone_e164 || '',
    phoneLineType: user.phone_line_type || ''
  }
}

function publicUser(user) {
  const brand = asJson(user.brand, {})
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    emailVerified: !!user.email_verified_at,
    phone: user.phone_e164 || '',
    phoneVerified: !!user.phone_verified_at,
    brand: { company: brand.company || '', color: brand.color || '#0f766e' },
    folders: asJson(user.folders, ['All', 'Sales', 'HR', 'Real Estate', 'Legal']),
    proposal: asJson(user.proposal, null),
    reminderDefault: cadence(user.default_remind_days, 3),
    senderNudgeDays: cadence(user.sender_nudge_days, 0)
  }
}

async function loadSigners(q, documentId) {
  const rows = await q(`select * from signers where document_id=$1 order by sort_index`, [documentId])
  return rows.rows
}

async function loadByIds(q, sqlIn, ids) {
  if (!ids.length) return []
  const params = ids.map((_, i) => `$${i + 1}`).join(',')
  const rows = await q(sqlIn.replace('__IN__', params), ids)
  return rows.rows
}

async function loadEvents(q, ids) {
  return loadByIds(q, `select * from audit_events where document_id in (__IN__) order by created_at`, ids)
}

export async function stateFor(ctx, user, device) {
  const docs = await ctx.db.query(
    `select * from documents where owner_id=$1 order by created_at desc`,
    [user.id]
  )
  const ids = docs.rows.map(d => d.id)
  const signerRows = { rows: await loadByIds(ctx.db.query.bind(ctx.db), `select * from signers where document_id in (__IN__) order by sort_index`, ids) }
  const events = await loadByIds(ctx.db.query.bind(ctx.db), `select * from audit_events where document_id in (__IN__) order by created_at`, ids)
  const byDoc = new Map()
  for (const s of signerRows.rows) {
    if (!byDoc.has(s.document_id)) byDoc.set(s.document_id, [])
    byDoc.get(s.document_id).push(s)
  }
  const evBy = new Map()
  for (const e of events) {
    if (!evBy.has(e.document_id)) evBy.set(e.document_id, [])
    evBy.get(e.document_id).push(e)
  }
  const mapped = docs.rows.map(d => mapDoc(d, byDoc.get(d.id) || [], evBy.get(d.id) || [], ctx.config.jwtSecret, true))
  const links = await ctx.db.query(`select * from signing_links where owner_id=$1 order by created_at desc`, [user.id])
  return {
    me: publicUser(user),
    usage: await usageFor(ctx, user, device),
    documents: mapped.filter(d => !d.tpl),
    templates: mapped.filter(d => d.tpl),
    links: links.rows.map(l => ({
      id: l.id,
      name: l.name,
      tpl: l.template_id,
      active: l.active,
      responses: l.responses,
      created: iso(l.created_at)
    }))
  }
}

export async function saveSettings(ctx, user, body) {
  const current = asJson(user.brand, {})
  const srcBrand = body.brand || current
  const brand = {
    company: String(srcBrand?.company || '').slice(0, 80),
    color: /^#[0-9a-fA-F]{6}$/.test(srcBrand?.color || '') ? srcBrand.color : '#0f766e'
  }
  let folders = Array.isArray(body.folders) ? body.folders.map(f => String(f).slice(0, 40)).filter(Boolean).slice(0, 30) : null
  if (folders) {
    folders = folders.filter(f => f !== 'All')
    folders.unshift('All')
  }
  let proposal = null
  if (body.proposal && typeof body.proposal === 'object') {
    const raw = JSON.stringify(body.proposal)
    if (raw.length > 50000) throw fail(400, 'proposal', 'That proposal is too large.')
    proposal = raw
  }
  await ctx.db.query(
    `update profiles set brand=$2::jsonb, folders=coalesce($3::jsonb, folders), proposal=coalesce($4::jsonb, proposal) where id=$1`,
    [user.id, JSON.stringify(brand), folders ? JSON.stringify(folders) : null, proposal]
  )
  if (body.reminderDefault !== undefined) await ctx.db.query(`update profiles set default_remind_days=$2 where id=$1`, [user.id, cadence(body.reminderDefault, 3)])
  if (body.senderNudgeDays !== undefined) await ctx.db.query(`update profiles set sender_nudge_days=$2 where id=$1`, [user.id, cadence(body.senderNudgeDays, 0)])
  const next = await ctx.db.query(`select * from profiles where id=$1`, [user.id])
  return publicUser(next.rows[0])
}

async function ownDoc(q, userId, id) {
  const row = await q(`select * from documents where id=$1 and owner_id=$2`, [id, userId])
  if (!row.rows[0]) throw fail(404, 'not_found', 'Document not found.')
  return row.rows[0]
}

export async function createBlank(ctx, user, body) {
  const name = String(body.name || 'Untitled document').slice(0, 160)
  const template = !!body.template
  const roles = Array.isArray(body.roles) && body.roles.length
    ? body.roles.map(r => String(r).slice(0, 80)).filter(Boolean).slice(0, 20)
    : ['Signer 1']
  const signers = cleanSigners(roles.map((r, i) => ({ name: r, email: '', role: 'signer', color: COLORS[i % COLORS.length] })))
  const bytes = await blankPdf(body.pages || 1)
  return storeNewDoc(ctx, user, { name, template, signers, bytes, folder: body.folder || 'Sales' })
}

export async function createUpload(ctx, user, { bytes, filename, name, template }) {
  const kind = sniff(bytes)
  if (!kind) throw fail(400, 'file', 'Upload a PDF, PNG, or JPG.')
  if (bytes.length > 10 * 1024 * 1024) throw fail(413, 'too_large', 'Files must be 10 MB or smaller.')
  let pdf = bytes
  if (kind === 'png' || kind === 'jpg') pdf = await imageToPdf(bytes, kind)
  try { await assertReadablePdf(pdf) } catch {
    throw fail(400, 'file', 'That PDF could not be opened. It may be password-protected or damaged.')
  }
  const base = String(name || filename || 'Document').replace(/\.(pdf|png|jpe?g)$/i, '').slice(0, 160)
  const signers = cleanSigners([{ name: 'Signer 1', email: '', role: 'signer', color: COLORS[0] }])
  return storeNewDoc(ctx, user, { name: base || 'Document', template: !!template, signers, bytes: pdf, folder: 'Sales' })
}

function sniff(buf) {
  const b = Buffer.from(buf)
  if (b.slice(0, 5).toString() === '%PDF-') return 'pdf'
  if (b[0] === 0x89 && b[1] === 0x50) return 'png'
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg'
  return null
}

async function storeNewDoc(ctx, user, { name, template, signers, bytes, folder }) {
  const id = crypto.randomUUID()
  const key = `${user.id}/${id}/original.pdf`
  await ctx.storage.put(key, bytes)
  await ctx.db.query(
    `insert into documents (id, owner_id, name, status, folder, is_template, original_path, remind_days)
     values ($1,$2,$3,'draft',$4,$5,$6,$7)`,
    [id, user.id, name, folder || 'Sales', template, key, cadence(user.default_remind_days, 3)]
  )
  await ctx.db.tx(q => insertSigners(q, id, signers))
  await ctx.db.query(
    `insert into audit_events (document_id, event_type, actor) values ($1,$2,$3)`,
    [id, template ? 'Template created' : 'Document created', user.full_name || 'You']
  )
  return getOwned(ctx, user, id)
}

export async function saveDraft(ctx, user, id, body) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  if (doc.status !== 'draft') throw fail(409, 'locked', 'This document has already been sent.')
  const signers = cleanSigners(body.signers || [])
  if (!signers) throw fail(400, 'signers', 'Add between 1 and 20 recipients.')
  const fields = cleanFields(body.fields || [], new Set(signers.map(s => s.id)))
  if (!fields) throw fail(400, 'fields', 'Too many fields.')
  const name = String(body.name || doc.name).slice(0, 160)
  const folder = String(body.folder || doc.folder || 'Sales').slice(0, 40)
  await ctx.db.tx(async q => {
    await q(
      `update documents set name=$2, folder=$3, ordered_sign=$4, expires_days=$5, remind_days=$6,
        message=$7, idv=$8, fields=$9::jsonb, updated_at=now() where id=$1`,
      [
        id,
        name,
        folder,
        !!body.ordered,
        Math.max(1, Math.min(365, Number(body.expiresDays) || 30)),
        cadence(body.remindDays, 3),
        String(body.message || '').slice(0, 2000),
        !!body.idv,
        JSON.stringify(fields)
      ]
    )
    await insertSigners(q, id, signers)
  })
  return getOwned(ctx, user, id)
}

async function getOwned(ctx, user, id) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), id)
  const events = await loadEvents(ctx.db.query.bind(ctx.db), [id])
  return mapDoc(doc, signers, events, ctx.config.jwtSecret, true)
}

export async function instantiateTemplate(ctx, user, templateId) {
  const template = await ownDoc(ctx.db.query.bind(ctx.db), user.id, templateId)
  if (!template.is_template) throw fail(400, 'template', 'That is not a template.')
  const old = await loadSigners(ctx.db.query.bind(ctx.db), templateId)
  const bytes = await ctx.storage.get(template.original_path)
  const next = cleanSigners(old.map(s => ({ name: s.full_name, email: '', role: s.role, color: s.color })))
  const created = await storeNewDoc(ctx, user, {
    name: template.name,
    template: false,
    signers: next,
    bytes,
    folder: template.folder
  })
  const fields = asJson(template.fields, []).map((f, i) => ({
    ...f,
    id: crypto.randomUUID(),
    signer: next[old.findIndex(s => s.id === f.signer)]?.id || next[0].id,
    value: null
  }))
  await ctx.db.query(
    `update documents set fields=$2::jsonb, ordered_sign=$3, expires_days=$4, remind_days=$5, message=$6, idv=$7 where id=$1`,
    [created.id, JSON.stringify(fields), template.ordered_sign, template.expires_days, template.remind_days, template.message, template.idv]
  )
  return getOwned(ctx, user, created.id)
}

export async function copyAsTemplate(ctx, user, id, name) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), id)
  const bytes = await ctx.storage.get(doc.original_path)
  const kept = signers.filter(s => s.role !== 'cc')
  const idMap = new Map()
  const nextSigners = kept.map(s => {
    const nid = crypto.randomUUID()
    idMap.set(s.id, nid)
    return { id: nid, name: s.full_name, email: '', role: s.role, color: s.color }
  })
  const created = await storeNewDoc(ctx, user, {
    name: String(name || doc.name).slice(0, 160),
    template: true,
    signers: nextSigners,
    bytes,
    folder: doc.folder
  })
  const fields = asJson(doc.fields, []).map(f => ({
    ...f,
    id: crypto.randomUUID(),
    signer: idMap.get(f.signer) || created.signers[0]?.id,
    value: null
  }))
  await ctx.db.query(`update documents set fields=$2::jsonb, ordered_sign=$3, expires_days=$4, remind_days=$5, message=$6, idv=$7 where id=$1`, [
    created.id, JSON.stringify(fields), doc.ordered_sign, doc.expires_days, doc.remind_days, doc.message, doc.idv
  ])
  return getOwned(ctx, user, created.id)
}

export async function deleteDocument(ctx, user, id) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  if (!doc.is_template && doc.status !== 'draft') throw fail(409, 'locked', 'Sent documents stay in your account for the audit trail.')
  await ctx.db.query(`delete from signing_links where template_id=$1`, [id])
  await ctx.db.query(`delete from documents where id=$1`, [id])
  return { ok: true }
}

function readyErrors(signers, fields) {
  if (!fields.length) return 'Add at least one field first.'
  const need = signers.filter(s => s.role !== 'cc' && s.role !== 'approver' && !fields.some(f => f.signer === s.id))
  if (need.length) return `${need[0].name || 'A recipient'} has no fields.`
  for (const s of signers) {
    if (s.role === 'in-person') {
      if (!s.name.trim()) return 'Each in-person signer needs a name.'
      continue
    }
    if (!s.name.trim()) return 'Each recipient needs a name.'
    if (!emailOk(s.email)) return `Enter an email for ${s.name}.`
  }
  return null
}

function brandOf(user) {
  const brand = asJson(user.brand, {})
  return { company: brand.company || user.full_name || 'Easy Digital Signatures', color: brand.color || '#0f766e' }
}

async function emailSigner(ctx, user, doc, signer, token, accessCode, { reminder = false } = {}) {
  if (!signer.email) return
  const href = `${ctx.config.appUrl}/#/sign/${token}`
  const note = accessCode
    ? `Access code: <b>${esc(accessCode)}</b>. You don’t need an account.`
    : 'You don’t need an account. The link is unique to you.'
  await ctx.email.send({
    to: signer.email,
    subject: reminder ? `Reminder: “${doc.name}” is waiting for your signature` : `${brandOf(user).company} sent you “${doc.name}” to sign`,
    text: `${reminder ? 'Reminder: ' : ''}${user.full_name} asked you to sign ${doc.name}. ${href}${accessCode ? ' Access code: ' + accessCode : ''}`,
    html: htmlEmail({
      title: reminder ? `Reminder: ${doc.name}` : doc.name,
      intro: reminder
        ? `${esc(user.full_name)} is still waiting for your signature on <b>${esc(doc.name)}</b>. It only takes a minute.<br><br>${esc(doc.message || '')}`
        : `${esc(user.full_name)} asked you to review and sign this document.<br><br>${esc(doc.message || '')}`,
      button: signer.role === 'approver' ? 'Review document' : 'Review and sign',
      href,
      note,
      brand: brandOf(user)
    })
  })
}

export async function sendDocument(ctx, user, id, device) {
  let prepared
  try {
    prepared = await ctx.db.tx(async q => {
      const locked = await q(`select * from documents where id=$1 and owner_id=$2 for update`, [id, user.id])
      const doc = locked.rows[0]
      if (!doc) throw fail(404, 'not_found', 'Document not found.')
      if (doc.is_template) throw fail(400, 'template', 'Use the template to create a document, then send that document.')
      if (['sent', 'waiting', 'completed'].includes(doc.status)) return { ok: true, already: true, id }
      if (doc.status !== 'draft') throw fail(409, 'status', `This document is ${doc.status}.`)
      const signers = await loadSigners(q, id)
      const fields = asJson(doc.fields, [])
      const clientSigners = signers.map(s => ({ ...s, name: s.full_name }))
      const problem = readyErrors(clientSigners, fields)
      if (problem) throw fail(400, 'invalid', problem)
      const profile = (await q(`select * from profiles where id=$1 for update`, [user.id])).rows[0]
      if (profile.blocked_at) throw fail(403, 'account_disabled', DISABLED_MESSAGE)
      if (!profile.email_verified_at) throw fail(403, 'email_unverified', FREE_MESSAGES.email_unverified)
      const ent = (await q(`select * from entitlements where user_id=$1 for update`, [user.id])).rows[0]
      let source = doc.billing_source
      if (!source) {
        const promoCode = await consumePromo(q, user.id)
        if (promoCode) source = `promo:${promoCode}`
      }
      if (!source) {
        const free = await evaluateFree(q, profile, {
          localId: device.localId,
          cookieId: device.cookieId,
          ip: device.ip,
          limit: ctx.config.ipFreeLimit,
          allowMissingDevice: !!device.allowMissingDevice,
          phoneRequired: phoneRequired(ctx)
        })
        if (free.ok) {
          await recordFreeClaim(q, profile, device)
          source = 'free'
        } else if (num(ent.credits) > 0) {
          await q(`update entitlements set credits = credits - 1 where user_id=$1 and credits > 0`, [user.id])
          source = 'credit'
        } else {
          return {
            ok: false,
            status: 402,
            error: 'payment_required',
            reason: free.error,
            message: `${free.message} Buy 1 document for $1, 10 for $5, or 50 for $10.`
          }
        }
      }
      const issued = []
      for (const s of signers) {
        if (s.role === 'cc') continue
        const token = randomToken(32)
        const access = doc.idv ? String(Math.floor(100000 + Math.random() * 900000)) : null
        await q(
          `update signers set token=$2, token_hash=$3, access_code_hash=$4 where id=$1`,
          [s.id, seal(token, ctx.config.jwtSecret), sha256(token), access ? hashSecret(access, ctx.config.jwtSecret) : null]
        )
        issued.push({ ...s, name: s.full_name, token, access })
      }
      const bytes = await ctx.storage.get(doc.original_path)
      const hash = sha256(bytes)
      await q(
        `update documents set status='sent', billing_source=$2, original_sha256=$3, sent_at=now(), updated_at=now() where id=$1`,
        [id, source, hash]
      )
      await q(`update profiles set first_send_ip=coalesce(first_send_ip,$2) where id=$1`, [user.id, device.ip || null])
      await audit(q, id, { type: `Sent for signature (${doc.ordered_sign ? 'in order' : 'all at once'})`, actor: profile.full_name, email: profile.email, ip: device.ip, ua: device.ua })
      return { ok: true, id, source, ordered: doc.ordered_sign, issued, doc: { ...doc, name: doc.name, message: doc.message }, profile }
    })
  } catch (err) {
    const reason = constraintReason(err)
    if (reason) return { ok: false, status: 402, error: 'payment_required', reason, message: FREE_MESSAGES[reason] }
    throw err
  }
  if (!prepared.ok || prepared.already) return prepared.already ? { ok: true, already: true, document: await getOwned(ctx, user, id) } : prepared
  const firsts = prepared.ordered
    ? prepared.issued.filter(s => s.role !== 'cc').slice(0, 1)
    : prepared.issued.filter(s => s.role !== 'cc')
  for (const s of firsts) {
    try {
      await emailSigner(ctx, prepared.profile, prepared.doc, s, s.token, s.access)
      await ctx.db.query(
        `insert into audit_events (document_id, signer_id, event_type, actor, email) values ($1,$2,$3,$4,$5)`,
        [id, s.id, `Email sent to ${s.full_name || s.name}`, 'System', s.email]
      )
    } catch (err) {
      await ctx.db.query(
        `insert into audit_events (document_id, event_type, actor, meta) values ($1,$2,$3,$4::jsonb)`,
        [id, 'Email failed', 'System', JSON.stringify({ error: String(err.message || err).slice(0, 200), email: s.email })]
      )
    }
  }
  const document = await getOwned(ctx, user, id)
  return {
    ok: true,
    billingSource: prepared.source,
    document,
    links: prepared.issued.map(s => ({
      name: s.full_name || s.name,
      email: s.email,
      role: s.role,
      url: `${ctx.config.appUrl}/#/sign/${s.token}`,
      accessCode: s.access || null
    }))
  }
}

export async function remind(ctx, user, id, { force = false, auto = false } = {}) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  if (!['sent', 'waiting'].includes(doc.status)) throw fail(409, 'status', 'This document is not waiting for signatures.')
  if (!force && doc.last_reminded_at && Date.now() - new Date(doc.last_reminded_at).getTime() < REMIND_GAP_MS) {
    const next = new Date(new Date(doc.last_reminded_at).getTime() + REMIND_GAP_MS)
    const err = fail(429, 'reminded_recently', `Already reminded in the last 24 hours. You can resend after ${next.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} PT.`)
    err.nextAllowed = next.toISOString()
    throw err
  }
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), id)
  let pending = signers.filter(s => s.role !== 'cc' && !s.signed_at && !s.declined_at)
  if (doc.ordered_sign) pending = pending.slice(0, 1)
  let sent = 0
  for (const s of pending) {
    if (!s.email || !s.token) continue
    let access = null
    if (doc.idv) {
      access = String(Math.floor(100000 + Math.random() * 900000))
      await ctx.db.query(`update signers set access_code_hash=$2 where id=$1`, [s.id, hashSecret(access, ctx.config.jwtSecret)])
    }
    const token = unseal(s.token, ctx.config.jwtSecret)
    try {
      await emailSigner(ctx, user, doc, { ...s, name: s.full_name }, token, access, { reminder: true })
      sent++
      await audit(ctx.db.query.bind(ctx.db), id, { type: `${auto ? 'Automatic reminder' : 'Reminder'} sent to ${s.full_name}`, actor: auto ? 'System' : user.full_name, email: s.email })
    } catch (err) {
      await ctx.logError?.('email.reminder', String(err?.message || err))
      await audit(ctx.db.query.bind(ctx.db), id, { type: 'Email failed', actor: 'System', meta: { error: String(err.message || err).slice(0, 200), email: s.email } })
    }
  }
  await ctx.db.query(
    `update documents set last_reminded_at=now()${auto ? ', auto_reminders = auto_reminders + 1' : ''} where id=$1`, [id]
  )
  return { ok: true, reminded: sent, lastReminded: new Date().toISOString() }
}

// Preview + run "Resend all unsigned" for one account. Skips documents reminded in the last 24 hours.
export async function remindAll(ctx, user, { dryRun = false } = {}) {
  const docs = (await ctx.db.query(
    `select * from documents where owner_id=$1 and status in ('sent','waiting') and not is_template order by sent_at`, [user.id]
  )).rows
  const plan = []
  let skipped = 0
  for (const doc of docs) {
    if (doc.last_reminded_at && Date.now() - new Date(doc.last_reminded_at).getTime() < REMIND_GAP_MS) { skipped++; continue }
    const signers = await loadSigners(ctx.db.query.bind(ctx.db), doc.id)
    let pending = signers.filter(s => s.role !== 'cc' && !s.signed_at && !s.declined_at && s.email && s.token)
    if (doc.ordered_sign) pending = pending.slice(0, 1)
    if (pending.length) plan.push({ id: doc.id, signers: pending.length })
  }
  const totals = { documents: plan.length, signers: plan.reduce((a, p) => a + p.signers, 0), skipped }
  if (dryRun) return { ok: true, ...totals }
  let reminded = 0
  for (const p of plan) {
    try { reminded += (await remind(ctx, user, p.id)).reminded } catch (err) { if (err.code !== 'reminded_recently') throw err }
  }
  return { ok: true, ...totals, reminded }
}

export async function setDocReminders(ctx, user, id, remindDays) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  const n = cadence(remindDays, -1)
  if (n < 0) throw fail(400, 'remind_days', 'Choose Off, every 2 days, every 3 days, or weekly.')
  await ctx.db.query(`update documents set remind_days=$2, updated_at=now() where id=$1`, [doc.id, n])
  return { ok: true, id: doc.id, remindDays: n }
}

async function signerByToken(ctx, token) {
  if (!token || token.length < 20) return null
  const row = await ctx.db.query(`select * from signers where token_hash=$1`, [sha256(token)])
  return row.rows[0] || null
}

async function partyDoc(ctx, signer) {
  const row = await ctx.db.query(`select * from documents where id=$1`, [signer.document_id])
  return row.rows[0]
}

function waitingFor(doc, signers, signer) {
  if (!doc.ordered_sign) return null
  return signers.find(s => s.role !== 'cc' && s.sort_index < signer.sort_index && !s.signed_at) || null
}

export async function signSession(ctx, token, device, { markView }) {
  const signer = await signerByToken(ctx, token)
  if (!signer) throw fail(404, 'not_found', 'This signing link is not valid.')
  const doc = await partyDoc(ctx, signer)
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), doc.id)
  if (['declined', 'expired', 'voided'].includes(doc.status)) {
    return { status: doc.status, name: doc.name }
  }
  if (doc.sent_at && ['sent', 'waiting'].includes(doc.status)) {
    const exp = new Date(doc.sent_at).getTime() + Number(doc.expires_days) * 864e5
    if (Date.now() > exp) {
      await ctx.db.query(`update documents set status='expired', updated_at=now() where id=$1`, [doc.id])
      await audit(ctx.db.query.bind(ctx.db), doc.id, { type: 'Expired', actor: 'System' })
      return { status: 'expired', name: doc.name }
    }
  }
  const ahead = waitingFor(doc, signers, signer)
  if (ahead && !signer.signed_at) {
    return { status: 'waiting_turn', name: doc.name, waitingFor: ahead.full_name }
  }
  if (markView && !signer.viewed_at && !signer.signed_at) {
    await ctx.db.query(
      `update signers set viewed_at=now(), view_ip=$2, view_ua=$3 where id=$1`,
      [signer.id, device.ip, device.ua]
    )
    if (doc.status === 'sent') await ctx.db.query(`update documents set status='waiting', updated_at=now() where id=$1`, [doc.id])
    await audit(ctx.db.query.bind(ctx.db), doc.id, {
      type: `Viewed by ${signer.full_name}`,
      actor: signer.full_name,
      email: signer.email,
      ip: device.ip,
      ua: device.ua,
      signerId: signer.id
    })
  }
  const fresh = await partyDoc(ctx, signer)
  const freshSigners = await loadSigners(ctx.db.query.bind(ctx.db), doc.id)
  const events = await loadEvents(ctx.db.query.bind(ctx.db), [doc.id])
  const mapped = mapDoc(fresh, freshSigners, events, ctx.config.jwtSecret, false)
  const me = freshSigners.find(s => s.id === signer.id)
  return {
    status: fresh.status,
    consentText: CONSENT_TEXT,
    consentVersion: CONSENT_VERSION,
    accessCodeRequired: !!fresh.idv && !me.signed_at,
    me: mapSigner(me, ctx.config.jwtSecret, false),
    document: mapped
  }
}

function cleanIncomingValue(f, value) {
  if (value == null || value === '') return null
  if (f.type === 'checkbox') return value === true || value === 'true'
  if (f.type === 'signature' || f.type === 'initials') {
    const s = String(value)
    if (!/^data:image\/(png|jpeg|jpg);base64,[a-z0-9+/=\r\n]+$/i.test(s)) return null
    if (s.length > 600000) throw fail(413, 'too_large', 'That signature image is too large.')
    return s
  }
  return String(value).slice(0, 2000)
}

export async function saveSignFields(ctx, token, body, device) {
  const session = await signSession(ctx, token, device, { markView: true })
  if (session.me?.done) return session
  if (session.status !== 'sent' && session.status !== 'waiting') throw fail(409, 'status', 'This document is not open for signing.')
  const doc = session.document
  const mine = new Map(doc.fields.filter(f => f.signer === session.me.id).map(f => [f.id, f]))
  const next = doc.fields.map(f => {
    const incoming = (body.fields || []).find(x => x.id === f.id)
    if (!incoming || !mine.has(f.id)) return f
    return { ...f, value: cleanIncomingValue(f, incoming.value) }
  })
  if (body.name && String(body.name).trim() && String(body.name).trim() !== session.me.name) {
    const name = String(body.name).trim().slice(0, 120)
    await ctx.db.query(`update signers set full_name=$2 where id=$1`, [session.me.id, name])
    await audit(ctx.db.query.bind(ctx.db), doc.id, { type: `Signer confirmed name as “${name}”`, actor: name, signerId: session.me.id, ip: device.ip, ua: device.ua })
  }
  await ctx.db.query(`update documents set fields=$2::jsonb, updated_at=now() where id=$1`, [doc.id, JSON.stringify(next)])
  return signSession(ctx, token, device, { markView: false })
}

export async function commentAs(ctx, { docId, who, text, signerId, ip, ua }) {
  const t = String(text || '').trim().slice(0, 2000)
  if (!t) throw fail(400, 'comment', 'Write a comment first.')
  const row = await ctx.db.query(`select comments from documents where id=$1`, [docId])
  const comments = asJson(row.rows[0].comments, [])
  comments.push({ t, who, ts: new Date().toISOString() })
  await ctx.db.query(`update documents set comments=$2::jsonb where id=$1`, [docId, JSON.stringify(comments)])
  await audit(ctx.db.query.bind(ctx.db), docId, { type: `Comment by ${who}`, actor: who, signerId, ip, ua })
}

export async function finishSign(ctx, token, body, device) {
  const signer = await signerByToken(ctx, token)
  if (!signer) throw fail(404, 'not_found', 'This signing link is not valid.')
  if (body?.consent !== true) throw fail(400, 'consent', 'Accept the electronic signature consent before finishing.')
  await saveSignFields(ctx, token, body || {}, device)
  const doc = await partyDoc(ctx, signer)
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), doc.id)
  const me = signers.find(s => s.id === signer.id)
  if (me.signed_at) return { ok: true, already: true, status: doc.status }
  if (doc.idv) {
    const code = String(body.accessCode || '').trim()
    if (!code || hashSecret(code, ctx.config.jwtSecret) !== me.access_code_hash) {
      throw fail(400, 'access_code', 'Enter the access code from your email.')
    }
  }
  const fields = asJson((await ctx.db.query(`select fields from documents where id=$1`, [doc.id])).rows[0].fields, [])
  const approver = me.role === 'approver'
  if (!approver) {
    const mine = fields.filter(f => f.signer === me.id && visible(fields, f))
    for (const f of mine) {
      if (f.type === 'text' || f.type === 'name' || f.type === 'number') {
        if (f.value && !validate(f, f.value)) throw fail(400, 'field', `${f.label || 'A field'} doesn’t look valid.`)
      }
      const empty = f.value == null || f.value === '' || f.value === false
      if (f.required && empty) throw fail(400, 'field', `“${f.label || f.type}” is required.`)
    }
  }
  await ctx.db.query(
    `update signers set signed_at=now(), consent_at=now(), consent_text=$2, consent_version=$3, consent_ip=$4, consent_ua=$5, sign_ip=$4, sign_ua=$5 where id=$1`,
    [me.id, CONSENT_TEXT, CONSENT_VERSION, device.ip, device.ua]
  )
  await audit(ctx.db.query.bind(ctx.db), doc.id, {
    type: `${approver ? 'Approved' : 'Signed'} by ${me.full_name}`,
    actor: me.full_name,
    email: me.email,
    ip: device.ip,
    ua: device.ua,
    signerId: me.id,
    meta: { consentVersion: CONSENT_VERSION }
  })
  const after = await loadSigners(ctx.db.query.bind(ctx.db), doc.id)
  const remaining = after.filter(s => s.role !== 'cc' && !s.signed_at)
  if (remaining.length) {
    if (doc.ordered_sign) {
      const next = remaining[0]
      const tokenNext = unseal(next.token, ctx.config.jwtSecret)
      let access = null
      if (doc.idv && next.access_code_hash) {
        access = String(Math.floor(100000 + Math.random() * 900000))
        await ctx.db.query(`update signers set access_code_hash=$2 where id=$1`, [next.id, hashSecret(access, ctx.config.jwtSecret)])
      }
      const owner = (await ctx.db.query(`select * from profiles where id=$1`, [doc.owner_id])).rows[0]
      try { await emailSigner(ctx, owner, doc, next, tokenNext, access) } catch { /* link still works */ }
      await audit(ctx.db.query.bind(ctx.db), doc.id, { type: `Sent to ${next.full_name}`, actor: 'System', email: next.email })
    }
    return { ok: true, status: 'waiting', remaining: remaining.length }
  }
  await completeDocument(ctx, doc.id)
  return { ok: true, status: 'completed' }
}

export async function declineSign(ctx, token, reason, device) {
  const signer = await signerByToken(ctx, token)
  if (!signer) throw fail(404, 'not_found', 'This signing link is not valid.')
  const why = String(reason || '').trim().slice(0, 500)
  if (!why) throw fail(400, 'reason', 'Add a short reason for declining.')
  const doc = await partyDoc(ctx, signer)
  if (doc.status === 'completed') throw fail(409, 'status', 'This document is already complete.')
  await ctx.db.query(
    `update signers set declined_at=now(), decline_reason=$2 where id=$1`,
    [signer.id, why]
  )
  await ctx.db.query(`update documents set status='declined', updated_at=now() where id=$1`, [doc.id])
  await audit(ctx.db.query.bind(ctx.db), doc.id, {
    type: `Declined by ${signer.full_name}: ${why}`,
    actor: signer.full_name,
    email: signer.email,
    ip: device.ip,
    ua: device.ua,
    signerId: signer.id
  })
  const owner = (await ctx.db.query(`select * from profiles where id=$1`, [doc.owner_id])).rows[0]
  try {
    await ctx.email.send({
      to: owner.email,
      subject: `${signer.full_name} declined “${doc.name}”`,
      text: `${signer.full_name} declined ${doc.name}: ${why}`,
      html: htmlEmail({
        title: 'A recipient declined',
        intro: `${esc(signer.full_name)} declined <b>${esc(doc.name)}</b>.<br>${esc(why)}`,
        brand: brandOf(owner)
      })
    })
  } catch { /* audited already */ }
  return { ok: true, status: 'declined' }
}

export async function completeDocument(ctx, id) {
  const row = await ctx.db.query(`select * from documents where id=$1`, [id])
  const doc = row.rows[0]
  if (!doc) throw fail(404, 'not_found', 'Document not found.')
  if (doc.status === 'completed' && doc.final_path) return doc
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), id)
  const events = await loadEvents(ctx.db.query.bind(ctx.db), [id])
  const owner = (await ctx.db.query(`select * from profiles where id=$1`, [doc.owner_id])).rows[0]
  const original = await ctx.storage.get(doc.original_path)
  const completedAt = new Date().toISOString()
  const mappedSigners = signers.map(s => mapSigner(s, ctx.config.jwtSecret, false))
  const sealed = await sealPdf({
    original,
    verifyUrl: `${ctx.config.appUrl}/verify/${id}`,
    doc: {
      id,
      name: doc.name,
      ordered: doc.ordered_sign,
      hashOrig: doc.original_sha256 || sha256(original),
      completed: completedAt,
      consentVersion: CONSENT_VERSION,
      fields: asJson(doc.fields, []),
      signers: mappedSigners,
      events: events.map(e => ({ t: e.event_type, ts: iso(e.created_at), who: e.actor, ip: e.ip || '' }))
    }
  })
  const finalKey = `${doc.owner_id}/${id}/final.pdf`
  await ctx.storage.put(finalKey, sealed.bytes)
  const updated = await ctx.db.query(
    `update documents set status='completed', completed_at=$2, final_path=$3, content_sha256=$4, final_sha256=$5,
      original_sha256=coalesce(original_sha256,$6), updated_at=now()
     where id=$1 and status <> 'completed'
     returning id`,
    [id, completedAt, finalKey, sealed.contentHash, sealed.finalHash, sha256(original)]
  )
  if (!updated.rows[0]) return (await ctx.db.query(`select * from documents where id=$1`, [id])).rows[0]
  await audit(ctx.db.query.bind(ctx.db), id, { type: 'Document completed', actor: 'System', meta: { finalSha256: sealed.finalHash, contentSha256: sealed.contentHash } })
  const recipients = new Map()
  recipients.set(owner.email, owner.full_name)
  for (const s of signers) if (s.email) recipients.set(s.email, s.full_name)
  const filename = `${String(doc.name).replace(/[^\w\-]+/g, '_').slice(0, 80) || 'document'}_signed.pdf`
  for (const [email, name] of recipients) {
    try {
      await ctx.email.send({
        to: email,
        subject: `Completed: ${doc.name}`,
        text: `${doc.name} is signed. The sealed PDF is attached. Verify it at ${ctx.config.appUrl}/verify/${id}`,
        html: htmlEmail({
          title: 'Everyone has signed',
          intro: `Hi ${esc(name || '')}, <b>${esc(doc.name)}</b> is complete. The sealed PDF is attached. You can confirm the file fingerprint at the link below.`,
          button: 'Verify fingerprint',
          href: `${ctx.config.appUrl}/verify/${id}`,
          brand: brandOf(owner)
        }),
        attachments: [{ filename, content: Buffer.from(sealed.bytes).toString('base64') }]
      })
    } catch (err) {
      await audit(ctx.db.query.bind(ctx.db), id, { type: 'Completion email failed', actor: 'System', email, meta: { error: String(err.message || err).slice(0, 180) } })
    }
  }
  return (await ctx.db.query(`select * from documents where id=$1`, [id])).rows[0]
}

export async function ownerFile(ctx, user, id, final) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, id)
  if (final) {
    if (doc.status !== 'completed') throw fail(409, 'status', 'The sealed PDF is ready after everyone signs.')
    return { bytes: await ctx.storage.get(doc.final_path), name: doc.name }
  }
  return { bytes: await ctx.storage.get(doc.original_path), name: doc.name }
}

export async function signerFile(ctx, token, final) {
  const signer = await signerByToken(ctx, token)
  if (!signer) throw fail(404, 'not_found', 'This signing link is not valid.')
  const doc = await partyDoc(ctx, signer)
  if (final) {
    if (!doc.final_path) throw fail(409, 'status', 'The sealed PDF is not ready yet.')
    return { bytes: await ctx.storage.get(doc.final_path), name: doc.name }
  }
  return { bytes: await ctx.storage.get(doc.original_path), name: doc.name }
}

export async function createLink(ctx, user, templateId) {
  const doc = await ownDoc(ctx.db.query.bind(ctx.db), user.id, templateId)
  if (!doc.is_template) throw fail(400, 'template', 'Turn the document into a template first.')
  const row = await ctx.db.query(
    `insert into signing_links (owner_id, template_id, name) values ($1,$2,$3) returning *`,
    [user.id, templateId, doc.name + ' (public link)']
  )
  return { id: row.rows[0].id, name: row.rows[0].name, tpl: templateId, active: true, responses: 0 }
}

export async function setLinkActive(ctx, user, id, active) {
  const row = await ctx.db.query(`update signing_links set active=$3 where id=$1 and owner_id=$2 returning id`, [id, user.id, !!active])
  if (!row.rows[0]) throw fail(404, 'not_found', 'Link not found.')
  return { ok: true }
}

async function cloneFromTemplate(ctx, template, { name, email }) {
  const owner = (await ctx.db.query(`select * from profiles where id=$1`, [template.owner_id])).rows[0]
  const signers = await loadSigners(ctx.db.query.bind(ctx.db), template.id)
  const signing = signers.filter(s => s.role !== 'cc')
  if (signing.length !== 1) throw fail(400, 'template', 'Public links and bulk send need a template with one signer.')
  const bytes = await ctx.storage.get(template.original_path)
  const created = await storeNewDoc(ctx, owner, {
    name: `${template.name} — ${name}`.slice(0, 160),
    template: false,
    signers: [{ id: crypto.randomUUID(), name, email, role: signing[0].role, color: signing[0].color }],
    bytes,
    folder: template.folder
  })
  const fields = asJson(template.fields, []).filter(f => f.signer === signing[0].id).map(f => ({
    ...f,
    id: crypto.randomUUID(),
    signer: created.signers[0].id,
    value: null
  }))
  await ctx.db.query(
    `update documents set fields=$2::jsonb, ordered_sign=$3, expires_days=$4, remind_days=$5, message=$6, idv=$7 where id=$1`,
    [created.id, JSON.stringify(fields), template.ordered_sign, template.expires_days, template.remind_days, template.message, template.idv]
  )
  return { owner, id: created.id }
}

export async function publicStart(ctx, linkId, { name, email }, device) {
  const link = await ctx.db.query(`select * from signing_links where id=$1`, [linkId])
  if (!link.rows[0] || !link.rows[0].active) throw fail(404, 'not_found', 'This link is inactive.')
  const template = await ctx.db.query(`select * from documents where id=$1`, [link.rows[0].template_id])
  if (!template.rows[0]) throw fail(404, 'not_found', 'This link is inactive.')
  const person = String(name || '').trim().slice(0, 120)
  const addr = String(email || '').trim().toLowerCase()
  if (!person) throw fail(400, 'name', 'Enter your name.')
  if (!emailOk(addr)) throw fail(400, 'email', 'Enter your email.')
  const cloned = await cloneFromTemplate(ctx, template.rows[0], { name: person, email: addr })
  const owner = cloned.owner
  const sent = await sendDocument(ctx, owner, cloned.id, { ...device, localId: '', cookieId: '', allowMissingDevice: true })
  if (!sent.ok) {
    await ctx.db.query(`delete from documents where id=$1`, [cloned.id])
    throw fail(sent.status || 402, sent.error || 'payment_required', 'The sender has no documents left to send. Ask them to add a document credit.')
  }
  await ctx.db.query(`update signing_links set responses=responses+1 where id=$1`, [linkId])
  await audit(ctx.db.query.bind(ctx.db), cloned.id, { type: `Started from public link “${link.rows[0].name}”`, actor: person })
  const mine = (sent.links || []).find(l => l.email === addr) || sent.links?.[0]
  return { ok: true, url: mine?.url, token: mine?.url?.split('/sign/')[1] }
}

export async function bulkSend(ctx, user, { templateId, recipients }, device) {
  const template = await ownDoc(ctx.db.query.bind(ctx.db), user.id, templateId)
  if (!template.is_template) throw fail(400, 'template', 'Choose a template.')
  const people = (recipients || []).map(r => ({
    name: String(r.name || '').trim().slice(0, 120),
    email: String(r.email || '').trim().toLowerCase()
  })).filter(r => r.name)
  if (!people.length) throw fail(400, 'recipients', 'Add at least one recipient.')
  if (people.length > 100) throw fail(400, 'recipients', 'Send at most 100 at a time.')
  if (people.some(p => !emailOk(p.email))) throw fail(400, 'email', 'Each recipient needs a valid email.')
  const usage = await usageFor(ctx, user, device)
  const capacity = usage.credits + (usage.promoCredits || 0) + (usage.freeAvailable ? 1 : 0)
  if (capacity < people.length) {
    return {
      ok: false,
      status: 402,
      error: 'payment_required',
      message: `You can send ${capacity} more document${capacity === 1 ? '' : 's'} right now, and this list has ${people.length}. Buy a pack or remove recipients.`,
      need: people.length - capacity
    }
  }
  const links = []
  for (const person of people) {
    const cloned = await cloneFromTemplate(ctx, template, person)
    const sent = await sendDocument(ctx, user, cloned.id, device)
    if (!sent.ok) return { ...sent, sent: links.length, links }
    links.push({ name: person.name, email: person.email, url: sent.links?.[0]?.url })
  }
  return { ok: true, sent: links.length, links }
}

export async function grantCheckout(ctx, session) {
  const meta = session.metadata || {}
  const userId = meta.userId
  const kind = meta.kind
  if (!userId || !PACKS[kind]) return { ok: false, message: 'This checkout session is not one of ours.' }
  if (!session.paid) return { ok: false, status: 402, error: 'unpaid', message: 'Payment is not complete yet.' }
  const applied = await ctx.db.tx(async q => {
    const ins = await q(
      `insert into payments (user_id, stripe_session_id, kind, amount_cents, card_fingerprint, document_id)
       values ($1,$2,$3,$4,$5,$6)
       on conflict (stripe_session_id) do nothing
       returning id`,
      [userId, session.id, kind, session.amount_cents || PACKS[kind].cents, session.card_fingerprint || null, meta.documentId || null]
    )
    if (!ins.rows[0]) return { ok: true, already: true, userId, kind, documentId: meta.documentId || null }
    await noteCardFingerprint(q, { fingerprint: session.card_fingerprint, userId })
    if (session.customer && typeof session.customer === 'string') {
      await q(`update profiles set stripe_customer_id=coalesce(stripe_customer_id,$2) where id=$1`, [userId, session.customer])
    }
    await q(`update entitlements set credits = credits + $2 where user_id=$1`, [userId, PACKS[kind].credits])
    return { ok: true, userId, kind, documentId: meta.documentId || null, fresh: true, credits: PACKS[kind].credits }
  })
  if (applied.fresh && applied.documentId) {
    const user = (await ctx.db.query(`select * from profiles where id=$1`, [applied.userId])).rows[0]
    if (user) await sendDocument(ctx, user, applied.documentId, { localId: '', cookieId: '', ip: '', ua: 'stripe-webhook' })
  }
  return applied
}

export async function runMaintenance(ctx) {
  const expired = await ctx.db.query(
    `select id from documents where status in ('sent','waiting') and sent_at is not null
     and sent_at + make_interval(days => expires_days) < now()`
  )
  for (const row of expired.rows) {
    await ctx.db.query(`update documents set status='expired', updated_at=now() where id=$1 and status in ('sent','waiting')`, [row.id])
    await audit(ctx.db.query.bind(ctx.db), row.id, { type: 'Expired', actor: 'System' })
  }
  // Automatic signer reminders: cadence 2/3/7 days, at most 5, never within 24h of any reminder.
  const due = await ctx.db.query(
    `select d.id, d.owner_id from documents d join profiles p on p.id = d.owner_id
     where d.status in ('sent','waiting') and d.remind_days > 0 and d.sent_at is not null and not d.is_template
       and p.blocked_at is null
       and d.auto_reminders < $1
       and d.sent_at + make_interval(days => d.remind_days) < now() + interval '1 hour'
       and (d.last_reminded_at is null or d.last_reminded_at + make_interval(days => d.remind_days) < now() + interval '1 hour')
       and (d.last_reminded_at is null or d.last_reminded_at < now() - interval '24 hours')
     order by d.sent_at limit 200`, [MAX_AUTO_REMINDERS]
  )
  let reminded = 0, signers = 0
  for (const row of due.rows) {
    const user = (await ctx.db.query(`select * from profiles where id=$1`, [row.owner_id])).rows[0]
    if (!user) continue
    try {
      const r = await remind(ctx, user, row.id, { auto: true })
      reminded++; signers += r.reminded
    } catch (err) { await ctx.logError?.('cron.reminder', err.message) }
  }
  const nudged = await senderNudges(ctx)
  return { expired: expired.rows.length, reminded, signers, nudged }
}

function ago(date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 864e5)
  if (days <= 0) return 'today'
  return days === 1 ? '1 day ago' : `${days} days ago`
}

export function resendLinkToken(ctx, userId, docId) {
  return signJwt({ uid: userId, doc: docId, purpose: 'resend' }, ctx.config.jwtSecret, 7 * 864e5)
}

// Sender follow-up digest: lists the sender's documents still waiting, each with a one-click resend link.
async function senderNudges(ctx) {
  const senders = (await ctx.db.query(
    `select * from profiles where sender_nudge_days > 0 and blocked_at is null and email_verified_at is not null
       and (last_nudged_at is null or last_nudged_at + make_interval(days => sender_nudge_days) < now() + interval '1 hour')
     limit 200`
  )).rows
  let sent = 0
  for (const user of senders) {
    const docs = (await ctx.db.query(
      `select * from documents where owner_id=$1 and status in ('sent','waiting') and not is_template
         and sent_at < now() - make_interval(days => $2) order by sent_at limit 25`, [user.id, num(user.sender_nudge_days)]
    )).rows
    if (!docs.length) continue
    const items = []
    for (const doc of docs) {
      const signersRows = await loadSigners(ctx.db.query.bind(ctx.db), doc.id)
      const waiting = signersRows.filter(s => s.role !== 'cc' && !s.signed_at && !s.declined_at).map(s => s.full_name || s.email)
      if (!waiting.length) continue
      const link = `${ctx.config.appUrl}/r/${resendLinkToken(ctx, user.id, doc.id)}`
      items.push({ doc, waiting, link })
    }
    if (!items.length) continue
    const rows = items.map(i => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0"><b>${esc(i.doc.name)}</b><br><span style="color:#64748b;font-size:13px">Still waiting on ${esc(i.waiting.join(', '))} · sent ${ago(i.doc.sent_at)}</span></td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right"><a href="${i.link}" style="color:#0E6B62;font-weight:700">Resend</a></td></tr>`).join('')
    try {
      await ctx.email.send({
        to: user.email,
        subject: items.length === 1 ? `Your “${items[0].doc.name}” is still waiting on ${items[0].waiting[0]}` : `${items.length} documents are still waiting for signatures`,
        text: items.map(i => `${i.doc.name}: still waiting on ${i.waiting.join(', ')}, sent ${ago(i.doc.sent_at)}. Resend: ${i.link}`).join('\n'),
        html: htmlEmail({
          title: 'Documents waiting for signatures',
          intro: `Hi ${esc(user.full_name || '')}, here’s what’s still open. One click resends the signing link to anyone who hasn’t signed.<table style="width:100%;border-collapse:collapse;margin-top:12px">${rows}</table>`,
          button: 'Open dashboard',
          href: `${ctx.config.appUrl}/#/app`,
          note: 'Change or turn off these follow-ups in Settings.',
          brand: { company: 'Easy Digital Signatures', color: '#0f766e' }
        })
      })
      sent++
    } catch (err) { await ctx.logError?.('email.nudge', String(err?.message || err)) }
    await ctx.db.query(`update profiles set last_nudged_at=now() where id=$1`, [user.id])
  }
  return sent
}

export async function resendFromLink(ctx, token) {
  const p = readJwt(String(token || ''), ctx.config.jwtSecret)
  if (!p || p.purpose !== 'resend') return { ok: false, message: 'This resend link has expired. Open your dashboard to resend.' }
  const user = (await ctx.db.query(`select * from profiles where id=$1`, [p.uid])).rows[0]
  if (!user || user.blocked_at) return { ok: false, message: 'This resend link is no longer valid.' }
  try {
    const r = await remind(ctx, user, p.doc)
    return { ok: true, message: r.reminded ? `Sent the signing link again to ${r.reminded} signer${r.reminded === 1 ? '' : 's'}.` : 'Nobody is waiting to sign this document.' }
  } catch (err) {
    return { ok: false, message: err.publicMessage || 'Could not resend this document.' }
  }
}

export async function verificationRecord(ctx, id) {
  const row = await ctx.db.query(
    `select id, name, status, original_sha256, content_sha256, final_sha256, completed_at from documents where id=$1`,
    [id]
  )
  const doc = row.rows[0]
  if (!doc || doc.status !== 'completed') return null
  return {
    id: doc.id,
    name: doc.name,
    status: doc.status,
    completed: iso(doc.completed_at),
    originalSha256: doc.original_sha256,
    contentSha256: doc.content_sha256,
    finalSha256: doc.final_sha256
  }
}
