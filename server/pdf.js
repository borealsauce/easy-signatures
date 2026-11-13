import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { calc, visible } from '../shared/fields.js'
import { sha256 } from './crypto.js'

const INK = rgb(0.08, 0.13, 0.22)
const TEAL = rgb(0.06, 0.46, 0.43)
const MUTED = rgb(0.28, 0.33, 0.4)

function latin(s) {
  return String(s ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '?').replace(/\s+/g, ' ').trim()
}

function dataImage(v) {
  const m = /^data:image\/(png|jpeg|jpg);base64,([a-z0-9+/=\r\n]+)$/i.exec(String(v || ''))
  if (!m) return null
  return { kind: m[1].toLowerCase() === 'png' ? 'png' : 'jpg', bytes: Buffer.from(m[2], 'base64') }
}

export async function assertReadablePdf(bytes) {
  await PDFDocument.load(bytes)
}

export async function blankPdf(pages = 1) {
  const pd = await PDFDocument.create()
  pd.setProducer('Easy Digital Signatures')
  pd.setCreator('Easy Digital Signatures')
  const n = Math.max(1, Math.min(10, Number(pages) || 1))
  for (let i = 0; i < n; i++) pd.addPage([612, 792])
  return Buffer.from(await pd.save())
}

export async function imageToPdf(bytes, kind) {
  const pd = await PDFDocument.create()
  pd.setProducer('Easy Digital Signatures')
  const im = kind === 'png' ? await pd.embedPng(bytes) : await pd.embedJpg(bytes)
  const W = 612
  const H = 792
  const sc = Math.min((W - 72) / im.width, (H - 72) / im.height, 1)
  const page = pd.addPage([W, H])
  page.drawImage(im, {
    x: (W - im.width * sc) / 2,
    y: (H - im.height * sc) / 2,
    width: im.width * sc,
    height: im.height * sc
  })
  return Buffer.from(await pd.save())
}

function fieldValue(fields, f) {
  if (f.type === 'formula') return calc(fields, f)
  return f.value
}

async function stampFields(pd, fields) {
  const font = await pd.embedFont(StandardFonts.Helvetica)
  const bold = await pd.embedFont(StandardFonts.HelveticaBold)
  const pages = pd.getPages()
  for (const f of fields) {
    if (!visible(fields, f)) continue
    const page = pages[f.page]
    if (!page) continue
    const { width: W, height: H } = page.getSize()
    const x = f.x * W
    const y = H - (f.y + f.h) * H
    const w = f.w * W
    const h = f.h * H
    const v = fieldValue(fields, f)
    if (v == null || v === '' || v === false) continue
    if (typeof v === 'string' && v.startsWith('data:image')) {
      const img = dataImage(v)
      if (!img) continue
      const embedded = img.kind === 'png' ? await pd.embedPng(img.bytes) : await pd.embedJpg(img.bytes)
      const s = Math.min(w / embedded.width, h / embedded.height)
      page.drawImage(embedded, { x, y, width: embedded.width * s, height: embedded.height * s })
    } else if (f.type === 'checkbox') {
      if (v === true) page.drawText('X', { x: x + 1, y: y + 1, size: Math.max(8, h * 0.8), font: bold, color: INK })
    } else {
      page.drawText(latin(v).slice(0, 500), {
        x: x + 2,
        y: y + h * 0.25,
        size: Math.min(11, Math.max(6, h * 0.65)),
        font,
        color: INK
      })
    }
  }
  return { font, bold }
}

