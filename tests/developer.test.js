import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import crypto from 'node:crypto'
import { createApp } from '../server/app.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-dev-'))
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
  ctx = null
}
function headers({ ip = '203.0.113.85', device = 'device-dev-aaaa', token } = {}) {
  return {
    'content-type': 'application/json',
    'x-forwarded-for': ip,
    'x-device-local': device,
    cookie: `eds_did=cookie-${device}`,
    'user-agent': 'EDSTest/1.0',
    ...(token ? { authorization: `Bearer ${token}` } : {})
  }
}
async function api(path, { method = 'GET', body, token, ip, device } = {}) {
  const res = await fetch(base + path, { method, headers: headers({ token, ip, device }), body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  return { status: res.status, json, text }
}
function mailTo(email, pred = () => true) {
  return [...ctx.mailbox].reverse().find(m => m.to === email && pred(m))
}
async function verifiedUser({ email, password = 'correct-horse', name = 'Pat Owner', ip, device, phone } = {}) {
  n += 1
  email ||= `dev${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 60}`
  device ||= `device-dev-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555600${String(1000 + n)}`
  const signup = await api('/api/auth/signup', { method: 'POST', body: { name, email, password }, ip, device })
  assert.equal(signup.status, 201, signup.text)
  const token = new URL(mailTo(email, m => String(m.subject || '').includes('Confirm')).url).searchParams.get('token')
  await fetch(base + '/auth/verify?token=' + token)
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password }, ip, device })
  const auth = login.json.token
  const start = await api('/api/phone/start', { method: 'POST', body: { phone }, ip, device, token: auth })
  assert.equal(start.status, 200, start.text)
  const sms = mailTo(phone, m => m.type === 'sms')
  assert.equal((await api('/api/phone/check', { method: 'POST', body: { phone, code: sms.code }, ip, device, token: auth })).status, 200)
  return { email, auth, ip, device, phone, name, id: login.json.userId }
}

async function listenHooks() {
  const received = []
  const server = createServer((req, res) => {
    let raw = ''
    req.on('data', c => { raw += c })
    req.on('end', () => {
      received.push({ path: req.url, headers: req.headers, body: raw, json: (() => { try { return JSON.parse(raw) } catch { return null } })() })
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/hook`
  return { received, url, close: () => new Promise(resolve => server.close(resolve)) }
}

async function oneRoleTemplate(user, name = 'API NDA') {
  const created = await api('/api/documents/blank', { method: 'POST', body: { name, pages: 1, template: true, roles: ['Client'] }, ...user, token: user.auth })
  const s = created.json.signers[0]
  const saved = await api('/api/documents/' + created.json.id, {
    method: 'PUT', token: user.auth, ip: user.ip, device: user.device,
    body: {
      name, ordered: true, expiresDays: 14, remindDays: 0, message: 'Please sign', idv: false, folder: 'Legal',
      signers: [{ ...s, name: 'Client', email: '', role: 'signer' }],
      fields: [{ type: 'signature', signer: s.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
    }
  })
  assert.equal(saved.status, 200, saved.text)
  return saved.json
}

test('API key can send from a template; webhooks fire for signed and declined', { timeout: 60000 }, async t => {
  await boot()
  const hooks = await listenHooks()
  t.after(async () => { await hooks.close(); await shutdown() })
  const owner = await verifiedUser({ email: 'api-owner@example.com' })
  await ctx.db.query('update entitlements set credits=5 where user_id=$1', [owner.id])
  const tpl = await oneRoleTemplate(owner)
  const createdKey = await api('/api/developer/keys', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device, body: { name: 'Production' } })
  assert.equal(createdKey.status, 201, createdKey.text)
  assert.match(createdKey.json.key, /^eds_live_/)
  const key = createdKey.json.key
  const listed = await api('/api/developer/keys', { token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(listed.json.keys.length, 1)
  assert.ok(!JSON.stringify(listed.json).includes(key), 'secret is shown only once')

  const hook = await api('/api/developer/webhooks', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { url: hooks.url }
  })
  assert.equal(hook.status, 201, hook.text)
  assert.match(hook.json.secret, /^whsec_/)
  const secret = hook.json.secret

  const sent = await api('/api/v1/documents/send', {
    method: 'POST',
    token: key,
    body: { templateId: tpl.id, name: 'Acme NDA', signers: [{ role: 'Client', name: 'Alex Client', email: 'alex@client.test' }] }
  })
  assert.equal(sent.status, 201, sent.text)
  assert.equal(sent.json.status, 'sent')
  assert.ok(sent.json.links[0].url.includes('/sign/'))
  const signTok = sent.json.links[0].url.split('/sign/')[1]
  const session = await api('/api/sign/' + signTok, { ip: '198.51.100.80', device: 'api-s1-aaaa' })
  const field = session.json.document.fields.find(f => f.signer === session.json.me.id)
  const done = await api('/api/sign/' + signTok + '/finish', {
    method: 'POST', ip: '198.51.100.80', device: 'api-s1-aaaa',
    body: { consent: true, fields: [{ id: field.id, value: PNG }] }
  })
  assert.equal(done.json.status, 'completed')
  const signed = hooks.received.find(r => r.json?.event === 'document.signed')
  assert.ok(signed, 'signed webhook arrived: ' + JSON.stringify(hooks.received.map(r => r.json?.event)))
  assert.equal(signed.json.data.name, 'Acme NDA')
  const expected = crypto.createHmac('sha256', secret).update(signed.body).digest('hex')
  assert.equal(signed.headers['x-eds-signature'], 'sha256=' + expected)
  assert.equal(signed.headers['x-eds-event'], 'document.signed')

  const sent2 = await api('/api/v1/documents/send', {
    method: 'POST',
    token: key,
    body: { templateId: tpl.id, signers: [{ role: 'Client', name: 'Blair', email: 'blair@client.test' }] }
  })
  assert.equal(sent2.status, 201, sent2.text)
  const tok2 = sent2.json.links[0].url.split('/sign/')[1]
  const declined = await api('/api/sign/' + tok2 + '/decline', {
    method: 'POST', ip: '198.51.100.81', device: 'api-s2-aaaa',
    body: { reason: 'Not this year.' }
  })
  assert.equal(declined.status, 200, declined.text)
  const ev = hooks.received.find(r => r.json?.event === 'document.declined')
  assert.ok(ev, 'declined webhook arrived')
  assert.equal(ev.json.data.reason, 'Not this year.')

  await api('/api/developer/keys/' + createdKey.json.id, { method: 'DELETE', token: owner.auth, ip: owner.ip, device: owner.device })
  const after = await api('/api/v1/templates', { token: key })
  assert.equal(after.status, 401, after.text)
})
