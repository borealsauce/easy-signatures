import test from 'node:test'
import assert from 'node:assert/strict'
import { renderPage } from '../seo/layout.js'
import { GUIDE_PAGES } from '../seo/guides-more.js'
import { SEO_PAGES } from '../seo/routes.js'
import { POSTS } from '../seo/blog.js'

const lds = html => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]))

test('guide pages: unique paths, valid schema, links to the free tool and signup', () => {
  const expected = ['/sign-pdf-on-iphone', '/sign-pdf-on-android', '/sign-pdf-on-mac', '/sign-pdf-on-windows', '/sign-pdf-without-adobe', '/contractor-agreement-e-signature', '/get-document-signed-by-email', '/notarization-vs-e-signature', '/electronic-signature-laws-by-state', '/waiver-e-signature']
  assert.deepEqual(GUIDE_PAGES.map(p => p.path), expected)
  const all = SEO_PAGES.map(p => p.path)
  assert.equal(new Set(all).size, all.length, 'no duplicate paths')
  const titles = SEO_PAGES.map(p => p.title)
  assert.equal(new Set(titles).size, titles.length, 'no duplicate titles')
  for (const page of GUIDE_PAGES) {
    const html = renderPage(page)
    assert.ok(page.title.length <= 70, page.path + ' title ' + page.title.length)
    assert.ok(page.description.length <= 170, page.path + ' description ' + page.description.length)
    assert.match(html, /href="\/sign-pdf-online"/, page.path)
    assert.match(html, /href="\/#\/signup"/, page.path)
    const types = lds(html).map(x => x['@type'])
    assert.ok(types.includes('FAQPage') && types.includes('BreadcrumbList'), page.path)
    assert.ok(page.faqs.length >= 4, page.path)
    const how = lds(html).find(x => x['@type'] === 'HowTo')
    if (/^\/sign-pdf-on-|without-adobe|by-email/.test(page.path)) {
      assert.ok(how, page.path + ' HowTo')
      assert.ok(how.step.length >= 3 && how.step.every(s => s.text && !/[<>]/.test(s.text)), page.path)
    }
    assert.doesNotMatch(html, /undefined|\[object Object\]/, page.path)
  }
  assert.match(renderPage(GUIDE_PAGES.find(p => p.path === '/electronic-signature-laws-by-state')), /815 ILCS 333/)
  assert.match(renderPage(GUIDE_PAGES.find(p => p.path === '/notarization-vs-e-signature')), /don’t provide notaries/)
})

test('how-to blog posts carry HowTo schema built from their own steps', () => {
  for (const p of POSTS.filter(p => p.slug.startsWith('how-to-'))) {
    const how = lds(renderPage(p)).find(x => x['@type'] === 'HowTo')
    assert.ok(how && how.step.length >= 2, p.slug)
  }
})

test('existing use-case pages link the free signer', () => {
  for (const path of ['/nda', '/leases', '/contractors', '/real-estate', '/hr-onboarding']) {
    assert.match(renderPage(SEO_PAGES.find(p => p.path === path)), /href="\/sign-pdf-online"/, path)
  }
})
