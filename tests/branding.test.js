import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const PNG_BYTES = Buffer.from(PNG_B64, 'base64')

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-brand-'))
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
function headers({ ip = '203.0.113.84', device = 'device-brand-aaaa', token, json = true } = {}) {
  return {
    ...(json ? { 'content-type': 'application/json' } : {}),
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
  email ||= `brand${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 50}`
  device ||= `device-brand-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555500${String(1000 + n)}`
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

test('branding: logo upload, color, signing page, and emails use the brand', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'brand-owner@example.com' })
  const saved = await api('/api/settings', {
    method: 'PUT', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { brand: { company: 'Northwind Legal', color: '#0e4d8b' } }
  })
  assert.equal(saved.status, 200, saved.text)
  assert.equal(saved.json.brand.company, 'Northwind Legal')
  assert.equal(saved.json.brand.color, '#0e4d8b')

  const fd = new FormData()
  fd.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'logo.png')
  const up = await fetch(base + '/api/settings/logo', {
    method: 'POST',
    headers: headers({ token: owner.auth, ip: owner.ip, device: owner.device, json: false }),
    body: fd
  })
  const uploaded = await up.json()
  assert.equal(up.status, 200, JSON.stringify(uploaded))
  assert.match(uploaded.brand.logoUrl, /\/api\/brand\/.+\/logo/)
  const logo = await fetch(base + uploaded.brand.logoUrl)
  assert.equal(logo.status, 200)
  assert.match(logo.headers.get('content-type') || '', /image\/png/)
  const bytes = Buffer.from(await logo.arrayBuffer())
  assert.deepEqual(bytes, PNG_BYTES)

  const kept = await api('/api/settings', {
    method: 'PUT', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { brand: { company: 'Northwind Legal', color: '#0e4d8b' } }
  })
  assert.match(kept.json.brand.logoUrl, /\/api\/brand\/.+\/logo/)

  const created = await api('/api/documents/blank', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device, body: { name: 'Engagement letter', pages: 1, roles: ['Client'] } })
  const s = created.json.signers[0]
  await api('/api/documents/' + created.json.id, {
    method: 'PUT', token: owner.auth, ip: owner.ip, device: owner.device,
    body: {
      name: 'Engagement letter', ordered: true, expiresDays: 14, remindDays: 0, message: 'Please sign', idv: false, folder: 'Legal',
      signers: [{ ...s, name: 'Alex Client', email: 'alex@client.test' }],
      fields: [{ type: 'signature', signer: s.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
    }
  })
  const sent = await api('/api/documents/' + created.json.id + '/send', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(sent.status, 200, sent.text)
  const invite = mailTo('alex@client.test', m => String(m.subject || '').includes('Engagement letter'))
  assert.ok(invite)
  assert.match(String(invite.subject), /Northwind Legal/)
  const token = sent.json.links[0].url.split('/sign/')[1]
  const session = await api('/api/sign/' + token, { ip: '198.51.100.70', device: 'client-aaaa' })
  assert.equal(session.json.brand.company, 'Northwind Legal')
  assert.equal(session.json.brand.color, '#0e4d8b')
  assert.match(session.json.brand.logoUrl, /\/api\/brand\/.+\/logo/)

  const gone = await api('/api/settings/logo', { method: 'DELETE', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(gone.status, 200, gone.text)
  assert.equal(gone.json.brand.logoUrl, '')
  const missing = await fetch(base + uploaded.brand.logoUrl.split('?')[0])
  assert.equal(missing.status, 404)
})
