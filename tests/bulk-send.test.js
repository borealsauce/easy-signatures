import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import { parseBulkRecipients, bulkCostSummary, allowanceLabel } from '../shared/bulk.js'

test('parseBulkRecipients reads pasted lines, CSV headers, and quoted names', () => {
  const pasted = parseBulkRecipients('Jordan Avery, jordan@example.com\nBlair Counsel, blair@counsel.test\n')
  assert.deepEqual(pasted.recipients.map(r => r.email), ['jordan@example.com', 'blair@counsel.test'])
  assert.equal(pasted.errors.length, 0)

  const csv = parseBulkRecipients('Email,Name\n"alex@client.test","Alex, Client"\nbo@sign.test,Bo Signer\n')
  assert.equal(csv.recipients[0].name, 'Alex, Client')
  assert.equal(csv.recipients[0].email, 'alex@client.test')
  assert.equal(csv.recipients[1].name, 'Bo Signer')
  assert.equal(csv.errors.length, 0)

  const bad = parseBulkRecipients('Pat Person, not-an-email\nPat Person, pat@ok.test\nPat Twin, pat@ok.test\n')
  assert.equal(bad.recipients.length, 1)
  assert.equal(bad.errors.length, 2)
  assert.match(bad.errors[0].message, /valid email/)
  assert.match(bad.errors[1].message, /more than once/)
})

test('bulkCostSummary is 1 credit per copy and flags a shortfall', () => {
  const usage = { credits: 2, promoCredits: 1, freeAvailable: true }
  const ok = bulkCostSummary(3, usage)
  assert.equal(ok.creditsEach, 1)
  assert.equal(ok.creditsUsed, 3)
  assert.equal(ok.available, 4)
  assert.equal(ok.enough, true)
  assert.equal(ok.remaining, 1)
  const short = bulkCostSummary(6, usage)
  assert.equal(short.enough, false)
  assert.equal(short.short, 2)
  assert.equal(allowanceLabel(usage), '1 free document, then 1 promo document, then 2 credits')
})

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-bulk-'))
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

function headers({ ip = '203.0.113.81', device = 'device-bulk-aaaa', token } = {}) {
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
  email ||= `bulk${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 20}`
  device ||= `device-bulk-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555200${String(1000 + n)}`
  const signup = await api('/api/auth/signup', { method: 'POST', body: { name, email, password, acceptTerms: true }, ip, device })
  assert.equal(signup.status, 201, signup.text)
  const confirm = mailTo(email, m => String(m.subject || '').includes('Confirm'))
  const token = new URL(confirm.url).searchParams.get('token')
  await fetch(base + '/auth/verify?token=' + token)
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password }, ip, device })
  assert.equal(login.status, 200, login.text)
  const auth = login.json.token
  const start = await api('/api/phone/start', { method: 'POST', body: { phone }, ip, device, token: auth })
  assert.equal(start.status, 200, start.text)
  const sms = mailTo(phone, m => m.type === 'sms')
  const check = await api('/api/phone/check', { method: 'POST', body: { phone, code: sms.code }, ip, device, token: auth })
  assert.equal(check.status, 200, check.text)
  return { email, auth, ip, device, phone, name, id: login.json.userId }
}

