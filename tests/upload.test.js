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
  const dir = mkdtempSync(join(tmpdir(), 'eds-upl-'))
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

function headers({ ip = '203.0.113.91', device = 'device-upl-aaaa', token } = {}) {
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
  device ||= `device-upl-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555100${String(1000 + n)}`
  const signup = await api('/api/auth/signup', { method: 'POST', body: { name, email, password, acceptTerms: true }, ip, device })
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

async function multipart(user, bytes, filename, extra = {}) {
  const fd = new FormData(); fd.append('file', new Blob([bytes]), filename)
  for (const [k, v] of Object.entries(extra)) fd.append(k, v)
  const h = headers({ ...user, token: user.auth }); delete h['content-type']
  const res = await fetch(base + '/api/documents/upload', { method: 'POST', headers: h, body: fd })
  return { status: res.status, json: await res.json().catch(() => null) }
}

test('uploads: direct-upload start, size limits, type checks, and title cleanup', async t => {
  await boot(); t.after(shutdown)
  const user = await verifiedUser()
  // Disk storage (local/tests) has no signed URLs, so the browser falls back to the multipart route.
  const start = await api('/api/documents/upload-url', { method: 'POST', body: { size: 1000 }, ...user, token: user.auth })
  assert.equal(start.status, 200, start.text); assert.equal(start.json.direct, false)
  const big = await api('/api/documents/upload-url', { method: 'POST', body: { size: 26 * 1024 * 1024 }, ...user, token: user.auth })
  assert.equal(big.status, 413); assert.match(big.json.message, /25 MB/)
  const empty = await api('/api/documents/upload-url', { method: 'POST', body: { size: 0 }, ...user, token: user.auth })
  assert.equal(empty.status, 400)

  const { PDFDocument } = await import('pdf-lib')
  const pd = await PDFDocument.create(); pd.addPage([612, 792]); const pdf = await pd.save()
  const ok = await multipart(user, pdf, 'Lease 2026.docx', { name: '' })
  assert.equal(ok.status, 201); assert.equal(ok.json.name, 'Lease 2026')
  const png = await multipart(user, Buffer.from(PNG.split(',')[1], 'base64'), 'screenshot.png')
  assert.equal(png.status, 201)
  const bad = await multipart(user, Buffer.from('MZ not a document'), 'program.exe')
  assert.equal(bad.status, 415); assert.match(bad.json.message, /PDF, PNG, or JPG/)

  // Completing an upload that never reached storage, or someone else's id, fails cleanly.
  const missing = await api('/api/documents/upload-complete', { method: 'POST', body: { id: crypto.randomUUID(), name: 'x' }, ...user, token: user.auth })
  assert.equal(missing.status, 400)
  const junk = await api('/api/documents/upload-complete', { method: 'POST', body: { id: '../../etc/passwd' }, ...user, token: user.auth })
  assert.equal(junk.status, 400)
  // A finished direct upload (simulated by writing to storage) becomes a draft; reusing the id is refused.
  const id = crypto.randomUUID()
  const me = (await api('/api/state', { ...user, token: user.auth })).json.me
  await ctx.app.locals.ctx.storage.put(`${me.id}/${id}/original.pdf`, pdf)
  const done = await api('/api/documents/upload-complete', { method: 'POST', body: { id, filename: 'Big scan.pdf' }, ...user, token: user.auth })
  assert.equal(done.status, 201, done.text); assert.equal(done.json.id, id); assert.equal(done.json.name, 'Big scan')
  const again = await api('/api/documents/upload-complete', { method: 'POST', body: { id }, ...user, token: user.auth })
  assert.equal(again.status, 409)
  const id2 = crypto.randomUUID()
  await ctx.app.locals.ctx.storage.put(`${me.id}/${id2}/original.pdf`, Buffer.from('not a pdf at all'))
  const notPdf = await api('/api/documents/upload-complete', { method: 'POST', body: { id: id2 }, ...user, token: user.auth })
  assert.equal(notPdf.status, 415)
})

test('signer emails greet the signer by first name', async t => {
  await boot(); t.after(shutdown)
  const user = await verifiedUser()
  const created = await api('/api/documents/blank', { method: 'POST', body: { name: 'Hello doc', pages: 1 }, ...user, token: user.auth })
  const d = created.json
  d.signers = [{ id: d.signers[0].id, name: 'Jane Doe', email: 'jane@sign.test', role: 'signer', color: '#2563eb' }]
  d.fields = [{ id: crypto.randomUUID(), page: 0, type: 'signature', signer: d.signers[0].id, x: .1, y: .1, w: .3, h: .06, required: true, label: 'Signature' }]
  const put = await api('/api/documents/' + d.id, { method: 'PUT', body: { name: d.name, folder: 'Sales', ordered: false, expiresDays: 30, remindDays: 3, message: '', signers: d.signers, fields: d.fields }, ...user, token: user.auth })
  assert.equal(put.status, 200, put.text)
  const sent = await api('/api/documents/' + d.id + '/send', { method: 'POST', ...user, token: user.auth })
  assert.equal(sent.status, 200, sent.text)
  const mail = mailTo('jane@sign.test')
  assert.ok(mail, 'invite email'); assert.match(mail.text || mail.html || '', /Hi Jane,/)
})
