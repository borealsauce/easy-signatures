// End-to-end smoke of the signup funnel in headless Chrome against a local server:
// landing → hero CTA → signup form → confirm email → log in → send first document → checkout → (test) payment,
// then prints the admin funnel report. Usage: node scripts/e2e-signup-funnel.js
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
import { createApp } from '../server/app.js'
import { funnelReport } from '../server/funnel.js'

const PORT = 4193, base = `http://127.0.0.1:${PORT}`
const links = []
const log = console.log
console.log = (...a) => { const m = a.join(' ').match(/to=(\S+) .*?(http\S+\/auth\/verify\?token=\S+)/); if (m) links.push({ to: m[1], url: m[2] }); log(...a) }
const ctx = await createApp({ NODE_ENV: 'test', APP_URL: base, JWT_SECRET: 't', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-fun-')), DEV_MAILBOX: '1' })
ctx.config.smsMode = 'off'
const server = await new Promise(r => { const s = ctx.app.listen(PORT, '127.0.0.1', () => r(s)) })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const step = (s) => log('✓', s)
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => m.type() === 'error' && !/favicon|insights/.test(m.text()) && errors.push(m.text()))
  const scripts = []; page.on('request', r => r.resourceType() === 'script' && scripts.push(r.url()))
  await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'))
  await page.evaluateOnNewDocument(() => localStorage.setItem('eds_track_test', '1'))
  await page.goto(base + '/?utm_source=smoke-test', { waitUntil: 'networkidle0' })
  if (scripts.some(u => /unpkg\.com\/pdf-lib|pdf\.min\.js/.test(u))) throw new Error('PDF libraries loaded on the homepage: ' + scripts.join(' '))
  step('homepage loaded without PDF libraries')
  await page.click('[data-cta="home-hero"]')
  await page.waitForSelector('#sf #nm', { timeout: 10000 })
  step('hero CTA opened the signup form')
  const email = 'funnel-smoke@example.com'
  await page.type('#nm', 'Funnel Smoke'); await page.type('#em', email); await page.type('#pw', 'correct-horse-9')
  await page.click('#tos'); await page.click('#go')
  await page.waitForFunction(() => /Check your email|confirm/i.test(document.querySelector('#view').innerText), { timeout: 10000 })
  step('account created; confirmation screen shown')
  const link = links.find(l => l.to === email); if (!link) throw new Error('no confirmation email')
  await page.goto(link.url, { waitUntil: 'networkidle0' })
  step('email confirmed via link')
  if (!(await page.evaluate(() => localStorage.getItem('eds_token')))) {
    await page.goto(base + '/#/login', { waitUntil: 'networkidle0' })
    await page.waitForSelector('#em'); await page.type('#em', email); await page.type('#pw', 'correct-horse-9')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => localStorage.getItem('eds_token'), { timeout: 10000 })
  }
  step('logged in')
  const sent = await page.evaluate(async () => {
    const h = { 'Content-Type': 'application/json', 'X-Device-Local': localStorage.getItem('eds_device'), Authorization: 'Bearer ' + localStorage.getItem('eds_token') }
    const d = await (await fetch('/api/documents/blank', { method: 'POST', headers: h, body: JSON.stringify({ name: 'Smoke doc', pages: 1 }) })).json()
    const s = d.signers[0]
    await fetch('/api/documents/' + d.id, { method: 'PUT', headers: h, body: JSON.stringify({ name: 'Smoke doc', ordered: true, expiresDays: 30, remindDays: 3, message: 'x', idv: false, signers: [{ ...s, name: 'Al Ri', email: 'al@example.com' }], fields: [{ type: 'signature', signer: s.id, page: 0, x: .1, y: .7, w: .3, h: .08, required: true }] }) })
    const r = await fetch('/api/documents/' + d.id + '/send', { method: 'POST', headers: h })
    return r.status + ' ' + JSON.stringify(await r.json()).slice(0, 160)
  })
  if (!sent.startsWith('200')) throw new Error('send failed: ' + sent)
  step('first document sent (free credit)')
  await page.goto(base + '/#/app', { waitUntil: 'networkidle0' })
  scripts.length = 0
  const signLink = await page.evaluate(async () => {
    const h = { 'X-Device-Local': localStorage.getItem('eds_device'), Authorization: 'Bearer ' + localStorage.getItem('eds_token') }
    const j = await (await fetch('/api/state', { headers: h })).json()
    const d = (j.docs || j.documents || [])[0]
    const tok = d && (d.signers || []).map(x => x.token).find(Boolean)
    return tok ? '#/sign/' + tok : JSON.stringify(d).slice(0, 400)
  })
  if (!signLink.startsWith('#/sign/')) throw new Error('no signing link: ' + signLink)
  await page.evaluate(h => { location.hash = h }, signLink)
  await page.waitForFunction(() => document.querySelector('#view canvas, #view .pg img, #view img[src^="blob:"], #view img[src^="data:"]'), { timeout: 20000 })
  await page.waitForFunction(() => window.pdfjsLib && window.PDFLib && document.querySelector('#view .pgload') === null, { timeout: 20000 })
  step('signing page rendered the PDF (pdf.js + pdf-lib loaded on demand after login)')
  await page.goto(base + '/#/app', { waitUntil: 'networkidle0' })
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.evaluate(() => window.buy('doc10'))])
  step('checkout started → ' + new URL(page.url()).pathname)
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }), page.click('#f button')])
  await new Promise(r => setTimeout(r, 1500))
  step('test payment completed → ' + new URL(page.url()).pathname + new URL(page.url()).hash)
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '))
  const rep = await funnelReport(ctx, { days: 1 })
  log('\nFunnel (last 24h):'); for (const s of rep.steps) log(`  ${s.label.padEnd(36)} ${s.count}`)
  log('  sources', JSON.stringify(rep.sources), 'ctas', JSON.stringify(rep.ctas))
  const by = Object.fromEntries(rep.steps.map(s => [s.key, s.count]))
  for (const k of ['landing_view', 'cta_click', 'signup_view', 'signup_started', 'signup_completed', 'email_verified', 'first_document_sent', 'checkout_started', 'purchase']) if (by[k] !== 1) throw new Error(`expected 1 for ${k}, got ${by[k]}`)
  log('\nALL FUNNEL STEPS RECORDED')
} finally {
  await browser.close(); server.close(); await ctx.close?.()
}
