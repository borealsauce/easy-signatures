// Conversion funnel: anonymous page/CTA/signup-form events from the browser (POST /api/ev, cookie-free),
// plus signups, email confirmations, first sends, checkouts, and purchases from the app's own tables.
export const CLIENT_EVENTS = new Set(['landing_view', 'cta_click', 'signup_view', 'signup_started', 'pdf_tool_open', 'pdf_signed', 'begin_checkout'])
const BOT_UA = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|bingpreview|curl|wget|python-requests/i
const clip = (v, n) => (v == null ? null : String(v).slice(0, n))

export async function recordEvent(db, { name, sid, userId, path, source, meta }) {
  try {
    await db.query(`insert into funnel_events (name, sid, user_id, path, source, meta) values ($1,$2,$3,$4,$5,$6::jsonb)`,
      [clip(name, 40), clip(sid, 40), userId || null, clip(path, 200), clip(source, 80), JSON.stringify(meta || {})])
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
  return { name, sid, path: clip(path, 200), source, meta }
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
