// Fetches a file the user already picked in the Dropbox Chooser.
// The browser usually downloads the Chooser’s direct link itself; this
// same-origin proxy is only a CORS fallback. Host allowlisting is strict
// so the route cannot be used as an open proxy.

import { fail } from './service.js'

const DROPBOX_HOST_RE = /^(?:[a-z0-9-]+\.)*(?:dropbox\.com|dropboxusercontent\.com)$/i

export function isAllowedDropboxHost(host) {
  if (!host) return false
  return DROPBOX_HOST_RE.test(String(host).replace(/\.$/, '').toLowerCase())
}

export function dropboxImportUrl(raw) {
  let u
  try { u = new URL(String(raw || '')) } catch { return null }
  if (u.protocol !== 'https:') return null
  if (u.username || u.password) return null
  if (u.port && u.port !== '443') return null
  if (!isAllowedDropboxHost(u.hostname)) return null
  return u
}

function headerFilename(headers) {
  const raw = headers?.get?.('content-disposition') || ''
  const star = /filename\*=UTF-8''([^;]+)/i.exec(raw)
  if (star) {
    try { return decodeURIComponent(star[1].trim().replace(/^"(.*)"$/, '$1')) } catch { /* fall through */ }
  }
  const plain = /filename="?([^";]+)"?/i.exec(raw)
  return plain ? plain[1].trim() : ''
}

export function safeImportName(name, fallback = 'document') {
  const base = String(name || fallback).replace(/\\/g, '/').split('/').pop() || fallback
  return base.replace(/[^\w.\- ()]+/g, '_').slice(0, 180) || fallback
}

async function readCapped(res, maxBytes) {
  const len = Number(res.headers.get('content-length') || 0)
  if (len > maxBytes) throw fail(413, 'too_large', `Files must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.`)
  if (!res.body || typeof res.body.getReader !== 'function') {
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > maxBytes) throw fail(413, 'too_large', `Files must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.`)
    return buf
  }
  const reader = res.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      try { await reader.cancel() } catch { /* ignore */ }
      throw fail(413, 'too_large', `Files must be ${Math.floor(maxBytes / 1024 / 1024)} MB or smaller.`)
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks.map(c => Buffer.from(c)))
}

function looksLikeHtml(type, bytes) {
  if (/text\/html|application\/xhtml/i.test(type || '')) return true
  const head = bytes.slice(0, 64).toString('utf8').trim().toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html')
}

export async function fetchDropboxFile(rawUrl, {
  maxBytes,
  name,
  fetchImpl = fetch,
  timeoutMs = 20000,
  maxRedirects = 5
} = {}) {
  let url = dropboxImportUrl(rawUrl)
  if (!url) throw fail(400, 'url', 'That Dropbox link isn’t valid.')
  if (!maxBytes) throw new Error('maxBytes is required')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    let res
    for (let i = 0; i <= maxRedirects; i++) {
      try {
        res = await fetchImpl(url, {
          method: 'GET',
          redirect: 'manual',
          signal: ac.signal,
          headers: { Accept: '*/*' }
        })
      } catch (err) {
        if (err?.name === 'AbortError') throw fail(504, 'timeout', 'Dropbox took too long to respond. Please try again.')
        throw fail(502, 'fetch', 'Could not download that Dropbox file.')
      }
      const loc = res.headers.get('location')
      if (res.status >= 300 && res.status < 400 && loc) {
        let next
        try { next = new URL(loc, url) } catch { throw fail(400, 'url', 'That Dropbox link isn’t valid.') }
        if (!dropboxImportUrl(next)) throw fail(400, 'url', 'That Dropbox link isn’t valid.')
        url = next
        continue
      }
      if (!res.ok) throw fail(502, 'fetch', 'Could not download that Dropbox file.')
      const bytes = await readCapped(res, maxBytes)
      const type = res.headers.get('content-type') || ''
      if (!bytes.length) throw fail(400, 'file', 'That Dropbox file was empty.')
      if (looksLikeHtml(type, bytes)) throw fail(502, 'fetch', 'Could not download that Dropbox file.')
      const filename = safeImportName(name || headerFilename(res.headers) || url.pathname.split('/').pop(), 'document')
      return { bytes, type: type.split(';')[0].trim() || 'application/octet-stream', name: filename }
    }
    throw fail(502, 'fetch', 'Could not download that Dropbox file.')
  } finally {
    clearTimeout(timer)
  }
}
