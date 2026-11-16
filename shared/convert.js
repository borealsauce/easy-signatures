import { pdfLib } from './pdf-libs.js'
// Turns whatever the user drops (PDF, photos, screenshots, HEIC, Word, Excel, text…) into PDF bytes in the browser.
// Heavy converters load from a CDN only when a file actually needs them.

export const MAX_MB = 25
export const ACCEPT = [
  '.pdf', 'application/pdf', 'image/*', '.heic', '.heif', '.tif', '.tiff', '.bmp', '.webp', '.gif',
  '.docx', '.xlsx', '.xls', '.ods', '.csv', '.txt', '.rtf', '.odt', '.html', '.htm'
].join(',')
export const TYPES_LABEL = 'PDF, Word (.docx), Excel (.xlsx, .xls), CSV, text, RTF, ODT, HTML, and images: JPG, PNG, HEIC, WEBP, GIF, BMP, TIFF'

const LIBS = {
  heic2any: ['https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js', () => window.heic2any],
  UTIF: ['https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js', () => window.UTIF],
  pako: ['https://cdn.jsdelivr.net/npm/pako@1.0.11/dist/pako.min.js', () => window.pako],
  mammoth: ['https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js', () => window.mammoth],
  XLSX: ['https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', () => window.XLSX],
  JSZip: ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', () => window.JSZip],
  html2canvas: ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', () => window.html2canvas]
}
const loading = {}
function lib(name) {
  const [src, get] = LIBS[name]
  if (get()) return Promise.resolve(get())
  return loading[name] ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true
    s.onload = () => get() ? res(get()) : rej(new Error('Converter failed to load'))
    s.onerror = () => { delete loading[name]; rej(new Error('Could not load the file converter. Check your connection and try again.')) }
    document.head.appendChild(s)
  })
}

const ext = f => (/\.([a-z0-9]+)$/i.exec(f.name || '')?.[1] || '').toLowerCase()
const IMAGE_EXT = ['jpg', 'jpeg', 'jfif', 'png', 'heic', 'heif', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'avif']
const DOC_EXT = { docx: 'docx', xlsx: 'sheet', xls: 'sheet', xlsm: 'sheet', ods: 'sheet', csv: 'sheet', txt: 'text', text: 'text', md: 'text', rtf: 'rtf', odt: 'odt', html: 'html', htm: 'html' }
const NOT_YET = {
  doc: 'Older Word .doc files aren’t supported yet. In Word, choose File → Save As → .docx or PDF, then upload that.',
  ppt: 'PowerPoint files aren’t supported yet. In PowerPoint, choose File → Export → PDF, then upload the PDF.',
  pptx: 'PowerPoint files aren’t supported yet. In PowerPoint, choose File → Export → PDF, then upload the PDF.',
  key: 'Keynote files aren’t supported. Choose File → Export To → PDF, then upload the PDF.',
  pages: 'Pages files aren’t supported. Choose File → Export To → PDF (or Word), then upload that.',
  numbers: 'Numbers files aren’t supported. Choose File → Export To → PDF or Excel, then upload that.',
  odp: 'Presentation files aren’t supported yet. Export to PDF first, then upload the PDF.'
}

async function head(f, n = 16) { return new Uint8Array(await f.slice(0, n).arrayBuffer()) }
export async function kindOf(f) {
  const h = await head(f), e = ext(f), t = (f.type || '').toLowerCase()
  if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) return 'pdf'
  if (e === 'pdf' || t === 'application/pdf') return 'badpdf'
  const brand = String.fromCharCode(...h.slice(4, 12))
  if (/^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brand)) return 'image'
  if (t.startsWith('image/') || IMAGE_EXT.includes(e)) return 'image'
  if (NOT_YET[e]) return 'unsupported:' + e
  if (DOC_EXT[e]) return DOC_EXT[e]
  if (t === 'text/plain') return 'text'
  if (t === 'text/csv') return 'sheet'
  if (t === 'text/html') return 'html'
  return 'unknown'
}

export function why(kind, f) {
  if (kind === 'badpdf') return 'This PDF looks damaged. Try re-saving or re-exporting it.'
  if (kind.startsWith('unsupported:')) return NOT_YET[kind.slice(12)]
  return `${ext(f) ? '.' + ext(f) + ' files' : 'This file type'} can’t be uploaded.`
}