function cursor(pd, font, bold) {
  let page = pd.addPage([612, 792])
  page.drawRectangle({ x: 0, y: 772, width: 612, height: 20, color: TEAL })
  let y = 740
  const max = 504
  function need(px) {
    if (y - px < 48) {
      page = pd.addPage([612, 792])
      page.drawRectangle({ x: 0, y: 772, width: 612, height: 20, color: TEAL })
      y = 740
    }
  }
  function text(value, size = 10, face = font, color = INK, gap = 6) {
    const words = latin(value).split(' ').filter(Boolean)
    let line = ''
    const lines = []
    for (const word of words.length ? words : ['']) {
      const next = line ? `${line} ${word}` : word
      if (face.widthOfTextAtSize(next, size) > max && line) {
        lines.push(line)
        line = word
      } else line = next
    }
    if (line) lines.push(line)
    for (const row of lines) {
      need(size + gap)
      page.drawText(row, { x: 54, y, size, font: face, color })
      y -= size + gap
    }
  }
  return { text, space(n = 8) { y -= n } }
}

export async function sealPdf({ original, doc, verifyUrl }) {
  const pd = await PDFDocument.load(original)
  pd.setProducer('Easy Digital Signatures')
  pd.setCreator('Easy Digital Signatures')
  const sourcePages = pd.getPageCount()
  await stampFields(pd, doc.fields || [])
  const contentBytes = Buffer.from(await pd.save())
  const contentHash = sha256(contentBytes)
  const sealed = await PDFDocument.load(contentBytes)
  const cfont = await sealed.embedFont(StandardFonts.Helvetica)
  const cbold = await sealed.embedFont(StandardFonts.HelveticaBold)
  const pen = cursor(sealed, cfont, cbold)
  pen.text('Certificate of Completion', 20, cbold, TEAL, 10)
  pen.text('Electronic signature record under the ESIGN Act and UETA', 10, cfont, MUTED, 8)
  pen.space(4)
  pen.text('Document: ' + (doc.name || 'Untitled'), 12, cbold)
  pen.text('Document ID: ' + doc.id, 9)
  pen.text('Status: completed', 10)
  pen.text('Completed: ' + (doc.completed || new Date().toISOString()), 10)
  pen.text('Pages in the signed document (before this certificate): ' + sourcePages, 10)
  pen.text('Fields: ' + (doc.fields || []).length, 10)
  pen.text('Routing: ' + (doc.ordered ? 'sequential' : 'parallel'), 10)
  pen.space(6)
  pen.text('Original document SHA-256', 11, cbold)
  pen.text(doc.hashOrig || 'n/a', 8, cfont, INK, 4)
  pen.text('Signed content SHA-256 (document after signatures, before this certificate)', 11, cbold)
  pen.text(contentHash, 8, cfont, INK, 4)
  pen.space(4)
  pen.text('The complete file, including this certificate, has its own SHA-256. Compare it with the value published at ' + verifyUrl + ' . If the file was changed, the hashes will not match.', 9, cfont, MUTED, 4)
  pen.space(8)
  pen.text('Recipients', 13, cbold)
  for (const s of doc.signers || []) {
    const when = s.doneAt ? `signed ${s.doneAt}` : (s.role === 'cc' ? 'copied' : 'pending')
    pen.text(`${s.name || 'Signer'} <${s.email || 'no email'}>  role ${s.role}  ${when}`, 9)
    if (s.signIp || s.viewIp) pen.text(`IP ${s.signIp || s.viewIp || 'n/a'}  ${s.signUa || ''}`, 8, cfont, MUTED, 3)
    if (s.consentAt) pen.text(`Consent ${s.consentAt} from ${s.consentIp || 'n/a'} (${doc.consentVersion || 'esign'})`, 8, cfont, MUTED, 3)
  }
  pen.space(8)
  pen.text('Audit trail', 13, cbold)
  for (const e of doc.events || []) {
    pen.text(`${e.ts || ''}  ${e.t || e.type || ''}  (${e.who || ''})  ${e.ip || ''}`, 8, cfont, INK, 3)
  }
  pen.space(10)
  pen.text('Each signer who completed the document checked an on-screen consent to do business electronically before their signature was applied. This page is an audit record, not legal advice.', 8, cfont, MUTED, 4)
  const finalBytes = Buffer.from(await sealed.save())
  return { bytes: finalBytes, contentHash, finalHash: sha256(finalBytes) }
}
