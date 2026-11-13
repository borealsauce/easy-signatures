import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

test('contact form emails support and the customer, and chat streams', async () => {
  let seen = null
  const mock = http.createServer((req, res) => {
    let body = ''
    req.on('data', c => { body += c })
    req.on('end', () => {
      seen = JSON.parse(body)
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write('data: {"choices":[{"delta":{"content":"Upload a PDF. "}}]}\n\n')
      res.write('data: {"choices":[{"delta":{"content":"[[contact]]"}}]}\n\n')
      res.write('data: [DONE]\n\n')
      res.end()
    })
  })
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve))
  const aiBase = `http://127.0.0.1:${mock.address().port}`
  const ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    JWT_SECRET: 'test-secret',
    DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-help-')),
    DEV_MAILBOX: '1',
    TRUST_PROXY: '1',
    SUPPORT_TO_EMAIL: 'help@example.com',
    AI_API_KEY: 'test-key',
    AI_BASE_URL: aiBase,
    AI_MODEL: 'test-model'
  })
  const server = await new Promise(resolve => {
    const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const cfg = await fetch(base + '/api/config').then(r => r.json())
    assert.equal(cfg.helpChat, true)
    assert.equal(cfg.prices.doc10, 5)
    assert.equal(cfg.prices.doc50, 10)

    const bot = await fetch(base + '/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
      body: JSON.stringify({ name: 'Bot', email: 'bot@example.com', message: 'buy followers', company_url: 'http://spam.test' })
    })
    assert.equal(bot.status, 200)
    assert.equal(ctx.mailbox.length, 0)

    const sent = await fetch(base + '/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
      body: JSON.stringify({ name: 'Ada', email: 'ada@example.com', message: 'Where is my PDF?', documentId: 'doc-123' })
    })
    assert.equal(sent.status, 200, await sent.text())
    const support = ctx.mailbox.find(m => m.to === 'help@example.com')
    const confirm = ctx.mailbox.find(m => m.to === 'ada@example.com')
    assert.ok(support)
    assert.equal(support.replyTo, 'ada@example.com')
    assert.match(support.text, /doc-123/)
    assert.ok(confirm)

    const chat = await fetch(base + '/api/help/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.10' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'How do I upload?' }] })
    })
    const text = await chat.text()
    assert.equal(chat.status, 200, text)
    assert.match(text, /Upload a PDF/)
    assert.match(seen.messages[0].content, /Do not give legal advice/)
    assert.equal(seen.messages.at(-1).content, 'How do I upload?')
  } finally {
    await new Promise(resolve => server.close(resolve))
    await new Promise(resolve => mock.close(resolve))
    await ctx.close()
  }
})
