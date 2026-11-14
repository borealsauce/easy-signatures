import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx
let base
let n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-tpl-'))
  ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    TRUST_PROXY: '1',
    JWT_SECRET: 'test-secret',
    DATA_DIR: dir,
    DEV_MAILBOX: '1',
    IP_FREE_LIMIT: '10',
    SIGNUP_PER_HOUR: '20',
    SIGNUP_PER_DAY: '50'
  })
  await new Promise(resolve => { ctx.server = ctx.app.listen(0, '127.0.0.1', resolve) })
  base = `http://127.0.0.1:${ctx.server.address().port}`
}

async function shutdown() {
  if (!ctx) return
  await new Promise(resolve => ctx.server.close(resolve))
  await ctx.close()
}

function headers({ ip = '203.0.113.80', device = 'device-tpl-aaaa', token } = {}) {
  return {
    'content-type': 'application/json',
    'x-forwarded-for': ip,
    'x-device-local': device,
    cookie: `eds_did=cookie-${device}`,
    'user-agent': 'EDSTest/1.0',
    ...(token ? { authorization: `Bearer ${token}` } : {})
  }
}

async function api(path, { method = 'GET', body, ...opt } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: headers(opt),
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  return { status: res.status, json, text }
}

async function cron() {
  const res = await fetch(base + '/api/cron/reminders', {
    method: 'POST',
    headers: { authorization: 'Bearer dev-cron' }
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  return { status: res.status, json, text }
}

function mailTo(email, pred = () => true) {
  return [...ctx.mailbox].reverse().find(m => m.to === email && pred(m))
}

function mailAll(email, pred = () => true) {
  return ctx.mailbox.filter(m => m.to === email && pred(m))
}

async function verifiedUser({ email, password = 'correct-horse', name = 'Pat Owner', ip, device, phone } = {}) {
  n += 1
  email ||= `owner${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 1}`
  device ||= `device-tpl-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555100${String(1000 + n)}`
  const signup = await api('/api/auth/signup', { method: 'POST', body: { name, email, password }, ip, device })
  assert.equal(signup.status, 201, signup.text)
  const confirm = mailTo(email, m => String(m.subject || '').includes('Confirm'))
  assert.ok(confirm?.url, 'verification email')
  const token = new URL(confirm.url).searchParams.get('token')
  const verified = await fetch(base + '/auth/verify?token=' + token)
  assert.ok(verified.url.includes('verified=1') || verified.status === 200)
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password }, ip, device })
  assert.equal(login.status, 200, login.text)
  const auth = login.json.token
  const start = await api('/api/phone/start', { method: 'POST', body: { phone }, ip, device, token: auth })
  assert.equal(start.status, 200, start.text)
  const sms = mailTo(phone, m => m.type === 'sms')
  const check = await api('/api/phone/check', { method: 'POST', body: { phone, code: sms.code }, ip, device, token: auth })
  assert.equal(check.status, 200, check.text)
  return { email, auth, ip, device, phone, name }
}

async function saveDoc(user, { name, signers, fields, ordered = true, expiresDays = 30, template = false }) {
  const created = await api('/api/documents/blank', {
    method: 'POST',
    body: { name, pages: 1, template, roles: signers.map(s => s.name) },
    ...user,
    token: user.auth
  })
  assert.equal(created.status, 201, created.text)
  const mappedSigners = created.json.signers.map((s, i) => ({
    ...s,
    name: signers[i].name,
    email: signers[i].email || '',
    role: signers[i].role || 'signer'
  }))
  const mappedFields = fields.map(f => ({
    type: f.type || 'signature',
    signer: mappedSigners[f.signerIndex].id,
    page: 0,
    x: f.x || 0.1,
    y: f.y || 0.7,
    w: 0.3,
    h: 0.08,
    required: true,
    label: f.label || 'Signature'
  }))
  const saved = await api('/api/documents/' + created.json.id, {
    method: 'PUT',
    token: user.auth,
    ip: user.ip,
    device: user.device,
    body: {
      name,
      ordered,
      expiresDays,
      remindDays: 0,
      message: 'Please sign',
      idv: false,
      folder: 'Sales',
      signers: mappedSigners,
      fields: mappedFields
    }
  })
  assert.equal(saved.status, 200, saved.text)
  return saved.json
}

test('templates: save, reuse in one click, and keep fields by role', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'templates@example.com' })
  const tpl = await saveDoc(owner, {
    name: 'NDA template',
    template: true,
    signers: [{ name: 'Client' }, { name: 'Counsel' }],
    fields: [
      { signerIndex: 0, label: 'Client signature' },
      { signerIndex: 1, label: 'Counsel signature', x: 0.5 }
    ]
  })
  assert.equal(tpl.tpl, true)
  const used = await api('/api/documents/from-template', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device, body: { templateId: tpl.id }
  })
  assert.equal(used.status, 201, used.text)
  assert.equal(used.json.tpl, false)
  assert.equal(used.json.signers.length, 2)
  assert.equal(used.json.signers[0].name, 'Client')
  assert.equal(used.json.signers[0].email, '')
  assert.equal(used.json.fields.length, 2)
  assert.equal(used.json.fields[0].signer, used.json.signers[0].id)
  assert.equal(used.json.fields[1].signer, used.json.signers[1].id)
  assert.notEqual(used.json.id, tpl.id)
  const filled = await api('/api/documents/' + used.json.id, {
    method: 'PUT',
    token: owner.auth,
    ip: owner.ip,
    device: owner.device,
    body: {
      name: 'Acme NDA',
      ordered: true,
      expiresDays: 14,
      remindDays: 0,
      message: 'Please sign',
      idv: false,
      folder: 'Legal',
      signers: used.json.signers.map((s, i) => ({
        ...s,
        name: i === 0 ? 'Alex Client' : 'Blair Counsel',
        email: i === 0 ? 'alex@client.test' : 'blair@counsel.test'
      })),
      fields: used.json.fields
    }
  })
  assert.equal(filled.status, 200, filled.text)
  const sent = await api('/api/documents/' + used.json.id + '/send', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device
  })
  assert.equal(sent.status, 200, sent.text)
  assert.ok(mailTo('alex@client.test', m => String(m.subject || '').includes('Acme NDA')))
})

