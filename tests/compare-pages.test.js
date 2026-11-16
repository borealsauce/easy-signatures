import test from 'node:test'
import assert from 'node:assert/strict'
import { renderPage } from '../seo/layout.js'
import { COMPARE_PAGES } from '../seo/compare-more.js'

test('comparison and feature pages: FAQ schema, free-tool link, dated sources', () => {
  const paths = COMPARE_PAGES.map(p => p.path)
  for (const p of ['/signnow-alternative', '/smallpdf-sign-alternative', '/formswift-alternative', '/best-free-e-signature-software', '/bulk-send-documents-for-signature', '/e-signature-templates']) assert.ok(paths.includes(p), p)
  for (const page of COMPARE_PAGES) {
    const html = renderPage(page)
    assert.match(html, /"@type":"FAQPage"/, page.path)
    assert.match(html, /href="\/sign-pdf-online"/, page.path)
    assert.ok(page.faqs.length >= 4, page.path)
    assert.ok(page.title.length <= 70, page.path + ' title length ' + page.title.length)
    assert.ok(page.description.length <= 170, page.path + ' description length ' + page.description.length)
  }
  for (const p of COMPARE_PAGES.filter(p => /alternative|best-free/.test(p.path))) assert.match(renderPage(p), /November 16, 2026/, p.path)
  assert.match(renderPage(COMPARE_PAGES.find(p => p.path === '/formswift-alternative')), /formswift\.com\/lp\/goodbye/)
})
