import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'

test('free Sign PDF tool page: SEO tags, schema, client script, aliases, and home link', async () => {
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 't', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-sp-')), DEV_MAILBOX: '1' })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const html = await (await fetch(base + '/sign-pdf-online')).text()
    assert.match(html, /<title>Sign PDF Online Free: Fill &amp; Sign PDFs, No Sign-Up<\/title>/)
    assert.match(html, /<h1>Sign PDF online free<\/h1>/)
    assert.match(html, /"@type":"SoftwareApplication","@id":"https:\/\/easydigitalsignatures.com\/sign-pdf-online#app"/)
    assert.match(html, /"@type":"FAQPage"/)
    assert.match(html, /never leaves your browser/)
    assert.match(html, /id="sp-file"/)
    assert.match(html, /<script src="\/sign-pdf.js" defer><\/script>/)
    const js = await fetch(base + '/sign-pdf.js')
    assert.equal(js.status, 200)
    assert.match(js.headers.get('content-type'), /javascript/)
    for (const a of ['/sign-pdf-free', '/free-pdf-signer']) {
      const r = await fetch(base + a, { redirect: 'manual' })
      assert.equal(r.status, 301, a)
      assert.equal(r.headers.get('location'), '/sign-pdf-online')
    }
    assert.match(await (await fetch(base + '/')).text(), /href="\/sign-pdf-online" data-cta="home-free-tool"/)
    assert.match(await (await fetch(base + '/fill-and-sign-pdf')).text(), /free Fill &amp; Sign PDF tool/)
  } finally { server.close() }
})
