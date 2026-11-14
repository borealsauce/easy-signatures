// Encrypt SSN and bank routing values at rest. Never log the plaintext.
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { isSensitive, looksMasked, maskSensitive, normalizeSensitive } from '../shared/fields.js'

const PREFIX = 'enc:v1:'

function keyFrom(secret) {
  return createHash('sha256').update(String(secret || 'eds-dev-field-key')).digest()
}

export function isEncrypted(v) {
  return typeof v === 'string' && v.startsWith(PREFIX)
}

export function encryptValue(plain, secret) {
  if (plain == null || plain === '') return null
  if (isEncrypted(plain)) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function decryptValue(value, secret) {
  if (!isEncrypted(value)) return value
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), 'base64url')
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const data = buf.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

export function storeSensitive(type, incoming, previous, secret) {
  if (!isSensitive(type)) return incoming
  if (incoming == null || incoming === '' || looksMasked(type, incoming)) {
    return previous ?? null
  }
  if (isEncrypted(incoming)) return incoming
  return encryptValue(normalizeSensitive(type, incoming), secret)
}

export function revealFields(fields, secret, { revealMe = false, revealSignerId = null, maskOthers = true } = {}) {
  return (fields || []).map(f => {
    const raw = f.value
    if (raw == null || raw === '' || raw === false || raw === true) return f
    if (!isSensitive(f.type) && !isEncrypted(raw)) return f
    const plain = isEncrypted(raw) ? decryptValue(raw, secret) : raw
    const reveal = (revealMe && f.signer === 'me') || (revealSignerId && f.signer === revealSignerId)
    if (reveal) return { ...f, value: plain }
    if (maskOthers && isSensitive(f.type)) return { ...f, value: maskSensitive(f.type, plain) }
    return { ...f, value: isSensitive(f.type) ? maskSensitive(f.type, plain) : plain }
  })
}

export function decryptAllFields(fields, secret) {
  return (fields || []).map(f => {
    if (!isEncrypted(f.value)) return f
    return { ...f, value: decryptValue(f.value, secret) }
  })
}
