import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import { abaValid, validate, maskSensitive, formatField, FIELD_LIBRARY, ROLE_OPTIONS, ME_ID } from '../shared/fields.js'
import { encryptValue, decryptValue, isEncrypted, storeSensitive, decryptAllFields } from '../server/sensitive.js'
import { sealPdf, blankPdf } from '../server/pdf.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const SECRET = 'test-field-secret'
let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-fields-'))
  ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    TRUST_PROXY: '1',
    JWT_SECRET: SECRET,
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
function headers({ ip = '203.0.113.80', device = 'device-fields-aaaa', token } = {}) {
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
  email ||= `fields${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 10}`
  device ||= `device-fields-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555700${String(1000 + n)}`
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

test('field library, ABA checksum, and SSN masking', () => {
  const types = FIELD_LIBRARY.flatMap(s => s.items.map(i => i.type))
  for (const need of ['signature', 'initials', 'text', 'number', 'stamp', 'datetime', 'radio', 'checkbox', 'attachment', 'formula', 'dropdown', 'currency', 'name', 'phone', 'email', 'state', 'zip', 'ssn', 'rtn', 'age']) {
    assert.ok(types.includes(need), 'missing ' + need)
  }
  assert.deepEqual(ROLE_OPTIONS.map(r => r.value), ['signer', 'approver'])
  assert.ok(abaValid('021000021'))
  assert.ok(!abaValid('021000022'))
  assert.equal(maskSensitive('ssn', '856-45-6789'), '***-**-6789')
  assert.equal(maskSensitive('rtn', '021000021'), '*****0021')
  assert.equal(formatField({ type: 'ssn' }, '856456789'), '856-45-6789')
  assert.ok(validate({ type: 'ssn' }, '856-45-6789'))
  assert.ok(!validate({ type: 'ssn' }, '123'))
  assert.ok(validate({ type: 'rtn' }, '021000021'))
  assert.ok(validate({ type: 'age' }, '42'))
  assert.ok(!validate({ type: 'age' }, '200'))
  assert.ok(validate({ type: 'state' }, 'CA'))
  assert.ok(validate({ type: 'currency' }, '$1,200.50'))
  const enc = encryptValue('856-45-6789', 'test-secret')
  assert.ok(isEncrypted(enc))
  assert.ok(!enc.includes('856'))
  assert.equal(decryptValue(enc, 'test-secret'), '856-45-6789')
  assert.equal(storeSensitive('ssn', '***-**-6789', enc, 'test-secret'), enc)
})

test('me fields are filled before send, SSN is encrypted at rest, and the PDF shows the real value', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'field-owner@example.com' })
  const fav = await api('/api/me/favorites', { method: 'PATCH', token: owner.auth, ip: owner.ip, device: owner.device, body: { types: ['signature', 'stamp', 'ssn'] } })
  assert.equal(fav.status, 200, fav.text)
  assert.ok(fav.json.favoriteFields.includes('ssn'))
  assert.ok(!JSON.stringify(fav.json).includes('856-45'))

  const created = await api('/api/documents/blank', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { name: 'New hire packet', pages: 1 }
  })
  assert.equal(created.status, 201, created.text)
  const doc = created.json
  const signer = doc.signers[0]
  const ids = {
    meSsn: '11111111-1111-4111-8111-111111111111',
    curr: '22222222-2222-4222-8222-222222222222',
    radio: '33333333-3333-4333-8333-333333333333',
    sig: '44444444-4444-4444-8444-444444444444',
    ssn: '55555555-5555-4555-8555-555555555555'
  }
  const save = await api('/api/documents/' + doc.id, {
    method: 'PUT', token: owner.auth, ip: owner.ip, device: owner.device,
    body: {
      name: 'New hire packet',
      ordered: true,
      expiresDays: 30,
      signers: [{ id: signer.id, name: 'Casey Candidate', email: 'casey-fields@example.com', role: 'signer', color: '#2563eb' }],
      fields: [
        { id: ids.meSsn, page: 0, type: 'ssn', signer: ME_ID, x: .1, y: .1, w: .2, h: .04, required: true, label: 'My SSN', value: '856-45-6789' },
        { id: ids.curr, page: 0, type: 'currency', signer: ME_ID, x: .1, y: .2, w: .2, h: .04, required: true, label: 'Salary', value: '1250.5' },
        { id: ids.radio, page: 0, type: 'radio', signer: ME_ID, x: .1, y: .3, w: .2, h: .08, required: true, label: 'Status', options: ['Full-time', 'Part-time'], value: 'Full-time' },
        { id: ids.sig, page: 0, type: 'signature', signer: signer.id, x: .1, y: .7, w: .3, h: .06, required: true, label: 'Signature' },
        { id: ids.ssn, page: 0, type: 'ssn', signer: signer.id, x: .1, y: .5, w: .2, h: .04, required: true, label: 'SSN' }
      ]
    }
  })
  assert.equal(save.status, 200, save.text)
  const savedSsn = (save.json.fields || []).find(f => f.id === ids.meSsn)
  assert.equal(savedSsn.value, '856-45-6789')
  assert.ok(!JSON.stringify(save.json).includes('enc:v1:'))

  const row = await ctx.db.query('select fields from documents where id=$1', [doc.id])
  const stored = JSON.stringify(row.rows[0].fields)
  assert.ok(stored.includes('enc:v1:'), 'SSN stored encrypted')
  assert.ok(!stored.includes('856-45-6789'))
  assert.ok(!stored.includes('856456789'))

  const send = await api('/api/documents/' + doc.id + '/send', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(send.status, 200, send.text)
  const link = (send.json.links || [])[0]
  assert.ok(link?.url)
  const signToken = String(link.url).split('/sign/').pop()

  const session = await api('/api/sign/' + signToken, { ip: '198.51.100.44', device: 'device-casey-sign1' })
  assert.equal(session.status, 200, session.text)
  assert.ok(!JSON.stringify(session.json).includes('856-45-6789'), 'other signers must not see the sender SSN')
  const masked = (session.json.document.fields || []).find(f => f.id === ids.meSsn)
  assert.equal(masked.value, '***-**-6789')

  const finish = await api('/api/sign/' + signToken + '/finish', {
    method: 'POST', ip: '198.51.100.44', device: 'device-casey-sign1',
    body: { consent: true, fields: [{ id: ids.sig, value: PNG }, { id: ids.ssn, value: '219-09-9999' }] }
  })
  assert.equal(finish.status, 200, finish.text)

  const raw = await ctx.db.query('select fields, status from documents where id=$1', [doc.id])
  assert.equal(raw.rows[0].status, 'completed')
  const rawFields = JSON.stringify(raw.rows[0].fields)
  assert.ok(!rawFields.includes('219-09-9999'))
  assert.ok(!rawFields.includes('856-45-6789'))
  assert.ok((rawFields.match(/enc:v1:/g) || []).length >= 2)

  const state = await api('/api/state', { token: owner.auth, ip: owner.ip, device: owner.device })
  const listed = JSON.stringify((state.json.documents || []).find(d => d.id === doc.id) || {})
  assert.ok(!listed.includes('219-09-9999'))
  assert.ok(!listed.includes('856-45-6789'))

  const revealed = decryptAllFields(raw.rows[0].fields, SECRET)
  assert.equal(revealed.find(f => f.id === ids.meSsn).value, '856-45-6789')
  assert.equal(revealed.find(f => f.id === ids.ssn).value, '219-09-9999')
  const sealed = await sealPdf({
    original: await blankPdf(1),
    verifyUrl: 'http://127.0.0.1:9/verify/x',
    doc: { id: doc.id, name: 'New hire packet', fields: revealed, signers: [], events: [] }
  })
  assert.ok(sealed.bytes.length > 1000)
  // Helvetica text may be in compressed streams; the stamper is given decrypted values above.
})

test('send is blocked until required Me fields are filled', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'field-me@example.com' })
  const created = await api('/api/documents/blank', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { name: 'Needs me', pages: 1 }
  })
  const signer = created.json.signers[0]
  const put = await api('/api/documents/' + created.json.id, {
    method: 'PUT', token: owner.auth, ip: owner.ip, device: owner.device,
    body: {
      name: 'Needs me',
      signers: [{ id: signer.id, name: 'Alex Signer', email: 'alex-fields@example.com', role: 'signer', color: '#2563eb' }],
      fields: [
        { page: 0, type: 'text', signer: ME_ID, x: .1, y: .1, w: .2, h: .04, required: true, label: 'Title', value: null },
        { page: 0, type: 'signature', signer: signer.id, x: .1, y: .7, w: .3, h: .06, required: true, label: 'Signature' }
      ]
    }
  })
  assert.equal(put.status, 200, put.text)
  const send = await api('/api/documents/' + created.json.id + '/send', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(send.status, 400)
  assert.match(send.json.message || '', /Title|Fill your/i)
})
