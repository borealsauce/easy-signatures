import { readFileSync } from 'node:fs'
import { siteFooterHtml } from '../shared/site-footer.js'
import { logoMarkSvg, WORDMARK, BRAND_NAME } from '../shared/logo.js'

// Inlined into every SEO page so first paint doesn't wait on a separate stylesheet request.
const SEO_CSS = readFileSync(new URL('./seo.css', import.meta.url), 'utf8').replace(/\n/g, '')

export const SITE = 'https://easydigitalsignatures.com'
export const BRAND = 'Easy Digital Signatures'
export const CHECKED = 'November 14, 2026'

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const LOGO = logoMarkSvg({ size: 26 })

// Google Search Console HTML-tag verification. Set GOOGLE_SITE_VERIFICATION in Vercel
// (the content="..." value Google gives you) and every page will carry the tag.
export function verificationMeta() {
  const v = process.env.GOOGLE_SITE_VERIFICATION
  return v ? `<meta name="google-site-verification" content="${esc(v)}">` : ''
}

export const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': SITE + '/#organization',
  name: BRAND,
  url: SITE + '/',
  logo: SITE + '/icon-512.png',
  contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: SITE + '/contact' }
}

export const APP_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': SITE + '/#software',
  name: BRAND,
  url: SITE + '/',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web browser',
  description: 'Send PDFs for electronic signature. Place fields, email a secure signing link, and get a flattened PDF with an audit certificate. Signers do not need an account.',
  publisher: { '@id': SITE + '/#organization' },
  offers: [
    { '@type': 'Offer', name: 'First document', price: '0', priceCurrency: 'USD', description: 'Your first document is free after you verify your email.' },
    { '@type': 'Offer', name: '1 document', price: '1.00', priceCurrency: 'USD', description: 'One document credit, pay as you go.' },
    { '@type': 'Offer', name: '10 documents', price: '5.00', priceCurrency: 'USD', description: 'Ten document credits (50 cents each).' },
    { '@type': 'Offer', name: '50 documents', price: '10.00', priceCurrency: 'USD', description: 'Fifty document credits (20 cents each).' }
  ]
}

export function faqLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } }))
  }
}

export function breadcrumbLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path }))
  }
}

const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`

// Everything that goes in <head> for SEO. Shared by SEO pages and the prerendered homepage.
export function headTags({ path, title, description, image = '/og.png', type = 'website', robots = 'index,follow', jsonld = [] }) {
  const url = SITE + path
  const img = SITE + image
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${robots}">
${verificationMeta()}
<meta property="og:site_name" content="${BRAND}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Easy Digital Signatures: send a PDF, get it signed">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
<meta name="theme-color" content="#06141E">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
${jsonld.map(ld).join('\n')}
<script defer src="/analytics.js"></script>`
}

const CHECK = `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#CCFBF1"/><path d="M6 10.4l2.6 2.5L14 7.6" fill="none" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
export const checklist = items => `<ul class="checks">${items.map(i => `<li>${CHECK}<span>${i}</span></li>`).join('')}</ul>`

export function renderPage(p) {
  const trail = p.breadcrumbs || [['Home', '/'], [p.crumb || p.h1, p.path]]
  const jsonld = [ORG_LD, ...(p.jsonld || []), breadcrumbLd(trail)]
  if (p.faqs?.length) jsonld.push(faqLd(p.faqs))
  const cta = p.cta || 'Start free'
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${headTags({ path: p.path, title: p.title, description: p.description, type: p.ogType, robots: p.robots, jsonld })}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Inter+Tight:wght@600&display=optional" media="print" onload="this.media='all'">
<style>${SEO_CSS}</style>
${p.head || ''}
</head><body class="seo">
<a class="skip" href="#content">Skip to content</a>
<header class="s-hero${p.compactHero ? ' compact' : ''}">
  <nav class="s-nav" aria-label="Main">
    <a class="s-logo" href="/" aria-label="${BRAND_NAME}">${LOGO}<span>${WORDMARK}</span></a>
    <div class="s-links"><a href="/e-signature-pricing">Pricing</a><a href="/sign-pdf-online">Sign PDF free</a><a href="/signature-generator">Signature generator</a><a href="/blog">Blog</a><a href="/#/login">Log in</a><a class="s-btn" href="/#/signup" data-cta="nav">Start free</a></div>
  </nav>
  <div class="s-hero-copy">
    <ol class="crumbs">${trail.map(([n, h], i) => i === trail.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${h}">${esc(n)}</a></li>`).join('')}</ol>
    ${p.eyebrow ? `<div class="s-eyebrow">${esc(p.eyebrow)}</div>` : ''}
    <h1>${p.h1}</h1>
    ${p.lede ? `<p class="s-lede">${p.lede}</p>` : ''}
    ${p.noHeroCta ? '' : `<div class="s-cta"><a class="s-btn big" href="/#/signup" data-cta="hero">${esc(cta)}</a><span class="s-note">First document free · then from 20¢ per document · no subscription</span></div>`}
  </div>
</header>
<main id="content" class="s-main">
${p.body}
${p.faqs?.length ? `<section class="s-faq" aria-labelledby="faq"><h2 id="faq">Frequently asked questions</h2>${p.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><div>${a}</div></details>`).join('')}</section>` : ''}
${p.noBottomCta ? '' : `<section class="s-band"><h2>Send your first document free</h2><p>Upload a PDF, place the fields, and email a signing link. After your free document it’s $1 each, 10 for $5, or 50 for $10.</p><a class="s-btn big" href="/#/signup" data-cta="band">Create a free account</a></section>`}
</main>
${siteFooterHtml()}
${p.scripts || ''}
</body></html>`
}

// Friendly, branded 404 page (noindex) used for unknown verification links.
export function notFoundPage({ path = '/404', h1 = 'Page not found', lede = '', body = '' } = {}) {
  return renderPage({
    path, title: `${h1} | ${BRAND}`, description: lede || 'This page could not be found.',
    h1, lede, crumb: 'Not found', compactHero: true, noHeroCta: true, noBottomCta: true,
    robots: 'noindex,follow',
    body: `<section class="card"><div class="prose">${body}<p><a class="s-btn" href="/">Go to the homepage</a></p></div></section>`
  })
}
