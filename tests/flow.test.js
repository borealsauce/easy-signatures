import test from 'node:test'
import assert from 'node:assert/strict'
import zlib from 'node:zlib'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function pdfText(buf) {
  const parts = []
  let i = 0
  while (i < buf.length) {
    const start = buf.indexOf('stream', i)
    if (start < 0) break
    let dataStart = start + 6
    if (buf[dataStart] === 0x0d) dataStart++
    if (buf[dataStart] === 0x0a) dataStart++
    const end = buf.indexOf('endstream', dataStart)
    if (end < 0) break
    let dataEnd = end
    if (buf[dataEnd - 1] === 0x0a) dataEnd--
    if (buf[dataEnd - 1] === 0x0d) dataEnd--
    try { parts.push(zlib.inflateSync(buf.subarray(dataStart, dataEnd)).toString('utf8')) } catch { /* not flate */ }
    i = end + 9
  }
  return parts.join('\n').replace(/<([0-9A-Fa-f\s]+)>/g, (_, hex) => {
    const clean = hex.replace(/\s+/g, '')
    if (!clean || clean.length % 2) return _
    return Buffer.from(clean, 'hex').toString('latin1')
  })
}

let ctx
let base
let n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-'))
  ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    TRUST_PROXY: '1',
    JWT_SECRET: 'test-secret',
    DATA_DIR: dir,
    DEV_MAILBOX: '1',
    IP_FREE_LIMIT: '3',
    SIGNUP_PER_HOUR: '5',
    SIGNUP_PER_DAY: '20'
  })
  await new Promise(resolve => {
    ctx.server = ctx.app.listen(0, '127.0.0.1', resolve)
  })
  base = `http://127.0.0.1:${ctx.server.address().port}`
}

async function shutdown() {
  if (!ctx) return
  await new Promise(resolve => ctx.server.close(resolve))
  await ctx.close()
}

