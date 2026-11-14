import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

test('promo codes, admin toggle, block and delete', { timeout: 60000 }, async () => {
  const ctx = await createApp({
    NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 'test-secret',
    DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-promo-')), DEV_MAILBOX: '1', TRUST_PROXY: '1',
    ADMIN_EMAILS: 'owner@example.com'
  })
  ctx.config.smsMode = 'off'
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (path, opt = {}) => {
    const res = await fetch(base + path, {
      method: opt.method || 'GET',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': opt.ip || '203.0.113.77', 'x-device-local': 'dev-promo-' + (opt.ip || 'a'), ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}) },
      body: opt.body ? JSON.stringify(opt.body) : undefined
    })
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  const make = async (email, promo, ip) => {
    const r = await call('/api/auth/signup', { method: 'POST', ip, body: { name: 'User ' + email, email, password: 'correct-horse', promo } })
    assert.equal(r.status, 201, JSON.stringify(r.json))
    await ctx.db.query(`update profiles set email_verified_at=now() where email=$1`, [email])
    const l = await call('/api/auth/login', { method: 'POST', ip, body: { email, password: 'correct-horse' } })
    return { token: l.json.token, signup: r.json }
  }
  const sendOne = async (token, ip) => {
    const d = (await call('/api/documents/blank', { method: 'POST', token, ip, body: { name: 'Doc', pages: 1 } })).json
    const s = d.signers[0]
    await call('/api/documents/' + d.id, { method: 'PUT', token, ip, body: { name: 'Doc', ordered: true, expiresDays: 30, remindDays: 3, message: 'x', idv: false, folder: 'Sales', signers: [{ ...s, name: 'Al Ri', email: 'al@example.com' }], fields: [{ type: 'signature', signer: s.id, page: 0, x: .1, y: .7, w: .3, h: .08, required: true }] } })
    return call('/api/documents/' + d.id + '/send', { method: 'POST', token, ip })
  }
  try {
    const owner = await make('owner@example.com', '', '198.51.100.1')
    // seeded codes
    const bad = await call('/api/auth/signup', { method: 'POST', body: { name: 'X', email: 'x@example.com', password: 'correct-horse', promo: 'NOPE' } })
    assert.equal(bad.status, 404)
    assert.match(bad.json.message, /isn’t valid/)
    const u = await make('vip@example.com', 'vip100', '198.51.100.2')
    assert.equal(u.signup.promo.ok, true)
    let me = (await call('/api/me', { token: u.token, ip: '198.51.100.2' })).json
    assert.equal(me.usage.promoCredits, 100)
    assert.equal(me.me.isAdmin, false)
    const again = await call('/api/promo/redeem', { method: 'POST', token: u.token, ip: '198.51.100.2', body: { code: 'VIP100' } })
    assert.equal(again.status, 409)
    const v10 = await call('/api/promo/redeem', { method: 'POST', token: u.token, ip: '198.51.100.2', body: { code: 'VIP10' } })
    assert.equal(v10.status, 200)
    const sent = await sendOne(u.token, '198.51.100.2')
    assert.equal(sent.json.billingSource, 'promo:VIP100')
    me = (await call('/api/me', { token: u.token, ip: '198.51.100.2' })).json
    assert.equal(me.usage.promoCredits, 109)
    // admin gate
    assert.equal((await call('/api/admin/promo', { token: u.token })).status, 403)
    const list = (await call('/api/admin/promo', { token: owner.token })).json.codes
    assert.deepEqual(list.map(c => c.code).sort(), ['VIP10', 'VIP100', 'VIP50'])
    assert.equal(list.find(c => c.code === 'VIP100').redeemers[0].used, 1)
    // toggle off
    assert.equal((await call('/api/admin/promo/VIP100', { method: 'PATCH', token: owner.token, body: { active: false } })).status, 200)
    assert.equal((await call('/api/admin/promo/VIP10', { method: 'PATCH', token: owner.token, body: { active: false } })).status, 200)
    me = (await call('/api/me', { token: u.token, ip: '198.51.100.2' })).json
    assert.equal(me.usage.promoCredits, 0)
    const off = await call('/api/promo/redeem', { method: 'POST', token: owner.token, body: { code: 'VIP100' } })
    assert.equal(off.status, 410)
    const html = await fetch(base + '/admin').then(r => r.text())
    assert.match(html, /Owner admin/)
    const s2 = await sendOne(u.token, '198.51.100.2')
    assert.notEqual(s2.json.billingSource, 'promo:VIP100')
    // create code
    assert.equal((await call('/api/admin/promo', { method: 'POST', token: owner.token, body: { code: 'friends', freeDocs: 5 } })).status, 201)
    // dashboard tabs
    const inc = await call('/api/admin/income', { token: owner.token })
    assert.equal(inc.status, 200, JSON.stringify(inc.json))
    const docs = (await call('/api/admin/documents', { token: owner.token })).json.documents
    assert.ok(docs.length >= 2)
    assert.ok(docs[0].recipients.length)
    const open = docs.find(d => ['sent', 'waiting'].includes(d.status))
    const rs = await call('/api/admin/documents/' + open.id + '/resend', { method: 'POST', token: owner.token })
    assert.equal(rs.status, 200, JSON.stringify(rs.json))
    const vd = await call('/api/admin/documents/' + open.id + '/void', { method: 'POST', token: owner.token })
    assert.equal(vd.json.status, 'voided')
    await call('/api/contact', { method: 'POST', body: { name: 'Pat', email: 'pat@example.com', message: 'How do I add a signer?' } })
    const sup = (await call('/api/admin/support', { token: owner.token })).json.messages
    assert.equal(sup[0].kind, 'contact')
    const act = (await call('/api/admin/activity', { token: owner.token })).json
    assert.ok(act.totals.users >= 2)
    const hl = await call('/api/admin/health', { token: owner.token })
    assert.equal(hl.json.database.ok, true)
    assert.equal((await call('/api/admin/health', { token: u.token })).status, 403)
    // users: block, unblock, delete; owner protected
    const users = (await call('/api/admin/users', { token: owner.token })).json.users
    const vip = users.find(x => x.email === 'vip@example.com')
    const own = users.find(x => x.email === 'owner@example.com')
    assert.equal(own.protected, true)
    assert.equal((await call('/api/admin/users/' + own.id, { method: 'DELETE', token: owner.token })).status, 403)
    const det = (await call('/api/admin/users/' + vip.id, { token: owner.token })).json
    assert.equal(det.promos.length, 2)
    const cr = await call('/api/admin/users/' + vip.id + '/credits', { method: 'POST', token: owner.token, body: { delta: 7 } })
    assert.equal(cr.json.credits, 7)
    assert.equal((await call('/api/admin/users/' + vip.id + '/credits', { method: 'POST', token: owner.token, body: { delta: -100 } })).json.credits, 0)
    assert.equal((await call('/api/admin/users/' + vip.id + '/block', { method: 'POST', token: owner.token, body: { blocked: true } })).status, 200)
    const blockedLogin = await call('/api/auth/login', { method: 'POST', body: { email: 'vip@example.com', password: 'correct-horse' } })
    assert.equal(blockedLogin.status, 403)
    assert.equal(blockedLogin.json.error, 'account_disabled')
    assert.equal((await call('/api/me', { token: u.token })).status, 403)
    assert.equal((await call('/api/admin/users/' + vip.id + '/block', { method: 'POST', token: owner.token, body: { blocked: false } })).status, 200)
    assert.equal((await call('/api/me', { token: u.token })).status, 200)
    assert.equal((await call('/api/admin/users/' + vip.id, { method: 'DELETE', token: owner.token })).status, 200)
    assert.equal((await ctx.db.query(`select count(*)::int n from profiles where email='vip@example.com'`)).rows[0].n, 0)
    const fresh = await call('/api/auth/signup', { method: 'POST', ip: '198.51.100.2', body: { name: 'Vip Again', email: 'vip@example.com', password: 'correct-horse' } })
    assert.equal(fresh.status, 201)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})

test('signup still succeeds when the verification email fails', async () => {
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 'test-secret', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-mail-')), DEV_MAILBOX: '1', TRUST_PROXY: '1' })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const realSend = ctx.app.locals.ctx.email.send
  ctx.app.locals.ctx.email.send = async () => { throw new Error('domain not verified') }
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.88' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, json: await r.json() }))
  try {
    const r = await post('/api/auth/signup', { name: 'Mail Fail', email: 'mf@example.com', password: 'correct-horse' })
    assert.equal(r.status, 201)
    assert.equal(r.json.emailSent, false)
    const again = await post('/api/auth/signup', { name: 'Mail Fail', email: 'mf@example.com', password: 'correct-horse' })
    assert.equal(again.status, 409)
    assert.equal(again.json.error, 'exists_unverified')
    ctx.app.locals.ctx.email.send = realSend
    const rs = await post('/api/auth/resend-email', { email: 'mf@example.com' })
    assert.equal(rs.status, 200)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})

test('password reset, logout and wrong password (local mode)', async () => {
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 'test-secret', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-reset-')), DEV_MAILBOX: '1', TRUST_PROXY: '1' })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.99' }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, json: await r.json() }))
  try {
    assert.equal((await post('/api/auth/signup', { name: 'Rae Set', email: 'rae@example.com', password: 'first-pass-1' })).status, 201)
    await ctx.db.query(`update profiles set email_verified_at=now() where email='rae@example.com'`)
    const wrong = await post('/api/auth/login', { email: 'rae@example.com', password: 'nope-nope-1' })
    assert.equal(wrong.status, 401)
    assert.match(wrong.json.message, /incorrect/)
    assert.equal((await post('/api/auth/forgot', { email: 'rae@example.com' })).status, 200)
    assert.equal((await post('/api/auth/forgot', { email: 'nobody@example.com' })).status, 200)
    const mail = ctx.mailbox.filter(m => /Reset your/.test(m.subject)).at(-1)
    const token = decodeURIComponent((mail.url || mail.text).split('/reset/')[1].split(/\s/)[0])
    assert.equal((await post('/api/auth/reset', { token, password: 'second-pass-2' })).status, 200)
    assert.equal((await post('/api/auth/reset', { token, password: 'third-pass-3' })).json.error, 'reset_invalid')
    assert.equal((await post('/api/auth/login', { email: 'rae@example.com', password: 'first-pass-1' })).status, 401)
    const ok = await post('/api/auth/login', { email: 'rae@example.com', password: 'second-pass-2' })
    assert.equal(ok.status, 200)
    assert.equal((await post('/api/auth/logout', {})).status, 200)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})

