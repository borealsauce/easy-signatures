import { mkdtempSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import puppeteer from 'puppeteer-core'

const port = 4181
const ctx = await createApp({
  NODE_ENV: 'test',
  APP_URL: `http://127.0.0.1:${port}`,
  JWT_SECRET: 'test-secret',
  DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-home-')),
  DEV_MAILBOX: '1',
  AI_API_KEY: 'screenshot-only',
  AI_BASE_URL: 'http://127.0.0.1:9',
  AI_MODEL: 'test'
})
const server = await new Promise(resolve => ctx.app.listen(port, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${port}`
const out = '/opt/cursor/artifacts'
await mkdir(out, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', err => errors.push(String(err)))

async function shot(name, opts = {}) {
  await page.screenshot({ path: join(out, name), ...opts })
  console.log('saved', name)
}

await page.setViewport({ width: 1440, height: 900 })
await page.goto(base + '/', { waitUntil: 'networkidle0', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('Too Easy.'), { timeout: 20000 })
await shot('homepage-desktop.png', { fullPage: true })
const pricing = await page.$('#pricing')
await pricing.screenshot({ path: join(out, 'pricing-section.png') })
console.log('saved pricing-section.png')

await page.setViewport({ width: 390, height: 844 })
await page.goto(base + '/', { waitUntil: 'networkidle0', timeout: 60000 })
await page.waitForFunction(() => document.body.innerText.includes('Too Easy.'), { timeout: 20000 })
await shot('homepage-mobile.png', { fullPage: true })

await page.setViewport({ width: 1440, height: 900 })
await page.goto(base + '/contact', { waitUntil: 'networkidle0', timeout: 60000 })
await page.waitForSelector('#cf', { timeout: 15000 })
await shot('contact-form.png', { fullPage: true })

await page.goto(base + '/', { waitUntil: 'networkidle0' })
await page.waitForSelector('.help-launcher', { timeout: 15000 })
await page.click('.help-launcher')
await page.waitForSelector('.help-panel:not([hidden])', { timeout: 5000 })
await shot('help-chat.png')

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
}
await browser.close()
server.close()
await ctx.close()
