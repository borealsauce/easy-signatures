import { mkdtempSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../server/app.js'
import puppeteer from 'puppeteer-core'

const port = 4173
const ctx = await createApp({
  NODE_ENV: 'test',
  PORT: String(port),
  APP_URL: `http://127.0.0.1:${port}`,
  TRUST_PROXY: '1',
  JWT_SECRET: 'test-secret',
  DATA_DIR: mkdtempSync(join(tmpdir(), 'eds-shot-')),
  DEV_MAILBOX: '1'
})
const server = await new Promise(resolve => {
  const s = ctx.app.listen(port, '127.0.0.1', () => resolve(s))
})
const base = `http://127.0.0.1:${port}`
const out = '/opt/cursor/artifacts'
await mkdir(out, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', err => errors.push(String(err)))

const shots = [
  ['/', 'homepage-current.png'],
  ['/layouts/a', 'layout-a-corporate.png'],
  ['/layouts/b', 'layout-b-aurora.png'],
  ['/layouts/c', 'layout-c-grove.png']
]
for (const [path, file] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForSelector('h1', { timeout: 20000 })
  await page.screenshot({ path: join(out, file), fullPage: true })
  console.log('saved', file)
}

await page.goto(base + '/#/signup', { waitUntil: 'networkidle0' })
await page.waitForSelector('#nm')
await page.type('#nm', 'Ada Lovelace')
await page.type('#em', 'ada.browser@example.com')
await page.type('#pw', 'correct-horse')
await page.click('#go')
await page.waitForFunction(() => document.body.innerText.includes('Check your email'), { timeout: 15000 })
const mailbox = await fetch(base + '/api/dev/mailbox').then(r => r.json())
const confirm = mailbox.find(m => m.to === 'ada.browser@example.com')
const verifyUrl = new URL(confirm.url)
await page.goto(base + verifyUrl.pathname + verifyUrl.search, { waitUntil: 'networkidle0' })
await page.goto(base + '/#/login', { waitUntil: 'networkidle0' })
await page.waitForSelector('#em')
await page.type('#em', 'ada.browser@example.com')
await page.type('#pw', 'correct-horse')
await page.click('#go')
await page.waitForFunction(() => location.hash.includes('phone') || document.body.innerText.includes('Verify your phone'), { timeout: 15000 })
const note = await page.$eval('body', el => el.innerText)
if (!note.includes("We'll never send spam or marketing texts.")) throw new Error('Phone note missing')
await page.type('#ph', '4155550199')
await page.click('#send')
await page.waitForSelector('#code', { timeout: 10000 })
const sms = (await fetch(base + '/api/dev/mailbox').then(r => r.json())).find(m => m.type === 'sms' && m.to === '+14155550199')
await page.type('#code', sms.code)
page.on('console', msg => console.log('PAGE', msg.type(), msg.text()))
const clicked = await page.evaluate(async () => {
  document.querySelector('#check').click()
  return document.querySelector('#code').value
})
console.log('typed code', clicked, 'expected', sms.code)
try {
  await page.waitForFunction(() => location.hash.includes('app'), { timeout: 15000 })
} catch (err) {
  console.log('STUCK', await page.evaluate(() => document.body.innerText))
  throw err
}
await page.screenshot({ path: join(out, 'dashboard-after-verify.png'), fullPage: true })

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
}
await browser.close()
await new Promise(resolve => server.close(resolve))
await ctx.close()
console.log('browser smoke ok')
