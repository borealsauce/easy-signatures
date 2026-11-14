import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import { ROLE_OPTIONS, roleLabel } from '../shared/fields.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-appr-'))
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
function headers({ ip = '203.0.113.93', device = 'device-appr-aaaa', token } = {}) {
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
  email ||= `appr${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 40}`
  device ||= `device-appr-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555800${String(1000 + n)}`
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

test('role menu offers only signer and approver', () => {
  assert.deepEqual(ROLE_OPTIONS.map(r => r.value), ['signer', 'approver'])
  assert.ok(ROLE_OPTIONS.find(r => r.value === 'approver').hint.toLowerCase().includes('no signature'))
  assert.equal(roleLabel('in-person'), 'In person')
  assert.equal(roleLabel('cc'), 'CC')
})

test('approver goes first, needs no fields, and is recorded in the audit trail', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'manager@firm.test' })
  const created = await api('/api/documents/blank', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { name: 'Offer letter', pages: 1, roles: ['Manager', 'Candidate', 'HR'] }
  })
  assert.equal(created.status, 201, created.text)
  const [manager, candidate, hr] = created.json.signers
  const signers = [
    { ...manager, name: 'Alex Manager', email: 'alex-mgr@firm.test', role: 'approver' },
    { ...candidate, name: 'Casey Candidate', email: 'casey@hire.test', role: 'signer' },
    { ...hr, name: 'HR Copy', email: 'hr@firm.test', role: 'cc' }
  ]
  const saved = await api('/api/documents/' + created.json.id, {
    method: 'PUT', token: owner.auth, ip: owner.ip, device: owner.device,
    body: {
      name: 'Offer letter', ordered: true, expiresDays: 14, remindDays: 0, message: 'Please review',
      signers,
      fields: [{ type: 'signature', signer: candidate.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
    }
  })
  assert.equal(saved.status, 200, saved.text)
  const sent = await api('/api/documents/' + created.json.id + '/send', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(sent.status, 200, sent.text)
  const approverMail = mailTo('alex-mgr@firm.test')
  assert.ok(approverMail, 'approver was emailed first')
  assert.match(String(approverMail.subject || approverMail.text || ''), /review|sign|offer/i)
  assert.equal(mailTo('casey@hire.test'), undefined, 'signer waits until the approver is done')
  assert.equal(mailTo('hr@firm.test'), undefined, 'CC is not asked to sign')

  const apprLink = sent.json.links.find(l => l.role === 'approver')
  assert.ok(apprLink?.url)
  const tok = apprLink.url.split('/sign/')[1]
  const session = await api('/api/sign/' + tok, { ip: '198.51.100.94', device: 'appr-s1-aaaa' })
  assert.equal(session.json.me.role, 'approver')
  const finished = await api('/api/sign/' + tok + '/finish', {
    method: 'POST', ip: '198.51.100.94', device: 'appr-s1-aaaa',
    body: { consent: true, fields: [] }
  })
  assert.equal(finished.status, 200, finished.text)
  assert.equal(finished.json.status, 'waiting')

  const events = (await api('/api/state', { token: owner.auth, ip: owner.ip, device: owner.device })).json
  const docs = events.documents || events.docs || []
  const doc = docs.find(d => d.id === created.json.id)
  assert.ok(doc, 'document in state')
  assert.ok((doc.events || []).some(e => /Approved by Alex Manager/.test(e.t)), 'audit has Approved by: ' + JSON.stringify(doc.events))
  assert.equal(doc.signers.find(s => s.role === 'approver').done, true)

  const signerMail = mailTo('casey@hire.test')
  assert.ok(signerMail, 'signer is emailed after approval')
  const signTok = sent.json.links.find(l => l.role === 'signer').url.split('/sign/')[1]
  const sess2 = await api('/api/sign/' + signTok, { ip: '198.51.100.95', device: 'appr-s2-aaaa' })
  const field = sess2.json.document.fields.find(f => f.signer === sess2.json.me.id)
  const done = await api('/api/sign/' + signTok + '/finish', {
    method: 'POST', ip: '198.51.100.95', device: 'appr-s2-aaaa',
    body: { consent: true, fields: [{ id: field.id, value: PNG }] }
  })
  assert.equal(done.json.status, 'completed')
  const hrMail = mailTo('hr@firm.test', m => String(m.subject || '').includes('Completed'))
  assert.ok(hrMail, 'CC received the completed copy')
})
