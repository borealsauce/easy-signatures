import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import { SEO_PAGES } from '../seo/routes.js'

test('SEO pages are server-rendered with unique meta, canonical, JSON-LD, and are in the sitemap', async () => {
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:9', JWT_SECRET: 't', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-seo-')), DEV_MAILBOX: '1' })
  const server = await new Promise(resolve => { const s = ctx.app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const sitemap = await (await fetch(base + '/sitemap.xml')).text()
    const titles = new Set(), descs = new Set()
    for (const path of ['/', ...SEO_PAGES.map(p => p.path)]) {
      const res = await fetch(base + path)
      assert.equal(res.status, 200, path)
      const html = await res.text()
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
      const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1]
      assert.ok(title && desc, path)
      assert.ok(!titles.has(title), 'duplicate title ' + path); titles.add(title)
      assert.ok(!descs.has(desc), 'duplicate description ' + path); descs.add(desc)
      assert.match(html, new RegExp(`<link rel="canonical" href="https://easydigitalsignatures.com${path === '/' ? '/' : path}">`), path)
      assert.match(html, /property="og:image" content="https:\/\/easydigitalsignatures.com\/og.png"/)
      assert.match(html, /<h1[ >]/, path)
      for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1])
      assert.ok(sitemap.includes(`<loc>https://easydigitalsignatures.com${path}</loc>`), 'sitemap ' + path)
    }
    const home = await (await fetch(base + '/')).text()
    assert.match(home, /Send it\. Get it signed\./)
    assert.match(home, /"@type":"FAQPage"/)
    assert.match(await (await fetch(base + '/robots.txt')).text(), /Sitemap: https:\/\/easydigitalsignatures.com\/sitemap.xml/)
    for (const a of ['/og.png', '/favicon.ico', '/apple-touch-icon.png', '/site.webmanifest', '/analytics.js', '/signature-generator.js']) {
      assert.equal((await fetch(base + a)).status, 200, a)
    }
  } finally {
    await new Promise(resolve => server.close(resolve))
    await ctx.close()
  }
})
