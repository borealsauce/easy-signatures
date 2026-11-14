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
    for (const bad of ['/verify/not-a-real-id', '/verify/00000000-0000-0000-0000-000000000000']) {
      const v = await fetch(base + bad)
      assert.equal(v.status, 404, bad)
      assert.match(await v.text(), /couldn’t find that document/)
    }
    for (const legal of ['/privacy', '/terms']) assert.match(await (await fetch(base + legal)).text(), /Last updated Nov 14, 2026/)
    assert.match(await (await fetch(base + '/')).text(), /href="\/privacy"/)
    const privacyHtml = await (await fetch(base + '/privacy')).text()
    for (const re of [/CCPA\/CPRA/, /Right to delete/, /Data processing summary/, /<b>Vercel<\/b>/, /<b>Supabase<\/b>/, /<b>Resend<\/b>/, /<b>Stripe<\/b>/, /18 and older/]) assert.match(privacyHtml, re)
    const terms = await (await fetch(base + '/terms')).text()
    assert.match(terms, /Acceptance of Terms/)
    assert.match(terms, /greater of \(a\) \$50/)
    for (const re of [/AAA\) under its Consumer Arbitration Rules/, /Class-action waiver/, /Jury-trial waiver/, /30-day opt-out/, /Small claims/, /laws of the State of California/, /San Diego County/, /No identity verification/, /wills, codicils/, /at least 18 years old/, /Acceptable use and abuse policy/, /DMCA/, /SHA-256/, /Force majeure/, /No waiver/, /Assignment/, /Entire agreement/, /continued access to or use/, /support@easydigitalsignatures\.com/, /applies to claims brought in arbitration, in small claims court/]) assert.match(terms, re)
    assert.match(terms, /six \(6\) months/)
    assert.match(await (await fetch(base + '/signature-generator')).text(), /By using this tool you agree to our/)
    const noTerms = await fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'No Terms', email: 'noterms@example.com', password: 'correct-horse' }) })
    assert.equal(noTerms.status, 400)
    assert.equal((await noTerms.json()).error, 'terms')
    const ok = await fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Yes Terms', email: 'yesterms@example.com', password: 'correct-horse', acceptTerms: true }) })
    assert.equal(ok.status, 201)
    const row = (await ctx.db.query(`select terms_version, terms_accepted_at from profiles where email='yesterms@example.com'`)).rows[0]
    assert.equal(row.terms_version, '2026-11-14.2')
    assert.ok(row.terms_accepted_at)
    const home = await (await fetch(base + '/')).text()
    assert.match(home, /Use of this site constitutes acceptance of our/)
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
