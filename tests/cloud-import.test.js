import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from '../server/config.js'
import { createApp } from '../server/app.js'
import { dropboxImportUrl, fetchDropboxFile, isAllowedDropboxHost, safeImportName } from '../server/cloud-import.js'

function mockRes({ status = 200, headers = {}, body = 'ok' } = {}) {
  const bytes = Buffer.from(body)
  let read = false
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    body: {
      getReader() {
        return {
          async read() {
            if (read) return { done: true, value: undefined }
            read = true
            return { done: false, value: new Uint8Array(bytes) }
          },
          async cancel() {}
        }
      }
    }
  }
}

test('Dropbox URL allowlist rejects anything that is not a Dropbox HTTPS link', () => {
  assert.ok(dropboxImportUrl('https://dl.dropboxusercontent.com/s/abc/file.pdf'))
  assert.ok(dropboxImportUrl('https://www.dropbox.com/s/abc/file.pdf?dl=1'))
  assert.ok(dropboxImportUrl('https://dropbox.com/s/abc/file.pdf'))
  assert.ok(dropboxImportUrl('https://dl.dropbox.com/scl/fi/abc/file.docx'))
  assert.ok(isAllowedDropboxHost('content.dropbox.com'))
  assert.equal(dropboxImportUrl('https://content.dropboxapi.com/2/files/download'), null)
  assert.equal(dropboxImportUrl('http://dl.dropboxusercontent.com/s/abc/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://user:pass@dl.dropboxusercontent.com/s/abc/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://dl.dropboxusercontent.com:8443/s/abc/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://evil.dropbox.com.attacker.com/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://dropbox.com.attacker.com/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://evil-dropboxusercontent.com/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://example.com/?u=https://dropbox.com/s/x'), null)
  assert.equal(dropboxImportUrl('https://127.0.0.1/file.pdf'), null)
  assert.equal(dropboxImportUrl('https://localhost/file.pdf'), null)
  assert.equal(dropboxImportUrl('ftp://dropbox.com/file.pdf'), null)
  assert.equal(dropboxImportUrl('javascript:alert(1)'), null)
  assert.equal(dropboxImportUrl(''), null)
  assert.equal(safeImportName('../../etc/passwd'), 'passwd')
  assert.equal(safeImportName('Lease 2026.pdf'), 'Lease 2026.pdf')
})

test('fetchDropboxFile follows only allowlisted redirects and enforces size and type', async () => {
  const pdf = Buffer.from('%PDF-1.4 ok')
  const hops = []
  const fetchImpl = async (url) => {
    hops.push(String(url))
    if (String(url).includes('first')) {
      return mockRes({ status: 302, headers: { location: 'https://dl.dropboxusercontent.com/s/abc/file.pdf' } })
    }
    return mockRes({ status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="Lease.pdf"' }, body: pdf })
  }
  const file = await fetchDropboxFile('https://www.dropbox.com/s/abc/first.pdf?dl=1', { maxBytes: 1024, fetchImpl })
  assert.equal(file.name, 'Lease.pdf')
  assert.equal(file.type, 'application/pdf')
  assert.deepEqual(file.bytes, pdf)
  assert.deepEqual(hops, ['https://www.dropbox.com/s/abc/first.pdf?dl=1', 'https://dl.dropboxusercontent.com/s/abc/file.pdf'])

  await assert.rejects(
    () => fetchDropboxFile('https://www.dropbox.com/s/abc/first.pdf', {
      maxBytes: 1024,
      fetchImpl: async () => mockRes({ status: 302, headers: { location: 'https://evil.example/steal' } })
    }),
    /isn’t valid/
  )

  await assert.rejects(
    () => fetchDropboxFile('https://dl.dropboxusercontent.com/s/abc/file.pdf', {
      maxBytes: 8,
      fetchImpl: async () => mockRes({ status: 200, headers: { 'content-length': '9', 'content-type': 'application/pdf' }, body: pdf })
    }),
    /MB or smaller/
  )

  await assert.rejects(
    () => fetchDropboxFile('https://dl.dropboxusercontent.com/s/abc/file.pdf', {
      maxBytes: 25 * 1024 * 1024,
      fetchImpl: async () => mockRes({ status: 200, headers: { 'content-type': 'text/html' }, body: '<!DOCTYPE html><html>login</html>' })
    }),
    /Could not download/
  )

  await assert.rejects(
    () => fetchDropboxFile('https://example.com/file.pdf', { maxBytes: 1024, fetchImpl: async () => mockRes() }),
    /isn’t valid/
  )
})

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

test('cloud import keys are optional in production and omitted from /api/config until all required values are set', async () => {
  const off = loadConfig(prodBase)
  assert.equal(off.dropboxAppKey, '')
  assert.equal(off.googlePickerClientId, '')
  const partial = loadConfig({
    ...prodBase,
    GOOGLE_PICKER_CLIENT_ID: '123.apps.googleusercontent.com',
    GOOGLE_PICKER_API_KEY: 'test-api-key'
  })
  assert.equal(partial.googlePickerClientId, '123.apps.googleusercontent.com')
  assert.equal(partial.googlePickerAppId, '')

  const dir = mkdtempSync(join(tmpdir(), 'eds-cloud-off-'))
  const ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    JWT_SECRET: 'test-secret',
    DATA_DIR: dir,
    DEV_MAILBOX: '1',
    TRUST_PROXY: '1'
  })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const cfg = await fetch(base + '/api/config').then(r => r.json())
    assert.equal(cfg.dropboxAppKey, undefined)
    assert.equal(cfg.googlePickerClientId, undefined)
    assert.equal(cfg.googlePickerApiKey, undefined)
    assert.equal(cfg.googlePickerAppId, undefined)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})

