import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-dec-'))
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
function headers({ ip = '203.0.113.83', device = 'device-dec-aaaa', token } = {}) {
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
  const res = await fetch(base + path, { method, headers: headers(opt), body: body ? JSON.stringify(body) : undefined })
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
  email ||= `dec${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 40}`
  device ||= `device-dec-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555400${String(1000 + n)}`
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
  return { email, auth, ip, device, phone, name }
}

async function sendLetter(user) {
  const created = await api('/api/documents/blank', { method: 'POST', body: { name: 'Vendor letter', pages: 1, roles: ['Vendor'] }, ...user, token: user.auth })
  const s = created.json.signers[0]
  await api('/api/documents/' + created.json.id, {
    method: 'PUT', token: user.auth, ip: user.ip, device: user.device,
    body: {
      name: 'Vendor letter', ordered: true, expiresDays: 14, remindDays: 0, message: 'Please sign', idv: false, folder: 'Sales',
      signers: [{ ...s, name: 'Alex Vendor', email: 'alex@vendor.test' }],
      fields: [{ type: 'signature', signer: s.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
    }
  })
  const sent = await api('/api/documents/' + created.json.id + '/send', { method: 'POST', token: user.auth, ip: user.ip, device: user.device })
  assert.equal(sent.status, 200, sent.text)
  return { id: created.json.id, token: sent.json.links[0].url.split('/sign/')[1] }
}

test('decline requires a reason and emails it to the sender', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'decline-owner@example.com' })
  const { id, token } = await sendLetter(owner)
  const empty = await api('/api/sign/' + token + '/decline', { method: 'POST', ip: '198.51.100.60', device: 'vendor-aaaa', body: { reason: '   ' } })
  assert.equal(empty.status, 400, empty.text)
  const still = await api('/api/sign/' + token, { ip: '198.51.100.60', device: 'vendor-aaaa' })
  assert.notEqual(still.json.status, 'declined')
  const declined = await api('/api/sign/' + token + '/decline', {
    method: 'POST', ip: '198.51.100.60', device: 'vendor-aaaa',
    body: { reason: 'The dates in section 2 are wrong.' }
  })
  assert.equal(declined.status, 200, declined.text)
  assert.equal(declined.json.status, 'declined')
  assert.equal(declined.json.reason, 'The dates in section 2 are wrong.')
  const mail = mailTo(owner.email, m => String(m.subject || '').includes('declined'))
  assert.ok(mail, 'sender notified')
  assert.match(String(mail.text || mail.subject || ''), /dates in section 2/)
  const state = await api('/api/state', { token: owner.auth, ip: owner.ip, device: owner.device })
  const docs = state.json.docs || state.json.documents || []
  const doc = docs.find(d => d.id === id)
  assert.equal(doc?.status, 'declined')
  assert.equal(doc.signers[0].declined, true)
  assert.equal(doc.signers[0].declineReason, 'The dates in section 2 are wrong.')
  const again = await api('/api/sign/' + token, { ip: '198.51.100.60', device: 'vendor-aaaa' })
  assert.equal(again.json.status, 'declined')
})
