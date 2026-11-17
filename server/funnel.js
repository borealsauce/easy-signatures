// Conversion funnel: anonymous page/CTA/signup-form events from the browser (POST /api/ev),
// each with a random per-browser visitor id and a salted one-way hash of the IP (never the raw IP),
// plus signups, email confirmations, first sends, checkouts, and purchases from the app's own tables.
import crypto from 'node:crypto'

export const CLIENT_EVENTS = new Set(['page_view', 'landing_view', 'cta_click', 'signup_view', 'signup_started', 'pdf_tool_open', 'pdf_signed', 'begin_checkout'])
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|bingpreview|curl|wget|python-requests/i
const clip = (v, n) => (v == null ? null : String(v).slice(0, n))

// Salted one-way hash of an IP address. The raw IP is never stored in funnel_events.
export function ipHash(ip, salt) {
  if (!ip) return null
  return crypto.createHmac('sha256', 'funnel-ip:' + String(salt || '')).update(String(ip)).digest('hex').slice(0, 32)
}

export async function recordEvent(db, { name, sid, vid, userId, path, source, meta, ipHash: ih, internal }) {
  try {
    await db.query(`insert into funnel_events (name, sid, vid, user_id, path, source, meta, ip_hash, internal) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
      [clip(name, 40), clip(sid, 40), clip(vid, 40), userId || null, clip(path, 200), clip(source, 80), JSON.stringify(meta || {}), ih || null, !!internal])
  } catch (e) { /* analytics must never break the app */ }
}

// Validate a browser beacon. Returns the row to store, or null to ignore it.
export function cleanClientEvent(body, ua = '') {
  if (!body || typeof body !== 'object' || BOT_UA.test(String(ua))) return null
  const name = String(body.name || '')
  if (!CLIENT_EVENTS.has(name)) return null
  const sid = String(body.sid || '')
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(sid)) return null
  const meta = {}
  for (const k of ['cta', 'landing', 'ref', 'utm_medium', 'utm_campaign', 'pack', 'pages', 'items']) {
    const v = body.data && body.data[k]
    if (v != null && v !== '') meta[k] = typeof v === 'number' ? v : clip(v, 100)
  }
  let path = String(body.path || '').split('?')[0]
  if (!path.startsWith('/')) path = '/'
  const source = clip(body.data?.utm_source || body.data?.ref || '', 80) || 'direct'
  const vid = /^[A-Za-z0-9_-]{8,40}$/.test(String(body.vid || '')) ? String(body.vid) : null
  return { name, sid, vid, path: clip(path, 200), source, meta, internal: body.internal === true }
}

const SESSION_STEPS = [['landing_view', 'Visited the site'], ['cta_click', 'Clicked a call to action'], ['signup_view', 'Opened the signup form'], ['signup_started', 'Started typing in the signup form']]

export async function funnelReport(ctx, { days = 30, excludeEmails = [] } = {}) {
  const d = Math.min(Math.max(Number(days) || 30, 1), 365)
  const q = (sql, p = []) => ctx.db.query(sql, [d, ...p]).then(r => r.rows)
  const since = `now() - ($1::int * interval '1 day')`
  const ex = excludeEmails.map(e => String(e).toLowerCase())
  const sessions = Object.fromEntries((await q(
    `select name, count(distinct sid)::int as n from funnel_events where created_at >= ${since} and sid is not null group by name`)).map(r => [r.name, r.n]))
  const one = async sql => Number((await q(sql, [ex]))[0]?.n || 0)
  const signups = await one(`select count(*) as n from profiles where created_at >= ${since} and not (lower(email) = any($2::text[]))`)
  const verified = await one(`select count(*) as n from profiles where created_at >= ${since} and email_verified_at is not null and not (lower(email) = any($2::text[]))`)
  const firstSent = await one(`select count(*) as n from (select d.owner_id, min(d.sent_at) as first from documents d join profiles p on p.id = d.owner_id
      where d.sent_at is not null and not d.is_template and not (lower(p.email) = any($2::text[])) group by d.owner_id) f where f.first >= ${since}`)
  const checkouts = await one(`select count(distinct coalesce(user_id::text, sid)) as n from funnel_events where name = 'checkout_started' and created_at >= ${since}
      and (user_id is null or user_id not in (select id from profiles where lower(email) = any($2::text[])))`)
  const pay = (await q(`select count(*)::int as n, count(distinct pa.user_id)::int as buyers, coalesce(sum(pa.amount_cents),0)::int as cents from payments pa join profiles p on p.id = pa.user_id
      where pa.created_at >= ${since} and not (lower(p.email) = any($2::text[]))`, [ex]))[0] || {}
  const steps = [
    ...SESSION_STEPS.map(([k, label]) => ({ key: k, label, count: sessions[k] || 0, unit: 'sessions' })),
    { key: 'signup_completed', label: 'Created an account', count: signups, unit: 'accounts' },
    { key: 'email_verified', label: 'Confirmed their email', count: verified, unit: 'accounts' },
    { key: 'first_document_sent', label: 'Sent their first document', count: firstSent, unit: 'accounts' },
    { key: 'checkout_started', label: 'Started checkout', count: checkouts, unit: 'buyers' },
    { key: 'purchase', label: 'Paid', count: pay.buyers || 0, unit: 'buyers', purchases: pay.n || 0, revenue: (pay.cents || 0) / 100 }
  ]
  const top = (sql) => q(sql)
  const landings = await top(`select path, count(distinct sid)::int as n from funnel_events where name='landing_view' and created_at >= ${since} group by path order by n desc limit 15`)
  const sources = await top(`select source, count(distinct sid)::int as n from funnel_events where name='landing_view' and created_at >= ${since} group by source order by n desc limit 15`)
  const ctas = await top(`select meta->>'cta' as cta, count(*)::int as n from funnel_events where name='cta_click' and created_at >= ${since} group by 1 order by n desc limit 15`)
  const tool = await top(`select name, count(distinct sid)::int as n from funnel_events where name in ('pdf_tool_open','pdf_signed') and created_at >= ${since} group by name`)
  const daily = await top(`select to_char(date_trunc('day', created_at at time zone 'America/Los_Angeles'), 'YYYY-MM-DD') as day, name, count(distinct coalesce(sid, user_id::text))::int as n
      from funnel_events where created_at >= ${since} group by 1, 2 order by 1 desc`)
  return { days: d, steps, landings, sources, ctas, tool: Object.fromEntries(tool.map(r => [r.name, r.n])), daily }
}

// Real visitors: browsers (visitor id, or tab session when there is none) that were never flagged as ours.
// A browser is excluded if it EVER sent an event with the internal flag (?internal=1 cookie), came from an
// excluded IP hash, or belongs to an excluded account (owner/admin emails, the smoke-test account).
export async function realVisitorsReport(ctx, { days = 30, excludeEmails = [], excludeIpHashes = [] } = {}) {
  const d = Math.min(Math.max(Number(days) || 30, 1), 365)
  const ex = excludeEmails.map(e => String(e).toLowerCase())
  const dbIps = (await ctx.db.query(`select ip_hash from funnel_excluded_ips`)).rows.map(r => r.ip_hash)
  const ips = [...new Set([...excludeIpHashes, ...dbIps].filter(Boolean))]
  const cte = `with bad as (
      select distinct coalesce(vid, sid) as v from funnel_events
       where internal or ip_hash = any($2::text[]) or user_id in (select id from profiles where lower(email) = any($3::text[]))
    ), ev as (
      select coalesce(vid, sid) as v, name, path, source, created_at from funnel_events
       where created_at >= now() - ($1::int * interval '1 day') and coalesce(vid, sid) is not null
         and not internal and (ip_hash is null or not (ip_hash = any($2::text[])))
         and coalesce(vid, sid) not in (select v from bad where v is not null)
         and name in ('page_view', 'landing_view')
    )`
  const q = sql => ctx.db.query(cte + sql, [d, ips, ex]).then(r => r.rows)
  const daily = await q(` select to_char(date_trunc('day', created_at at time zone 'America/Los_Angeles'), 'YYYY-MM-DD') as day, count(distinct v)::int as visitors, count(*) filter (where name='page_view')::int as views from ev group by 1 order by 1 desc`)
  const total = (await q(` select count(distinct v)::int as n from ev`))[0]?.n || 0
  const pages = await q(` select path, count(distinct v)::int as n from ev group by path order by n desc, path limit 15`)
  const referrers = await q(` select source, count(distinct v)::int as n from ev where name='landing_view' group by source order by n desc, source limit 15`)
  const excluded = (await ctx.db.query(`select count(distinct coalesce(vid, sid))::int as n from funnel_events where created_at >= now() - ($1::int * interval '1 day') and (internal or ip_hash = any($2::text[]))`, [d, ips])).rows[0]?.n || 0
  return { days: d, uniqueVisitors: total, daily, pages, referrers, excludedBrowsers: excluded, excludedIpCount: ips.length }
}