function headers({ ip = '203.0.113.10', device = 'device-main-aaaa', token } = {}) {
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

function mailTo(email, pred = () => true) {
  return [...ctx.mailbox].reverse().find(m => m.to === email && pred(m))
}

async function verifiedUser({ email, password = 'correct-horse', name = 'Ada Lovelace', ip, device, phone }) {
  n += 1
  email ||= `user${n}@example.com`
  ip ||= `203.0.113.${(n % 200) + 1}`
  device ||= `device-${String(n).padStart(4, '0')}-aaaa`
  phone ||= `+1555555${String(1000 + n)}`
  const signup = await api('/api/auth/signup', { method: 'POST', body: { name, email, password }, ip, device })
  assert.equal(signup.status, 201, signup.text)
  const confirm = mailTo(email, m => m.subject?.includes('Confirm'))
  assert.ok(confirm?.url, 'verification email')
  const token = new URL(confirm.url).searchParams.get('token')
  const verified = await fetch(base + '/auth/verify?token=' + token)
  assert.ok(verified.url.includes('verified=1'))
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

async function draftFor(user, signerName = 'Alex Rivera') {
  const created = await api('/api/documents/blank', {
    method: 'POST', body: { name: 'Vendor agreement', pages: 1 }, ...user, token: user.auth
  })
  assert.equal(created.status, 201, created.text)
  const signer = created.json.signers[0]
  const saved = await api('/api/documents/' + created.json.id, {
    method: 'PUT',
    token: user.auth,
    ip: user.ip,
    device: user.device,
    body: {
      name: 'Vendor agreement',
      ordered: true,
      expiresDays: 30,
      remindDays: 3,
      message: 'Please sign',
      idv: false,
      folder: 'Sales',
      signers: [{ ...signer, name: signerName, email: 'signer@example.com' }],
      fields: [{ type: 'signature', signer: signer.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
    }
  })
  assert.equal(saved.status, 200, saved.text)
  return saved.json
}

test('end to end: free document, payment, and abuse checks', { timeout: 120000 }, async (t) => {
  await boot()
  t.after(shutdown)

  const owner = await verifiedUser({ email: 'ada@example.com', ip: '203.0.113.10', device: 'device-ada-aaaaaa', phone: '+15555551001' })
  const doc = await draftFor(owner)
  const sent = await api('/api/documents/' + doc.id + '/send', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(sent.status, 200, sent.text)
  assert.equal(sent.json.billingSource, 'free')
  assert.match(sent.json.links[0].url, /#\/sign\//)

  const signMail = mailTo('signer@example.com', m => m.subject?.includes('Vendor'))
  assert.ok(signMail, 'signer email')
  const signToken = signMail.url.split('/sign/')[1]
  const session = await api('/api/sign/' + signToken, { ip: '198.51.100.8', device: 'signer-device-aaaa' })
  assert.equal(session.json.me.name, 'Alex Rivera')
  assert.match(session.json.consentText, /ESIGN/)
  assert.equal(session.json.document.events.some(e => e.ip === '198.51.100.8' && /Viewed/.test(e.t)), true)

  const refused = await api('/api/sign/' + signToken + '/finish', {
    method: 'POST', ip: '198.51.100.8', device: 'signer-device-aaaa', body: { consent: false }
  })
  assert.equal(refused.status, 400)

  const done = await api('/api/sign/' + signToken + '/finish', {
    method: 'POST',
    ip: '198.51.100.8',
    device: 'signer-device-aaaa',
    body: {
      consent: true,
      fields: [{ id: session.json.document.fields[0].id, value: PNG }]
    }
  })
  assert.equal(done.status, 200, done.text)
  assert.equal(done.json.status, 'completed')

  const file = await fetch(base + '/api/sign/' + signToken + '/download')
  const bytes = Buffer.from(await file.arrayBuffer())
  assert.equal(file.status, 200)
  const text = pdfText(bytes)
  assert.match(text, /Certificate of Completion/)
  assert.match(text, /ESIGN/)
  const state = await api('/api/state', { token: owner.auth, ip: owner.ip, device: owner.device })
  const finished = state.json.documents.find(d => d.id === doc.id)
  assert.equal(finished.status, 'completed')
  assert.match(text, new RegExp(finished.hashOrig))
  assert.match(text, new RegExp(finished.hashContent))
  const verify = await fetch(base + '/verify/' + doc.id)
  const verifyHtml = await verify.text()
  assert.match(verifyHtml, new RegExp(finished.hashFinal))
  const completion = mailTo('ada@example.com', m => m.subject?.startsWith('Completed'))
  assert.ok(completion, 'owner receives the completed PDF email')
  assert.ok(mailTo('signer@example.com', m => m.subject?.startsWith('Completed')))

  const second = await draftFor(owner, 'Blair Chen')
  const paywall = await api('/api/documents/' + second.id + '/send', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(paywall.status, 402, paywall.text)
  assert.equal(paywall.json.error, 'payment_required')
  const checkout = await api('/api/billing/checkout', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { kind: 'doc1', documentId: second.id }
  })
  assert.equal(checkout.status, 200, checkout.text)
  assert.match(checkout.json.url, /\/dev\/checkout/)
  const paid = await api('/api/billing/dev/complete', { method: 'POST', body: { sessionId: checkout.json.id } })
  assert.equal(paid.status, 200, paid.text)
  const afterPay = await api('/api/state', { token: owner.auth, ip: owner.ip, device: owner.device })
  assert.equal(afterPay.json.documents.find(d => d.id === second.id).status, 'sent')
  assert.equal(afterPay.json.documents.find(d => d.id === second.id).billingSource, 'credit')
  assert.equal(afterPay.json.usage.credits, 0)

  const again = await api('/api/billing/dev/complete', { method: 'POST', body: { sessionId: checkout.json.id } })
  assert.equal(again.json.already, true)

  const twin = await verifiedUser({
    email: 'ada.twin@example.com', ip: '203.0.113.11', device: 'device-twin-aaaa', phone: '+15555551001'
  })
  const twinDoc = await draftFor(twin, 'Casey')
  const blockedPhone = await api('/api/documents/' + twinDoc.id + '/send', { method: 'POST', token: twin.auth, ip: twin.ip, device: twin.device })
  assert.equal(blockedPhone.status, 402)
  assert.equal(blockedPhone.json.reason, 'phone_reuse')
  const twinCheckout = await api('/api/billing/checkout', {
    method: 'POST', token: twin.auth, ip: twin.ip, device: twin.device,
    body: { kind: 'doc1', documentId: twinDoc.id }
  })
  assert.equal(twinCheckout.status, 200, twinCheckout.text)

  const sameBrowser = await verifiedUser({
    email: 'browser2@example.com', ip: '203.0.113.12', device: 'device-ada-aaaaaa', phone: '+15555551002'
  })
  const browserDoc = await draftFor(sameBrowser, 'Drew')
  const blockedDevice = await api('/api/documents/' + browserDoc.id + '/send', {
    method: 'POST', token: sameBrowser.auth, ip: sameBrowser.ip, device: 'device-ada-aaaaaa'
  })
  assert.equal(blockedDevice.status, 402)
  assert.equal(blockedDevice.json.reason, 'device_reuse')

  const aliasA = await verifiedUser({ email: 'quill@gmail.com', ip: '203.0.113.21', device: 'device-gmail-aaaa', phone: '+15555551021' })
  await api('/api/documents/' + (await draftFor(aliasA, 'Erin')).id + '/send', { method: 'POST', token: aliasA.auth, ip: aliasA.ip, device: aliasA.device })
  const aliasB = await verifiedUser({ email: 'quill+tag@gmail.com', ip: '203.0.113.22', device: 'device-gtag-aaaa', phone: '+15555551022' })
  const aliasDoc = await draftFor(aliasB, 'Fran')
  const blockedAlias = await api('/api/documents/' + aliasDoc.id + '/send', { method: 'POST', token: aliasB.auth, ip: aliasB.ip, device: aliasB.device })
  assert.equal(blockedAlias.json.reason, 'email_reuse')

  const voip = await api('/api/auth/signup', {
    method: 'POST', ip: '203.0.113.30', device: 'device-voip-aaaa',
    body: { name: 'Voip User', email: 'voip@example.com', password: 'correct-horse' }
  })
  assert.equal(voip.status, 201)
  const voipToken = new URL(mailTo('voip@example.com').url).searchParams.get('token')
  await fetch(base + '/auth/verify?token=' + voipToken)
  const voipLogin = await api('/api/auth/login', { method: 'POST', ip: '203.0.113.30', device: 'device-voip-aaaa', body: { email: 'voip@example.com', password: 'correct-horse' } })
  const voipUser = { auth: voipLogin.json.token, ip: '203.0.113.30', device: 'device-voip-aaaa' }
  await api('/api/phone/start', { method: 'POST', ...voipUser, token: voipUser.auth, body: { phone: '+15555550000' } })
  const voipCode = mailTo('+15555550000').code
  const voipCheck = await api('/api/phone/check', { method: 'POST', ...voipUser, token: voipUser.auth, body: { phone: '+15555550000', code: voipCode } })
  assert.equal(voipCheck.json.voip, true)
  const voipDoc = await draftFor(voipUser, 'Gale')
  const blockedVoip = await api('/api/documents/' + voipDoc.id + '/send', { method: 'POST', token: voipUser.auth, ip: voipUser.ip, device: voipUser.device })
  assert.equal(blockedVoip.json.reason, 'voip')

  for (let i = 0; i < 3; i++) {
    const u = await verifiedUser({
      email: `office${i}@example.com`,
      ip: '203.0.113.50',
      device: `device-office-${i}-aa`,
      phone: `+1555555211${i}`
    })
    const d = await draftFor(u, 'Harper ' + i)
    const ok = await api('/api/documents/' + d.id + '/send', { method: 'POST', token: u.auth, ip: u.ip, device: u.device })
    assert.equal(ok.status, 200, ok.text)
  }
  const fourth = await verifiedUser({
    email: 'office3@example.com', ip: '203.0.113.50', device: 'device-office-3-aa', phone: '+15555552003'
  })
  const fourthDoc = await draftFor(fourth, 'Indigo')
  const blockedIp = await api('/api/documents/' + fourthDoc.id + '/send', { method: 'POST', token: fourth.auth, ip: fourth.ip, device: fourth.device })
  assert.equal(blockedIp.json.reason, 'ip_threshold')
  const ipPay = await api('/api/billing/checkout', {
    method: 'POST', token: fourth.auth, ip: fourth.ip, device: fourth.device,
    body: { kind: 'doc10' }
  })
  await api('/api/billing/dev/complete', { method: 'POST', body: { sessionId: ipPay.json.id } })
  const ipSent = await api('/api/documents/' + fourthDoc.id + '/send', { method: 'POST', token: fourth.auth, ip: fourth.ip, device: fourth.device })
  assert.equal(ipSent.status, 200, ipSent.text)
  assert.equal(ipSent.json.billingSource, 'credit')

  const cardA = await verifiedUser({ email: 'carda@example.com', ip: '203.0.113.60', device: 'device-card-a-aaa', phone: '+15555553001' })
  const packA = await api('/api/billing/checkout', { method: 'POST', token: cardA.auth, ip: cardA.ip, device: cardA.device, body: { kind: 'doc10' } })
  await api('/api/billing/dev/complete', { method: 'POST', body: { sessionId: packA.json.id, cardFingerprint: 'card_fp_shared' } })
  const cardB = await verifiedUser({ email: 'cardb@example.com', ip: '203.0.113.61', device: 'device-card-b-aaa', phone: '+15555553002' })
  const packB = await api('/api/billing/checkout', { method: 'POST', token: cardB.auth, ip: cardB.ip, device: cardB.device, body: { kind: 'doc10' } })
  await api('/api/billing/dev/complete', { method: 'POST', body: { sessionId: packB.json.id, cardFingerprint: 'card_fp_shared' } })
  const cardDoc = await draftFor(cardB, 'Jules')
  const cardSent = await api('/api/documents/' + cardDoc.id + '/send', { method: 'POST', token: cardB.auth, ip: cardB.ip, device: cardB.device })
  assert.equal(cardSent.status, 200, cardSent.text)
  assert.equal(cardSent.json.billingSource, 'credit')
  const cardUsage = await api('/api/me', { token: cardB.auth, ip: cardB.ip, device: cardB.device })
  assert.equal(cardUsage.json.usage.freeReason, 'card_fingerprint')
  assert.equal(cardUsage.json.usage.freeAvailable, false)

  const disposable = await api('/api/auth/signup', {
    method: 'POST', ip: '203.0.113.70', device: 'device-disp-aaaa',
    body: { name: 'Temp', email: 'me@mailinator.com', password: 'correct-horse' }
  })
  assert.equal(disposable.status, 400)
  assert.equal(disposable.json.error, 'disposable')

  let last = 201
  for (let i = 0; i < 6; i++) {
    const res = await api('/api/auth/signup', {
      method: 'POST', ip: '203.0.113.80', device: `device-rate-${i}-aaa`,
      body: { name: 'Rate ' + i, email: `rate${i}@example.com`, password: 'correct-horse' }
    })
    last = res.status
  }
  assert.equal(last, 429)

  const packUser = await verifiedUser({ email: 'packs@example.com', ip: '203.0.113.90', device: 'device-pack-aaaaaa', phone: '+15555554001' })
  const pack = await api('/api/billing/checkout', { method: 'POST', token: packUser.auth, ip: packUser.ip, device: packUser.device, body: { kind: 'doc10' } })
  await api('/api/billing/dev/complete', { method: 'POST', body: { sessionId: pack.json.id } })
  const before = await api('/api/me', { token: packUser.auth, ip: packUser.ip, device: packUser.device })
  assert.equal(before.json.usage.credits, 10)
  const packDoc = await draftFor(packUser, 'Kai')
  const packSent = await api('/api/documents/' + packDoc.id + '/send', { method: 'POST', token: packUser.auth, ip: packUser.ip, device: packUser.device })
  assert.equal(packSent.json.billingSource, 'free')
  const againDoc = await draftFor(packUser, 'Lane')
  const creditSent = await api('/api/documents/' + againDoc.id + '/send', { method: 'POST', token: packUser.auth, ip: packUser.ip, device: packUser.device })
  assert.equal(creditSent.json.billingSource, 'credit')
  const after = await api('/api/me', { token: packUser.auth, ip: packUser.ip, device: packUser.device })
  assert.equal(after.json.usage.credits, 9)
  assert.equal(after.json.usage.freeAvailable, false)
})
