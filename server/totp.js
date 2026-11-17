// Time-based one-time passwords (RFC 6238, SHA-1, 6 digits, 30 s) for optional account 2FA.
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf) {
  let bits = 0, value = 0, out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0
  const out = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  return Buffer.from(out)
}

export function newTotpSecret() {
  return base32Encode(crypto.randomBytes(20))
}

export function totpAt(secret, step) {
  const key = base32Decode(secret)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(step))
  const h = crypto.createHmac('sha1', key).update(msg).digest()
  const off = h[h.length - 1] & 15
  const code = ((h[off] & 127) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3]
  return String(code % 1e6).padStart(6, '0')
}

export function currentStep(now = Date.now()) {
  return Math.floor(now / 30000)
}

// Returns the matched time step (to block replay) or null. Accepts one step of clock drift either way.
export function checkTotp(secret, code, { now = Date.now(), lastStep = null } = {}) {
  const c = String(code || '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(c)) return null
  const step = currentStep(now)
  for (const s of [step, step - 1, step + 1]) {
    if (lastStep != null && s <= Number(lastStep)) continue
    const expect = totpAt(secret, s)
    if (crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(c))) return s
  }
  return null
}

export function otpauthUrl(secret, account, issuer = 'Easy Digital Signatures') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

export function qrSvg(text) {
  const QRCode = createRequire(import.meta.url)('qrcode-svg')
  return new QRCode({ content: text, padding: 2, width: 200, height: 200, ecl: 'M', join: true, container: 'svg-viewbox' }).svg()
}

export function newRecoveryCodes(n = 8) {
  return Array.from({ length: n }, () => {
    const raw = crypto.randomBytes(5).toString('hex')
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}
