import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

test('homepage stays up and the three layouts are separate pages', async () => {
  const ctx = await createApp({
    NODE_ENV: 'test',
    APP_URL: 'http://127.0.0.1:9',
    JWT_SECRET: 'test-secret',
    DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-pages-')),
    DEV_MAILBOX: '1'
  })
  const server = await new Promise(resolve => {
    const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const home = await fetch(base + '/')
    const html = await home.text()
    assert.equal(home.status, 200)
    assert.match(html, /Create your free account|app\.js/)
    assert.doesNotMatch(html, /DEMO ONLY/)
    for (const id of ['a', 'b', 'c']) {
      const res = await fetch(base + '/layouts/' + id)
      const page = await res.text()
      assert.equal(res.status, 200, id)
      assert.match(page, /Sample data/)
      assert.match(page, /\$1/)
      assert.match(page, /\$10/)
      assert.match(page, /100/)
    }
    const index = await fetch(base + '/layouts')
    assert.match(await index.text(), /not the live homepage|Current homepage/)
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})
