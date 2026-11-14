// Owner-only admin page. The HTML holds no data; every API call is checked server-side
// against the Supabase session and ADMIN_EMAILS.
export function adminPageHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Admin · Easy Digital Signatures</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;background:#eef3f8;color:#14213d;margin:0}
  header{background:#0b1f3a;color:#fff;padding:14px 24px;display:flex;align-items:center;gap:12px}
  header a{color:#9fe3d9;text-decoration:none;font-size:14px}
  main{max-width:1080px;margin:24px auto;padding:0 16px}
  .card{background:#fff;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(15,23,42,.08)}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:18px;margin:0}
  .row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .sp{flex:1}
  .muted{color:#64748b;font-size:13px}
  input{font:inherit;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px}
  button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer}
  button.p{background:#0E6B62;color:#fff;border-color:#0E6B62} button.danger{color:#b91c1c;border-color:#fecaca}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}
  th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0} th{color:#64748b;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .pill{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700}
  .on{background:#dcfce7;color:#166534} .off{background:#fee2e2;color:#991b1b}
  .switch{position:relative;width:46px;height:26px;display:inline-block}
  .switch input{opacity:0;width:0;height:0}
  .slider{position:absolute;inset:0;background:#cbd5e1;border-radius:99px;transition:.15s;cursor:pointer}
  .slider:before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.15s}
  .switch input:checked+.slider{background:#0E6B62} .switch input:checked+.slider:before{transform:translateX(20px)}
  #msg{min-height:20px;font-size:14px}
  .err{color:#b91c1c}
</style></head><body>
<header><b>Easy Digital Signatures · Admin</b><span class="sp"></span><a href="/#/app">Back to app</a></header>
<main id="root"><div class="card">Loading…</div></main>
<script>
const root = document.getElementById('root')
const token = localStorage.getItem('eds_token') || ''
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmt = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
async function api(path, opt = {}) {
  const res = await fetch(path, { method: opt.method || 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: opt.body ? JSON.stringify(opt.body) : undefined })
  return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) }
}
function say(text, bad) { const m = document.getElementById('msg'); if (m) { m.textContent = text; m.className = bad ? 'err' : 'muted' } }
async function load() {
  if (!token) { root.innerHTML = '<div class="card"><h1>Admin</h1><p>Log in first, then come back to this page.</p><p><a href="/#/login">Log in</a></p></div>'; return }
  const [r, u] = await Promise.all([api('/api/admin/promo'), api('/api/admin/users')])
  if (r.status === 401) { root.innerHTML = '<div class="card"><h1>Admin</h1><p>Your session expired. <a href="/#/login">Log in again</a>, then reopen /admin.</p></div>'; return }
  if (!r.ok) { root.innerHTML = '<div class="card"><h1>Not available</h1><p>' + esc(r.json.message || 'This page is only for the site owner.') + '</p></div>'; return }
  render(r.json.codes || [], u.ok ? (u.json.users || []) : [])
}
function usersHtml(users) {
  const btn = (x, label, act, cls) => '<button data-act="' + act + '" data-id="' + esc(x.id) + '" data-email="' + esc(x.email) + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + label + '</button>'
  return '<div class="card"><div class="row"><h2>Users</h2><span class="muted">' + users.length + ' total · ' + users.filter(x => x.blocked).length + ' blocked</span></div>'
    + (users.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Name</th><th>Email</th><th>Signed up</th><th>Verified</th><th>Docs sent</th><th>Credits</th><th>Promo code</th><th>Status</th><th></th></tr></thead><tbody>'
      + users.map(x => '<tr><td>' + esc(x.name || '—') + '</td><td>' + esc(x.email) + '</td><td>' + fmt(x.created) + '</td><td>' + (x.verified ? 'Yes' : 'No') + '</td><td>' + x.docsSent + '</td><td>' + x.credits + '</td><td>' + esc(x.promo || '—') + '</td><td><span class="pill ' + (x.status === 'blocked' ? 'off' : x.status === 'active' ? 'on' : '') + '">' + esc(x.status) + '</span></td><td style="white-space:nowrap">'
        + (x.protected ? '<span class="muted">Owner</span>' : (x.blocked ? btn(x, 'Unblock', 'unblock') : btn(x, 'Block', 'block')) + ' ' + btn(x, 'Delete', 'delete', 'danger'))
        + '</td></tr>').join('') + '</tbody></table></div>'
      : '<p class="muted">No users yet.</p>') + '</div>'
}
function render(codes, users) {
  root.innerHTML = '<div class="card"><h1>Promo codes</h1><p class="muted">Each account can redeem a code once. Promo documents are used before paid credits. Turning a code off blocks new redemptions and any unused documents from it right away; turning it back on restores them.</p>'
    + '<div class="row" style="margin-top:12px"><input id="nc" placeholder="CODE" style="text-transform:uppercase;width:160px"><input id="nd" type="number" min="1" value="100" style="width:110px"><span class="muted">free docs per account</span><button class="p" id="add">Create code</button></div><p id="msg"></p></div>'
    + codes.map(c => '<div class="card"><div class="row"><h2>' + esc(c.code) + '</h2><span class="pill ' + (c.active ? 'on">On' : 'off">Off') + '</span><span class="muted">' + c.freeDocs + ' free docs per account · ' + c.redemptions + ' redeemed · ' + c.docsUsed + ' docs used · created ' + fmt(c.created) + '</span><span class="sp"></span>'
      + '<label class="switch" title="Turn ' + esc(c.code) + ' on or off"><input type="checkbox" data-code="' + esc(c.code) + '"' + (c.active ? ' checked' : '') + '><span class="slider"></span></label></div>'
      + (c.redeemers.length
        ? '<table><thead><tr><th>Name</th><th>Email</th><th>Redeemed</th><th>Docs used</th><th>Last activity</th></tr></thead><tbody>' + c.redeemers.map(u => '<tr><td>' + esc(u.name || '—') + '</td><td>' + esc(u.email) + '</td><td>' + fmt(u.redeemed) + '</td><td>' + u.used + ' of ' + u.granted + '</td><td>' + fmt(u.lastActivity) + '</td></tr>').join('') + '</tbody></table>'
        : '<p class="muted" style="margin-top:10px">No one has redeemed this code yet.</p>')
      + '</div>').join('') + usersHtml(users)
  document.querySelectorAll('button[data-act]').forEach(b => b.onclick = async () => {
    const { act, id, email } = b.dataset
    if (act === 'delete' && !confirm('Delete ' + email + '? This permanently removes their account, documents and credits. They can sign up again with the same email.')) return
    if (act === 'block' && !confirm('Block ' + email + '? They won’t be able to log in or send documents until you unblock them.')) return
    b.disabled = true
    const r = act === 'delete'
      ? await api('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE' })
      : await api('/api/admin/users/' + encodeURIComponent(id) + '/block', { method: 'POST', body: { blocked: act === 'block' } })
    if (!r.ok) { b.disabled = false; return say(r.json.message || 'Could not update user', true) }
    await load(); say(email + (act === 'delete' ? ' deleted.' : act === 'block' ? ' blocked.' : ' unblocked.'))
  })
  document.getElementById('add').onclick = async () => {
    const r = await api('/api/admin/promo', { method: 'POST', body: { code: document.getElementById('nc').value, freeDocs: document.getElementById('nd').value } })
    if (!r.ok) return say(r.json.message || 'Could not create code', true)
    await load(); say(r.json.code + ' created and turned on.')
  }
  document.querySelectorAll('input[data-code]').forEach(el => el.onchange = async () => {
    const r = await api('/api/admin/promo/' + encodeURIComponent(el.dataset.code), { method: 'PATCH', body: { active: el.checked } })
    if (!r.ok) { el.checked = !el.checked; return say(r.json.message || 'Could not update code', true) }
    await load(); say(r.json.code + ' is now ' + (r.json.active ? 'on' : 'off') + '.')
  })
}
load()
</script></body></html>`
}
