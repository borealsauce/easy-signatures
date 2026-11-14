// Inbound email: Resend "email.received" webhook -> forward to the owner's inbox.
// Resend signs webhooks with Svix: headers svix-id, svix-timestamp, svix-signature ("v1,<base64>" list).
import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.resend.com'
const MAX_ATTACH_BYTES = 30 * 1024 * 1024

export function verifySvix(secret, headers, rawBody, now = Date.now()) {
  const id = headers['svix-id'], ts = headers['svix-timestamp'], sigs = headers['svix-signature']
  if (!secret || !id || !ts || !sigs) return false
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${rawBody.toString('utf8')}`).digest()
  return String(sigs).split(' ').some(part => {
    const [ver, sig] = part.split(',')
    if (ver !== 'v1' || !sig) return false
    const got = Buffer.from(sig, 'base64')
    return got.length === expected.length && timingSafeEqual(got, expected)
  })
}

const addr = v => String(v || '').match(/[^\s<>"]+@[^\s<>"]+/)?.[0]?.toLowerCase() || ''
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export async function forwardInbound(config, event, fetchImpl = fetch) {
  if (event?.type !== 'email.received') return { skipped: 'type' }
  const emailId = event.data?.email_id || event.data?.id
  if (!emailId) return { skipped: 'no_id' }
  const key = config.resendFullKey
  if (!key) throw new Error('RESEND_FULL_API_KEY is not set')
  const auth = { Authorization: `Bearer ${key}` }
  const r = await fetchImpl(`${API}/emails/receiving/${encodeURIComponent(emailId)}`, { headers: auth })
  if (!r.ok) throw new Error(`fetch received email ${r.status}`)
  const mail = await r.json()
  const from = mail.from || event.data?.from || ''
  const fromAddr = addr(from)
  const domain = (config.inboundDomain || '').toLowerCase()
  if (domain && fromAddr.endsWith('@' + domain)) return { skipped: 'own_domain' } // avoid loops with our own senders
  const toList = [].concat(mail.to || event.data?.to || []).map(String)

  const attachments = []
  const skippedFiles = []
  const meta = mail.attachments || event.data?.attachments || []
  if (meta.length) {
    let list = []
    const a = await fetchImpl(`${API}/emails/receiving/${encodeURIComponent(emailId)}/attachments`, { headers: auth })
    if (a.ok) list = (await a.json()).data || []
    let total = 0
    for (const att of list) {
      const name = att.filename || 'attachment'
      if (!att.download_url || total + (att.size || 0) > MAX_ATTACH_BYTES) { skippedFiles.push(name); continue }
      const d = await fetchImpl(att.download_url)
      if (!d.ok) { skippedFiles.push(name); continue }
      const buf = Buffer.from(await d.arrayBuffer())
      total += buf.length
      if (total > MAX_ATTACH_BYTES) { skippedFiles.push(name); continue }
      attachments.push({ filename: name, content: buf.toString('base64'), ...(att.content_type ? { content_type: att.content_type } : {}) })
    }
    for (const m of meta.slice(list.length)) skippedFiles.push(m.filename || 'attachment')
  }

  const note = `Forwarded from ${from} to ${toList.join(', ')}${mail.created_at ? ' on ' + mail.created_at : ''}. Reply to answer the sender directly.${skippedFiles.length ? ' Attachments not forwarded (too large or unavailable): ' + skippedFiles.join(', ') + '. Open them in the Resend dashboard.' : ''}`
  const body = {
    from: config.inboundFrom,
    to: [config.inboundForwardTo],
    subject: mail.subject || event.data?.subject || '(no subject)',
    html: `<div style="font:13px sans-serif;color:#475569;border-bottom:1px solid #e2e8f0;padding:0 0 8px;margin:0 0 12px">${esc(note)}</div>${mail.html || `<pre style="white-space:pre-wrap;font:14px sans-serif">${esc(mail.text || '')}</pre>`}`,
    text: `${note}\n\n${mail.text || ''}`
  }
  if (fromAddr) body.reply_to = from
  if (attachments.length) body.attachments = attachments
  const s = await fetchImpl(`${API}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.resendKey || key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `inbound-${emailId}` },
    body: JSON.stringify(body)
  })
  if (!s.ok) throw new Error(`forward send ${s.status}: ${(await s.text()).slice(0, 200)}`)
  return { forwarded: true, attachments: attachments.length, skippedFiles: skippedFiles.length }
}