// ---------- images ----------
function loadImg(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob), im = new Image()
    im.onload = () => res({ im, done: () => URL.revokeObjectURL(url) })
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')) }
    im.src = url // <img> applies EXIF orientation (image-orientation: from-image is the default)
  })
}
async function decodeImage(f) {
  const e = ext(f), h = await head(f)
  const isHeic = ['heic', 'heif'].includes(e) || /ftyp(hei|hev|mif1|msf1)/.test(String.fromCharCode(...h.slice(4, 12)))
  const isTiff = ['tif', 'tiff'].includes(e) || (h[0] === 0x49 && h[1] === 0x49 && h[2] === 42) || (h[0] === 0x4d && h[1] === 0x4d && h[3] === 42)
  try { const r = await loadImg(f); return canvasOf(r.im, r.done) } catch { /* fall through to converters */ }
  if (isHeic) {
    const heic2any = await lib('heic2any')
    let out
    try { out = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.9 }) } catch { throw new Error('This HEIC photo couldn’t be read. On iPhone, try Share → Save as PDF, or upload a screenshot.') }
    const r = await loadImg(Array.isArray(out) ? out[0] : out)
    return canvasOf(r.im, r.done) // libheif applies the HEIF irot/imir rotation itself; EXIF orientation must not be applied twice
  }
  if (isTiff) {
    await lib('pako'); const UTIF = await lib('UTIF')
    const buf = await f.arrayBuffer(), ifds = UTIF.decode(buf); UTIF.decodeImage(buf, ifds[0])
    const rgba = UTIF.toRGBA8(ifds[0]), c = document.createElement('canvas'); c.width = ifds[0].width; c.height = ifds[0].height
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer), c.width, c.height), 0, 0)
    return c
  }
  throw new Error('This image couldn’t be read. Try saving it as JPG or PNG.')
}
function canvasOf(im, done) {
  const max = 2400, s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight))
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s))
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); done(); return c
}
function shrink(c, max = 2400) {
  const s = Math.min(1, max / Math.max(c.width, c.height)); if (s === 1) return c
  const o = document.createElement('canvas'); o.width = Math.round(c.width * s); o.height = Math.round(c.height * s)
  const x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(c, 0, 0, o.width, o.height); return o
}
const jpegBytes = (c, q = 0.88) => new Promise(r => c.toBlob(b => b.arrayBuffer().then(a => r(new Uint8Array(a))), 'image/jpeg', q))

async function addImagePage(pd, c, { margin = 36, fitPage = false } = {}) {
  c = shrink(c)
  const land = c.width > c.height * 1.05, W = land ? 792 : 612, H = land ? 612 : 792
  const im = await pd.embedJpg(await jpegBytes(c))
  const page = pd.addPage([W, H])
  if (fitPage) { page.drawImage(im, { x: 0, y: 0, width: W, height: H }); return }
  const s = Math.min((W - margin * 2) / im.width, (H - margin * 2) / im.height)
  page.drawImage(im, { x: (W - im.width * s) / 2, y: (H - im.height * s) / 2, width: im.width * s, height: im.height * s })
}

export async function imagesToPdf(files, onStep = () => {}) {
  const pd = await (await pdfLib()).PDFDocument.create(); pd.setProducer('Easy Digital Signatures')
  for (let i = 0; i < files.length; i++) {
    onStep(`Converting image ${i + 1} of ${files.length}…`)
    await addImagePage(pd, await decodeImage(files[i]))
  }
  return new Uint8Array(await pd.save())
}

// ---------- documents → HTML → letter pages ----------
const PAGE_W = 816, PAGE_H = 1056, PAD = 72 // 8.5x11in at 96dpi, 0.75in margins
const DOC_CSS = `.edsconv{font:14px/1.5 Georgia,'Times New Roman',serif;color:#111;word-wrap:break-word}
.edsconv h1{font-size:26px;margin:0 0 12px}.edsconv h2{font-size:20px;margin:18px 0 8px}.edsconv h3{font-size:16px;margin:14px 0 6px}
.edsconv p{margin:0 0 10px}.edsconv ul,.edsconv ol{margin:0 0 10px;padding-left:26px}.edsconv img{max-width:100%;height:auto}
.edsconv table{border-collapse:collapse;margin:0 0 12px;font:12px/1.35 Arial,sans-serif}.edsconv td,.edsconv th{border:1px solid #999;padding:4px 6px;vertical-align:top;text-align:left}
.edsconv th{background:#eef2f6}.edsconv pre{font:12.5px/1.45 'Courier New',monospace;white-space:pre-wrap;margin:0}.edsconv .ln{font:12.5px/1.45 'Courier New',monospace;white-space:pre-wrap;min-height:1.45em}`