async function oneSignerTemplate(user, name = 'Offer letter') {
  const created = await api('/api/documents/blank', {
    method: 'POST',
    body: { name, pages: 1, template: true, roles: ['New hire'] },
    ...user,
    token: user.auth
  })
  assert.equal(created.status, 201, created.text)
  const signer = created.json.signers[0]
  const saved = await api('/api/documents/' + created.json.id, {
    method: 'PUT',
    token: user.auth,
    ip: user.ip,
    device: user.device,
    body: {
      name,
      ordered: false,
      expiresDays: 14,
      remindDays: 0,
      message: 'Please sign',
      idv: false,
      folder: 'HR',
      signers: [{ ...signer, name: 'New hire', email: '', role: 'signer' }],
      fields: [{ type: 'signature', signer: signer.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
    }
  })
  assert.equal(saved.status, 200, saved.text)
  assert.equal(saved.json.tpl, true)
  return saved.json
}

test('bulk send: each copy uses 1 credit and the response shows the cost', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'bulk-owner@example.com' })
  await ctx.db.query('update entitlements set credits=5 where user_id=$1', [owner.id])
  const tpl = await oneSignerTemplate(owner)
  const people = [
    { name: 'Alex Client', email: 'alex@client.test' },
    { name: 'Blair Counsel', email: 'blair@counsel.test' }
  ]
  const sent = await api('/api/bulk', {
    method: 'POST',
    token: owner.auth,
    ip: owner.ip,
    device: owner.device,
    body: { templateId: tpl.id, recipients: people }
  })
  assert.equal(sent.status, 200, sent.text)
  assert.equal(sent.json.sent, 2)
  assert.equal(sent.json.cost.creditsEach, 1)
  assert.equal(sent.json.cost.creditsUsed, 2)
  assert.equal(sent.json.cost.copies, 2)
  assert.ok(sent.json.cost.remaining >= 0)
  assert.ok(mailTo('alex@client.test', m => String(m.subject || '').includes('Offer letter')))
  assert.ok(mailTo('blair@counsel.test', m => String(m.subject || '').includes('Offer letter')))
  const me = await api('/api/me', { token: owner.auth, ip: owner.ip, device: owner.device })
  const used = 5 + 1 - ((me.json.usage.credits || 0) + (me.json.usage.promoCredits || 0) + (me.json.usage.freeAvailable ? 1 : 0))
  assert.equal(used, 2, JSON.stringify(me.json.usage))
  assert.equal(sent.json.links.length, 2)
  const first = await api('/api/sign/' + sent.json.links[0].url.split('/sign/')[1], { ip: '198.51.100.40', device: 'bulk-s1-aaaa' })
  assert.equal(first.status, 200, first.text)
  assert.equal(first.json.me.email, 'alex@client.test')
})

test('bulk send: not enough credits returns 402 and sends nothing', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'bulk-short@example.com' })
  const tpl = await oneSignerTemplate(owner, 'Short pack')
  const people = [
    { name: 'One', email: 'one@sign.test' },
    { name: 'Two', email: 'two@sign.test' },
    { name: 'Three', email: 'three@sign.test' }
  ]
  const refused = await api('/api/bulk', {
    method: 'POST',
    token: owner.auth,
    ip: owner.ip,
    device: owner.device,
    body: { templateId: tpl.id, recipients: people }
  })
  assert.equal(refused.status, 402, refused.text)
  assert.equal(refused.json.cost.copies, 3)
  assert.equal(refused.json.cost.creditsEach, 1)
  assert.ok(refused.json.need >= 1)
  assert.equal(mailTo('one@sign.test'), undefined)
  const state = await api('/api/state', { token: owner.auth, ip: owner.ip, device: owner.device })
  const sentDocs = (state.json.docs || state.json.documents || []).filter(d => !d.tpl && d.status !== 'draft')
  // /api/state shape: check keys if filter is empty due to field names
  const docs = state.json.docs || state.json.documents || state.json
  assert.equal(sentDocs.length, 0, JSON.stringify({ status: state.status, keys: Object.keys(state.json || {}), docs }))
})

test('bulk send: a multi-signer template is rejected', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'bulk-multi@example.com' })
  const created = await api('/api/documents/blank', {
    method: 'POST',
    body: { name: 'Two party', pages: 1, template: true, roles: ['Client', 'Counsel'] },
    ...owner,
    token: owner.auth
  })
  const signers = created.json.signers.map((s, i) => ({ ...s, name: i ? 'Counsel' : 'Client', email: '', role: 'signer' }))
  await api('/api/documents/' + created.json.id, {
    method: 'PUT',
    token: owner.auth,
    ip: owner.ip,
    device: owner.device,
    body: {
      name: 'Two party', ordered: true, expiresDays: 14, remindDays: 0, message: '', idv: false, folder: 'Legal',
      signers,
      fields: [
        { type: 'signature', signer: signers[0].id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Client' },
        { type: 'signature', signer: signers[1].id, page: 0, x: 0.5, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Counsel' }
      ]
    }
  })
  const refused = await api('/api/bulk', {
    method: 'POST',
    token: owner.auth,
    ip: owner.ip,
    device: owner.device,
    body: { templateId: created.json.id, recipients: [{ name: 'Alex', email: 'alex@client.test' }] }
  })
  assert.equal(refused.status, 400, refused.text)
  assert.match(String(refused.json.message || ''), /one signer/i)
})
