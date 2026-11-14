import crypto from 'node:crypto'
import { fail, instantiateTemplate, saveDraft, sendDocument } from './service.js'
import { hashSecret, randomToken } from './crypto.js'

const KEY_PREFIX = 'eds_live_'
const EVENTS = ['document.signed', 'document.declined', 'document.expired']

function validHookUrl(url, ctx) {
  if (/^https:\/\//i.test(url)) return true
  if (!ctx.config.prod && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(url)) return true
  return false
}

function hashKey(raw, secret) {
  return hashSecret(raw, secret)
}

export async function userFromApiKey(ctx, token) {
  if (!token || !String(token).startsWith(KEY_PREFIX)) return null
  const hash = hashKey(token, ctx.config.jwtSecret)
  const row = (await ctx.db.query(
    `select k.id as key_id, k.revoked_at, p.* from api_keys k join profiles p on p.id = k.user_id where k.key_hash=$1`,
    [hash]
  )).rows[0]
  if (!row || row.revoked_at) return null
  await ctx.db.query(`update api_keys set last_used_at=now() where id=$1`, [row.key_id]).catch(() => {})
  return row
}

export async function listKeys(ctx, user) {
  const rows = (await ctx.db.query(
    `select id, name, prefix, last_used_at, created_at, revoked_at from api_keys where user_id=$1 and revoked_at is null order by created_at desc`,
    [user.id]
  )).rows
  return { keys: rows.map(r => ({ id: r.id, name: r.name, prefix: r.prefix, lastUsed: r.last_used_at, created: r.created_at })) }
}

export async function createKey(ctx, user, name) {
  const label = String(name || 'API key').trim().slice(0, 80) || 'API key'
  const raw = KEY_PREFIX + randomToken(24)
  const prefix = raw.slice(0, 16) + '…'
  const row = (await ctx.db.query(
    `insert into api_keys (user_id, name, prefix, key_hash) values ($1,$2,$3,$4) returning id, name, prefix, created_at`,
    [user.id, label, prefix, hashKey(raw, ctx.config.jwtSecret)]
  )).rows[0]
  return { id: row.id, name: row.name, prefix: row.prefix, created: row.created_at, key: raw }
}

export async function revokeKey(ctx, user, id) {
  const row = (await ctx.db.query(
    `update api_keys set revoked_at=now() where id=$1 and user_id=$2 and revoked_at is null returning id`,
    [id, user.id]
  )).rows[0]
  if (!row) throw fail(404, 'not_found', 'API key not found.')
  return { ok: true }
}

export async function listWebhooks(ctx, user) {
  const rows = (await ctx.db.query(
    `select id, url, events, active, last_status, last_error, last_sent_at, created_at from webhooks where user_id=$1 order by created_at desc`,
    [user.id]
  )).rows
  return {
    webhooks: rows.map(r => ({
      id: r.id,
      url: r.url,
      events: r.events,
      active: r.active,
      lastStatus: r.last_status,
      lastError: r.last_error,
      lastSent: r.last_sent_at,
      created: r.created_at
    })),
    eventTypes: EVENTS
  }
}

function parseEvents(events) {
  const list = (Array.isArray(events) ? events : EVENTS).map(e => String(e).trim()).filter(e => EVENTS.includes(e))
  return list.length ? list : EVENTS
}

export async function createWebhook(ctx, user, body) {
  const url = String(body.url || '').trim()
  if (url.length > 500) throw fail(400, 'url', 'That URL is too long.')
  if (!validHookUrl(url, ctx)) throw fail(400, 'url', 'Webhook URLs must start with https://')
  const events = parseEvents(body.events)
  const secret = 'whsec_' + randomToken(24)
  const row = (await ctx.db.query(
    `insert into webhooks (user_id, url, secret, events, active) values ($1,$2,$3,$4,true) returning *`,
    [user.id, url, secret, events]
  )).rows[0]
  return { id: row.id, url: row.url, events: row.events, active: true, secret, created: row.created_at }
}

export async function updateWebhook(ctx, user, id, body) {
  const current = (await ctx.db.query(`select * from webhooks where id=$1 and user_id=$2`, [id, user.id])).rows[0]
  if (!current) throw fail(404, 'not_found', 'Webhook not found.')
  const url = body.url != null ? String(body.url).trim() : current.url
  if (!validHookUrl(url, ctx)) throw fail(400, 'url', 'Webhook URLs must start with https://')
  const events = body.events ? parseEvents(body.events) : current.events
  const active = body.active == null ? current.active : !!body.active
  const row = (await ctx.db.query(
    `update webhooks set url=$3, events=$4, active=$5 where id=$1 and user_id=$2 returning id, url, events, active`,
    [id, user.id, url, events, active]
  )).rows[0]
  return row
}

export async function deleteWebhook(ctx, user, id) {
  const row = (await ctx.db.query(`delete from webhooks where id=$1 and user_id=$2 returning id`, [id, user.id])).rows[0]
  if (!row) throw fail(404, 'not_found', 'Webhook not found.')
  return { ok: true }
}

export async function sendFromTemplate(ctx, user, body, device) {
  if (!user.email_verified_at) throw fail(403, 'email_unverified', 'Confirm your email before sending documents.')
  const templateId = body.templateId
  if (!templateId) throw fail(400, 'template', 'templateId is required.')
  const created = await instantiateTemplate(ctx, user, templateId)
  const people = Array.isArray(body.signers) ? body.signers : []
  const signers = created.signers.map((s, i) => {
    const match = people.find(p => String(p.role || '').trim().toLowerCase() === String(s.name || '').trim().toLowerCase())
      || people[i]
    return {
      ...s,
      name: String(match?.name || s.name || '').trim().slice(0, 120),
      email: String(match?.email || s.email || '').trim().toLowerCase(),
      role: s.role
    }
  })
  const saved = await saveDraft(ctx, user, created.id, {
    name: String(body.name || created.name).slice(0, 160),
    ordered: created.ordered,
    expiresDays: body.expiresDays || created.expiresDays,
    remindDays: created.remindDays,
    message: body.message != null ? String(body.message).slice(0, 2000) : created.message,
    idv: created.idv,
    folder: created.folder,
    signers,
    fields: created.fields
  })
  const sent = await sendDocument(ctx, user, created.id, device)
  if (!sent.ok) throw Object.assign(fail(sent.status || 402, sent.error || 'send', sent.message || 'Could not send.'), { body: sent })
  return {
    ok: true,
    id: created.id,
    name: saved.name || created.name,
    status: 'sent',
    billingSource: sent.billingSource,
    links: sent.links
  }
}

export const WEBHOOK_EVENTS = EVENTS
