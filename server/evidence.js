// Tamper-evident audit trail, retention records, and public hash verification.
//
// Every audit event is appended with a per-document sequence number and a SHA-256 hash chain:
//   event_hash = sha256(prev_hash + '|' + payload)
// where payload is the exact canonical JSON string stored with the row. Changing, removing, or
// reordering any event breaks every later hash. Database triggers (supabase/schema.sql) reject
// UPDATE on audit_events and audit_records, and reject DELETE unless a purge flag is set inside
// the same transaction (used only for unsent drafts and for retention records past retain_until).
import { sha256 } from './crypto.js'

export const CHAIN_VERSION = 1
export const RETENTION_YEARS = 7

function iso(v) {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function eventPayload({ docId, seq, type, actor, email, ip, ua, signerId, meta, at }) {
  // Fixed key order. Stored verbatim in audit_events.payload so verification never re-serializes.
  return JSON.stringify({
    v: CHAIN_VERSION,
    doc: docId,
    seq,
    type: type ?? null,
    actor: actor ?? null,
    email: email ?? null,
    ip: ip ?? null,
    ua: ua ?? null,
    signer: signerId ?? null,
    meta: meta ?? null,
    at
  })
}

export function chainHash(prev, payload) {
  return sha256(Buffer.from(`${prev || ''}|${payload}`, 'utf8'))
}

// Append one event. Safe under concurrency: (document_id, seq) is unique and the insert uses
// ON CONFLICT DO NOTHING, so a lost race just recomputes against the new head and tries again.
export async function appendAudit(q, docId, { type, actor, email, ip, ua, signerId, meta }) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const head = (await q(
      `select seq, event_hash from audit_events where document_id=$1 and seq is not null order by seq desc limit 1`,
      [docId]
    )).rows[0]
    const seq = head ? Number(head.seq) + 1 : 1
    const prev = head ? head.event_hash : null
    const at = new Date().toISOString()
    const payload = eventPayload({ docId, seq, type, actor, email, ip, ua, signerId, meta, at })
    const hash = chainHash(prev, payload)
    const row = (await q(
      `insert into audit_events (document_id, signer_id, event_type, actor, email, ip, user_agent, meta, created_at, seq, prev_hash, event_hash, payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)
       on conflict (document_id, seq) do nothing
       returning id`,
      [docId, signerId || null, type, actor || null, email || null, ip || null, ua || null, JSON.stringify(meta ?? null), at, seq, prev, hash, payload]
    )).rows[0]
    if (row) return { id: row.id, seq, hash }
  }
  throw new Error('Could not append the audit event after several attempts.')
}

// Recompute the chain for a document's events (ordered by seq). Returns { ok, length, head, problems }.
export function verifyChain(rows) {
  const problems = []
  let prev = null
  const events = rows.filter(r => r.seq != null).sort((a, b) => Number(a.seq) - Number(b.seq))
  events.forEach((r, i) => {
    const n = i + 1
    if (Number(r.seq) !== n) problems.push(`event ${n}: sequence gap (found ${r.seq})`)
    if ((r.prev_hash || null) !== prev) problems.push(`event ${n}: previous-hash link is broken`)
    if (chainHash(r.prev_hash, r.payload) !== r.event_hash) problems.push(`event ${n}: hash does not match its payload`)
    let p = null
    try { p = JSON.parse(r.payload) } catch { problems.push(`event ${n}: payload is not valid JSON`) }
    if (p) {
      if (p.type !== r.event_type) problems.push(`event ${n}: event type differs from the hashed payload`)
      if ((p.email ?? null) !== (r.email ?? null)) problems.push(`event ${n}: email differs from the hashed payload`)
      if ((p.ip ?? null) !== (r.ip ?? null)) problems.push(`event ${n}: IP differs from the hashed payload`)
      if (p.at && new Date(p.at).getTime() !== new Date(r.created_at).getTime()) problems.push(`event ${n}: timestamp differs from the hashed payload`)
    }
    prev = r.event_hash
  })
  const unchained = rows.filter(r => r.seq == null).length
  if (unchained) problems.push(`${unchained} event(s) are not in the hash chain`)
  return { ok: problems.length === 0, length: events.length, head: prev, problems }
}

export async function loadChain(q, docId) {
  return (await q(
    `select id, seq, prev_hash, event_hash, payload, event_type, actor, email, ip, user_agent, meta, signer_id, created_at
       from audit_events where document_id=$1 order by seq nulls first, created_at`,
    [docId]
  )).rows
}

