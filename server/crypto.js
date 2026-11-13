import crypto from 'node:crypto'

export function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex')
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 32).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false
  const [, salt, hash] = stored.split('$')
  const next = crypto.scryptSync(password, salt, 32)
  const prev = Buffer.from(hash, 'hex')
  if (next.length !== prev.length) return false
  return crypto.timingSafeEqual(next, prev)
}

export function hashSecret(value, pepper) {
  return crypto.createHash('sha256').update(String(pepper) + ':' + String(value)).digest('hex')
}

export function signJwt(payload, secret, ttlMs = 1000 * 60 * 60 * 24 * 14) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function readJwt(token, secret) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const expect = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expect)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function keyFrom(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest()
}

export function seal(plain, secret) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function unseal(packed, secret) {
  try {
    const buf = Buffer.from(packed, 'base64url')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(secret), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export function canonicalEmail(email) {
  const raw = String(email || '').trim().toLowerCase()
  const at = raw.lastIndexOf('@')
  if (at < 1) return ''
  let user = raw.slice(0, at)
  let domain = raw.slice(at + 1)
  user = user.split('+')[0]
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') user = user.replace(/\./g, '')
  return `${user}@${domain}`
}

export function normalizePhone(input) {
  const raw = String(input || '').trim()
  if (!raw) return null
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) return null
    return `+${digits}`
  }
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export function clientIp(req, config) {
  if (config.vercel && req.headers['x-real-ip']) return String(req.headers['x-real-ip']).split(',')[0].trim()
  if (config.trustProxy && req.headers['x-forwarded-for']) {
    const parts = String(req.headers['x-forwarded-for']).split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return req.socket?.remoteAddress || ''
}

export function readCookie(req, name) {
  const c = req.headers.cookie || ''
  const m = c.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}
