// End-to-end check of the free /sign-pdf-online tool in headless Chrome.
// Usage: node scripts/e2e-sign-pdf.js [baseUrl] [outDir]   (starts a local server when no baseUrl)
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib'

const out = process.argv[3] || mkdtempSync(join(tmpdir(), 'sp-e2e-'))
mkdirSync(out, { recursive: true })
let base = process.argv[2], server
if (!base) {
  const { createApp } = await import('../server/app.js')
  const ctx = await createApp({ NODE_ENV: 'test', APP_URL: 'http://127.0.0.1:4191', JWT_SECRET: 't', DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-sp-')), DEV_MAILBOX: '1' })
  server = await new Promise(r => { const s = ctx.app.listen(4191, '127.0.0.1', () => r(s)) })
  base = 'http://127.0.0.1:4191'
}

// Sample: page 1 portrait letter, page 2 rotated 90°.
const doc = await PDFDocument.create(), f = await doc.embedFont(StandardFonts.Helvetica)
const p1 = doc.addPage([612, 792]); p1.drawText('E2E sample page one', { x: 72, y: 720, size: 20, font: f })
const p2 = doc.addPage([612, 792]); p2.drawText('E2E sample page two (rotated)', { x: 72, y: 720, size: 20, font: f }); p2.setRotation(degrees(90))
const sample = join(out, 'sample.pdf'); writeFileSync(sample, await doc.save())

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const results = {}
for (const [label, view] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }]]) {
  const page = await browser.newPage(); await page.setViewport(view)
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => m.type() === 'error' && errors.push(m.text()))
  await page.goto(base + '/sign-pdf-online', { waitUntil: 'networkidle0' })
  const input = await page.$('#sp-file'); await input.uploadFile(sample)
  await page.waitForSelector('.sp-page canvas', { timeout: 30000 }); await page.waitForFunction(() => document.querySelectorAll('.sp-page').length === 2)
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.sp-page').getBoundingClientRect().top + scrollY - 120))
  await new Promise(r => setTimeout(r, 500))
  // Draw a signature.
  await page.click('#sp-add-sig'); await page.waitForSelector('#sp-dlg:not([hidden])')
  const c = await (await page.$('#sp-draw')).boundingBox()
  await page.mouse.move(c.x + 40, c.y + 120); await page.mouse.down()
  for (let i = 0; i <= 30; i++) await page.mouse.move(c.x + 40 + i * (c.width - 80) / 30, c.y + 100 + Math.sin(i / 3) * 40, { steps: 2 })
  await page.mouse.up(); await page.click('#sp-sig-use')
  // Drag it near the bottom-left of page 1.
  const pg1 = await (await page.$('.sp-page')).boundingBox()
  let sb = await (await page.$('.sp-item')).boundingBox()
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down()
  await page.mouse.move(pg1.x + pg1.width * 0.25, pg1.y + pg1.height * 0.6, { steps: 8 }); await page.mouse.up()
  // Resize from the corner handle.
  const rs = await (await page.$('.sp-item.sel .sp-rs')).boundingBox()
  await page.mouse.move(rs.x + rs.width / 2, rs.y + rs.height / 2); await page.mouse.down(); await page.mouse.move(rs.x + 40, rs.y + 10, { steps: 5 }); await page.mouse.up()
  // Text + date.
  await page.click('#sp-add-text'); await page.keyboard.type('Hello E2E Test')
  if (label === 'desktop') { await page.click('#sp-add-text'); await page.keyboard.type('Zoë – naïve ✓ 日本') }
  await page.click('#sp-add-date')
  // Check mark dragged to page 2.
  await page.click('#sp-add-check')
  const items = await page.$$('.sp-item'); const ck = await items[items.length - 1].boundingBox()
  const pg2 = await (await page.$$('.sp-page'))[1].boundingBox()
  await page.mouse.move(ck.x + ck.width / 2, ck.y + ck.height / 2); await page.mouse.down()
  if (pg2.y + 80 < view.height) { for (let i = 1; i <= 20; i++) await page.mouse.move(ck.x + ck.width / 2, ck.y + (pg2.y + 80 - ck.y) * i / 20) }
  else {
    // Hold near the bottom edge so the page auto-scrolls until page 2 is under the pointer.
    await page.mouse.move(ck.x + ck.width / 2, view.height - 20, { steps: 10 })
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 30))
      const r2 = await page.evaluate(() => document.querySelectorAll('.sp-page')[1].getBoundingClientRect().top)
      if (r2 < view.height - 200) break
    }
    const r2 = await page.evaluate(() => document.querySelectorAll('.sp-page')[1].getBoundingClientRect().top)
    await page.mouse.move(ck.x + ck.width / 2, r2 + 60, { steps: 6 })
  }
  await page.mouse.up()
  await page.screenshot({ path: join(out, label + '-editor.png') })
  await page.click('#sp-download'); await page.waitForSelector('#sp-done:not([hidden])', { timeout: 30000 })
  const bytes = await page.evaluate(() => Array.from(window.__spLastPdf))
  const file = join(out, label + '-signed.pdf'); writeFileSync(file, Buffer.from(bytes))
  const state = await page.evaluate(() => [...document.querySelectorAll('.sp-item')].map(e => ({ page: e.parentElement.dataset.n, cls: e.className })))
  await page.screenshot({ path: join(out, label + '-done.png') })
  results[label] = { file, items: state, errors, msg: await page.$eval('#sp-msg', e => e.textContent) }
  await page.close()
}
await browser.close(); server && server.close()
console.log(JSON.stringify({ out, results }, null, 2))