function clean(html) {
  const docu = new DOMParser().parseFromString(html, 'text/html')
  docu.querySelectorAll('script,style,link,meta,iframe,object,embed,form,input,button,select,textarea,video,audio,noscript,base').forEach(n => n.remove())
  docu.querySelectorAll('*').forEach(n => {
    for (const a of [...n.attributes]) {
      const nm = a.name.toLowerCase()
      if (nm.startsWith('on') || ((nm === 'href' || nm === 'src') && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name)
      if (nm === 'src' && !/^(data:image\/|blob:)/i.test(a.value)) n.removeAttribute('src') // no outside fetches
    }
  })
  return docu.body.innerHTML
}

function blocksOf(root) {
  const out = []
  const walk = el => {
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 3) { if (n.textContent.trim()) { const p = document.createElement('p'); p.textContent = n.textContent; out.push(p) } continue }
      if (n.nodeType !== 1) continue
      const tag = n.tagName
      if (['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'BODY', 'CENTER', 'HEADER', 'FOOTER'].includes(tag) && n.children.length && [...n.children].some(c => /^(P|DIV|TABLE|H\d|UL|OL|SECTION)$/.test(c.tagName))) walk(n)
      else out.push(n)
    }
  }
  walk(root); return out
}

async function htmlToPdf(html, onStep) {
  const h2c = await lib('html2canvas')
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + PAGE_W + 'px;pointer-events:none;z-index:-1'
  host.innerHTML = `<style>${DOC_CSS}</style>`
  document.body.appendChild(host)
  try {
    const src = document.createElement('div'); src.className = 'edsconv'; src.innerHTML = html
    const blocks = blocksOf(src)
    const pages = []; const limit = PAGE_H - PAD * 2
    const newPage = () => { const p = document.createElement('div'); p.className = 'edsconv'; p.style.cssText = `width:${PAGE_W}px;height:${PAGE_H}px;padding:${PAD}px;box-sizing:border-box;background:#fff;overflow:hidden`; const inner = document.createElement('div'); p.appendChild(inner); host.appendChild(p); pages.push(p); return inner }
    let cur = newPage()
    const fits = () => cur.scrollHeight <= limit
    for (const b of blocks) {
      cur.appendChild(b)
      if (fits()) continue
      if (b.tagName === 'TABLE' && b.rows.length > 1) { // split long tables by row, repeating the header row
        b.remove(); const rows = [...b.rows], headRow = rows[0].querySelector('th') ? rows.shift() : null
        let t = b.cloneNode(false); if (headRow) t.appendChild(headRow.cloneNode(true)); cur.appendChild(t)
        for (const r of rows) {
          t.appendChild(r)
          if (!fits() && t.rows.length > (headRow ? 2 : 1)) { r.remove(); cur = newPage(); t = b.cloneNode(false); if (headRow) t.appendChild(headRow.cloneNode(true)); cur.appendChild(t); t.appendChild(r) }
        }
        continue
      }
      if (cur.childNodes.length > 1) { b.remove(); cur = newPage(); cur.appendChild(b) }
    }
    const pd = await (await pdfLib()).PDFDocument.create(); pd.setProducer('Easy Digital Signatures')
    const used = pages.filter(p => p.textContent.trim() || p.querySelector('img,table'))
    if (!used.length) throw new Error('This file looks empty.')
    for (let i = 0; i < used.length; i++) {
      onStep(`Converting page ${i + 1} of ${used.length}…`)
      const c = await h2c(used[i], { scale: 1.5, backgroundColor: '#fff', logging: false, useCORS: false, width: PAGE_W, height: PAGE_H })
      await addImagePage(pd, c, { fitPage: true })
    }
    return new Uint8Array(await pd.save())
  } finally { host.remove() }
}

const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const textHtml = t => t.replace(/\r\n?/g, '\n').split('\n').map(l => `<div class="ln">${escH(l)}</div>`).join('')

function rtfText(r) {
  let s = r.replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  s = s.replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode(n < 0 ? 65536 + +n : +n))
  s = s.replace(/\{\\\*[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '').replace(/\{\\(fonttbl|colortbl|stylesheet|info)[^]*?\}\s*\}/g, '')
  s = s.replace(/\\(par|line)\b ?/g, '\n').replace(/\\tab\b ?/g, '\t').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '').replace(/\\([\\{}])/g, '$1')
  return s.trim()
}

