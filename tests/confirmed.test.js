import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

let ctx
let base

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-confirmed-'))
  ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    TRUST_PROXY: '1',
    JWT_SECRET: 'test-secret',
    DATA_DIR: dir,
    DEV_MAILBOX: '1',
    SIGNUP_PER_HOUR: '20',
    SIGNUP_PER_DAY: '50'
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

function mailTo(email) {
  return (ctx.mailbox || []).find(m => m.to === email && String(m.subject || '').includes('Confirm'))
}

test('email confirmation lands on a celebratory page', async (t) => {
  await boot()
  t.after(shutdown)

  const page = await fetch(base + '/auth/confirmed')
  assert.equal(page.status, 200)
  assert.match(page.headers.get('x-robots-tag') || '', /noindex/)
  const html = await page.text()
  assert.match(html, /You're in!/)
  assert.match(html, /first document is free/)
  assert.doesNotMatch(html, /VIP100|VIP50|VIP10/)
  assert.match(html, /prefers-reduced-motion/)
  assert.match(html, /Resend confirmation/)
  assert.match(html, /Go to my dashboard/)

  const bad = await fetch(base + '/auth/verify')
  assert.equal(bad.status, 200)
  assert.match(bad.url, /\/auth\/confirmed\?verified=0/)
  const badHtml = await bad.text()
  assert.match(badHtml, /You're in!/) // shell is the same; client paints invalid state

  const email = 'confirm.page@example.com'
  const signup = await fetch(base + '/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.88', 'x-device-local': 'device-confirm-aaaa' },
    body: JSON.stringify({ name: 'Casey Confirm', email, password: 'correct-horse', acceptTerms: true })
  })
  assert.equal(signup.status, 201, await signup.text())
  const confirm = mailTo(email)
  assert.ok(confirm?.url, 'verification email')
  const token = new URL(confirm.url).searchParams.get('token')
  const verified = await fetch(base + '/auth/verify?token=' + token)
  assert.equal(verified.status, 200)
  assert.match(verified.url, /\/auth\/confirmed\?/)
  assert.match(verified.url, /verified=1/)
  assert.match(verified.url, /email=confirm\.page%40example\.com/)
  const okHtml = await verified.text()
  assert.match(okHtml, /You're in!/)
  assert.match(okHtml, /let’s get signing|let's get signing/)
})
