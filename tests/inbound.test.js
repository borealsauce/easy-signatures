import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifySvix, forwardInbound } from '../server/inbound.js'
import { createApp } from '../server/app.js'

const SECRET = 'whsec_' + Buffer.from('test-inbound-secret-123456').toString('base64')
function sign(body, ts = Math.floor(Date.now() / 1000), id = 'msg_1') {
  const sig = createHmac('sha256', Buffer.from(SECRET.slice(6), 'base64')).update(`${id}.${ts}.${body}`).digest('base64')
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` }
}

test('svix signature verification', () => {
  const body = '{"type":"email.received"}'
  assert.equal(verifySvix(SECRET, sign(body), Buffer.from(body)), true)
  assert.equal(verifySvix(SECRET, sign(body), Buffer.from(body + ' ')), false)
  assert.equal(verifySvix(SECRET, sign(body, Math.floor(Date.now() / 1000) - 3600), Buffer.from(body)), false)
  assert.equal(verifySvix(SECRET, { 'svix-id': 'x' }, Buffer.from(body)), false)
})

test('forwardInbound fetches the email and forwards with reply-to and attachments', async () => {
  const calls = []
  const fake = async (url, opts = {}) => {
    calls.push({ url, opts })
    if (url.endsWith('/emails/receiving/em_1')) return new Response(JSON.stringify({ from: 'Jane <jane@client.com>', to: ['support@easydigitalsignatures.com'], subject: 'Help please', html: '<p>Hi</p>', text: 'Hi', attachments: [{ id: 'a1', filename: 'x.pdf' }] }))
    if (url.endsWith('/attachments')) return new Response(JSON.stringify({ data: [{ filename: 'x.pdf', content_type: 'application/pdf', size: 3, download_url: 'https://dl.example/x' }] }))
    if (url === 'https://dl.example/x') return new Response('PDF')
    if (url.endsWith('/emails')) return new Response('{"id":"sent"}')
    return new Response('nope', { status: 404 })
  }
  const config = { resendFullKey: 'k', resendKey: 's', inboundForwardTo: 'owner@example.com', inboundFrom: 'Inbox <inbox@easydigitalsignatures.com>', inboundDomain: 'easydigitalsignatures.com' }
  const out = await forwardInbound(config, { type: 'email.received', data: { email_id: 'em_1' } }, fake)
  assert.equal(out.forwarded, true)
  const send = calls.find(c => c.url.endsWith('/emails'))
  const body = JSON.parse(send.opts.body)
  assert.deepEqual(body.to, ['owner@example.com'])
  assert.equal(body.subject, 'Help please')
  assert.equal(body.reply_to, 'Jane <jane@client.com>')
  assert.equal(body.attachments[0].content, Buffer.from('PDF').toString('base64'))
  assert.equal(send.opts.headers['Idempotency-Key'], 'inbound-em_1')
  assert.deepEqual(await forwardInbound(config, { type: 'email.sent', data: {} }, fake), { skipped: 'type' })
})

test('/api/inbound-email rejects bad signatures', async () => {
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 't', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-in-')), DEV_MAILBOX: '1', RESEND_WEBHOOK_SECRET: SECRET })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const body = JSON.stringify({ type: 'email.sent', data: {} })
    const bad = await fetch(base + '/api/inbound-email', { method: 'POST', headers: { 'content-type': 'application/json', ...sign(body), 'svix-signature': 'v1,AAAA' }, body })
    assert.equal(bad.status, 401)
    const good = await fetch(base + '/api/inbound-email', { method: 'POST', headers: { 'content-type': 'application/json', ...sign(body) }, body })
    assert.equal(good.status, 200)
    assert.equal((await good.json()).skipped, 'type')
  } finally { server.close() }
})
