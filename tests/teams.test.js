import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let ctx, base, n = 0

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-team-'))
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
function headers({ ip = '203.0.113.90', device = 'device-team-aaaa', token } = {}) {
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
  email ||= `team${n}@example.com`
  ip ||= `198.51.100.${(n % 200) + 70}`
  device ||= `device-team-${String(n).padStart(4, '0')}aa`
  phone ||= `+1555700${String(1000 + n)}`
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

async function oneRoleTemplate(user, name = 'Team NDA') {
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

test('teams share templates and bill the shared credit pool', { timeout: 60000 }, async t => {
  await boot()
  t.after(shutdown)
  const owner = await verifiedUser({ email: 'owner@firm.test', name: 'Pat Owner' })
  const member = await verifiedUser({ email: 'alex@firm.test', name: 'Alex Member' })
  await ctx.db.query('update entitlements set credits=3 where user_id=$1', [owner.id])
  await ctx.db.query('update entitlements set credits=0 where user_id=$1', [member.id])

  const created = await api('/api/team', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device, body: { name: 'Northwind Legal' } })
  assert.equal(created.status, 201, created.text)
  assert.equal(created.json.team.name, 'Northwind Legal')
  assert.equal(created.json.team.role, 'owner')

  const invited = await api('/api/team/invites', {
    method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device,
    body: { email: member.email }
  })
  assert.equal(invited.status, 201, invited.text)
  const mail = mailTo(member.email, m => String(m.subject || '').includes('invited'))
  assert.ok(mail, 'invite email was sent')
  const href = mail.url || (mail.html && mail.html.match(/#\/team-invite\/([^"'<\s]+)/) || [])[0]
  const token = String(mail.url || '').split('/team-invite/')[1] || (String(mail.html || '').match(/#\/team-invite\/([A-Za-z0-9_-]+)/) || [])[1]
  assert.ok(token, 'invite link is in the email: ' + JSON.stringify({ url: mail.url, subject: mail.subject }))

  const accepted = await api('/api/team/invites/accept', {
    method: 'POST', token: member.auth, ip: member.ip, device: member.device, body: { token }
  })
  assert.equal(accepted.status, 200, accepted.text)
  assert.equal(accepted.json.team.role, 'member')

  const moved = await api('/api/team/credits', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device, body: { amount: 2 } })
  assert.equal(moved.status, 200, moved.text)
  assert.equal(moved.json.team.credits, 2)
  const ownerEnt = (await ctx.db.query('select credits from entitlements where user_id=$1', [owner.id])).rows[0]
  assert.equal(Number(ownerEnt.credits), 1)

  const tpl = await oneRoleTemplate(owner)
  const shared = await api('/api/documents/' + tpl.id + '/share', { method: 'POST', token: owner.auth, ip: owner.ip, device: owner.device, body: { share: true } })
  assert.equal(shared.status, 200, shared.text)
  assert.equal(shared.json.shared, true)

  const state = await api('/api/state', { token: member.auth, ip: member.ip, device: member.device })
  const found = (state.json.templates || []).find(x => x.id === tpl.id)
  assert.ok(found, 'member can see the shared template')
  assert.equal(state.json.usage.teamCredits, 2)

  async function sendCopy(user, templateId, docName, signerName, signerEmail) {
    const inst = await api('/api/documents/from-template', { method: 'POST', token: user.auth, ip: user.ip, device: user.device, body: { templateId } })
    assert.ok(inst.status === 201 || inst.status === 200, inst.text)
    const doc = inst.json.document || inst.json
    const saved = await api('/api/documents/' + doc.id, {
      method: 'PUT', token: user.auth, ip: user.ip, device: user.device,
      body: {
        name: docName, ordered: true, expiresDays: 14, remindDays: 0, message: 'Please sign',
        signers: doc.signers.map((s, i) => i === 0 ? { ...s, name: signerName, email: signerEmail, role: 'signer' } : s),
        fields: doc.fields
      }
    })
    assert.equal(saved.status, 200, saved.text)
    return api('/api/documents/' + doc.id + '/send', { method: 'POST', token: user.auth, ip: user.ip, device: user.device })
  }

  const sent = await sendCopy(member, tpl.id, 'Acme NDA', 'Casey Client', 'casey@client.test')
  assert.equal(sent.status, 200, sent.text)
  assert.equal(sent.json.billingSource, 'team:' + moved.json.team.id)
  const after = await api('/api/team', { token: member.auth, ip: member.ip, device: member.device })
  assert.equal(after.json.team.credits, 1)

  const sent2 = await sendCopy(member, tpl.id, 'Second', 'Drew', 'drew@client.test')
  assert.equal(sent2.status, 200, sent2.text)
  const sent3 = await sendCopy(member, tpl.id, 'Third', 'Eden', 'eden@client.test')
  assert.equal(sent3.status, 402, sent3.text)
  assert.match(sent3.json.message || '', /team is out of credits/i)
})
