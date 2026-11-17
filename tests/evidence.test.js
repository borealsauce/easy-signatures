import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, createHash } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import { verifyChain, loadChain } from '../server/evidence.js'
import { totpAt, currentStep } from '../server/totp.js'
import { CONSENT_VERSION } from '../shared/consent.js'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const SECRET = 'whsec_' + Buffer.from('test-evidence-secret-123456').toString('base64')
let ctx, base

function sign(body, id) {
  const ts = Math.floor(Date.now() / 1000)
  const sig = createHmac('sha256', Buffer.from(SECRET.slice(6), 'base64')).update(`${id}.${ts}.${body}`).digest('base64')
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` }
}
async function api(path, { method = 'GET', body, token, ip = '203.0.113.50', device = 'dev-evidence-aaaa' } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, 'x-device-local': device, cookie: `eds_did=c-${device}`, 'user-agent': 'EDSTest/1.0', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  return { status: res.status, json, text }
}
const mailTo = (email, pred = () => true) => [...ctx.mailbox].reverse().find(m => m.to === email && pred(m))

async function owner(email) {
  const ip = '203.0.113.51', device = 'dev-owner-evidence'
  assert.equal((await api('/api/auth/signup', { method: 'POST', body: { name: 'Eve Owner', email, password: 'correct-horse', acceptTerms: true }, ip, device })).status, 201)
  const token = new URL(mailTo(email, m => m.subject?.includes('Confirm')).url).searchParams.get('token')
  await fetch(base + '/auth/verify?token=' + token)
  const login = await api('/api/auth/login', { method: 'POST', body: { email, password: 'correct-horse' }, ip, device })
  const auth = login.json.token
  await api('/api/phone/start', { method: 'POST', body: { phone: '+15555559001' }, token: auth, ip, device })
  const sms = mailTo('+15555559001', m => m.type === 'sms')
  await api('/api/phone/check', { method: 'POST', body: { phone: '+15555559001', code: sms.code }, token: auth, ip, device })
  return { auth, ip, device, email }
}

test('evidence: hash chain, append-only audit, consent, /verify, delete-content retention, delivery events, 2FA', { timeout: 120000 }, async t => {
  ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', TRUST_PROXY: '1', JWT_SECRET: 'test-secret', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-ev-')), DEV_MAILBOX: '1', RESEND_WEBHOOK_SECRET: SECRET })
  await new Promise(r => { ctx.server = ctx.app.listen(0, '127.0.0.1', r) })
  base = `http://127.0.0.1:${ctx.server.address().port}`
  t.after(async () => { await new Promise(r => ctx.server.close(r)); await ctx.close() })
  const q = ctx.db.query.bind(ctx.db)

  const o = await owner('eve@example.com')
  const created = await api('/api/documents/blank', { method: 'POST', body: { name: 'Evidence NDA', pages: 1 }, token: o.auth, ip: o.ip, device: o.device })
  const signer = created.json.signers[0]
  await api('/api/documents/' + created.json.id, { method: 'PUT', token: o.auth, ip: o.ip, device: o.device, body: {
    name: 'Evidence NDA', ordered: true, expiresDays: 30, remindDays: 3, message: 'Sign', idv: false, folder: 'Sales',
    signers: [{ ...signer, name: 'Sam Signer', email: 'sam@example.com' }],
    fields: [{ type: 'signature', signer: signer.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
  } })
  const id = created.json.id
  assert.equal((await api('/api/documents/' + id + '/send', { method: 'POST', token: o.auth, ip: o.ip, device: o.device })).status, 200)
  const tok = mailTo('sam@example.com').url.split('/sign/')[1]
  const session = await api('/api/sign/' + tok, { ip: '198.51.100.20' })
  assert.equal(session.json.consentVersion, CONSENT_VERSION)
  assert.match(session.json.consentText, /^I agree to sign electronically\./)
  const stale = await api('/api/sign/' + tok + '/finish', { method: 'POST', ip: '198.51.100.20', body: { consent: true, consentVersion: '1999-01-01', fields: [] } })
  assert.equal(stale.status, 409)
  const fieldId = session.json.document.fields[0].id
  const done = await api('/api/sign/' + tok + '/finish', { method: 'POST', ip: '198.51.100.20', body: { consent: true, consentVersion: CONSENT_VERSION, fields: [{ id: fieldId, value: PNG }] } })
  assert.equal(done.json.status, 'completed', done.text)

  // Chain is intact and covers consent + signing with intent and hashes.
  const chain = await loadChain(q, id)
  const check = verifyChain(chain)
  assert.equal(check.ok, true, check.problems.join('; '))
  assert.ok(chain.some(e => /consent accepted by Sam Signer/.test(e.event_type)))
  const signed = chain.find(e => /^Signed by/.test(e.event_type))
  assert.equal(signed.meta.consentVersion, CONSENT_VERSION)
  assert.match(signed.meta.intent, /Finish/)
  assert.match(signed.meta.documentSha256BeforeSigning, /^[0-9a-f]{64}$/)
  const docRow = (await q(`select * from documents where id=$1`, [id])).rows[0]
  assert.match(docRow.audit_seal_hash, /^[0-9a-f]{64}$/)

  // Append-only: updates and unauthorized deletes are rejected by the database.
  await assert.rejects(q(`update audit_events set ip='1.2.3.4' where document_id=$1`, [id]), /append-only/)
  await assert.rejects(q(`delete from audit_events where document_id=$1`, [id]), /authorized purge/)
  await assert.rejects(q(`update audit_records set status='x' where document_id=$1`, [id]), /append-only/)
  // A tampered payload is detected.
  const forged = chain.map((e, i) => i === 1 ? { ...e, payload: e.payload.replace('"seq":2', '"seq":2 ') } : e)
  assert.equal(verifyChain(forged).ok, false)

  // Certificate contains chain head; /verify matches the downloaded file only.
  const pdf = Buffer.from(await (await fetch(base + '/api/sign/' + tok + '/download')).arrayBuffer())
  const hex = createHash('sha256').update(pdf).digest('hex')
  assert.equal(hex, docRow.final_sha256)
  const hit = await api('/api/verify', { method: 'POST', body: { sha256: hex } })
  assert.deepEqual(Object.keys(hit.json).sort(), ['completed', 'match', 'signers'])
  assert.equal(hit.json.match, true)
  assert.equal(hit.json.signers, 1)
  assert.equal((await api('/api/verify', { method: 'POST', body: { sha256: 'a'.repeat(64) } })).json.match, false)
  assert.equal((await api('/api/verify', { method: 'POST', body: { sha256: 'nope' } })).status, 400)
  const page = await (await fetch(base + '/verify')).text()
  assert.match(page, /crypto\.subtle\.digest/)

  // Retention snapshot on completion.
  const kept = (await q(`select * from audit_records where document_id=$1`, [id])).rows
  assert.equal(kept[0].reason, 'completed')
  assert.equal(kept[0].chain_ok, true)
  assert.ok(new Date(kept[0].retain_until).getUTCFullYear() >= new Date().getUTCFullYear() + 7)

  // Delivery webhook adds a chained audit event for a tracked message.
  await q(`insert into email_messages (message_id, document_id, signer_id, email, kind) values ('em_test_1',$1,$2,'sam@example.com','signing')`, [id, signer.id])
  const body = JSON.stringify({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'em_test_1' } })
  const hook = await fetch(base + '/api/inbound-email', { method: 'POST', headers: { 'content-type': 'application/json', ...sign(body, 'msg_ev_1') }, body })
  assert.equal((await hook.json()).recorded, 'email.delivered')
  const dup = await fetch(base + '/api/inbound-email', { method: 'POST', headers: { 'content-type': 'application/json', ...sign(body, 'msg_ev_1') }, body })
  assert.equal((await dup.json()).duplicate, true)
  assert.ok((await loadChain(q, id)).some(e => /delivered to sam@example.com/.test(e.event_type)))

  // Evidence export and owner-controlled file deletion keep the audit record and verification.
  const ev = await api('/api/documents/' + id + '/evidence', { token: o.auth, ip: o.ip, device: o.device })
  assert.equal(ev.json.chain.ok, true, JSON.stringify(ev.json.chain))
  assert.equal(ev.json.operator.startsWith('Boreal MT LLC'), true)
  const del = await api('/api/documents/' + id + '/delete-content', { method: 'POST', token: o.auth, ip: o.ip, device: o.device })
  assert.equal(del.json.contentDeleted, true, del.text)
  assert.equal((await fetch(base + '/api/sign/' + tok + '/download')).status, 410)
  assert.equal((await api('/api/verify', { method: 'POST', body: { sha256: hex } })).json.match, true)
  assert.equal(verifyChain(await loadChain(q, id)).ok, true)
  assert.equal((await q(`select count(*)::int n from audit_records where document_id=$1`, [id])).rows[0].n, 2)

  // 2FA: setup, enable, password-only token rejected, login needs a code, recovery code works once.
  const setup = await api('/api/2fa/setup', { method: 'POST', token: o.auth, ip: o.ip, device: o.device })
  assert.match(setup.json.qrSvg, /^<svg/)
  const code = totpAt(setup.json.secret, currentStep())
  const on = await api('/api/2fa/enable', { method: 'POST', body: { code }, token: o.auth, ip: o.ip, device: o.device })
  assert.equal(on.json.recoveryCodes.length, 8)
  assert.equal((await api('/api/state', { token: o.auth, ip: o.ip, device: o.device })).status, 401)
  assert.equal((await api('/api/state', { token: on.json.token, ip: o.ip, device: o.device })).status, 200)
  const need = await api('/api/auth/login', { method: 'POST', body: { email: o.email, password: 'correct-horse' } })
  assert.equal(need.json.error, 'totp_required')
  assert.equal(need.json.token, undefined)
  assert.equal((await api('/api/auth/login', { method: 'POST', body: { email: o.email, password: 'correct-horse', totp: '000000' } })).json.error, 'totp_invalid')
  const rc = on.json.recoveryCodes[0]
  const viaRc = await api('/api/auth/login', { method: 'POST', body: { email: o.email, password: 'correct-horse', recoveryCode: rc } })
  assert.equal(viaRc.status, 200, viaRc.text)
  assert.equal((await api('/api/state', { token: viaRc.json.token })).status, 200)
  assert.equal((await api('/api/auth/login', { method: 'POST', body: { email: o.email, password: 'correct-horse', recoveryCode: rc } })).json.error, 'totp_invalid')

  // Legal pages exist and name the operator.
  for (const p of ['/security', '/court-evidence', '/acceptable-use', '/subprocessors', '/dpa', '/legal', '/legal/changelog', '/terms', '/privacy']) {
    const html = await (await fetch(base + p)).text()
    assert.match(html, /Boreal MT LLC/, p)
  }
  assert.match(await (await fetch(base + '/security')).text(), /not<\/b> completed a SOC 2 audit/)
  assert.match(await (await fetch(base + '/court-evidence')).text(), /902\(11\)/)
  assert.equal((await fetch(base + '/legal/evidence', { redirect: 'manual' })).headers.get('location'), '/court-evidence')
})

test('legal: regulated-use limits and accessibility statement', async () => {
  const { LEGAL_PAGES, SECURITY_PAGE } = await import('../seo/legal-more.js')
  const acc = LEGAL_PAGES.find(p => p.path === '/accessibility')
  assert.ok(acc && /WCAG\) 2\.1/.test(acc.body) && /100 out of 100/.test(acc.body))
  for (const re of [/HIPAA/, /BAA/, /21 CFR Part 11/, /eIDAS/, /ESIGN/]) assert.match(SECURITY_PAGE.body, re)
  const { siteFooterHtml } = await import('../shared/site-footer.js').catch(() => ({}))
  if (siteFooterHtml) assert.match(siteFooterHtml(), /\/accessibility/)
})
