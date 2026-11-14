import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { appConfirmUrl } from '../server/confirm-link.js'
import { htmlEmail } from '../server/providers.js'
import { createApp } from '../server/app.js'

test('confirmation links stay on our domain and never use supabase.co', () => {
  const url = appConfirmUrl('https://easydigitalsignatures.com', {
    hashed_token: 'abc+def/g==',
    action_link: 'https://jmjlclckrljimxsccilj.supabase.co/auth/v1/verify?token=abc&type=signup',
    verification_type: 'signup'
  }, 'signup')
  const parsed = new URL(url)
  assert.equal(parsed.origin, 'https://easydigitalsignatures.com')
  assert.equal(parsed.pathname, '/auth/confirm')
  assert.equal(parsed.searchParams.get('token_hash'), 'abc+def/g==')
  assert.equal(parsed.searchParams.get('type'), 'signup')
  assert.doesNotMatch(url, /supabase\.co/i)
})

test('resend confirmation links use the magiclink type on our domain', () => {
  const url = appConfirmUrl('https://easydigitalsignatures.com/', { hashed_token: 'tok_1' }, 'magiclink')
  assert.equal(url, 'https://easydigitalsignatures.com/auth/confirm?token_hash=tok_1&type=magiclink')
})

test('unknown confirm types fall back to signup; missing tokens are rejected', () => {
  const url = appConfirmUrl('https://easydigitalsignatures.com', { hashed_token: 'tok' }, 'recovery')
  assert.equal(new URL(url).searchParams.get('type'), 'signup')
  assert.throws(() => appConfirmUrl('https://easydigitalsignatures.com', { action_link: 'https://example.supabase.co/x' }), /missing confirm token/)
})

test('confirm email HTML preheader hides later URLs from the inbox preview', () => {
  const href = 'https://easydigitalsignatures.com/auth/confirm?token_hash=tok&type=signup'
  const html = htmlEmail({
    title: 'Confirm your email',
    preheader: 'Confirm this address so you can send documents.',
    intro: 'Hi Casey, confirm this address so you can send documents.',
    button: 'Confirm email',
    href,
    brand: { company: 'Easy Digital Signatures', color: '#0f766e' }
  })
  assert.match(html, /display:none/)
  assert.match(html, /Confirm this address so you can send documents\./)
  assert.match(html, /href="https:\/\/easydigitalsignatures\.com\/auth\/confirm\?token_hash=tok&amp;type=signup"/)
  assert.doesNotMatch(html, /supabase\.co/i)
  const preheaderIndex = html.indexOf('Confirm this address so you can send documents.')
  const hrefIndex = html.indexOf(href.replace('&', '&amp;'))
  assert.ok(preheaderIndex > -1 && hrefIndex > preheaderIndex)
})

let ctx
let base

async function boot() {
  const dir = mkdtempSync(join(tmpdir(), 'eds-confirm-link-'))
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

test('signup confirmation email uses a preheader and does not lead with the link', async (t) => {
  await boot()
  t.after(shutdown)

  const missing = await fetch(base + '/auth/confirm', { redirect: 'follow' })
  assert.equal(missing.status, 200)
  assert.match(missing.url, /\/auth\/confirmed\?verified=0/)

  const bogus = await fetch(base + '/auth/confirm?token_hash=not-a-real-token&type=signup')
  assert.equal(bogus.status, 200)
  assert.match(bogus.url, /\/auth\/confirmed\?verified=0/)

  const email = 'confirm-link@eds-mail.test'
  const signup = await fetch(base + '/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.91', 'x-device-local': 'device-confirm-link' },
    body: JSON.stringify({ name: 'Link Check', email, password: 'correct-horse', acceptTerms: true })
  })
  assert.equal(signup.status, 201, await signup.text())
  const mail = (ctx.mailbox || []).find(m => m.to === email && String(m.subject || '').includes('Confirm'))
  assert.ok(mail, 'verification email')
  assert.match(mail.url, /^http:\/\/127\.0\.0\.1:9\/auth\/verify\?token=/)
  assert.doesNotMatch(mail.url, /supabase\.co/i)
  assert.doesNotMatch(String(mail.text || ''), /supabase\.co/i)
  assert.match(String(mail.text || ''), /^Hi Link Check,\s+Confirm this address so you can send documents\./)
  assert.doesNotMatch(String(mail.text || '').split('\n')[0], /https?:\/\//)
})
