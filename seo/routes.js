import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITE, ORG_LD, APP_LD, faqLd, headTags, renderPage } from './layout.js'
import { PAGES } from './pages.js'
import { MORE_PAGES } from './landing-more.js'
import { POSTS, BLOG_INDEX } from './blog.js'
import { TOOL_PAGE } from './tool-page.js'
import { SIGN_PDF_PAGE } from './sign-pdf-page.js'
import { PRIVACY, TERMS } from './legal.js'
import { marketingHtml } from '../marketing.js'
import { HOME_FAQ } from '../shared/home-faq.js'

const here = dirname(fileURLToPath(import.meta.url))
const LASTMOD = '2026-11-16'
export const INDEXNOW_KEY = '9c0f7c0d74dd681b044655de2b7164e1'
const HTML_CACHE = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
const ASSET_CACHE = 'public, max-age=86400, s-maxage=604800'

export const SEO_PAGES = [SIGN_PDF_PAGE, ...PAGES, ...MORE_PAGES, TOOL_PAGE, BLOG_INDEX, ...POSTS, PRIVACY, TERMS]

const HOME = {
  path: '/',
  title: 'Easy Digital Signatures: Free E-Signature Online, Then $1 per Document',
  description: 'Send PDFs for electronic signature. Place fields, email a secure link, and get a signed PDF with an audit certificate. First document free, then $1 or less.'
}

const WEBSITE_LD = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE + '/#website', name: 'Easy Digital Signatures', url: SITE + '/', publisher: { '@id': SITE + '/#organization' } }

// Shell pages that the client app renders. They get real titles and analytics, but no body.
const SHELLS = {
  '/pricing': { title: 'Pricing | Easy Digital Signatures', description: 'First document free, then $1 per document, 10 for $5, or 50 for $10. No subscription.', canonical: '/', prerender: true },
  '/contact': { title: 'Contact Easy Digital Signatures', description: 'Questions about a document or your account? Send us a message and we’ll reply by email.' },
  '/signup': { title: 'Create your free account | Easy Digital Signatures', description: 'Create a free account and send your first document for e-signature at no cost.' },
  '/login': { title: 'Log in | Easy Digital Signatures', description: 'Log in to send documents for signature.', robots: 'noindex,follow' },
  '/app': { title: 'Dashboard | Easy Digital Signatures', description: 'Your documents.', robots: 'noindex,nofollow' }
}

function sitemapXml() {
  const urls = ['/', ...SEO_PAGES.map(p => p.path)]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${LASTMOD}</lastmod></url>`).join('\n')}
</urlset>
`
}

const ROBOTS = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /app$
Disallow: /r/
Disallow: /verify/
Disallow: /dev/
Disallow: /auth/
Disallow: /layouts

Sitemap: ${SITE}/sitemap.xml
`

const ASSETS = {
  '/og.png': ['og.png', 'image/png'],
  '/favicon.ico': ['favicon.ico', 'image/x-icon'],
  '/icon.svg': ['icon.svg', 'image/svg+xml'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
  '/apple-touch-icon.png': ['apple-touch-icon.png', 'image/png'],
  '/site.webmanifest': ['site.webmanifest', 'application/manifest+json'],
  '/seo.css': ['../seo.css', 'text/css; charset=utf-8'],
  '/analytics.js': ['../analytics.js', 'text/javascript; charset=utf-8'],
  '/signature-generator.js': ['../signature-generator.js', 'text/javascript; charset=utf-8'],
  '/sign-pdf.js': ['../sign-pdf.js', 'text/javascript; charset=utf-8']
}

// Inject SEO head tags (and optionally the prerendered homepage) into the SPA's index.html.
function shellHtml(indexHtml, { path, title, description, robots, canonical, jsonld = [], body = '' }) {
  let html = indexHtml
    .replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '')
    .replace(/<script src="(https:\/\/[^"]+)"><\/script>/g, '<script defer src="$1"></script>')
    // Google Fonts CSS shouldn't block first paint of the prerendered page (fonts use display=swap).
    .replace(/<link href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)" rel="stylesheet">/, '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="$1" rel="stylesheet" media="print" onload="this.media=\'all\'">')
    .replace(/<title>[^<]*<\/title>/, headTags({ path: canonical || path, title, description, robots, jsonld }))
  if (body) {
    html = html.replace('<body>', '<body class="marketing">').replace('<main id="view"></main>', `<main id="view">${body}</main>`)
  }
  return html
}

export function registerSeo(app, { root, config }) {
  const indexHtml = readFileSync(join(root, 'index.html'), 'utf8')
  const smsEnabled = config?.smsMode !== 'off'
  const homeBody = marketingHtml({ loggedIn: false, smsEnabled })
  const homeLd = [ORG_LD, WEBSITE_LD, APP_LD, faqLd(HOME_FAQ)]
  const homeHtml = shellHtml(indexHtml, { ...HOME, jsonld: homeLd, body: homeBody })

  const send = (res, html, type = 'text/html; charset=utf-8', cache = HTML_CACHE) => {
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', cache)
    res.send(html)
  }

  app.get('/', (req, res) => send(res, homeHtml))
  for (const alias of ['/sign-pdf-free', '/sign-pdf-online-free', '/fill-and-sign-pdf-free', '/free-pdf-signer']) app.get(alias, (req, res) => res.redirect(301, '/sign-pdf-online'))
  for (const [path, s] of Object.entries(SHELLS)) {
    const html = shellHtml(indexHtml, { path, ...s, body: s.prerender ? homeBody : '' })
    app.get(path, (req, res) => send(res, html, undefined, 'public, max-age=0, s-maxage=600'))
  }
  for (const page of SEO_PAGES) {
    const html = renderPage(page)
    app.get(page.path, (req, res) => send(res, html))
  }
  const sitemap = sitemapXml()
  app.get('/sitemap.xml', (req, res) => send(res, sitemap, 'application/xml; charset=utf-8'))
  // IndexNow ownership key (public by design; Bing/Yandex fetch it to verify URL submissions).
  app.get('/9c0f7c0d74dd681b044655de2b7164e1.txt', (req, res) => send(res, '9c0f7c0d74dd681b044655de2b7164e1', 'text/plain; charset=utf-8'))
  app.get('/robots.txt', (req, res) => send(res, ROBOTS, 'text/plain; charset=utf-8'))
  for (const [route, [file, type]] of Object.entries(ASSETS)) {
    const full = join(here, 'assets', file)
    app.get(route, (req, res, next) => {
      if (!existsSync(full)) return next()
      res.setHeader('Content-Type', type)
      res.setHeader('Cache-Control', ASSET_CACHE)
      res.send(readFileSync(full))
    })
  }
}