async function odtHtml(f) {
  const JSZip = await lib('JSZip'), zip = await JSZip.loadAsync(await f.arrayBuffer())
  const xml = new DOMParser().parseFromString(await zip.file('content.xml').async('string'), 'application/xml')
  const body = xml.getElementsByTagName('office:text')[0]; if (!body) throw new Error('This ODT file couldn’t be read.')
  const txt = n => [...n.childNodes].map(c => c.nodeType === 3 ? escH(c.nodeValue) : c.localName === 'tab' ? '&emsp;' : c.localName === 'line-break' ? '<br>' : c.localName === 's' ? ' ' : txt(c)).join('')
  const out = []
  for (const n of body.children) {
    if (n.localName === 'h') out.push(`<h2>${txt(n)}</h2>`)
    else if (n.localName === 'p') out.push(`<p>${txt(n) || '&nbsp;'}</p>`)
    else if (n.localName === 'list') out.push(`<ul>${[...n.getElementsByTagName('text:list-item')].map(li => `<li>${txt(li)}</li>`).join('')}</ul>`)
    else if (n.localName === 'table') out.push(`<table>${[...n.getElementsByTagName('table:table-row')].map(r => `<tr>${[...r.getElementsByTagName('table:table-cell')].map(c => `<td>${txt(c)}</td>`).join('')}</tr>`).join('')}</table>`)
  }
  return out.join('')
}

async function sheetHtml(f) {
  const XLSX = await lib('XLSX')
  const wb = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array', cellDates: true })
  return wb.SheetNames.map((n, i) => {
    const ws = wb.Sheets[n]; if (!ws['!ref']) return ''
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, blankrows: false })
    if (!rows.length) return ''
    const w = Math.max(...rows.map(r => r.length))
    return `${wb.SheetNames.length > 1 ? `<h3>${escH(n)}</h3>` : ''}<table>${rows.map((r, j) => `<tr>${Array.from({ length: w }, (_, k) => j === 0 ? `<th>${escH(r[k] ?? '')}</th>` : `<td>${escH(r[k] ?? '')}</td>`).join('')}</tr>`).join('')}</table>`
  }).join('')
}

// Returns [{ name, bytes, from }] — images in one drop become one multi-page PDF.
export async function toPdfs(list, onStep = () => {}) {
  const files = [...list], out = [], errors = [], images = []
  for (const f of files) {
    if (f.size > MAX_MB * 1024 * 1024) { errors.push(`${f.name}: too large (max ${MAX_MB} MB)`); continue }
    const kind = await kindOf(f)
    try {
      if (kind === 'pdf') out.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()), from: 'pdf' })
      else if (kind === 'image') images.push(f)
      else if (kind === 'docx') {
        onStep(`Converting ${f.name}…`); const mammoth = await lib('mammoth')
        const r = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() }, { convertImage: mammoth.images.imgElement(im => im.read('base64').then(b => ({ src: `data:${im.contentType};base64,${b}` }))) })
        out.push({ name: f.name, bytes: await htmlToPdf(clean(r.value), onStep), from: 'docx' })
      } else if (kind === 'sheet') { onStep(`Converting ${f.name}…`); out.push({ name: f.name, bytes: await htmlToPdf(await sheetHtml(f), onStep), from: 'sheet' }) }
      else if (kind === 'text') { onStep(`Converting ${f.name}…`); out.push({ name: f.name, bytes: await htmlToPdf(textHtml(await f.text()), onStep), from: 'text' }) }
      else if (kind === 'rtf') { onStep(`Converting ${f.name}…`); out.push({ name: f.name, bytes: await htmlToPdf(textHtml(rtfText(await f.text())), onStep), from: 'rtf' }) }
      else if (kind === 'odt') { onStep(`Converting ${f.name}…`); out.push({ name: f.name, bytes: await htmlToPdf(await odtHtml(f), onStep), from: 'odt' }) }
      else if (kind === 'html') { onStep(`Converting ${f.name}…`); out.push({ name: f.name, bytes: await htmlToPdf(clean(await f.text()), onStep), from: 'html' }) }
      else errors.push(`${f.name}: ${why(kind, f)}`)
    } catch (e) { errors.push(`${f.name}: ${e.message || 'could not be converted'}`) }
  }
  if (images.length) {
    try {
      const name = images.length === 1 ? images[0].name : `${images[0].name.replace(/\.[^.]+$/, '')} (+${images.length - 1} more)`
      out.unshift({ name, bytes: await imagesToPdf(images, onStep), from: 'image' })
    } catch (e) { errors.push(`${images.map(f => f.name).join(', ')}: ${e.message || 'could not be converted'}`) }
  }
  for (const o of out) if (o.bytes.length > MAX_MB * 1024 * 1024) { errors.push(`${o.name}: too large after conversion (max ${MAX_MB} MB)`); o.skip = true }
  return { docs: out.filter(o => !o.skip), errors }
}