test('/api/config exposes cloud keys only when complete, and import-fetch is authenticated and host-locked', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'eds-cloud-on-'))
  const ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    JWT_SECRET: 'test-secret',
    DATA_DIR: dir,
    DEV_MAILBOX: '1',
    TRUST_PROXY: '1',
    DROPBOX_APP_KEY: 'test-dropbox-key',
    GOOGLE_PICKER_CLIENT_ID: '123.apps.googleusercontent.com',
    GOOGLE_PICKER_API_KEY: 'test-api-key',
    GOOGLE_PICKER_APP_ID: '1234567890'
  })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const headers = {
    'content-type': 'application/json',
    'x-forwarded-for': '203.0.113.80',
    'x-device-local': 'device-cloud-aaaa',
    cookie: 'eds_did=cookie-cloud-aaaa'
  }
  const call = (path, opt = {}) => fetch(base + path, {
    method: opt.method || 'GET',
    headers: { ...headers, ...(opt.token ? { authorization: 'Bearer ' + opt.token } : {}) },
    body: opt.body ? JSON.stringify(opt.body) : undefined
  })
  try {
    const cfg = await call('/api/config').then(r => r.json())
    assert.equal(cfg.dropboxAppKey, 'test-dropbox-key')
    assert.equal(cfg.googlePickerClientId, '123.apps.googleusercontent.com')
    assert.equal(cfg.googlePickerApiKey, 'test-api-key')
    assert.equal(cfg.googlePickerAppId, '1234567890')

    const unauth = await call('/api/documents/import-fetch', { method: 'POST', body: { url: 'https://dl.dropboxusercontent.com/s/abc/file.pdf' } })
    assert.equal(unauth.status, 401)

    const signup = await call('/api/auth/signup', { method: 'POST', body: { name: 'Pat Owner', email: 'cloud-import@example.com', password: 'correct-horse', acceptTerms: true } })
    assert.equal(signup.status, 201, await signup.text())
    await ctx.db.query('update profiles set email_verified_at=now() where email=$1', ['cloud-import@example.com'])
    const login = await call('/api/auth/login', { method: 'POST', body: { email: 'cloud-import@example.com', password: 'correct-horse' } }).then(r => r.json())
    const token = login.token
    assert.ok(token)

    const blocked = await call('/api/documents/import-fetch', { method: 'POST', token, body: { url: 'https://example.com/secret.pdf' } })
    assert.equal(blocked.status, 400)
    const blockedJson = await blocked.json()
    assert.match(blockedJson.message, /isn’t valid/)

    const bad = await call('/api/documents/import-fetch', { method: 'POST', token, body: { url: 'https://evil.dropbox.com.attacker.com/file.pdf' } })
    assert.equal(bad.status, 400)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})
