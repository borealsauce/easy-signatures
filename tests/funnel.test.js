import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import { cleanClientEvent } from '../server/funnel.js'

test('beacon validation drops bots, unknown events and bad ids', () => {
  const ok = { name: 'landing_view', sid: 'abcdef123456', path: '/sign-pdf-online?x=1', data: { utm_source: 'google', cta: 'x' } }
  assert.deepEqual(cleanClientEvent(ok, 'Mozilla/5.0'), { name: 'landing_view', sid: 'abcdef123456', path: '/sign-pdf-online', source: 'google', meta: { cta: 'x' } })
  assert.equal(cleanClientEvent(ok, 'Googlebot/2.1'), null)
  assert.equal(cleanClientEvent(ok, 'Chrome-Lighthouse'), null)
  assert.equal(cleanClientEvent({ ...ok, name: 'drop_table' }, ''), null)
  assert.equal(cleanClientEvent({ ...ok, sid: 'x' }, ''), null)
  assert.equal(cleanClientEvent({ ...ok, sid: '<script>alert(1)</script>' }, ''), null)
  assert.equal(cleanClientEvent({ ...ok, path: 'https://evil.example' }, '').path, '/')
})

test('funnel: beacons, signup, first send, checkout, admin report, /pricing redirect, inline css', { timeout: 60000 }, async () => {
  const ctx = await createApp({
    NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 'test-secret',
    DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-funnel-')), DEV_MAILBOX: '1', TRUST_PROXY: '1',
    ADMIN_EMAILS: 'owner@example.com'
  })
  ctx.config.smsMode = 'off'
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (path, opt = {}) => {
    const res = await fetch(base + path, {
      method: opt.method || 'GET', redirect: 'manual',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': opt.ip || '203.0.113.9', 'x-device-local': 'dev-funnel-' + String(opt.ip || 'a').replace(/\./g, '_'), cookie: 'eds_did=cookie-funnel-' + String(opt.ip || 'a').replace(/\./g, '_'), ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}) },
      body: opt.body ? JSON.stringify(opt.body) : undefined
    })
    return { status: res.status, headers: res.headers, text: await res.text() }
  }
  const json = r => JSON.parse(r.text || 'null')
  const beacon = (name, sid, data = {}, ua = 'Mozilla/5.0 (iPhone)') => fetch(base + '/api/ev', { method: 'POST', headers: { 'content-type': 'text/plain', 'user-agent': ua }, body: JSON.stringify({ name, sid, path: '/', data }) })
  const make = async (email, ip) => {
    const r = await call('/api/auth/signup', { method: 'POST', ip, body: { name: 'User ' + email, email, password: 'correct-horse', acceptTerms: true } })
    assert.equal(r.status, 201, r.text)
    await ctx.db.query(`update profiles set email_verified_at=now() where email=$1`, [email])
    return json(await call('/api/auth/login', { method: 'POST', ip, body: { email, password: 'correct-horse' } })).token
  }
  try {
    for (const sid of ['sessionaaaa1', 'sessionbbbb2', 'sessioncccc3']) assert.equal((await beacon('landing_view', sid, { utm_source: 'google' })).status, 204)
    await beacon('landing_view', 'sessionaaaa1') // same tab again: still one session
    await beacon('cta_click', 'sessionaaaa1', { cta: 'home-hero' })
    await beacon('cta_click', 'sessionbbbb2', { cta: 'home-hero' })
    await beacon('signup_view', 'sessionaaaa1')
    await beacon('signup_started', 'sessionaaaa1')
    await beacon('landing_view', 'botsession01', {}, 'Googlebot/2.1')
    assert.equal((await fetch(base + '/api/ev', { method: 'POST', body: 'not json' })).status, 204)

    const owner = await make('owner@example.com', '198.51.100.1')
    const u = await make('buyer@example.com', '198.51.100.2')
    const ip = '198.51.100.2'
    const d = json(await call('/api/documents/blank', { method: 'POST', token: u, ip, body: { name: 'Doc', pages: 1 } }))
    const s = d.signers[0]
    await call('/api/documents/' + d.id, { method: 'PUT', token: u, ip, body: { name: 'Doc', ordered: true, expiresDays: 30, remindDays: 3, message: 'x', idv: false, signers: [{ ...s, name: 'Al Ri', email: 'al@example.com' }], fields: [{ type: 'signature', signer: s.id, page: 0, x: .1, y: .7, w: .3, h: .08, required: true }] } })
    const sent = await call('/api/documents/' + d.id + '/send', { method: 'POST', token: u, ip }); assert.equal(sent.status, 200, sent.text)
    const co = await call('/api/billing/checkout', { method: 'POST', token: u, ip, body: { kind: 'doc10' } })
    assert.equal(co.status, 200, co.text)

    assert.equal((await call('/api/admin/funnel', { token: u })).status, 403)
    const rep = json(await call('/api/admin/funnel?days=30', { token: owner }))
    const step = Object.fromEntries(rep.steps.map(x => [x.key, x.count]))
    assert.equal(step.landing_view, 3)
    assert.equal(step.cta_click, 2)
    assert.equal(step.signup_view, 1)
    assert.equal(step.signup_started, 1)
    assert.equal(step.signup_completed, 1, 'admin account excluded')
    assert.equal(step.email_verified, 1)
    assert.equal(step.first_document_sent, 1)
    assert.equal(step.checkout_started, 1)
    assert.equal(step.purchase, 0)
    assert.equal(rep.sources[0].source, 'google')
    assert.equal(rep.ctas[0].cta, 'home-hero')

    const p = await call('/pricing')
    assert.equal(p.status, 301)
    assert.equal(p.headers.get('location'), '/e-signature-pricing')
    const home = await call('/')
    assert.doesNotMatch(home.text, /<link rel="stylesheet" href="\/app\.css">/)
    assert.match(home.text, /<style>[^<]*\.mkt/)
    assert.doesNotMatch(home.text, /pdf-lib|pdf\.min\.js/, 'PDF libraries load lazily')
    assert.match(home.text, /data-cta="home-hero"/)
    const signup = await call('/signup')
    assert.doesNotMatch(signup.text, /href="\/app\.css"/)
    assert.match((await call('/app.js')).headers.get('cache-control'), /s-maxage/)
  } finally {
    server.close()
    await ctx.db.close?.()
  }
})
