// Generates seo/assets: og.png (1200x630), favicons, and the web manifest.
// Run: node scripts/build-seo-assets.js   (needs Chrome; set CHROME_PATH if not /usr/bin/google-chrome)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'seo', 'assets')
mkdirSync(out, { recursive: true })

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" rx="7" fill="#14C4B0"/><path d="M6.5 16.2c2.6-1.1 4.4 1.4 6.5-.2 2.3-1.7 3.5-4.4 7.8-3.2" fill="none" stroke="#042F2E" stroke-width="1.8" stroke-linecap="round"/><path d="M7.2 19.4h8.4" fill="none" stroke="#042F2E" stroke-width="1.5" stroke-linecap="round" opacity="0.65"/></svg>`
writeFileSync(join(out, 'icon.svg'), ICON_SVG)

const OG = `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Inter+Tight:wght@600;700&family=Great+Vibes&display=block" rel="stylesheet"><style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:Inter,sans-serif;color:#F8FAFC;
background:radial-gradient(ellipse 70% 80% at 75% 0%,rgba(20,184,166,.25),transparent 55%),radial-gradient(ellipse 50% 60% at 5% 95%,rgba(13,148,136,.2),transparent 55%),linear-gradient(180deg,#06141E,#0A1C28 60%,#0C2430)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1.2px,transparent 1.2px);background-size:22px 22px;-webkit-mask-image:radial-gradient(ellipse 80% 80% at 40% 30%,#000 20%,transparent 75%)}
.l{position:absolute;left:72px;top:64px;width:600px}
.brand{display:flex;align-items:center;gap:14px;font-size:26px;font-weight:600;letter-spacing:-.02em}
h1{font-family:"Inter Tight";font-size:76px;line-height:1.02;letter-spacing:-.045em;margin:70px 0 0;font-weight:700}
h1 span{color:#5EEAD4}
p{font-size:25px;color:rgba(226,232,240,.85);margin:26px 0 0;line-height:1.4}
.pill{display:inline-block;margin-top:34px;background:#14C4B0;color:#042F2E;font-weight:700;font-size:23px;padding:14px 28px;border-radius:999px}
.paper{position:absolute;right:64px;top:92px;width:420px;height:440px;background:#fff;border-radius:6px;box-shadow:0 30px 70px rgba(0,0,0,.45);padding:34px 34px;color:#0F172A;transform:rotate(2deg)}
.k{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#14B8A6}
.t{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:6px 0 16px}
.ln{height:9px;background:#E2E8F0;border-radius:5px;margin:0 0 11px}
.sig{margin-top:30px;border:2px solid #14B8A6;background:#F0FDFA;border-radius:8px;padding:6px 14px 10px}
.sig small{font-size:11px;font-weight:700;letter-spacing:.08em;color:#0F766E;text-transform:uppercase}
.sig div{font-family:"Great Vibes";font-size:52px;color:#115E59;line-height:1.05}
.cert{display:flex;align-items:center;gap:8px;margin-top:18px;font-size:14px;color:#0F766E;font-weight:600}
</style></head><body><div class="dots"></div>
<div class="l"><div class="brand">${ICON_SVG.replace('<svg ', '<svg width="44" height="44" ')}Easy Digital Signatures</div>
<h1>Send it.<br>Get it <span>signed.</span></h1>
<p>E-sign any PDF. Signers need no account.<br>Signed PDF + audit certificate.</p>
<div class="pill">First document free · then $1</div></div>
<div class="paper"><div class="k">Agreement</div><div class="t">Master Services Agreement</div>
<div class="ln"></div><div class="ln" style="width:92%"></div><div class="ln" style="width:96%"></div><div class="ln" style="width:70%"></div><div class="ln" style="width:88%;margin-top:22px"></div><div class="ln" style="width:94%"></div><div class="ln" style="width:60%"></div>
<div class="sig"><small>Signature</small><div>Jordan Hale</div></div>
<div class="cert">✓ Audit certificate with SHA-256 fingerprints</div></div>
</body></html>`

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630 })
await page.setContent(OG, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)
writeFileSync(join(out, 'og.png'), await page.screenshot({ type: 'png' }))

async function icon(size, pad = 0, bg = 'transparent') {
  await page.setViewport({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="width:${size}px;height:${size}px;padding:${pad}px;box-sizing:border-box">${ICON_SVG.replace('<svg ', `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `)}</div></body></html>`)
  return page.screenshot({ type: 'png', omitBackground: bg === 'transparent' })
}
writeFileSync(join(out, 'icon-192.png'), await icon(192))
writeFileSync(join(out, 'icon-512.png'), await icon(512))
writeFileSync(join(out, 'apple-touch-icon.png'), await icon(180, 18, '#06141E'))

// favicon.ico with embedded PNGs (16, 32, 48)
const pngs = [await icon(16), await icon(32), await icon(48)]
const sizes = [16, 32, 48]
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4)
let offset = 6 + 16 * pngs.length
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(sizes[i], 0); e.writeUInt8(sizes[i], 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3)
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12)
  offset += png.length
  return e
})
writeFileSync(join(out, 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs]))

writeFileSync(join(out, 'site.webmanifest'), JSON.stringify({
  name: 'Easy Digital Signatures', short_name: 'Easy Signatures', start_url: '/', display: 'standalone',
  background_color: '#06141E', theme_color: '#06141E',
  icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
}, null, 2))
await browser.close()
console.log('wrote', out)