// Snapshot the audit trail into the retention table. One snapshot per (document, reason); the table
// rejects updates. Taken at completion, at decline/expiry/void, and before any document content is deleted.
export async function retainAuditRecord(q, docId, reason = 'completed') {
  const doc = (await q(`select d.*, p.email as owner_email from documents d left join profiles p on p.id=d.owner_id where d.id=$1`, [docId])).rows[0]
  if (!doc || doc.is_template || doc.status === 'draft') return null
  const signers = (await q(`select * from signers where document_id=$1 order by sort_index`, [docId])).rows
  const chain = await loadChain(q, docId)
  const check = verifyChain(chain)
  const people = signers.map(s => ({
    name: s.full_name, email: s.email, role: s.role,
    viewedAt: iso(s.viewed_at), signedAt: iso(s.signed_at), declinedAt: iso(s.declined_at),
    consentAt: iso(s.consent_at), consentVersion: s.consent_version || null, consentText: s.consent_text || null,
    signIp: s.sign_ip || null, signUa: s.sign_ua || null, viewIp: s.view_ip || null, viewUa: s.view_ua || null
  }))
  const events = chain.map(r => ({ seq: r.seq, at: iso(r.created_at), type: r.event_type, actor: r.actor, email: r.email, ip: r.ip, ua: r.user_agent, meta: r.meta ?? null, prevHash: r.prev_hash, hash: r.event_hash, payload: r.payload }))
  const base = doc.completed_at ? new Date(doc.completed_at) : new Date()
  const until = new Date(base)
  until.setUTCFullYear(until.getUTCFullYear() + RETENTION_YEARS)
  const signerCount = signers.filter(s => s.role !== 'cc').length
  await q(
    `insert into audit_records (document_id, owner_id, owner_email, document_name, status, sent_at, completed_at,
       original_sha256, content_sha256, final_sha256, signer_count, signers, events, chain_head, chain_length, chain_ok, reason, retain_until)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18)
     on conflict (document_id, reason) do nothing`,
    [docId, doc.owner_id, doc.owner_email || null, doc.name, doc.status, doc.sent_at, doc.completed_at,
      doc.original_sha256, doc.content_sha256, doc.final_sha256, signerCount, JSON.stringify(people), JSON.stringify(events),
      check.head, check.length, check.ok, reason, until.toISOString()]
  )
  return { head: check.head, length: check.length, ok: check.ok }
}

// Public lookup by complete-file SHA-256. Reveals only: match, completion date, signer count.
export async function lookupByHash(q, hex) {
  const h = String(hex || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(h)) return { valid: false }
  const live = (await q(
    `select d.completed_at, (select count(*)::int from signers s where s.document_id=d.id and s.role <> 'cc') as n
       from documents d where d.final_sha256=$1 and d.status='completed' limit 1`, [h])).rows[0]
  const kept = live ? null : (await q(`select completed_at, signer_count as n from audit_records where final_sha256=$1 and status='completed' limit 1`, [h])).rows[0]
  const hit = live || kept
  if (!hit) return { valid: true, match: false }
  return { valid: true, match: true, completed: iso(hit.completed_at), signers: Number(hit.n) || 0 }
}

// Resend delivery webhooks (same Svix-signed endpoint as inbound mail). Each event for a tracked
// signing/reminder/completion email becomes an audit event on that document.
const DELIVERY = {
  'email.sent': m => `Email accepted by the mail provider for ${m.email}`,
  'email.delivered': m => `Email delivered to ${m.email}'s mail server`,
  'email.delivery_delayed': m => `Email delivery to ${m.email} delayed`,
  'email.bounced': m => `Email to ${m.email} bounced`,
  'email.complained': m => `Email to ${m.email} was marked as spam by the recipient`,
  'email.opened': m => `Email opened by ${m.email} (tracking pixel; mail apps can trigger this automatically)`
}

export async function recordDeliveryEvent(db, event, svixId) {
  const type = event?.type
  if (!DELIVERY[type]) return { skipped: 'type' }
  const messageId = event?.data?.email_id || event?.data?.id
  if (!messageId) return { skipped: 'no_id' }
  const m = (await db.query(`select * from email_messages where message_id=$1`, [String(messageId)])).rows[0]
  if (!m || !m.document_id) return { skipped: 'untracked' }
  if (svixId) {
    const seen = await db.query(`insert into webhook_events_seen (id) values ($1) on conflict do nothing returning id`, [String(svixId).slice(0, 200)])
    if (!seen.rows[0]) return { duplicate: true }
  }
  if (type === 'email.opened') {
    // Only the first open per message is audited; repeated opens add no evidence.
    const first = await db.query(`update email_messages set opened_at=now() where message_id=$1 and opened_at is null returning message_id`, [m.message_id])
    if (!first.rows[0]) return { skipped: 'already_opened' }
  }
  if (type === 'email.delivered') await db.query(`update email_messages set delivered_at=coalesce(delivered_at, now()) where message_id=$1`, [m.message_id])
  const doc = (await db.query(`select id from documents where id=$1`, [m.document_id])).rows[0]
  if (!doc) return { skipped: 'no_document' }
  await appendAudit(db.query.bind(db), m.document_id, {
    type: DELIVERY[type](m),
    actor: 'Mail provider (Resend)',
    email: m.email,
    signerId: m.signer_id,
    meta: { messageId: m.message_id, kind: m.kind, providerEvent: type, providerTime: event?.created_at || null, bounce: type === 'email.bounced' ? (event?.data?.bounce?.message || event?.data?.bounce?.type || null) : null }
  })
  return { recorded: type }
}
