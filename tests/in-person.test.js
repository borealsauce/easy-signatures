import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-ip-'))
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
function headers({ ip = '203.0.113.82', device = 'device-ip-aaaa', token } = {}) {
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
  email ||= `ip${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 30}`
  device ||= `device-ip-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555300${String(1000 + n)}`
  const signup = await api('/api/auth/signup', { method: 'POST', body: { name, email, password, acceptTerms: true }, ip, device })
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

async function sendInPerson(user, { name = 'Walk-in form', secondEmail } = {}) {
  const roles = secondEmail ? ['Guest', 'Manager'] : ['Guest']
  const created = await api('/api/documents/blank', { method: 'POST', body: { name, pages: 1, roles }, ...user, token: user.auth })
  assert.equal(created.status, 201, created.text)
  const signers = created.json.signers.map((s, i) => i === 0
    ? { ...s, name: 'Guest Signer', email: '', role: 'in-person' }
    : { ...s, name: 'Manager', email: secondEmail, role: 'signer' })
  const fields = signers.filter(s => s.role !== 'cc').map((s, i) => ({
    type: 'signature', signer: s.id, page: 0, x: 0.1 + i * 0.4, y: 0.7, w: 0.3, h: 0.08, required: true, label: s.name
  }))
  const saved = await api('/api/documents/' + created.json.id, {
    method: 'PUT', token: user.auth, ip: user.ip, device: user.device,
    body: { name, ordered: !!secondEmail, expiresDays: 7, remindDays: 0, message: '', idv: false, folder: 'Sales', signers, fields }
  })
  assert.equal(saved.status, 200, saved.text)
  const sent = await api('/api/documents/' + created.json.id + '/send', { method: 'POST', token: user.auth, ip: user.ip, device: user.device })
  assert.equal(sent.status, 200, sent.text)
  return { sent, id: created.json.id }
}

test('in-person: send without an email, sign on the device, no invite email', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'ip-owner@example.com' })
  const { sent } = await sendInPerson(owner)
  const link = sent.json.links.find(l => l.role === 'in-person')
  assert.ok(link, 'in-person link')
  assert.equal(link.email, '')
  assert.equal(ctx.mailbox.filter(m => String(m.subject || '').includes('Walk-in form')).length, 0)
  const token = link.url.split('/sign/')[1]
  const session = await api('/api/sign/' + token, { ip: '198.51.100.50', device: 'kiosk-aaaa' })
  assert.equal(session.status, 200, session.text)
  assert.equal(session.json.me.name, 'Guest Signer')
  assert.equal(session.json.me.role, 'in-person')
  const field = session.json.document.fields.find(f => f.signer === session.json.me.id)
  const done = await api('/api/sign/' + token + '/finish', {
    method: 'POST', ip: '198.51.100.50', device: 'kiosk-aaaa',
    body: { consent: true, fields: [{ id: field.id, value: PNG }] }
  })
  assert.equal(done.status, 200, done.text)
  assert.equal(done.json.status, 'completed')
})

test('in-person then email: the next signer is emailed only after the guest signs', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'ip-order@example.com' })
  const { sent } = await sendInPerson(owner, { name: 'Check in', secondEmail: 'manager@sign.test' })
  const guest = sent.json.links.find(l => l.role === 'in-person')
  const manager = sent.json.links.find(l => l.email === 'manager@sign.test')
  assert.ok(guest && manager)
  assert.equal(ctx.mailbox.filter(m => m.to === 'manager@sign.test' && String(m.subject || '').includes('Check in')).length, 0)
  const early = await api('/api/sign/' + manager.url.split('/sign/')[1], { ip: '198.51.100.51', device: 'mgr-aaaa' })
  assert.equal(early.json.status, 'waiting_turn')
  const session = await api('/api/sign/' + guest.url.split('/sign/')[1], { ip: '198.51.100.50', device: 'kiosk-bbbb' })
  const field = session.json.document.fields.find(f => f.signer === session.json.me.id)
  const done = await api('/api/sign/' + guest.url.split('/sign/')[1] + '/finish', {
    method: 'POST', ip: '198.51.100.50', device: 'kiosk-bbbb',
    body: { consent: true, fields: [{ id: field.id, value: PNG }] }
  })
  assert.equal(done.status, 200, done.text)
  assert.equal(done.json.status, 'waiting')
  assert.ok(mailTo('manager@sign.test', m => String(m.subject || '').includes('Check in')))
  const next = await api('/api/sign/' + manager.url.split('/sign/')[1], { ip: '198.51.100.51', device: 'mgr-aaaa' })
  assert.equal(next.json.me.email, 'manager@sign.test')
})
