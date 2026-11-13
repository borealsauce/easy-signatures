import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from '../server/config.js'
import { createApp } from '../server/app.js'

const prodBase = {
  NODE_ENV: 'production',
  APP_URL: 'http://127.0.0.1:9',
  DATABASE_URL: 'memory',
  JWT_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Easy Digital Signatures <signatures@example.com>',
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_WEBHOOK_SECRET: 'whsec_x',
  STRIPE_PRICE_1DOC: 'price_1',
  STRIPE_PRICE_10DOC: 'price_10',
  STRIPE_PRICE_50DOC: 'price_50',
  SUPPORT_TO_EMAIL: 'help@example.com',
  CRON_SECRET: 'cron-secret',
  DATABASE_SSL: '0'
}

test('production starts without Twilio and keeps SMS when the three vars are set', () => {
  const off = loadConfig(prodBase)
  assert.equal(off.smsMode, 'off')
  const on = loadConfig({
    ...prodBase,
    TWILIO_ACCOUNT_SID: 'ACxxx',
    TWILIO_AUTH_TOKEN: 'token',
    TWILIO_VERIFY_SERVICE_SID: 'VAxxx'
  })
  assert.equal(on.smsMode, 'twilio')
  assert.equal(loadConfig({ NODE_ENV: 'test', JWT_SECRET: 'x' }).smsMode, 'dev')
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /Missing production environment variables/)
})

test('email signing works when SMS is off', async () => {
  const ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    JWT_SECRET: 'test-secret',
    DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-sms-off-')),
    DEV_MAILBOX: '1',
    TRUST_PROXY: '1',
    DATABASE_SSL: '0'
  })
  ctx.config.smsMode = 'off'
  const server = await new Promise(resolve => {
    const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  const headers = {
    'content-type': 'application/json',
    'x-forwarded-for': '203.0.113.44',
    'x-device-local': 'device-sms-off-aaa',
    cookie: 'eds_did=cookie-sms-off-aaa'
  }
  const call = (path, opt = {}) => fetch(base + path, {
    method: opt.method || 'GET',
    headers: { ...headers, ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}) },
    body: opt.body ? JSON.stringify(opt.body) : undefined
  })
  try {
    const cfg = await call('/api/config').then(r => r.json())
    assert.equal(cfg.smsEnabled, false)
    const signup = await call('/api/auth/signup', { method: 'POST', body: { name: 'Ada Lovelace', email: 'ada-sms-off@example.com', password: 'correct-horse' } })
    assert.equal(signup.status, 201)
    await ctx.db.query(`update profiles set email_verified_at=now() where email=$1`, ['ada-sms-off@example.com'])
    const login = await call('/api/auth/login', { method: 'POST', body: { email: 'ada-sms-off@example.com', password: 'correct-horse' } }).then(r => r.json())
    const token = login.token
    const phone = await call('/api/phone/start', { method: 'POST', token, body: { phone: '+15555550199' } })
    assert.equal(phone.status, 404)
    const created = await call('/api/documents/blank', { method: 'POST', token, body: { name: 'Letter', pages: 1 } }).then(r => r.json())
    const signer = created.signers[0]
    const saved = await call('/api/documents/' + created.id, {
      method: 'PUT', token,
      body: {
        name: 'Letter', ordered: true, expiresDays: 30, remindDays: 3, message: 'Please sign', idv: false, folder: 'Sales',
        signers: [{ ...signer, name: 'Alex Rivera', email: 'signer-sms-off@example.com' }],
        fields: [{ type: 'signature', signer: signer.id, page: 0, x: 0.1, y: 0.7, w: 0.3, h: 0.08, required: true, label: 'Signature' }]
      }
    })
    assert.equal(saved.status, 200)
    const sent = await call('/api/documents/' + created.id + '/send', { method: 'POST', token })
    const sentJson = await sent.json()
    assert.equal(sent.status, 200, JSON.stringify(sentJson))
    assert.equal(sentJson.billingSource, 'free')
    const signToken = sentJson.links[0].url.split('/sign/')[1]
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const done = await call('/api/sign/' + signToken + '/finish', {
      method: 'POST',
      body: { consent: true, fields: [{ id: (await call('/api/sign/' + signToken).then(r => r.json())).document.fields[0].id, value: png }] }
    })
    assert.equal(done.status, 200, await done.text())
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})