test('reminders: manual resend, resend all, 24h limit, cron auto reminders, sender digest', { timeout: 60000 }, async () => {
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 'test-secret', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-rem-')), DEV_MAILBOX: '1', TRUST_PROXY: '1' })
  ctx.config.smsMode = 'off'
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (path, opt = {}) => {
    const res = await fetch(base + path, { method: opt.method || 'GET', headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.120', 'x-device-local': 'dev-rem-1', ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}), ...(opt.headers || {}) }, body: opt.body ? JSON.stringify(opt.body) : undefined })
    return { status: res.status, json: await res.json().catch(() => null) }
  }
  try {
    await call('/api/auth/signup', { method: 'POST', body: { name: 'Sam Sender', email: 'sam@example.com', password: 'correct-horse', promo: 'VIP10' } })
    await ctx.db.query(`update profiles set email_verified_at=now() where email='sam@example.com'`)
    const token = (await call('/api/auth/login', { method: 'POST', body: { email: 'sam@example.com', password: 'correct-horse' } })).json.token
    const settings = await call('/api/settings', { method: 'PUT', token, body: { reminderDefault: 2, senderNudgeDays: 3 } })
    assert.equal(settings.json.reminderDefault, 2)
    assert.equal(settings.json.senderNudgeDays, 3)
    const ids = []
    for (const nm of ['NDA', 'Lease']) {
      const d = (await call('/api/documents/blank', { method: 'POST', token, body: { name: nm, pages: 1 } })).json
      assert.equal(d.remindDays, 2)
      const s = d.signers[0]
      const bo = crypto.randomUUID()
      await call('/api/documents/' + d.id, { method: 'PUT', token, body: { name: nm, ordered: false, expiresDays: 30, remindDays: 2, message: 'x', idv: false, folder: 'Sales', signers: [{ ...s, name: 'Jane Doe', email: 'jane@example.com' }, { id: bo, name: 'Bo Lee', email: 'bo@example.com', role: 'signer', color: '#db2777' }], fields: [{ type: 'signature', signer: s.id, page: 0, x: .1, y: .7, w: .3, h: .08, required: true }, { type: 'signature', signer: bo, page: 0, x: .5, y: .7, w: .3, h: .08, required: true }] } })
      const sent = await call('/api/documents/' + d.id + '/send', { method: 'POST', token })
      assert.equal(sent.status, 200, JSON.stringify(sent.json))
      ids.push(d.id)
    }
    const credits = async () => (await call('/api/me', { token })).json.usage
    const before = await credits()
    const pre = (await call('/api/documents/remind-all', { method: 'POST', token, body: { dryRun: true } })).json
    assert.deepEqual([pre.documents, pre.signers, pre.skipped], [2, 4, 0])
    const one = await call('/api/documents/' + ids[0] + '/remind', { method: 'POST', token })
    assert.equal(one.json.reminded, 2)
    const again = await call('/api/documents/' + ids[0] + '/remind', { method: 'POST', token })
    assert.equal(again.status, 429)
    assert.match(again.json.message, /24 hours/)
    const all = (await call('/api/documents/remind-all', { method: 'POST', token, body: {} })).json
    assert.deepEqual([all.documents, all.signers, all.skipped, all.reminded], [1, 2, 1, 2])
    const after = await credits()
    assert.equal(after.promoCredits, before.promoCredits)
    assert.equal(after.credits, before.credits)
    assert.ok(ctx.mailbox.some(m => /^Reminder: “NDA”/.test(m.subject)))
    // cron: too soon → nothing; after time travel → auto reminders, capped at 5
    const cron = () => call('/api/cron/reminders', { headers: { authorization: 'Bearer dev-cron' } })
    assert.equal((await call('/api/cron/reminders')).status, 401)
    assert.equal((await cron()).json.reminded, 0)
    for (let i = 0; i < 7; i++) {
      await ctx.db.query(`update documents set sent_at=now() - interval '20 days', last_reminded_at=now() - interval '3 days' where owner_id=(select id from profiles where email='sam@example.com')`)
      await ctx.db.query(`update profiles set last_nudged_at=null`)
      await cron()
    }
    const counts = (await ctx.db.query(`select auto_reminders from documents where id = any($1::uuid[])`, [ids])).rows.map(r => r.auto_reminders)
    assert.deepEqual(counts, [5, 5])
    const digest = ctx.mailbox.filter(m => /still waiting|waiting for signatures/.test(m.subject))
    assert.ok(digest.length >= 1)
    const link = digest.at(-1).text.match(/\/r\/([^\s]+)/)[1]
    await ctx.db.query(`update documents set last_reminded_at=null`)
    const page = await fetch(base + '/r/' + link).then(r => r.text())
    assert.match(page, /Resend now/)
    const done = await fetch(base + '/r/' + link, { method: 'POST' }).then(r => r.text())
    assert.match(done, /Sent the signing link again/)
    // per-document cadence change after sending, and Off stops auto reminders
    assert.equal((await call('/api/documents/' + ids[0] + '/reminders', { method: 'PATCH', token, body: { remindDays: 0 } })).json.remindDays, 0)
    assert.equal((await call('/api/documents/' + ids[0] + '/reminders', { method: 'PATCH', token, body: { remindDays: 5 } })).status, 400)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})