test('signing order: only the current signer is emailed and later signers wait their turn', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'order@example.com' })
  const doc = await saveDoc(owner, {
    name: 'Two party agreement',
    ordered: true,
    signers: [
      { name: 'First Signer', email: 'first@sign.test' },
      { name: 'Second Signer', email: 'second@sign.test' }
    ],
    fields: [
      { signerIndex: 0, label: 'First signature' },
      { signerIndex: 1, label: 'Second signature', x: 0.5 }
    ]
  })
  const sent = await api('/api/documents/' + doc.id + '/send', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device
  })
  assert.equal(sent.status, 200, sent.text)
  assert.equal(sent.json.document.ordered, true)
  assert.equal(mailAll('first@sign.test', m => String(m.subject || '').includes('Two party')).length, 1)
  assert.equal(mailAll('second@sign.test', m => String(m.subject || '').includes('Two party') && !String(m.subject || '').startsWith('Completed')).length, 0)
  const firstUrl = sent.json.links.find(l => l.email === 'first@sign.test').url
  const secondUrl = sent.json.links.find(l => l.email === 'second@sign.test').url
  const firstToken = firstUrl.split('/sign/')[1]
  const secondToken = secondUrl.split('/sign/')[1]
  const early = await api('/api/sign/' + secondToken, { ip: '198.51.100.40', device: 'second-dev-aaaa' })
  assert.equal(early.json.status, 'waiting_turn')
  const session = await api('/api/sign/' + firstToken, { ip: '198.51.100.41', device: 'first-dev-aaaa' })
  assert.equal(session.status, 200, session.text)
  const finished = await api('/api/sign/' + firstToken + '/finish', {
    method: 'POST',
    ip: '198.51.100.41',
    device: 'first-dev-aaaa',
    body: { consent: true, fields: [{ id: session.json.document.fields.find(f => f.signer === session.json.me.id).id, value: PNG }] }
  })
  assert.equal(finished.status, 200, finished.text)
  assert.equal(finished.json.status, 'waiting')
  assert.ok(mailTo('second@sign.test', m => String(m.subject || '').includes('Two party')))
  const next = await api('/api/sign/' + secondToken, { ip: '198.51.100.40', device: 'second-dev-aaaa' })
  assert.ok(next.json.me)
  assert.equal(next.json.me.name, 'Second Signer')
})

test('expiration: warning email before expiry, then the link closes', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'expiry@example.com' })
  const doc = await saveDoc(owner, {
    name: 'Time boxed letter',
    expiresDays: 30,
    signers: [{ name: 'Jordan Hale', email: 'jordan@sign.test' }],
    fields: [{ signerIndex: 0, label: 'Signature' }]
  })
  const sent = await api('/api/documents/' + doc.id + '/send', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device
  })
  assert.equal(sent.status, 200, sent.text)
  const signToken = sent.json.links[0].url.split('/sign/')[1]
  assert.ok(sent.json.document.expiresAt)

  // Too early for a warning (just sent).
  const none = await cron()
  assert.equal(none.status, 200, none.text)
  assert.equal(none.json.warned, 0)
  assert.equal(mailAll('jordan@sign.test', m => String(m.subject || '').includes('expires')).length, 0)

  // 2 days before a 30-day expiry.
  await ctx.db.query(`update documents set sent_at = now() - interval '28 days 6 hours' where id=$1`, [doc.id])
  const warned = await cron()
  assert.equal(warned.status, 200, warned.text)
  assert.equal(warned.json.warned, 1, JSON.stringify(warned.json))
  assert.ok(mailTo('jordan@sign.test', m => String(m.subject || '').toLowerCase().includes('expires')))
  assert.ok(mailTo(owner.email, m => String(m.subject || '').includes('Time boxed letter') && String(m.subject || '').includes('expires')))
  const again = await cron()
  assert.equal(again.json.warned, 0, 'warning is sent only once')

  await ctx.db.query(`update documents set sent_at = now() - interval '31 days' where id=$1`, [doc.id])
  const closed = await cron()
  assert.equal(closed.status, 200, closed.text)
  assert.equal(closed.json.expired, 1, JSON.stringify(closed.json))
  const session = await api('/api/sign/' + signToken, { ip: '198.51.100.50', device: 'late-dev-aaaa' })
  assert.equal(session.json.status, 'expired')
  assert.ok(mailTo(owner.email, m => String(m.subject || '').includes('expired')))
  assert.ok(mailTo('jordan@sign.test', m => String(m.subject || '').includes('has expired')))
})
