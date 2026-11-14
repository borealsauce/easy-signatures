import crypto from 'node:crypto'

const EVENTS = ['document.signed', 'document.declined', 'document.expired']

export async function fireWebhooks(ctx, userId, event, payload) {
  if (!EVENTS.includes(event) || !userId) return
  let hooks
  try {
    hooks = (await ctx.db.query(
      `select * from webhooks where user_id=$1 and active=true and $2 = any(events)`,
      [userId, event]
    )).rows
  } catch { return }
  if (!hooks.length) return
  const body = JSON.stringify({
    event,
    created: new Date().toISOString(),
    data: payload
  })
  for (const hook of hooks) {
    const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex')
    let status = 0
    let error = null
    try {
      const ac = new AbortController()
      const t = setTimeout(() => ac.abort(), 5000)
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-eds-event': event, 'x-eds-signature': 'sha256=' + sig },
        body,
        signal: ac.signal
      })
      clearTimeout(t)
      status = res.status
      if (!res.ok) error = `HTTP ${res.status}`
    } catch (err) {
      error = String(err.message || err).slice(0, 200)
    }
    await ctx.db.query(
      `update webhooks set last_status=$2, last_error=$3, last_sent_at=now() where id=$1`,
      [hook.id, status || null, error]
    )
  }
}
