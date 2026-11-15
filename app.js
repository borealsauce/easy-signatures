import { initialsOf } from '/shared/names.js'
import { TERMS_VERSION } from '/shared/terms.js'
import { parseBulkRecipients, bulkCostSummary, allowanceLabel } from '/shared/bulk.js'
import { calc, visible, validate, ROLE_OPTIONS, ROLE_LABELS, roleLabel, ME_ID, ME_COLOR, FIELD_LIBRARY, fieldMeta, FT, MIN, INPUT_TYPES, US_STATES, isSensitive, formatField, DEFAULT_FAVORITES } from '/shared/fields.js'
import { marketingHtml } from '/marketing.js'
import { logoMarkSvg } from '/shared/logo.js'
import { mountHelp } from '/help.js'
import { ACCEPT, MAX_MB, toPdfs } from '/shared/convert.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const V = $('#view')
const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2']
const SIGFONTS = ['Caveat', 'Dancing Script', 'Great Vibes']
const uid = () => crypto.randomUUID()
function closeRoleMenus() {
  $$('.role-dd-menu').forEach(el => el.remove())
  $$('.role-dd-btn[aria-expanded=true]').forEach(el => el.setAttribute('aria-expanded', 'false'))
}
function openRoleMenu(btn, current, onPick) {
  closeRoleMenus()
  if (btn.disabled) return
  btn.setAttribute('aria-expanded', 'true')
  const menu = document.createElement('div')
  menu.className = 'role-dd-menu'
  menu.setAttribute('role', 'listbox')
  menu.innerHTML = ROLE_OPTIONS.map(opt => {
    const on = opt.value === current
    return `<button type="button" class="role-dd-item" role="option" aria-selected="${on}" data-role="${opt.value}"><span class="check">${on ? '✓' : ''}</span><span><b>${esc(opt.label)}</b><span class="hint">${esc(opt.hint)}</span></span></button>`
  }).join('')
  document.body.appendChild(menu)
  const r = btn.getBoundingClientRect()
  const width = Math.max(260, r.width)
  let left = r.left
  if (left + width > innerWidth - 8) left = Math.max(8, innerWidth - width - 8)
  let top = r.bottom + 4
  const mh = menu.getBoundingClientRect().height
  if (top + mh > innerHeight - 8 && r.top - mh > 8) top = r.top - mh - 4
  Object.assign(menu.style, { left: left + 'px', top: top + 'px', width: width + 'px' })
  menu.querySelectorAll('[data-role]').forEach(item => {
    item.onclick = e => { e.preventDefault(); e.stopPropagation(); onPick(item.dataset.role); closeRoleMenus() }
  })
}
document.addEventListener('mousedown', e => {
  if (!e.target.closest('.role-dd-menu, .role-dd-btn')) closeRoleMenus()
})
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRoleMenus() })
const now = () => new Date().toISOString()
const fmt = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const REMIND_OPTS = [[0, 'Off'], [2, 'Every 2 days'], [3, 'Every 3 days'], [7, 'Weekly']]
const remindSelect = (id, val, extra = '') => `<select id="${id}" ${extra}>${REMIND_OPTS.map(([v, l]) => `<option value="${v}" ${Number(val) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`
const DAY_MS = 864e5
const recentlyReminded = d => d.lastReminded && Date.now() - new Date(d.lastReminded).getTime() < DAY_MS
const PHONE_NOTE = "Your number is only used to verify your account. We'll never send spam or marketing texts."

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800) }
function modal(html) { $('#mbox').innerHTML = html; $('#modal').classList.remove('hidden') }
function closeModal() { $('#modal').classList.add('hidden') }
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal() }

let TOKEN = localStorage.getItem('eds_token') || ''
let S = { docs: [], templates: [], links: [], me: null, usage: null, smsEnabled: true, brand: { company: '', color: '#0f766e' }, folders: ['All', 'Sales', 'HR', 'Real Estate', 'Legal'], prop: null }
let activeId = null
let saveTimer = null

function deviceLocal() {
  let v = localStorage.getItem('eds_device')
  if (!v) { v = crypto.randomUUID(); localStorage.setItem('eds_device', v) }
  return v
}
function authHeaders(json = true) {
  const h = { 'X-Device-Local': deviceLocal() }
  if (json) h['Content-Type'] = 'application/json'
  if (TOKEN) h.Authorization = 'Bearer ' + TOKEN
  return h
}
async function api(path, opt = {}) {
  const res = await fetch(path, { method: opt.method || 'GET', headers: authHeaders(!opt.raw), body: opt.body ? JSON.stringify(opt.body) : undefined })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  if ((res.status === 401 || json?.error === 'account_disabled') && TOKEN && !path.startsWith('/api/sign')) {
    if (json?.error === 'account_disabled') setTimeout(() => toast(json.message), 0)
    TOKEN = ''
    localStorage.removeItem('eds_token')
    S.me = null
  }
  return { status: res.status, json, ok: res.ok }
}
function setToken(t) { TOKEN = t || ''; if (t) localStorage.setItem('eds_token', t); else localStorage.removeItem('eds_token') }
async function hydrate() {
  if (!TOKEN) return
  const res = await api('/api/state')
  if (!res.ok) return
  S.docs = res.json.documents || []
  S.templates = res.json.templates || []
  S.links = res.json.links || []
  S.me = res.json.me
  S.usage = res.json.usage
  S.brand = res.json.me.brand || S.brand
  S.folders = res.json.me.folders || S.folders
  S.prop = res.json.me.proposal || S.prop
}
const doc = id => S.docs.find(d => d.id === id) || S.templates.find(d => d.id === id)
function payload(d) {
  return {
    name: d.name, folder: d.folder, ordered: !!d.ordered, expiresDays: d.expiresDays, remindDays: d.remindDays,
    message: d.message, idv: !!d.idv, signers: d.signers.map(s => ({ id: s.id, name: s.name, email: s.email, role: s.role, color: s.color })),
    fields: d.fields
  }
}
async function persist(id) {
  const d = doc(id)
  if (!d || d.status !== 'draft') return
  const res = await api('/api/documents/' + id, { method: 'PUT', body: payload(d) })
  if (!res.ok) toast(res.json?.message || 'Could not save')
}
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (activeId) persist(activeId) }, 350) }
async function flushNow() { clearTimeout(saveTimer); if (activeId) await persist(activeId) }

function typedSig(name, font = 'Caveat') {
  const c = document.createElement('canvas'); c.width = 500; c.height = 120
  const x = c.getContext('2d'); let fs = 64
  x.font = `${fs}px '${font}'`
  while (fs > 24 && x.measureText(name || 'Signed').width > 480) { fs -= 4; x.font = `${fs}px '${font}'` }
  x.fillStyle = '#1e3a8a'; x.textBaseline = 'middle'; x.fillText(name || 'Signed', 10, 62)
  return c.toDataURL()
}
const PRE = new Map() // id -> PDF bytes we just uploaded, so the editor opens without downloading them again
function keepBytes(id, bytes) { PRE.set(id, bytes); while (PRE.size > 4) PRE.delete(PRE.keys().next().value) }
async function pdfBytes(d) {
  if (d._bytes) return d._bytes
  if (PRE.has(d.id)) return (d._bytes = PRE.get(d.id))
  const res = await fetch(d._fileUrl || ('/api/documents/' + d.id + '/file'), { headers: authHeaders(false) })
  if (!res.ok) throw new Error('Could not load the PDF')
  d._bytes = new Uint8Array(await res.arrayBuffer())
  return d._bytes
}
// Page 1 renders right away; the rest get placeholders and render as they scroll into view (or in the background).
async function renderPages(el, d) {
  el.innerHTML = '<div class="pgload"><span class="spin"></span> Loading document…</div>'
  const bytes = await pdfBytes(d)
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise // copy: pdf.js hands the buffer to its worker
  const SC = 1.6, p1 = await pdf.getPage(1), v1 = p1.getViewport({ scale: 1 })
  el.innerHTML = ''
  const wraps = [], jobs = []
  const size = (w, vw, vh) => { w.style.width = Math.min(820, vw * 1.35) + 'px'; w.style.aspectRatio = `${vw} / ${vh}`; w.dataset.pw = vw; w.dataset.ph = vh }
  for (let i = 0; i < pdf.numPages; i++) {
    const w = document.createElement('div'); w.className = 'page'; w.dataset.page = i; size(w, v1.width, v1.height)
    if (i) w.classList.add('pending')
    el.appendChild(w); wraps.push(w)
  }
  const render = i => jobs[i] ||= (async () => {
    const p = i ? await pdf.getPage(i + 1) : p1, vp = p.getViewport({ scale: SC }), w = wraps[i]
    size(w, vp.width / SC, vp.height / SC)
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
    await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
    w.prepend(c); w.classList.remove('pending')
  })()
  await render(0)
  d._pages = pdf.numPages
  if (pdf.numPages > 1) {
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); render(+e.target.dataset.page) } }), { rootMargin: '1200px 0px' }) : null
    wraps.slice(1).forEach(w => io?.observe(w))
    ;(async () => { for (let i = 1; i < pdf.numPages; i++) { if (!wraps[i].isConnected) return; await render(i); await new Promise(r => setTimeout(r, 16)) } })()
  }
}
function sigOf(d, id) { return d.signers.find(s => s.id === id) }
function partyOf(d, id) {
  if (id === ME_ID) return { id: ME_ID, name: 'Me (Fill out now)', color: ME_COLOR, role: 'sender' }
  return sigOf(d, id) || d.signers[0] || { id, name: 'Signer', color: '#64748b' }
}
function fieldCount(d, id) { return (d.fields || []).filter(f => f.signer === id).length }
function stateOptions(val) {
  const cur = String(val || '')
  return `<option value="">State…</option>` + US_STATES.map(([c, n]) => `<option value="${c}" ${cur === c || cur === n ? 'selected' : ''}>${c} — ${n}</option>`).join('')
}
function pickImageFile(cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/png,image/jpeg'
  i.onchange = () => {
    const file = i.files[0]; if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast('That image is too large (max 10 MB)')
    const r = new FileReader()
    r.onload = () => cb(r.result)
    r.readAsDataURL(file)
  }
  i.click()
}
function editorFieldFace(f, v, meta, canFill) {
  if (f.type === 'formula') return esc('= ' + (v ?? ''))
  if (v && String(v).startsWith('data:')) return `<img src="${v}">`
  if (v === true) return '✔'
  if (!canFill) return v ? esc(formatField(f, v)) : `${meta.icon} ${esc(f.label)}${f.required ? '*' : ''}`
  const ph = esc(f.placeholder || f.label || '') + (f.required ? '*' : '')
  if (f.type === 'state') return `<select class="me-fill">${stateOptions(v)}</select>`
  if (f.type === 'dropdown') return `<select class="me-fill"><option value="">${ph}</option>${(f.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
  if (f.type === 'radio') return `<div class="radios">${(f.options || []).map(o => `<label><input type="radio" name="r-${f.id}" value="${esc(o)}" ${v === o ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>`
  if (f.type === 'datetime') return `<input class="me-fill" type="${f.format === 'date' ? 'date' : 'datetime-local'}" value="${esc(v || '')}">`
  if (f.type === 'date') return `<input class="me-fill" type="date" value="${esc(v || '')}">`
  if (INPUT_TYPES.includes(f.type)) return `<input class="me-fill" type="text" autocomplete="off" placeholder="${ph}" value="${esc(v || '')}">`
  if (f.type === 'checkbox') return v === true ? '✔' : ''
  if ((f.type === 'stamp' || f.type === 'attachment' || f.type === 'signature' || f.type === 'initials' || f.type === 'payment') && v) return esc(formatField(f, v))
  return `${meta.icon} ${esc(f.label)}${f.required ? '*' : ''}`
}
function bindEditorFill(el, f, d, after) {
  const bump = () => { after() }
  const inp = $('input.me-fill,select.me-fill', el)
  if (inp) {
    inp.onchange = () => {
      let val = inp.value || null
      if (val && !validate(f, val)) { toast(`${f.label} doesn’t look valid.`); return }
      if (isSensitive(f.type) && val) val = formatField(f, val)
      if (f.type === 'currency' && val) val = formatField(f, val)
      f.value = val
      bump()
    }
    return
  }
  $$('.radios input', el).forEach(r => { r.onchange = () => { f.value = r.value; bump() } })
  if (['signature', 'initials', 'stamp', 'attachment', 'checkbox', 'payment'].includes(f.type)) {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('x') || e.target.classList.contains('h')) return
      if (f.type === 'signature' || f.type === 'initials') {
        const me = { name: S.me?.name || 'Me', sigImg: null, iniImg: null }
        sigModal(f.type, me, d, () => { f.value = f.type === 'signature' ? me.sigImg : me.iniImg; bump() })
      } else if (f.type === 'stamp') {
        pickImageFile(data => { f.value = data; bump() })
      } else if (f.type === 'attachment') {
        const i = document.createElement('input'); i.type = 'file'
        i.onchange = () => { if (i.files[0]?.size > 10 * 1024 * 1024) return toast('Attachment too large (max 10 MB)'); f.value = '📎 ' + i.files[0].name; bump() }
        i.click()
      } else if (f.type === 'checkbox') { f.value = f.value === true ? false : true; bump() }
      else if (f.type === 'payment') {
        modal(`<h3>Acknowledge $${f.amount}</h3><p>This records the amount on the document. Easy Digital Signatures does not collect this payment.</p><button class="p" id="pay">Acknowledge $${f.amount}</button>`)
        $('#pay').onclick = () => { f.value = `Acknowledged $${f.amount}`; closeModal(); bump() }
      }
    })
  }
}


async function sha256(b) { const h = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('') }

function sortable(t) {
  $$('th', t).forEach((th, i) => th.onclick = () => {
    const dir = th.classList.contains('asc') ? -1 : 1
    $$('th', t).forEach(x => x.classList.remove('asc', 'desc')); th.classList.add(dir > 0 ? 'asc' : 'desc')
    const tb = t.tBodies[0]; const rows = [...tb.rows]
    rows.sort((a, b) => {
      let x = a.cells[i].dataset.v ?? a.cells[i].innerText.trim(), y = b.cells[i].dataset.v ?? b.cells[i].innerText.trim()
      const nx = parseFloat(String(x).replace(/[$,%]/g, '')), ny = parseFloat(String(y).replace(/[$,%]/g, ''))
      if (!isNaN(nx) && !isNaN(ny) && /^[\d$.,%-]+$/.test(x) && /^[\d$.,%-]+$/.test(y)) return (nx - ny) * dir
      return String(x).localeCompare(String(y)) * dir
    })
    rows.forEach(r => tb.appendChild(r))
  })
}
function table(heads, rows) { return `<div class="tw"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` }
function afterRender() { $$('table').forEach(sortable) }

const NAV = [['#/app', 'Dashboard'], ['#/templates', 'Templates'], ['#/links', 'Signing links'], ['#/bulk', 'Bulk send'], ['#/proposal', 'Proposals'], ['#/team', 'Team'], ['#/developer', 'Developer'], ['#/settings', 'Settings'], ['#/pricing', 'Pricing']]
function meter() {
  const u = S.usage
  if (!u) return ''
  const bits = []
  if (u.promoCredits) bits.push(`${u.promoCredits} promo doc${u.promoCredits === 1 ? '' : 's'}`)
  if (u.credits) bits.push(`${u.credits} credit${u.credits === 1 ? '' : 's'}`)
  if (u.teamCredits) bits.push(`${u.teamCredits} team credit${u.teamCredits === 1 ? '' : 's'}`)
  if (u.freeAvailable) bits.push('1 free document')
  if (!bits.length) bits.push('Buy documents')
  return `<a class="meter" href="#/pricing">${bits.join(' · ')}</a>`
}
function nav() {
  const h = location.hash || '#/'
  const logo = document.querySelector('header.top a.logo')
  if (logo) logo.setAttribute('href', h.startsWith('#/sign/') ? h : '#/')
  if (h.startsWith('#/sign/')) { $('#nav').innerHTML = '<span class="sp"></span><span style="font-size:13px;color:var(--mut)">Secure signing link</span>'; document.body.classList.remove('navopen'); return }
  if (!S.me) {
    $('#nav').innerHTML = `<a href="#/pricing" class="${h.startsWith('#/pricing') ? 'on' : ''}">Pricing</a><a href="#/contact">Need help?</a><span class="sp"></span><a href="#/login">Log in</a><a href="#/signup" class="btn p" style="color:#fff">Sign up</a>`
  } else {
    $('#nav').innerHTML = NAV.map(([u, l]) => `<a href="${u}" class="${h.startsWith(u) ? 'on' : ''}">${l}</a>`).join('') + `<a href="#/contact">Need help?</a><span class="sp"></span>${meter()}<a href="#/new" class="btn p" style="color:#fff">+ New document</a><a href="#/settings">${esc(S.me.name.split(' ')[0])}</a>`
  }
  document.body.classList.remove('navopen')
}
async function route() {
  const hash = location.hash || '#/'
  const pricingAnchor = hash === '#pricing'
  const [, r, a] = (pricingAnchor ? '#/' : hash).split('/')
  const pub = ['', 'pricing', 'login', 'signup', 'sign', 'form', 'phone', 'contact', 'forgot', 'reset', 'team-invite']
  document.body.classList.toggle('marketing', (r || '') === '')
  if (S.me) { await flushNow(); activeId = null; if (r !== 'sign' && !skipHydrate) await hydrate() }
  skipHydrate = false
  nav()
  window.scrollTo(0, 0)
  if (!S.me && !pub.includes(r || '')) { location.hash = '#/login'; return }
  const R = {
    '': landing, pricing, login, signup, phone, contact, forgot, reset: () => resetPw(a), app: dashboard, new: newDoc, edit: () => editor(a),
    sign: () => signToken(a), inperson: () => inperson(a), cert: () => cert(a), templates, links, form: () => publicForm(a), bulk, proposal, team, 'team-invite': () => teamInvite(a), developer, settings
  }
  await (R[r] || landing)()
  if (pricingAnchor) document.getElementById('pricing')?.scrollIntoView()
  afterRender()
}
window.onhashchange = () => { route().catch(e => toast(e.message || 'Something went wrong')) }

function landing() { V.innerHTML = marketingHtml({ loggedIn: !!S.me, smsEnabled: S.smsEnabled !== false }) }

function pricing() { location.hash = '#pricing' }

function contact() {
  const pre = sessionStorage.getItem('contact_prefill') || ''
  sessionStorage.removeItem('contact_prefill')
  V.innerHTML = `<div class="card contact-page"><h1>Contact</h1><p>Need help with a document or your account? We reply by email.</p>
  <form id="cf">
    <label class="f">Name</label><input name="name" required style="width:100%" value="${esc(S.me?.name || '')}">
    <label class="f">Email</label><input name="email" type="email" required style="width:100%" value="${esc(S.me?.email || '')}">
    <label class="f">Message</label><textarea name="message" required rows="5" style="width:100%">${esc(pre)}</textarea>
    <label class="f">Document ID (optional)</label><input name="documentId" style="width:100%" placeholder="From the certificate, if you have one">
    <label class="hp">Company website<input name="company_url" tabindex="-1" autocomplete="off"></label>
    <br><button class="p" type="submit">Send message</button>
  </form></div>`
  $('#cf').onsubmit = async (e) => {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.target))
    const res = await api('/api/contact', { method: 'POST', body: data })
    if (!res.ok) return toast(res.json?.message || 'Could not send')
    V.innerHTML = `<div class="card contact-page"><h1>Message sent</h1><p>We emailed a confirmation to ${esc(data.email)}. You’ll hear back at that address.</p><a href="#/">Back home</a></div>`
  }
}

function login() {
  const params = new URLSearchParams(location.search)
  V.innerHTML = `<div class="card auth"><h1>Log in</h1>${params.get('verified') === '1' ? '<p class="banner">Email confirmed. Log in to continue.</p>' : ''}${params.get('verified') === '0' ? '<p class="banner">That confirmation link is invalid or already used.</p>' : ''}
  <label class="f">Email</label><input id="em" type="email" autocomplete="username" style="width:100%">
  <label class="f">Password</label><input id="pw" type="password" autocomplete="current-password" style="width:100%">
  <br><br><button class="p" id="go">Log in</button><div id="lmsg"></div>
  <p><a href="#/forgot">Forgot password?</a> · <a href="#/signup">Create an account</a> · <a href="javascript:void 0" id="rs2">Resend confirmation email</a></p></div>`
  const resendConfirm = async () => {
    const email = $('#em').value
    if (!email) return toast('Enter your email first')
    const r = await api('/api/auth/resend-email', { method: 'POST', body: { email } })
    toast(r.json?.message || (r.ok ? 'Sent' : 'Could not send'))
  }
  $('#rs2').onclick = resendConfirm
  $('#go').onclick = async () => {
    const res = await api('/api/auth/login', { method: 'POST', body: { email: $('#em').value, password: $('#pw').value } })
    if (!res.ok) {
      $('#lmsg').innerHTML = `<p class="banner">${esc(res.json?.message || 'Could not log in')}${res.json?.error === 'email_unverified' ? ' <a href="javascript:void 0" id="rs">Resend confirmation</a>' : ''}</p>`
      if ($('#rs')) $('#rs').onclick = resendConfirm
      return
    }
    setToken(res.json.token)
    await hydrate()
    if (sessionStorage.getItem('eds_buy')) { await resumeBuy(); return }
    const invite = sessionStorage.getItem('eds_team_invite')
    if (invite) { sessionStorage.removeItem('eds_team_invite'); location.hash = '#/team-invite/' + invite; return }
    location.hash = (!S.smsEnabled || S.usage?.phoneVerified) ? '#/app' : '#/phone'
  }
}

function forgot() {
  V.innerHTML = `<div class="card auth"><h1>Reset your password</h1><p>Enter your account email and we’ll send you a reset link.</p>
  <label class="f">Email</label><input id="em" type="email" autocomplete="email" style="width:100%">
  <br><br><button class="p" id="go">Send reset link</button><div id="fmsg"></div>
  <p><a href="#/login">Back to log in</a></p></div>`
  $('#go').onclick = async () => {
    $('#go').disabled = true
    const r = await api('/api/auth/forgot', { method: 'POST', body: { email: $('#em').value } })
    $('#go').disabled = false
    $('#fmsg').innerHTML = `<p class="banner">${esc(r.json?.message || (r.ok ? 'Check your email.' : 'Could not send the reset email.'))}</p>`
  }
}
function resetPw(token) {
  V.innerHTML = `<div class="card auth"><h1>Choose a new password</h1>
  <label class="f">New password</label><input id="pw" type="password" autocomplete="new-password" style="width:100%">
  <label class="f">Confirm new password</label><input id="pw2" type="password" autocomplete="new-password" style="width:100%">
  <br><br><button class="p" id="go">Save password</button><div id="rmsg"></div></div>`
  $('#go').onclick = async () => {
    if ($('#pw').value !== $('#pw2').value) { $('#rmsg').innerHTML = '<p class="banner">The passwords don’t match.</p>'; return }
    const r = await api('/api/auth/reset', { method: 'POST', body: { token: decodeURIComponent(token || ''), password: $('#pw').value } })
    if (!r.ok) { $('#rmsg').innerHTML = `<p class="banner">${esc(r.json?.message || 'Could not reset password.')} ${r.json?.error === 'reset_invalid' ? '<a href="#/forgot">Send a new link</a>' : ''}</p>`; return }
    V.innerHTML = `<div class="card auth"><h1>Password updated</h1><p>Log in with your new password.</p><a class="btn p" href="#/login">Go to log in</a></div>`
  }
}

function signup() {
  V.innerHTML = `<div class="card auth"><h1>Create your account</h1><p>${S.smsEnabled ? 'You’ll confirm your email, then a mobile number, before the free document unlocks.' : 'You’ll confirm your email before the free document unlocks.'}</p>
  <label class="f">Full name</label><input id="nm" autocomplete="name" style="width:100%">
  <label class="f">Email</label><input id="em" type="email" autocomplete="email" style="width:100%">
  <label class="f">Password</label><input id="pw" type="password" autocomplete="new-password" style="width:100%">
  <label class="f">Promo code (optional)</label><input id="pc" autocomplete="off" style="width:100%;text-transform:uppercase" placeholder="Enter code">
  <label class="row" style="margin-top:14px;align-items:flex-start;gap:8px"><input type="checkbox" id="tos" style="margin-top:3px"> <span>I agree to the <a href="/terms" target="_blank" rel="noopener">Terms</a> and <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></span></label>
  <br><button class="p" id="go">Create account</button><div id="smsg"></div>
  <p><a href="#/login">I already have an account</a></p></div>`
  $('#go').onclick = async () => {
    if (!$('#tos').checked) { $('#smsg').innerHTML = '<p class="banner">Please agree to the Terms and Privacy Policy to create your account.</p>'; return }
    const res = await api('/api/auth/signup', { method: 'POST', body: { name: $('#nm').value, email: $('#em').value, password: $('#pw').value, promo: $('#pc').value, acceptTerms: true, termsVersion: TERMS_VERSION } })
    if (!res.ok) { $('#smsg').innerHTML = `<p class="banner">${esc(res.json?.message || 'Could not sign up')}</p>`; return }
    const em = esc($('#em').value)
    const promo = res.json.promo
    const promoLine = promo ? (promo.ok ? `<p class="banner">${esc(promo.code)} applied: ${promo.granted} free documents are on your account.</p>` : `<p class="banner">${esc(promo.message)} You can enter a code later in Settings.</p>`) : ''
    V.innerHTML = res.json.emailSent === false
      ? `<div class="card auth"><h1>Account created</h1>${promoLine}<p>We couldn’t send the confirmation email to <b>${em}</b> just now. Go to log in and use <b>Resend confirmation email</b> in a few minutes.</p><a class="btn p" href="#/login">Go to log in</a></div>`
      : `<div class="card auth"><h1>Check your email</h1>${promoLine}<p>We sent a confirmation link to <b>${em}</b>. Open it, then log in.</p><a class="btn p" href="#/login">Go to log in</a></div>`
  }
}

function phone() {
  if (!S.smsEnabled) return location.hash = '#/app'
  if (!S.me) return location.hash = '#/login'
  V.innerHTML = `<div class="card auth"><h1>Verify your phone</h1><p>This unlocks your one free document. Paying does not require a phone number.</p>
  <label class="f">Mobile number</label><input id="ph" placeholder="+1 415 555 0100" autocomplete="tel" style="width:100%">
  <p class="note">${esc(PHONE_NOTE)}</p>
  <br><button class="p" id="send">Text me a code</button>
  <div id="step2" class="hidden"><label class="f">6-digit code</label><input id="code" inputmode="numeric" maxlength="6" style="width:100%;letter-spacing:4px;font-size:20px"><br><br><button class="p" id="check">Verify</button></div>
  <p><a href="#/app">Skip for now</a></p></div>`
  $('#send').onclick = async () => {
    const res = await api('/api/phone/start', { method: 'POST', body: { phone: $('#ph').value } })
    if (!res.ok) return toast(res.json?.message || 'Could not send the code')
    toast(res.json.message || 'Code sent')
    $('#step2').classList.remove('hidden')
  }
  $('#check').onclick = async () => {
    const res = await api('/api/phone/check', { method: 'POST', body: { phone: $('#ph').value, code: $('#code').value } })
    if (!res.ok) return toast(res.json?.message || 'That code did not match')
    await hydrate()
    toast(res.json.voip ? 'Phone saved. This number can’t unlock the free document.' : 'Phone verified')
    location.hash = '#/app'
  }
}

function phoneBanner() {
  if (!S.me) return ''
  if (!S.usage?.emailVerified) return `<div class="banner">Confirm your email before you send a document. <button id="resend">Resend link</button></div>`
  if (S.smsEnabled && !S.usage?.phoneVerified) return `<div class="banner"><b>Verify your phone to unlock 1 free document.</b><br><a href="#/phone">Add a mobile number</a><p class="note">${esc(PHONE_NOTE)}</p></div>`
  if (S.usage && !S.usage.freeAvailable && S.usage.freeReason && S.usage.freeReason !== 'already_used') return `<div class="banner">${esc(S.usage.freeMessage)}</div>`
  return ''
}

function dashboard() {
  let folder = sessionStorage.qpf || 'All'
  const ds = S.docs
  const c = k => ds.filter(d => d.status === k).length
  const months = [...Array(6)].map((_, i) => { const m = new Date(); m.setMonth(m.getMonth() - 5 + i); return m })
  const per = months.map(m => ds.filter(d => { const x = new Date(d.created); return x.getMonth() === m.getMonth() && x.getFullYear() === m.getFullYear() }).length)
  const mx = Math.max(...per, 1)
  const comp = ds.filter(d => d.completed && d.sent)
  const avg = comp.length ? (comp.reduce((a, d) => a + (new Date(d.completed) - new Date(d.sent)), 0) / comp.length / 36e5).toFixed(1) : '—'
  V.innerHTML = `${phoneBanner()}<div class="row"><h1 style="margin:0">Documents</h1><span class="sp"></span>${meter()}${ds.some(d => ['sent', 'waiting'].includes(d.status)) ? '<button id="rall" title="Email a reminder to everyone who hasn’t signed yet. Doesn’t use credits.">↻ Resend all unsigned</button>' : ''}<a class="btn" href="#/bulk">Bulk send</a><a class="btn p" href="#/new">+ New document</a><label class="btn">⬆ Upload<input type="file" accept="${ACCEPT}" multiple hidden onchange="uploadFiles(this.files)"></label></div>
  <div class="grid4" style="margin:18px 0">${[['Drafts', c('draft')], ['Awaiting signatures', c('sent') + c('waiting')], ['Completed', c('completed')], ['Avg. hours to complete', avg]].map(([l, v]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
  <div class="card" style="margin-bottom:18px"><h3>Documents sent per month</h3><div class="bar" style="margin:16px 0 22px">${per.map((v, i) => `<div style="height:${v / mx * 100}%" title="${v}"><span>${months[i].toLocaleString('en', { month: 'short' })} · ${v}</span></div>`).join('') || '<p>No documents yet.</p>'}</div></div>
  <div class="row" style="margin-bottom:10px">${S.folders.map(f => `<button class="${f === folder ? 'p' : ''}" data-f="${esc(f)}">📁 ${esc(f)}</button>`).join('')}<span class="sp"></span><input id="q" placeholder="Search documents…"></div><div id="dt"></div>`
  const drawT = () => {
    const q = ($('#q').value || '').toLowerCase()
    const rows = ds.filter(d => (folder === 'All' || d.folder === folder) && d.name.toLowerCase().includes(q)).map(d => {
      const sg = d.signers.filter(s => s.role !== 'cc'); const n = sg.filter(s => s.done).length; const st = d.status
      const next = d.signers.find(s => s.role !== 'cc' && !s.done)
      const exp = d.expiresAt || (d.sent && d.expiresDays ? new Date(new Date(d.sent).getTime() + d.expiresDays * 864e5).toISOString() : null)
      const expNote = exp && ['sent', 'waiting'].includes(st) ? `<div class="note">Expires ${fmt(exp)}</div>` : (st === 'expired' && exp ? `<div class="note">Expired ${fmt(exp)}</div>` : '')
      const declinedBy = d.signers.find(s => s.declined)
      const decNote = st === 'declined' && declinedBy ? `<div class="note">${esc(declinedBy.name)} declined${declinedBy.declineReason ? ': ' + esc(declinedBy.declineReason) : ''}</div>` : ''
      return `<tr><td><a href="#/${st === 'draft' ? 'edit' : st === 'completed' ? 'cert' : 'edit'}/${d.id}">${esc(d.name)}</a></td><td data-v="${st}"><span class="pill s-${st}">${st[0].toUpperCase() + st.slice(1)}</span>${expNote}${decNote}</td><td>${esc(d.folder)}</td><td>${sg.map(s => esc(s.name)).join(', ')}</td><td data-v="${n / Math.max(1, sg.length)}">${n}/${sg.length}</td><td data-v="${d.created}">${fmt(d.created)}</td><td data-v="${d.events.at(-1)?.ts || ''}">${fmt(d.events.at(-1)?.ts)}</td><td>${st === 'draft' ? `<a href="#/edit/${d.id}">Edit</a>` : ''}${['sent', 'waiting'].includes(st) && next?.token ? `<a href="#/${next.role === 'in-person' ? 'inperson/' + d.id : 'sign/' + next.token}">${next.role === 'in-person' ? 'Sign in person' : 'Signing link'}</a> · ${recentlyReminded(d) ? `<span class="note" title="You can resend once every 24 hours">Reminded ${fmt(d.lastReminded)}</span>` : `<a href="javascript:remind('${d.id}')">Resend</a>${d.lastReminded ? ` <span class="note">(last ${fmt(d.lastReminded)})</span>` : ''}`}` : ''}${st === 'completed' ? `<a href="javascript:downloadDoc('${d.id}')">PDF</a> · <a href="#/cert/${d.id}">Certificate</a>` : ''}${st !== 'draft' ? ` · <a href="javascript:timeline('${d.id}')">Timeline</a>` : ''}</td></tr>`
    })
    $('#dt').innerHTML = rows.length ? table(['Document', 'Status', 'Folder', 'Recipients', 'Signed', 'Created', 'Last activity', 'Actions'], rows) : '<div class="card"><h3>No documents yet</h3><p><a href="#/new">Upload a PDF or start from a blank page.</a></p></div>'
    afterRender()
  }
  $$('[data-f]').forEach(b => b.onclick = () => { sessionStorage.qpf = b.dataset.f; dashboard() })
  if ($('#rall')) $('#rall').onclick = async () => {
    const pre = await api('/api/documents/remind-all', { method: 'POST', body: { dryRun: true } })
    if (!pre.ok) return toast(pre.json?.message || 'Could not check documents')
    const p = pre.json
    const skippedNote = p.skipped ? `<p class="note">${p.skipped} document${p.skipped === 1 ? ' was' : 's were'} reminded in the last 24 hours and will be skipped.</p>` : ''
    if (!p.signers) return modal(`<h3>Nothing to resend</h3><p>No one is waiting to be reminded right now.</p>${skippedNote}<button onclick="closeModal()">OK</button>`)
    modal(`<h3>Resend to ${p.signers} signer${p.signers === 1 ? '' : 's'} on ${p.documents} document${p.documents === 1 ? '' : 's'}?</h3><p>Only people who haven’t signed yet get the reminder. This doesn’t use any credits.</p>${skippedNote}<div class="row" style="margin-top:12px"><button class="p" id="rgo">Resend now</button><button onclick="closeModal()">Cancel</button></div>`)
    $('#rgo').onclick = async () => {
      $('#rgo').disabled = true
      const r = await api('/api/documents/remind-all', { method: 'POST', body: {} })
      closeModal()
      toast(r.ok ? `Reminders sent to ${r.json.reminded} signer${r.json.reminded === 1 ? '' : 's'}` : (r.json?.message || 'Could not resend'))
      await hydrate(); route()
    }
  }
  const resend = $('#resend'); if (resend) resend.onclick = async () => { const r = await api('/api/auth/resend', { method: 'POST' }); toast(r.ok ? 'Confirmation email sent' : (r.json?.message || 'Could not send')) }
  $('#q').oninput = drawT; drawT()
}
async function remind(id) {
  const r = await api('/api/documents/' + id + '/remind', { method: 'POST' })
  toast(r.ok ? (r.json.reminded ? `Signing link resent to ${r.json.reminded} signer${r.json.reminded === 1 ? '' : 's'}` : 'No one is waiting to sign') : (r.json?.message || 'Could not resend'))
  if (r.ok) { await hydrate(); route() }
}
function timeline(id) { const d = doc(id); modal(`<h3>${esc(d.name)}</h3><div class="tl">${d.events.map(e => `<div><b>${esc(e.t)}</b><br><small>${fmt(e.ts)} · ${esc(e.who || '')}${e.ip ? ' · ' + esc(e.ip) : ''}</small></div>`).join('') || '<p>No activity yet.</p>'}</div><p><button onclick="closeModal()">Close</button></p>`) }
async function downloadDoc(id) {
  const res = await fetch('/api/documents/' + id + '/download', { headers: authHeaders(false) })
  if (!res.ok) return toast('The sealed PDF is not ready yet')
  const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = (doc(id)?.name || 'document').replace(/[^\w\-]+/g, '_') + '_signed.pdf'; a.click()
}


const DROPBOX_CHOOSER_EXTS = ['.pdf', '.docx', '.xlsx', '.xls', '.ods', '.csv', '.txt', '.rtf', '.odt', '.html', '.htm', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.heic', '.heif']
const GOOGLE_PICKER_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.text',
  'text/csv', 'text/plain', 'text/rtf', 'text/html',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.drawing',
  'application/vnd.google-apps.presentation'
].join(',')

function googlePickerReady() {
  return !!(S.googlePickerClientId && S.googlePickerApiKey && S.googlePickerAppId)
}
function cloudImportButtons() {
  const d = S.dropboxAppKey ? '<button type="button" class="btn lg" id="fromdbx">Dropbox</button>' : ''
  const g = googlePickerReady() ? '<button type="button" class="btn lg" id="fromgdrive">Google Drive</button>' : ''
  return d + g
}
function loadScript(src, attrs = {}) {
  return new Promise((res, rej) => {
    if (attrs.id && document.getElementById(attrs.id)) return res()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v)
    s.onload = () => res()
    s.onerror = () => rej(new Error('Could not load a needed script. Check your connection and try again.'))
    document.head.appendChild(s)
  })
}

async function importFromDropbox() {
  if (!S.dropboxAppKey) return
  try {
    if (!window.Dropbox?.choose) {
      await loadScript('https://www.dropbox.com/static/api/2/dropins.js', { id: 'dropboxjs', 'data-app-key': S.dropboxAppKey })
    }
    if (!window.Dropbox?.choose) throw new Error('Dropbox could not be loaded. Please try again.')
    const picked = await new Promise((resolve, reject) => {
      window.Dropbox.choose({
        success: files => resolve(files || []),
        cancel: () => resolve([]),
        linkType: 'direct',
        multiselect: true,
        extensions: DROPBOX_CHOOSER_EXTS,
        folderselect: false,
        sizeLimit: MAX_MB * 1024 * 1024
      })
    })
    if (!picked.length) return
    const files = []
    const errors = []
    for (const item of picked) {
      try { files.push(await dropboxItemToFile(item)) }
      catch (e) { errors.push(`${item.name || 'File'}: ${e.message}`) }
    }
    if (files.length) await uploadFiles(files)
    if (errors.length) modal(`<h3>${errors.length} file${errors.length === 1 ? '' : 's'} couldn’t be added</h3><ul class="uperr">${errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul><button class="p" onclick="closeModal()">OK</button>`)
  } catch (e) { toast(e.message || 'Could not open Dropbox') }
}

async function dropboxItemToFile(item) {
  const name = item.name || 'document'
  try {
    const res = await fetch(item.link)
    if (res.ok) {
      const blob = await res.blob()
      if (blob.size && !/text\/html/i.test(blob.type || '')) return new File([blob], name, { type: blob.type || 'application/octet-stream' })
    }
  } catch { /* CORS or network: fall through to the same-origin proxy */ }
  const res = await fetch('/api/documents/import-fetch', {
    method: 'POST',
    headers: { ...authHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ url: item.link, name, source: 'dropbox' })
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.message || 'Could not download that Dropbox file.')
  }
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'application/octet-stream' })
}

async function importFromGoogleDrive() {
  if (!googlePickerReady()) return
  try {
    const token = await googleAccessToken()
    const docs = await openGooglePicker(token)
    if (!docs.length) return
    const files = []
    const errors = []
    for (const doc of docs) {
      try { files.push(await googleDocToFile(doc, token)) }
      catch (e) { errors.push(`${doc.name || 'File'}: ${e.message}`) }
    }
    if (files.length) await uploadFiles(files)
    if (errors.length) modal(`<h3>${errors.length} file${errors.length === 1 ? '' : 's'} couldn’t be added</h3><ul class="uperr">${errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul><button class="p" onclick="closeModal()">OK</button>`)
  } catch (e) {
    const msg = e.message || 'Could not open Google Drive'
    if (/popup_closed|popup_blocked|access_denied|cancelled|canceled/i.test(msg)) return
    toast(msg)
  }
}

async function googleAccessToken() {
  await loadScript('https://accounts.google.com/gsi/client', { id: 'google-gis' })
  if (!window.google?.accounts?.oauth2) throw new Error('Google sign-in could not be loaded. Please try again.')
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: S.googlePickerClientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: resp => {
        if (resp?.access_token) resolve(resp.access_token)
        else reject(new Error(resp?.error_description || resp?.error || 'Google Drive access was not granted.'))
      },
      error_callback: err => reject(new Error(err?.message || err?.type || 'Google sign-in was cancelled'))
    })
    client.requestAccessToken({ prompt: '' })
  })
}

async function openGooglePicker(token) {
  await loadScript('https://apis.google.com/js/api.js', { id: 'google-gapi' })
  if (!window.gapi?.load) throw new Error('Google Drive could not be loaded. Please try again.')
  await new Promise((resolve, reject) => window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Google Drive could not be loaded. Please try again.')) }))
  if (!window.google?.picker) throw new Error('Google Drive could not be loaded. Please try again.')
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setMimeTypes(GOOGLE_PICKER_MIMES)
  return new Promise(resolve => {
    const picker = new google.picker.PickerBuilder()
      .addView(view)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(token)
      .setDeveloperKey(S.googlePickerApiKey)
      .setAppId(String(S.googlePickerAppId))
      .setOrigin(location.origin)
      .setTitle('Select a document to sign')
      .setCallback(data => {
        if (data.action === google.picker.Action.PICKED) resolve((data.docs || []).map(d => ({
          id: d.id,
          name: d.name,
          mimeType: d.mimeType
        })))
        else if (data.action === google.picker.Action.CANCEL) resolve([])
      })
      .build()
    picker.setVisible(true)
  })
}

function googleExport(mime) {
  if (!String(mime || '').startsWith('application/vnd.google-apps.')) return null
  return { mime: 'application/pdf', ext: '.pdf' }
}

async function googleDocToFile(doc, token) {
  const exp = googleExport(doc.mimeType)
  const url = exp
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}/export?mimeType=${encodeURIComponent(exp.mime)}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
  if (!res.ok) throw new Error('Could not download that Google Drive file.')
  const blob = await res.blob()
  if (!blob.size) throw new Error('That Google Drive file was empty.')
  const base = (doc.name || 'document').replace(/\.[^.]+$/, '')
  const name = exp ? base + exp.ext : (doc.name || 'document')
  return new File([blob], name, { type: exp?.mime || blob.type || 'application/octet-stream' })
}

function newDoc() {
  V.innerHTML = `<h1>Start a document</h1><div id="dz" class="dz"><div class="ic">⬆️</div><h3>Drop PDFs, Word docs, or images here</h3><p>PDF · Word · Excel · CSV · text · JPG · PNG · HEIC · screenshots &amp; more · up to ${MAX_MB} MB each. Several photos become one document.</p><div class="cloud-btns"><label class="btn p lg">Browse files<input type="file" id="up" accept="${ACCEPT}" multiple hidden></label><label class="btn lg camb">📷 Photo or camera<input type="file" id="upcam" accept="image/*" multiple hidden></label>${cloudImportButtons()}</div></div>
  <div class="grid3">${S.templates.map(t => `<div class="card"><div class="ic">📄</div><h3>${esc(t.name)}</h3><p>Your template · roles: ${t.signers.map(s => esc(s.name)).join(', ')}</p><br><button class="p" onclick="fromTemplate('${t.id}')">Use template</button></div>`).join('')}
  <div class="card"><div class="ic">🧩</div><h3>Create a template</h3><p>Upload your own PDF or start from a blank page, then place fields by role. Nothing prebuilt.</p><br><button onclick="tplBuilder()">Create template</button></div>
  <div class="card"><div class="ic">🧾</div><h3>Build a proposal</h3><p>Pricing table → PDF → signature.</p><br><a class="btn" href="#/proposal">Open builder</a></div></div>`
  $('#up').onchange = e => uploadFiles(e.target.files)
  $('#upcam').onchange = e => uploadFiles(e.target.files)
  $('#fromdbx')?.addEventListener('click', importFromDropbox)
  $('#fromgdrive')?.addEventListener('click', importFromGoogleDrive)
  const dz = $('#dz'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('over') }; dz.ondragleave = () => dz.classList.remove('over')
  dz.ondrop = e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); uploadFiles(e.dataTransfer.files) }
}
function xhrSend(method, url, body, headers, onProgress) {
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open(method, url)
    for (const [k, v] of Object.entries(headers || {})) x.setRequestHeader(k, v)
    x.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(e.loaded / e.total) }
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText || '{}') } catch {} ; res({ ok: x.status >= 200 && x.status < 300, status: x.status, json: j }) }
    x.onerror = () => rej(new Error('Network error. Check your connection and try again.'))
    x.send(body)
  })
}
// Uploads a finished PDF. Big files go straight to storage with a signed URL (no serverless size limit).
async function sendPdf(bytes, filename, { name, template } = {}, onProgress) {
  const pre = nextUploadUrl; nextUploadUrl = null
  const start = (pre && await pre.catch(() => null)) || await api('/api/documents/upload-url', { method: 'POST', body: { size: bytes.length } })
  if (!start.ok) throw new Error(start.json?.message || 'Could not start the upload')
  const blob = new Blob([bytes], { type: 'application/pdf' })
  if (start.json.direct) {
    const put = await xhrSend('PUT', start.json.url, blob, { 'Content-Type': 'application/pdf', 'x-upsert': 'true' }, onProgress)
    if (!put.ok) throw new Error('The upload didn’t finish. Please try again.')
    const done = await api('/api/documents/upload-complete', { method: 'POST', body: { id: start.json.id, name, filename, template: !!template } })
    if (!done.ok) throw new Error(done.json?.message || 'Could not upload')
    return done.json
  }
  const fd = new FormData(); fd.append('file', blob, filename.replace(/\.[^.]+$/, '') + '.pdf'); if (name) fd.append('name', name); if (template) fd.append('template', 'true')
  const r = await xhrSend('POST', '/api/documents/upload', fd, { Authorization: 'Bearer ' + TOKEN, 'X-Device-Local': deviceLocal() }, onProgress)
  if (!r.ok) throw new Error(r.json?.message || (r.status === 413 ? `Files must be ${MAX_MB} MB or smaller.` : 'Could not upload'))
  return r.json
}
async function previewFirstPage(bytes, el) {
  const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise, p = await pdf.getPage(1)
  const vp = p.getViewport({ scale: 1.6 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
  await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
  const w = document.createElement('div'); w.className = 'page'; w.style.width = Math.min(820, vp.width / 1.6 * 1.35) + 'px'; w.appendChild(c)
  el.innerHTML = ''; el.appendChild(w); return pdf.numPages
}
let uploading = false
let skipHydrate = false // set right after an upload: we already have the new draft, so the editor opens without a /api/state round trip
let nextUploadUrl = null
async function uploadFiles(list) {
  window.hideDrop?.()
  const files = [...list || []]
  if (!files.length || uploading) return
  uploading = true
  const names = files.map(f => f.name)
  V.innerHTML = `<div class="upflow"><div class="upcard"><div class="upstat"><span class="spin"></span><div><b id="upmsg">Reading ${files.length === 1 ? esc(files[0].name) : files.length + ' files'}…</b><div class="note" id="upsub">${esc(names.slice(0, 4).join(' · '))}${names.length > 4 ? ' …' : ''}</div></div></div><div class="upbar"><i id="upbar"></i></div></div><div class="pages" id="upprev"></div></div>`
  const msg = m => { const e = $('#upmsg'); if (e) e.textContent = m }
  const bar = f => { const e = $('#upbar'); if (e) e.style.width = Math.round(f * 100) + '%' }
  // Ask for the signed upload URL while the file is still being read/converted (size is re-checked on completion).
  nextUploadUrl = api('/api/documents/upload-url', { method: 'POST', body: { size: Math.min(files[0].size || 1, MAX_MB * 1024 * 1024) } }).then(r => r.ok ? r : null)
  try {
    const { docs, errors } = await toPdfs(files, msg)
    let first = null
    if (docs.length) {
      const pages = previewFirstPage(docs[0].bytes, $('#upprev')).catch(() => 0) // page 1 shows while the upload runs
      const prog = docs.map(() => 0), total = docs.reduce((a, x) => a + x.bytes.length, 0)
      msg(docs.length === 1 ? 'Uploading…' : `Uploading ${docs.length} documents…`)
      const results = await Promise.all(docs.map((x, i) => sendPdf(x.bytes, x.name, {}, f => { prog[i] = f * x.bytes.length; bar(prog.reduce((a, b) => a + b, 0) / total) })
        .then(j => { keepBytes(j.id, x.bytes); return j }, e => { errors.push(`${x.name}: ${e.message}`); return null })))
      bar(1); msg('Preparing pages…'); await pages
      const made = results.filter(Boolean)
      first = made[0]?.id || null
      if (made.length && made.every(x => x.id && Array.isArray(x.signers))) { S.docs = [...made.filter(x => !S.docs.some(y => y.id === x.id)), ...S.docs]; skipHydrate = true }
    }
    if (errors.length) modal(`<h3>${errors.length} file${errors.length === 1 ? '' : 's'} couldn’t be added</h3><ul class="uperr">${errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul><p class="note">Works with PDF, Word (.docx), Excel (.xlsx/.xls), CSV, text, RTF, ODT, HTML, and images (JPG, PNG, HEIC, WEBP, GIF, BMP, TIFF).</p><button class="p" onclick="closeModal()">OK</button>`)
    if (first) { toast(docs.length > 1 ? 'Drafts created' : 'Draft created'); location.hash = '#/edit/' + first }
    else route()
  } catch (e) { toast(e.message || 'Upload failed'); route() } finally { uploading = false }
}
;(() => {
  const ov = document.createElement('div'); ov.id = 'dropov'; ov.innerHTML = '<div>📄 Drop PDFs, Word docs, or images</div>'; document.body.appendChild(ov); let n = 0
  const ok = () => /^#\/(app|new)$/.test(location.hash)
  const hide = () => { n = 0; ov.classList.remove('on') }
  window.hideDrop = hide
  addEventListener('dragenter', e => { if (!ok() || ![...e.dataTransfer.types].includes('Files')) return; n++; ov.classList.add('on') })
  addEventListener('dragleave', e => { if (--n <= 0 || !e.relatedTarget) hide() })
  addEventListener('dragover', e => { if (ok()) e.preventDefault() })
  addEventListener('drop', hide, true) // capture phase: hides even when the drop zone stops the event
  addEventListener('dragend', hide); addEventListener('hashchange', hide)
  addEventListener('drop', e => { if (!ok() || e.defaultPrevented || !S.me) return; e.preventDefault(); uploadFiles(e.dataTransfer.files) })
})()

async function fromTemplate(tid) {
  const res = await api('/api/documents/from-template', { method: 'POST', body: { templateId: tid } })
  if (!res.ok) return toast(res.json?.message || 'Could not use that template')
  location.hash = '#/edit/' + res.json.id
}
function editTpl(tid) { location.hash = '#/edit/' + tid }
async function delTpl(tid) {
  if (!confirm('Delete this template?')) return
  const res = await api('/api/documents/' + tid, { method: 'DELETE' })
  if (!res.ok) return toast(res.json?.message || 'Could not delete')
  await hydrate(); route()
}
async function saveTpl(id) {
  const d = doc(id)
  if (d.tpl) { await flushNow(); toast('Template saved'); location.hash = '#/templates'; return }
  const name = prompt('Template name', d.name)
  if (!name) return
  await flushNow()
  const res = await api('/api/documents/' + id + '/template', { method: 'POST', body: { name } })
  if (!res.ok) return toast(res.json?.message || 'Could not save the template')
  toast('Template saved')
}
function tplBuilder() {
  modal(`<h3>Create a template</h3><p style="font-size:13px;color:var(--mut)">Build a reusable document from scratch. Nothing prebuilt.</p>
  <label class="f">Template name</label><input id="tbn" style="width:100%" placeholder="e.g. Client intake form">
  <label class="f">Roles (comma separated)</label><input id="tbr" style="width:100%" value="Client">
  <label class="f">Start from</label>
  <label class="row" style="font-size:14px"><input type="radio" name="tbs" value="up" checked> Upload my own PDF / image</label>
  <label class="row" style="font-size:14px"><input type="radio" name="tbs" value="bl"> Blank page(s) <input id="tbp" type="number" min="1" max="10" value="1" style="width:60px"></label>
  <input type="file" id="tbf" accept="${ACCEPT}" style="margin-top:8px"><br><br>
  <div class="row"><button class="p" id="tbg">Continue to place fields</button><button onclick="closeModal()">Cancel</button></div>`)
  $('#tbf').onchange = () => { $('[name=tbs][value=up]').checked = true; if (!$('#tbn').value && $('#tbf').files[0]) $('#tbn').value = $('#tbf').files[0].name.replace(/\.[a-z0-9]+$/i, '') }
  $('#tbg').onclick = async () => {
    const name = $('#tbn').value.trim() || 'Untitled template'
    const roles = $('#tbr').value.split(',').map(x => x.trim()).filter(Boolean)
    if ($('[name=tbs]:checked').value === 'up') {
      const f = $('#tbf').files[0]
      if (!f) return toast('Choose a file, or pick Blank page')
      const btn = $('#tbg'); btn.disabled = true; btn.textContent = 'Uploading…'
      let json
      try {
        const { docs, errors } = await toPdfs([f], m => { btn.textContent = m })
        if (!docs[0]) throw new Error(errors[0] || 'Upload failed')
        json = await sendPdf(docs[0].bytes, f.name, { template: true, name })
        keepBytes(json.id, docs[0].bytes)
      } catch (e) { btn.disabled = false; btn.textContent = 'Continue to place fields'; return toast(e.message || 'Upload failed') }
      if (roles.length) {
        json.signers = roles.map((r, i) => ({ id: json.signers[i]?.id || uid(), name: r, email: '', role: 'signer', color: COLORS[i % 6] }))
        json.ordered = true; json.fields = []; json.expiresDays = 30; json.remindDays = S.me?.reminderDefault ?? 3; json.message = json.message || 'Please review and sign.'; json.folder = json.folder || 'Sales'
        await api('/api/documents/' + json.id, { method: 'PUT', body: payload(json) })
      }
      closeModal(); location.hash = '#/edit/' + json.id
    } else {
      const res = await api('/api/documents/blank', { method: 'POST', body: { name, pages: +$('#tbp').value || 1, roles, template: true } })
      if (!res.ok) return toast(res.json?.message || 'Could not create the template')
      closeModal(); location.hash = '#/edit/' + res.json.id
    }
  }
}

// ---------- "Who needs to sign?" step, shown right after a new upload loads ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Follows the role list the Recipients panel offers (shared/fields.js), so both places always match.
const rcpRoles = () => ROLE_OPTIONS.map(r => [r.value, r.value === 'cc' ? 'Needs to view (CC)' : r.label])
const rcpSkipped = new Set()
function needsRecipients(d) {
  if (d.status !== 'draft' || rcpSkipped.has(d.id) || (d.fields || []).length) return false
  return !d.signers.some(s => (s.email || '').trim())
}
function knownContacts() {
  const m = new Map()
  for (const x of [...S.docs, ...(S.bulkDocs || [])]) for (const s of x.signers || []) {
    const e = (s.email || '').trim().toLowerCase()
    if (EMAIL_RE.test(e) && !m.has(e) && s.name && !/^signer \d+$/i.test(s.name)) m.set(e, { email: s.email.trim(), name: s.name.trim() })
  }
  if (S.me?.email) m.delete(S.me.email.toLowerCase())
  return [...m.values()].slice(0, 300)
}
function recipientsStep(d, done) {
  $('.rcp')?.remove()
  const me = { name: S.me?.name || '', email: S.me?.email || '' }
  const fresh = s => !s.email && /^signer \d+$/i.test(s.name || '')
  let rows = d.signers.filter(s => !fresh(s)).map(s => ({ id: s.id, name: s.name, email: s.email || '', role: s.role, color: s.color }))
  if (!rows.length) rows = [{ id: uid(), name: '', email: '', role: 'signer' }]
  let ordered = !!d.ordered && rows.length > 1, showErr = false
  const contacts = knownContacts()
  const ov = document.createElement('div'); ov.className = 'rcp'; document.body.appendChild(ov)
  const colorFor = (r, i) => r.color || COLORS[i % COLORS.length]
  const av = (r, i) => `<span class="rav" style="background:${colorFor(r, i)}">${esc(r.name.trim() ? initialsOf(r.name) : (r.email ? r.email[0].toUpperCase() : '?'))}</span>`
  const errs = (r, i) => ({
    name: !r.name.trim() ? 'Enter a name' : '',
    email: r.role === 'in-person' && !r.email.trim() ? '' : !r.email.trim() ? 'Enter an email' : !EMAIL_RE.test(r.email.trim()) ? 'Check this email' : rows.findIndex(x => x.email.trim().toLowerCase() === r.email.trim().toLowerCase()) !== i ? 'Already added' : ''
  })
  const draw = () => {
    ov.innerHTML = `<div class="rcpbox" role="dialog" aria-modal="true" aria-labelledby="rcpt">
      <div class="rcphead"><div><h2 id="rcpt">Who needs to sign?</h2><p>Add everyone who signs or gets a copy. You can change this later in the Recipients panel.</p></div><button class="rcpx" data-a="close" aria-label="Close">✕</button></div>
      <div class="rcpbody">
        <label class="rcptog"><input type="checkbox" id="rcpord" ${ordered ? 'checked' : ''}><span class="sw"></span><span><b>Set signing order</b><small>${ordered ? 'Drag ⠿ to reorder. Each person gets the link after the one above finishes.' : 'Everyone gets the link at the same time.'}</small></span></label>
        <div class="rcplist">${rows.map((r, i) => { const e = showErr ? errs(r, i) : {}; return `<div class="rrow${r.role === 'cc' ? ' cc' : ''}" data-i="${i}">
          ${ordered ? `<span class="rgrip" title="Drag to reorder" data-grip="${i}">⠿</span><span class="rnum">${i + 1}</span>` : ''}${av(r, i)}
          <div class="rf"><input data-k="name" value="${esc(r.name)}" placeholder="Full name" autocomplete="off" list="rcp-names" class="${e.name ? 'bad' : ''}" aria-label="Full name">${e.name ? `<small class="rerr">${e.name}</small>` : ''}</div>
          <div class="rf re"><input data-k="email" type="email" value="${esc(r.email)}" placeholder="${r.role === 'in-person' ? 'Email (optional)' : 'Email address'}" autocomplete="off" list="rcp-emails" class="${e.email ? 'bad' : ''}" aria-label="Email">${e.email ? `<small class="rerr">${e.email}</small>` : ''}</div>
          <select data-k="role" aria-label="Role">${rcpRoles().concat(rcpRoles().some(([v]) => v === r.role) ? [] : [[r.role, r.role === 'cc' ? 'Needs to view (CC)' : roleLabel(r.role)]]).map(([v, l]) => `<option value="${v}" ${v === r.role ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <button class="rdel" data-del="${i}" title="Remove" aria-label="Remove recipient"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm4 2v8h2v-8h-2zm4 0v8h2v-8h-2z"/></svg></button>
        </div>` }).join('')}</div>
        <div class="rcpadd"><button data-a="add">+ Add recipient</button>${rcpRoles().some(([v]) => v === 'cc') ? '<button data-a="cc">+ Add CC</button>' : ''}${me.email && !rows.some(r => r.email.trim().toLowerCase() === me.email.toLowerCase()) ? `<button data-a="me" class="rme">✍️ I'm signing too</button>` : ''}</div>
        <datalist id="rcp-emails">${contacts.map(c => `<option value="${esc(c.email)}">${esc(c.name)}</option>`).join('')}</datalist>
        <datalist id="rcp-names">${contacts.map(c => `<option value="${esc(c.name)}">${esc(c.email)}</option>`).join('')}</datalist>
      </div>
      <div class="rcpfoot"><button class="rlink" data-a="self">Skip, just me</button><span class="sp"></span><button class="p lg" data-a="go">Continue to place fields →</button></div>
    </div>`
    $$('.rrow', ov).forEach(row => {
      const i = +row.dataset.i, r = rows[i]
      $$('[data-k]', row).forEach(inp => {
        inp.oninput = () => {
          r[inp.dataset.k] = inp.value
          if (inp.dataset.k === 'email') { const c = contacts.find(c => c.email.toLowerCase() === inp.value.trim().toLowerCase()); if (c && !r.name.trim()) { r.name = c.name; $('[data-k=name]', row).value = c.name } }
          if (inp.dataset.k === 'name') { const c = contacts.find(c => c.name.toLowerCase() === inp.value.trim().toLowerCase()); if (c && !r.email.trim()) { r.email = c.email; $('[data-k=email]', row).value = c.email } }
          $('.rav', row).outerHTML = av(r, i)
        }
        if (inp.tagName === 'SELECT') inp.onchange = () => { r.role = inp.value; draw() }
      })
    })
    $$('[data-del]', ov).forEach(b => b.onclick = () => { rows.splice(+b.dataset.del, 1); if (!rows.length) rows.push({ id: uid(), name: '', email: '', role: 'signer' }); draw() })
    $$('[data-grip]', ov).forEach(g => g.onpointerdown = e => dragRow(e, +g.dataset.grip))
    $('#rcpord', ov).onchange = e => { ordered = e.target.checked; draw() }
  }
  const dragRow = (e, from) => {
    e.preventDefault()
    const list = $('.rcplist', ov), row = list.children[from]; row.classList.add('drag'); let to = from
    const mv = m => {
      const kids = [...list.children]; to = kids.length
      for (let k = 0; k < kids.length; k++) { if (k === from) continue; const b = kids[k].getBoundingClientRect(); if (m.clientY < b.top + b.height / 2) { to = k; break } }
      row.style.transform = `translateY(${m.clientY - e.clientY}px)`
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const [x] = rows.splice(from, 1); rows.splice(to > from ? to - 1 : to, 0, x); draw() }
    addEventListener('pointermove', mv); addEventListener('pointerup', up)
  }
  const close = () => { ov.remove(); removeEventListener('keydown', key) }
  const commit = list => {
    const keep = new Set(list.map(r => r.id))
    const used = new Set()
    d.signers = list.map((r, i) => {
      const old = d.signers.find(s => s.id === r.id)
      let color = r.color || COLORS[i % COLORS.length]; if (used.has(color)) color = COLORS.find(c => !used.has(c)) || color; used.add(color)
      return { ...(old || {}), id: r.id, name: r.name.trim(), email: r.email.trim(), role: r.role, color, done: false }
    })
    const firstSigner = d.signers.find(s => s.role !== 'cc') || d.signers[0]
    d.fields = (d.fields || []).map(f => keep.has(f.signer) ? f : { ...f, signer: firstSigner.id })
    d.ordered = ordered && d.signers.length > 1
    const ord = $('#ord'); if (ord) ord.checked = d.ordered
    rcpSkipped.add(d.id); save(); close(); done()
  }
  const key = e => { if (e.key === 'Escape') { rcpSkipped.add(d.id); close() } }
  addEventListener('keydown', key)
  ov.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a
    if (e.target === ov || a === 'close') { rcpSkipped.add(d.id); return close() }
    if (a === 'add') { rows.push({ id: uid(), name: '', email: '', role: 'signer' }); draw(); $$('.rrow [data-k=name]', ov).at(-1)?.focus() }
    if (a === 'cc') { rows.push({ id: uid(), name: '', email: '', role: 'cc' }); draw(); $$('.rrow [data-k=name]', ov).at(-1)?.focus() }
    if (a === 'me') { const blank = rows.find(r => !r.name.trim() && !r.email.trim()); const r = blank || { id: uid(), role: 'signer' }; Object.assign(r, { name: me.name, email: me.email, role: 'signer' }); if (!blank) rows.push(r); draw() }
    if (a === 'self') { const r = d.signers.find(s => (s.email || '').toLowerCase() === me.email.toLowerCase()) || d.signers[0] || {}; ordered = false; commit([{ id: r.id || uid(), name: me.name || 'Me', email: me.email, role: 'signer', color: r.color || COLORS[0] }]); toast('Just you — place your fields, then send it to yourself to sign') }
    if (a === 'go') {
      const list = rows.filter(r => r.name.trim() || r.email.trim())
      if (!list.length) { showErr = true; rows = [{ id: uid(), name: '', email: '', role: 'signer' }]; draw(); return toast('Add at least one person, or choose “Skip, just me”') }
      rows = list
      if (rows.some((r, i) => errs(r, i).name || errs(r, i).email)) { showErr = true; draw(); $('.rrow .bad', ov)?.focus(); return }
      if (!rows.some(r => r.role !== 'cc')) { showErr = true; draw(); return toast('Add at least one signer — CC recipients only get a copy') }
      commit(rows)
      const s1 = d.signers.find(s => s.role !== 'cc'); toast(`Now drag fields onto the page for ${s1.name.split(' ')[0]}`)
    }
  }
  draw()
  setTimeout(() => $('.rrow [data-k=name]', ov)?.focus(), 50)
}

let sel = null
async function editor(id) {
  const d = doc(id)
  if (!d) { V.innerHTML = '<p>Not found</p>'; return }
  activeId = d.status === 'draft' ? id : null
  sel = null
  let cur = d.signers.find(s => s.role !== 'cc')?.id
  const locked = d.status !== 'draft'
  V.innerHTML = `<div class="row" style="margin-bottom:12px"><input id="dn" value="${esc(d.name)}" style="font-size:20px;font-weight:700;flex:1;min-width:200px" ${locked ? 'disabled' : ''}><span class="pill s-${d.status}">${d.status}</span>
  ${d.tpl ? `<span class="pill s-draft">template builder</span><a class="btn" href="#/templates">Done</a><button class="p" onclick="saveTpl('${d.id}')">Save template</button>` : locked ? `<button onclick="timeline('${d.id}')">Timeline</button>` : `<button onclick="saveTpl('${d.id}')">Save as template</button><button class="p" id="send">Send</button>`}</div>
  ${d.tpl ? '<div class="card" style="margin-bottom:12px;padding:10px 14px;font-size:13px"><b>Template builder.</b> Recipients here are roles. Real names and emails are filled in each time you use the template.</div>' : ''}
  <div class="editor"><div class="panel fpanel" id="fpanel"></div>
  <div class="pages" id="pages"></div>
  <div class="panel"><h4 class="rcph">${d.tpl ? 'Roles' : 'Who needs to sign?'}${d.tpl || locked ? '' : '<button class="rcpedit" onclick="editRecipients()">Edit</button>'}</h4><label class="row" style="font-size:13px"><input type="checkbox" id="ord" ${d.ordered ? 'checked' : ''}> Sign in order — one after another</label><div id="sg"></div>${locked ? '' : '<button onclick="addSigner()" style="width:100%">+ Add recipient</button>'}
  <h4 style="margin-top:16px">Field properties</h4><div id="props"><p style="font-size:13px;color:var(--mut)">Select a field.</p></div>
  <h4 style="margin-top:16px">Settings</h4><label class="f">Folder</label><select id="fo">${S.folders.slice(1).map(f => `<option ${f === d.folder ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
  <label class="f">Expires after (days)</label><input id="ex" type="number" min="1" max="365" value="${d.expiresDays}" style="width:100%"><p class="note" style="font-size:12px">The signing link closes after this many days. Unsigned signers and you get a warning email 2 days before.</p><label class="f">Automatic reminders</label>${remindSelect('rm', d.remindDays, 'style="width:100%"')}<p class="note" style="font-size:12px">Emails only people who haven’t signed. Up to 5 reminders; stops when signed, voided or expired.${locked && !d.tpl ? ` Sent ${d.autoReminders || 0} automatic so far.${d.lastReminded ? ' Last reminded ' + fmt(d.lastReminded) + '.' : ''}` : ''}</p>
  <label class="row" style="font-size:13px;margin-top:8px"><input type="checkbox" id="idv" ${d.idv ? 'checked' : ''}> Email an access code</label><label class="f">Message</label><textarea id="msg" style="width:100%">${esc(d.message || '')}</textarea>
  ${locked && d.signers.some(s => s.token) ? `<h4>Signing links</h4>${d.signers.filter(s => s.token).map(s => `<p style="font-size:12px"><b>${esc(s.name)}</b> ${s.role === 'in-person' ? '<span class="note">(in person)</span>' : ''}<br><a href="#/${s.role === 'in-person' ? 'inperson/' + d.id : 'sign/' + s.token}">${s.role === 'in-person' ? 'Hand this device' : 'Open link'}</a></p>`).join('')}` : ''}</div></div>`
  window.addSigner = () => { d.signers.push({ id: uid(), name: 'Signer ' + (d.signers.length + 1), email: '', role: 'signer', color: COLORS[d.signers.length % 6], done: false }); save(); drawS() }
  const drawS = () => {
    $('#sg').innerHTML = d.signers.map((s, i) => `<div style="border:1px solid ${s.id === cur ? s.color : 'var(--line)'};border-radius:8px;padding:6px;margin-bottom:6px" data-s="${s.id}"><div class="signer"><span class="rav sm" style="background:${s.color}">${esc(s.name.trim() ? initialsOf(s.name) : '?')}</span><b style="font-size:12px">${d.ordered ? i + 1 + '.' : ''}</b><input value="${esc(s.name)}" data-k="name" placeholder="${d.tpl ? 'Role name' : 'Full name'}" ${locked ? 'disabled' : ''}>${i > 0 && !locked ? `<span style="cursor:pointer" data-up="${i}">↑</span><span style="cursor:pointer" data-del="${i}">✕</span>` : ''}</div><div class="signer"><input value="${esc(s.email || '')}" data-k="email" placeholder="${s.role === 'in-person' ? 'Email optional' : 'email@example.com'}" ${locked ? 'disabled' : ''}><div class="role-dd"><button type="button" class="role-dd-btn" data-k="role" data-role="${s.role}" ${locked ? 'disabled' : ''} aria-haspopup="listbox" aria-expanded="false" title="${esc((ROLE_LABELS.find(o => o.value === s.role) || ROLE_OPTIONS[0]).hint)}">${esc(roleLabel(s.role))}<span class="caret">▾</span></button></div></div>${s.role === 'in-person' ? '<p class="note">No email needed — you’ll hand them this device after you send.</p>' : s.role === 'approver' ? '<p class="note">Approves or declines with a reason. No signature fields needed.</p>' : s.role === 'cc' ? '<p class="note">Gets a copy of the finished document. They don’t sign.</p>' : ''}${d.tpl || s.role === 'cc' || s.role === 'approver' ? '' : `<div class="asig"><img data-ps="sig" src="${s.name.trim() ? typedSig(s.name) : ''}"><img data-ps="ini" src="${s.name.trim() ? typedSig(initialsOf(s.name)) : ''}"><small data-ps="txt">${s.name.trim() ? initialsOf(s.name) : ''}</small></div>`}</div>`).join('')
    $$('[data-s]').forEach(el => {
      el.onclick = e => { if (e.target.closest('input,select,button,.role-dd')) return; cur = el.dataset.s; drawS(); if (typeof drawPanel === 'function') drawPanel() }
      const nm = $('[data-k=name]', el)
      if (nm) nm.oninput = () => { const v = nm.value.trim(), a = $('[data-ps=sig]', el); if (!a) return; a.src = v ? typedSig(v) : ''; $('[data-ps=ini]', el).src = v ? typedSig(initialsOf(v)) : ''; $('[data-ps=txt]', el).textContent = v ? initialsOf(v) : '' }
      $$('input[data-k]', el).forEach(inp => inp.onchange = () => { const s = sigOf(d, el.dataset.s); s[inp.dataset.k] = inp.value; save(); drawF() })
      const roleBtn = $('[data-k=role]', el)
      if (roleBtn && !roleBtn.disabled) roleBtn.onclick = e => {
        e.preventDefault(); e.stopPropagation()
        const s = sigOf(d, el.dataset.s)
        openRoleMenu(roleBtn, s.role, role => { s.role = role; save(); drawS(); drawF() })
      }
    })
    $$('[data-del]').forEach(x => x.onclick = () => { const s = d.signers.splice(+x.dataset.del, 1)[0]; d.fields = d.fields.filter(f => f.signer !== s.id); save(); drawS(); drawF(); if (typeof drawPanel === 'function') drawPanel() })
    $$('[data-up]').forEach(x => x.onclick = () => { const i = +x.dataset.up; [d.signers[i - 1], d.signers[i]] = [d.signers[i], d.signers[i - 1]]; save(); drawS() })
  }
  const drawF = () => {
    $$('.fld').forEach(x => x.remove())
    d.fields.forEach(f => {
      const pg = $(`.page[data-page="${f.page}"]`); if (!pg) return
      const s = partyOf(d, f.signer)
      const el = document.createElement('div'); el.className = 'fld ed' + (sel === f.id ? ' sel' : ''); el.dataset.id = f.id
      Object.assign(el.style, { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%', borderColor: s.color, color: s.color, background: s.color + '22' })
      const v = f.type === 'formula' ? '= ' + calc(d.fields, f) : f.value
      const meta = fieldMeta(f.type)
      const canFill = !locked && f.signer === ME_ID
      const face = editorFieldFace(f, v, meta, canFill)
      el.innerHTML = (canFill ? face : '<span class="fc">' + face + '</span>') + (locked ? '' : '<span class="x" role="button" aria-label="Delete field" title="Delete field (Delete key)">✕</span>' + (sel === f.id ? '<span class="h hl"></span><span class="h hr"></span><span class="h ht"></span>' : ''))
      pg.appendChild(el)
      if (canFill) bindEditorFill(el, f, d, () => { save(); drawF(); if (typeof drawPanel === 'function') drawPanel() })
      if (locked) return
      if (el.offsetWidth < 56 || el.offsetHeight < 20) el.classList.add('tiny')
      el.onpointerdown = e => {
        if (e.target.closest('.x')) { e.preventDefault(); e.stopPropagation(); delField(f.id); return }
        if (e.target.closest('input,select,textarea,label,.me-fill,.radios')) { sel = f.id; props(); return }
        const was = sel === f.id; sel = f.id; props(); if (!was) { el.classList.add('sel'); if (!$('.h', el)) el.insertAdjacentHTML('beforeend', '<span class="h hl"></span><span class="h hr"></span><span class="h ht"></span>') }
        const cl = e.target.classList, mode = cl.contains('hl') ? 'l' : cl.contains('hr') ? 'r' : cl.contains('ht') ? 't' : 'm'
        const r = pg.getBoundingClientRect(); const PW = +pg.dataset.pw || 612, PH = +pg.dataset.ph || 792, [mw, mh] = MIN[f.type] || [30, 16], minW = mw / PW, minH = mh / PH
        const sx = e.clientX, sy = e.clientY, o = { ...f }; el.setPointerCapture(e.pointerId)
        el.onpointermove = m => {
          const dx = (m.clientX - sx) / r.width, dy = (m.clientY - sy) / r.height
          if (mode === 'm') { f.x = Math.min(1 - f.w, Math.max(0, o.x + dx)); f.y = Math.min(1 - f.h, Math.max(0, o.y + dy)) }
          else if (mode === 'r') f.w = Math.max(minW, Math.min(1 - o.x, o.w + dx))
          else if (mode === 'l') { const nx = Math.max(0, Math.min(o.x + o.w - minW, o.x + dx)); f.w = o.w + (o.x - nx); f.x = nx }
          else { const ny = Math.max(0, Math.min(o.y + o.h - minH, o.y + dy)); f.h = o.h + (o.y - ny); f.y = ny }
          if (f.type === 'checkbox') { if (mode === 't') f.w = Math.min(1 - f.x, f.h * PH / PW); else { f.h = f.w * PW / PH; if (f.y + f.h > 1) f.y = 1 - f.h } }
          Object.assign(el.style, { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%' })
        }
        el.onpointerup = () => { el.onpointermove = null; save(); drawF() }
      }
    })
  }
  const props = () => {
    const f = d.fields.find(x => x.id === sel); if (!f) { $('#props').innerHTML = '<p style="font-size:13px;color:var(--mut)">Select a field.</p>'; return }
    $$('.fld').forEach(x => x.classList.toggle('sel', x.dataset.id === sel))
    const assigners = [`<option value="${ME_ID}" ${f.signer === ME_ID ? 'selected' : ''}>Me (Fill out now)</option>`].concat(d.signers.filter(s => s.role !== 'cc').map(s => `<option value="${s.id}" ${s.id === f.signer ? 'selected' : ''}>${esc(s.name)}</option>`))
    $('#props').innerHTML = `<label class="f">Type</label><b>${esc(fieldMeta(f.type).label)}</b><label class="f">Assigned to</label><select id="pa" style="width:100%">${assigners.join('')}</select>
    <label class="f">Label</label><input id="pl" value="${esc(f.label)}" style="width:100%">
    <label class="f">Placeholder</label><input id="ph" value="${esc(f.placeholder || '')}" style="width:100%">
    <label class="row" style="font-size:13px;margin-top:6px"><input type="checkbox" id="pr" ${f.required ? 'checked' : ''}> Required</label>
    ${['text', 'name'].includes(f.type) ? `<label class="f">Validation</label><select id="pv" style="width:100%">${['none', 'email', 'number', 'zip', 'phone'].map(v => `<option ${f.valid === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}
    ${f.type === 'dropdown' || f.type === 'radio' ? `<label class="f">Options (comma separated)</label><input id="po" value="${esc((f.options || []).join(', '))}" style="width:100%">` : ''}
    ${f.type === 'formula' ? `<label class="f">Formula — use {Label} of number fields</label><input id="pf" value="${esc(f.formula || '')}" placeholder="{Qty}*{Price}" style="width:100%">` : ''}
    ${f.type === 'payment' ? `<label class="f">Amount ($)</label><input id="pm" type="number" value="${f.amount || 100}" style="width:100%">` : ''}
    ${f.type === 'currency' ? `<label class="f">Currency</label><input id="pcu" value="${esc(f.currency || 'USD')}" maxlength="3" style="width:100%">` : ''}
    ${f.type === 'datetime' ? `<label class="f">Format</label><select id="pfmt" style="width:100%"><option value="datetime" ${f.format !== 'date' ? 'selected' : ''}>Date and time</option><option value="date" ${f.format === 'date' ? 'selected' : ''}>Date only</option></select>` : ''}
    <label class="f">Show only when checkbox is checked</label><select id="pc" style="width:100%"><option value="">Always show</option>${d.fields.filter(x => x.type === 'checkbox' && x.id !== f.id).map(x => `<option value="${x.id}" ${f.cond === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`
    const on = (i, fn) => { const e = $(i); if (e) e.onchange = () => { fn(e); save(); drawF(); if (typeof drawPanel === 'function') drawPanel() } }
    on('#pa', e => f.signer = e.value); on('#pl', e => f.label = e.value); on('#ph', e => f.placeholder = e.value); on('#pr', e => f.required = e.checked); on('#pv', e => f.valid = e.value)
    on('#po', e => f.options = e.value.split(',').map(s => s.trim()).filter(Boolean)); on('#pf', e => f.formula = e.value); on('#pm', e => f.amount = +e.value); on('#pc', e => f.cond = e.value || null)
    on('#pcu', e => f.currency = e.value.toUpperCase().slice(0, 3)); on('#pfmt', e => f.format = e.value)
  }
  const delField = id => { d.fields = d.fields.filter(x => x.id !== id); if (sel === id) sel = null; save(); drawF(); props(); if (typeof drawPanel === 'function') drawPanel() }
  let fieldTab = 'all'
  let fieldQ = ''
  let fav = new Set(Array.isArray(S.me?.favoriteFields) && S.me.favoriteFields.length ? S.me.favoriteFields : DEFAULT_FAVORITES)
  let drawPanel = () => {}
  drawS(); await renderPages($('#pages'), d); drawF()
  const addAt = (t, pg, fx, fy) => {
    const meta = fieldMeta(t); let w = meta.w, h = meta.h, l = meta.label
    const PW = +pg.dataset.pw || 612, PH = +pg.dataset.ph || 792
    const min = MIN[t] || [70, 22]
    w = Math.max(w, min[0] / PW); h = Math.max(h, min[1] / PH); if (t === 'checkbox') h = w * PW / PH
    const f = { id: uid(), page: +pg.dataset.page, type: t, signer: cur, x: Math.max(0, Math.min(1 - w, fx - w / 2)), y: Math.max(0, Math.min(1 - h, fy - h / 2)), w, h, required: t !== 'checkbox' && t !== 'radio', label: l, value: null }
    if (meta.placeholder) f.placeholder = meta.placeholder
    if (t === 'dropdown') f.options = ['Option A', 'Option B']
    if (t === 'radio') f.options = ['Yes', 'No']
    if (t === 'payment') f.amount = 100
    if (t === 'currency') f.currency = 'USD'
    if (t === 'datetime') f.format = 'datetime'
    if (meta.valid) f.valid = meta.valid
    d.fields.push(f); sel = f.id; save(); drawF(); props(); if (typeof drawPanel === 'function') drawPanel()
  }
  let armed = null
  let ghost = null; const hint = document.createElement('div'); hint.id = 'hint'; hint.textContent = 'Click to place · Shift+click to repeat · Esc to cancel'
  const disarm = () => { armed = null; ghost && ghost.remove(); ghost = null; hint.remove(); $('#pages')?.classList.remove('placing'); $$('.ftile').forEach(x => x.style.outline = '') }
  function arm(t, tl) { disarm(); armed = t; if (tl) tl.style.outline = '2px solid var(--brand)'; $('#pages').classList.add('placing'); document.body.appendChild(hint); const s = partyOf(d, cur); ghost = document.createElement('div'); ghost.className = 'fld ghost'; const meta = fieldMeta(t); Object.assign(ghost.style, { borderColor: s.color, color: s.color, background: s.color + '33', display: 'none' }); ghost.textContent = meta.icon + ' ' + meta.label }
  const pos = (e, pg) => { const r = pg.getBoundingClientRect(), PW = +pg.dataset.pw || 612, PH = +pg.dataset.ph || 792; const meta = fieldMeta(armed); let w = meta.w, h = meta.h; const min = MIN[armed] || [70, 22]; w = Math.max(w, min[0] / PW); h = Math.max(h, min[1] / PH); if (armed === 'checkbox') h = w * PW / PH; return { x: Math.max(0, Math.min(1 - w, (e.clientX - r.left) / r.width - w / 2)), y: Math.max(0, Math.min(1 - h, (e.clientY - r.top) / r.height - h / 2)), w, h } }
  const bindTools = () => {
    $$('#fpanel .ftile[data-t]').forEach(tl => {
      tl.onpointerdown = e => {
        if (e.target.closest('.star') || locked) return
        e.preventDefault(); const t = tl.dataset.t
        const g = document.createElement('div'); g.className = 'fld'; const s = partyOf(d, cur)
        Object.assign(g.style, { position: 'fixed', width: '120px', height: '30px', borderColor: s.color, color: s.color, background: s.color + '33', pointerEvents: 'none', zIndex: 99, left: e.clientX - 60 + 'px', top: e.clientY - 15 + 'px' })
        g.textContent = fieldMeta(t).label; document.body.appendChild(g); let moved = false
        const mv = m => { moved = true; g.style.left = m.clientX - 60 + 'px'; g.style.top = m.clientY - 15 + 'px' }
        const up = u => {
          removeEventListener('pointermove', mv); removeEventListener('pointerup', up); g.remove()
          const pg = document.elementFromPoint(u.clientX, u.clientY)?.closest('.page')
          if (pg && moved) { const r = pg.getBoundingClientRect(); addAt(t, pg, (u.clientX - r.left) / r.width, (u.clientY - r.top) / r.height) }
          else if (!moved) arm(t, tl)
        }
        addEventListener('pointermove', mv); addEventListener('pointerup', up)
      }
    })
  }
  drawPanel = () => {
    const panel = $('#fpanel'); if (!panel) return
    const q = fieldQ.trim().toLowerCase()
    const people = [
      { id: ME_ID, name: 'Me (Fill out now)', color: ME_COLOR, note: true },
      ...d.signers.filter(s => s.role !== 'cc').map((s, i) => ({ id: s.id, name: (d.ordered ? (i + 1) + '. ' : '') + (s.name || 'Recipient'), color: s.color }))
    ]
    const who = people.map(p => `<button type="button" class="rwho ${cur === p.id ? 'on' : ''}" data-who="${p.id}" style="--who:${p.color}"><span class="dot" style="background:${p.color}"></span><span class="sp">${esc(p.name)}</span><small>${fieldCount(d, p.id)} field${fieldCount(d, p.id) === 1 ? '' : 's'}</small></button>`).join('')
    const sections = FIELD_LIBRARY.map(sec => {
      let items = sec.items.filter(it => fieldTab !== 'fav' || fav.has(it.type))
      if (q) items = items.filter(it => (it.label + ' ' + it.type).toLowerCase().includes(q))
      if (!items.length) return ''
      return `<div class="fsec">${esc(sec.section)}</div><div class="fgrid">${items.map(it => `<button type="button" class="ftile" data-t="${it.type}" ${locked ? 'disabled' : ''}><span>${esc(it.label)}</span><span class="ic">${it.icon}</span><span class="star ${fav.has(it.type) ? 'on' : ''}" data-fav="${it.type}" title="Favorite">★</span></button>`).join('')}</div>`
    }).join('')
    const empty = !sections ? `<p class="note">${fieldTab === 'fav' ? 'Star fields you use often.' : 'No fields match that search.'}</p>` : ''
    panel.innerHTML = `<div class="rhint">Select a recipient for whom you need to add fields</div>
      <div class="rpick">${who}</div>
      ${cur === ME_ID && !locked ? '<p class="note">Fill these fields now — they will already be complete when you send.</p>' : ''}
      <div class="rhint">Add fields for this recipient by placing them on the document</div>
      <div class="ftabs"><button type="button" data-tab="fav" class="${fieldTab === 'fav' ? 'on' : ''}">♥ Favorites</button><button type="button" data-tab="all" class="${fieldTab === 'all' ? 'on' : ''}">All Fields</button></div>
      <input class="fsearch" id="fsearch" placeholder="Search fields" value="${esc(fieldQ)}">
      ${sections}${empty}
      <p class="note">Click a field, then click the page. Shift+click keeps placing. Esc cancels.</p>`
    $$('#fpanel .rwho').forEach(btn => { btn.onclick = () => { cur = btn.dataset.who; drawS(); drawPanel() } })
    $$('#fpanel [data-tab]').forEach(btn => { btn.onclick = () => { fieldTab = btn.dataset.tab; drawPanel() } })
    $$('#fpanel [data-fav]').forEach(btn => {
      btn.onclick = e => {
        e.preventDefault(); e.stopPropagation()
        const typ = btn.dataset.fav
        if (fav.has(typ)) fav.delete(typ); else fav.add(typ)
        if (S.me) S.me.favoriteFields = [...fav]
        drawPanel()
        api('/api/me/favorites', { method: 'PATCH', body: { types: [...fav] } })
      }
    })
    const search = $('#fsearch')
    if (search) {
      search.oninput = () => { fieldQ = search.value; drawPanel(); const again = $('#fsearch'); if (again) { again.focus(); again.setSelectionRange(fieldQ.length, fieldQ.length) } }
    }
    if (!locked) bindTools()
  }
  drawPanel()
  if (locked) return
  $('#pages').onpointermove = e => { if (!armed || !ghost) return; const pg = e.target.closest('.page'); if (!pg) { ghost.style.display = 'none'; return } if (ghost.parentNode !== pg) pg.appendChild(ghost); const p = pos(e, pg); Object.assign(ghost.style, { display: 'flex', left: p.x * 100 + '%', top: p.y * 100 + '%', width: p.w * 100 + '%', height: p.h * 100 + '%' }) }
  $('#pages').onpointerleave = () => { if (ghost) ghost.style.display = 'none' }
  $('#pages').onclick = e => { if (!armed || (e.target.closest('.fld') && !e.target.closest('.ghost'))) return; const pg = e.target.closest('.page'); if (!pg) return; const r = pg.getBoundingClientRect(); addAt(armed, pg, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); if (!e.shiftKey) disarm() }
  $('#pages').oncontextmenu = e => { if (armed) { e.preventDefault(); disarm() } }
  const onKey = e => {
    if (e.key === 'Escape' && armed) disarm()
    const a = document.activeElement
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !$('.rcp') && !(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) && d.fields.some(x => x.id === sel)) { e.preventDefault(); delField(sel) }
  }
  addEventListener('keydown', onKey)
  addEventListener('hashchange', () => { removeEventListener('keydown', onKey); disarm(); $('.rcp')?.remove() }, { once: true })
  window.editRecipients = () => recipientsStep(d, () => { cur = d.signers.find(s => s.role !== 'cc')?.id || d.signers[0]?.id; drawS(); drawF(); props(); if (typeof drawPanel === 'function') drawPanel() })
  if (!d.tpl && needsRecipients(d)) window.editRecipients()
  $('#dn').onchange = e => { d.name = e.target.value; save() }
  $('#ord').onchange = e => { d.ordered = e.target.checked; save(); drawS() }
  $('#fo').onchange = e => { d.folder = e.target.value; save() }
  $('#ex').onchange = e => { d.expiresDays = +e.target.value; save() }
  $('#rm').onchange = async e => {
    d.remindDays = +e.target.value
    if (!locked) return save()
    const r = await api('/api/documents/' + d.id + '/reminders', { method: 'PATCH', body: { remindDays: d.remindDays } })
    toast(r.ok ? 'Reminder schedule updated' : (r.json?.message || 'Could not update reminders'))
  }
  $('#idv').onchange = e => { d.idv = e.target.checked; save() }
  $('#msg').onchange = e => { d.message = e.target.value; save() }
  if ($('#send')) $('#send').onclick = async () => {
    await flushNow()
    const res = await api('/api/documents/' + d.id + '/send', { method: 'POST' })
    if (res.status === 402) return payModal(d.id, res.json)
    if (!res.ok) return toast(res.json?.message || 'Could not send')
    const links = res.json.links || []
    await hydrate()
    if (links.some(l => l.role === 'in-person')) {
      location.hash = '#/inperson/' + d.id
      return
    }
    modal(`<h3>Sent</h3><p>Each recipient with an email address got a secure link. You can also open a link here.</p>${links.map(l => `<div class="card" style="margin:8px 0"><b>${esc(l.name)}</b> ${l.email ? `&lt;${esc(l.email)}&gt;` : '(no email — open the link on this device)'}<br><a class="btn p" style="margin-top:8px" href="${l.url.replace(/^https?:\/\/[^/]+/, '')}">Open signing link</a></div>`).join('')}<button onclick="closeModal();location.hash='#/app'">Back to dashboard</button>`)
  }
}

function payModal(id, info) {
  const extra = id ? `,'${id}'` : ''
  modal(`<h3>This send needs a credit</h3><p>${esc(info?.message || 'Buy a pack, then send.')}</p>
  <div class="row" style="margin-top:10px"><button class="p" onclick="buy('doc1'${extra})">1 document · $1</button><button onclick="buy('doc10'${extra})">10 documents · $5</button><button onclick="buy('doc50'${extra})">50 documents · $10</button></div>
  <p class="note">Have a promo code? <a href="#/settings" onclick="closeModal()">Enter it in Settings</a>.</p>
  <p class="note">Apple Pay and Google Pay show on the secure checkout page when your device supports them. The free-document checks never block a paid send.</p>
  <p class="note">By purchasing, you agree to our <a href="/terms" target="_blank" rel="noopener">Terms</a>. Credits are non-refundable once used.</p>`)
}
async function buy(kind, documentId) {
  if (!TOKEN) {
    sessionStorage.setItem('eds_buy', JSON.stringify({ kind, documentId: documentId || '' }))
    location.hash = '#/login'
    return
  }
  const res = await api('/api/billing/checkout', { method: 'POST', body: { kind, documentId: documentId || undefined } })
  if (res.json?.url) location.href = res.json.url
  else toast(res.json?.message || 'Checkout could not start')
}
async function resumeBuy() {
  const raw = sessionStorage.getItem('eds_buy')
  if (!raw) return
  sessionStorage.removeItem('eds_buy')
  try { const { kind, documentId } = JSON.parse(raw); await buy(kind, documentId) } catch { toast('Checkout could not start') }
}

function handBack(label = 'Hand the device back') {
  const id = sessionStorage.getItem('eds_handoff')
  if (!id) return ''
  return `<p style="margin-top:18px"><a class="btn p" href="#/inperson/${id}">${esc(label)}</a></p>`
}
async function inperson(id) {
  if (!S.me) return (location.hash = '#/login')
  const d = doc(id)
  if (!d) return V.innerHTML = '<div class="card"><h2>Document not found.</h2><p><a href="#/app">Back to dashboard</a></p></div>'
  const pending = d.signers.filter(s => s.role === 'in-person' && !s.done)
  const doneIp = d.signers.filter(s => s.role === 'in-person' && s.done)
  const current = d.ordered ? d.signers.find(s => s.role !== 'cc' && !s.done) : pending[0]
  const canStart = current && current.role === 'in-person' && current.token
  const emailed = d.signers.filter(s => s.role !== 'cc' && s.role !== 'in-person' && !s.done)
  let body
  if (d.status === 'completed') body = `<h2>Everyone has signed.</h2><p><a class="btn p" href="#/cert/${d.id}">View certificate</a></p>`
  else if (d.status === 'declined' || d.status === 'voided' || d.status === 'expired') body = `<h2>This document is ${esc(d.status)}.</h2>`
  else if (canStart) body = `<h2>Hand this device to ${esc(current.name)}</h2><p>They’ll sign on the next screen. When they’re done, the device comes back to you${pending.length > 1 ? ' for the next person' : ''}.</p><p style="margin-top:24px"><button class="p lg" id="go">Start signing as ${esc(current.name)}</button></p>`
  else if (current && current.role !== 'in-person') body = `<h2>Waiting on ${esc(current.name)}</h2><p>They were emailed a signing link. You can hand this device to the next in-person signer after they finish.</p>`
  else if (!pending.length) body = `<h2>No one is waiting to sign in person.</h2>${emailed.length ? `<p>${esc(emailed.map(s => s.name).join(', '))} still need to sign by email.</p>` : ''}`
  else body = `<h2>Ready when you are.</h2>`
  V.innerHTML = `<div class="card" style="max-width:560px;margin:40px auto;text-align:center;padding:36px 28px"><p class="note">In-person signing</p><h1 style="margin:8px 0 16px">${esc(d.name)}</h1>${body}${doneIp.length ? `<p class="note" style="margin-top:16px">Already signed in person: ${doneIp.map(s => esc(s.name)).join(', ')}</p>` : ''}<p style="margin-top:24px"><a href="#/app">Back to dashboard</a></p></div>`
  const go = $('#go')
  if (go) go.onclick = () => { sessionStorage.setItem('eds_handoff', d.id); location.hash = '#/sign/' + current.token }
}
async function signToken(token) {
  if (!token) return V.innerHTML = '<p>Missing signing link.</p>'
  const res = await fetch('/api/sign/' + token, { headers: { 'X-Device-Local': deviceLocal() } })
  const session = await res.json().catch(() => null)
  if (!res.ok) return V.innerHTML = `<div class="card"><h2>${esc(session?.message || 'This link is not valid.')}</h2></div>`
  if (session.status === 'expired' || session.status === 'declined' || session.status === 'voided') {
    const why = session.me?.declineReason || session.document?.signers?.find(s => s.declined)?.declineReason
    return V.innerHTML = `<div class="card"><h2>This document is ${esc(session.status)}.</h2>${session.status === 'declined' && why ? `<p>${esc(why)}</p>` : ''}${handBack()}</div>`
  }
  if (session.status === 'waiting_turn') return V.innerHTML = `<div class="card"><h2>Waiting on ${esc(session.waitingFor)}</h2><p>You’ll get an email when it’s your turn.</p></div>`
  if (session.status === 'completed' && session.me?.done) return V.innerHTML = `<div class="card" style="text-align:center"><h2>This document is complete.</h2><p><a class="btn p" href="/api/sign/${token}/download">Download the sealed PDF</a></p></div>`
  const d = session.document
  d._fileUrl = '/api/sign/' + token + '/file'
  const s = d.signers.find(x => x.id === session.me.id) || session.me
  if (s.done) return V.innerHTML = `<div class="card"><h2>You’ve already signed.</h2><p>We’ll email everyone when the document is complete.</p></div>`
  const push = async () => {
    await fetch('/api/sign/' + token + '/fields', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Device-Local': deviceLocal() }, body: JSON.stringify({ name: s.name, fields: d.fields.filter(f => f.signer === s.id).map(f => ({ id: f.id, value: f.value })) }) })
  }
  const approver = s.role === 'approver'
  const brand = session.brand || {}
  V.innerHTML = `<div class="signbar" style="border-top:4px solid ${esc(brand.color || 'var(--brand2)')}">${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="" style="height:28px;max-width:140px;object-fit:contain">` : ''}<b>${esc(brand.company ? brand.company + ' · ' : '')}${esc(d.name)}</b><span>· ${esc(s.name)}${s.role === 'in-person' ? ' · signing in person' : ''}</span><span class="sp"></span><span id="prog"></span>${approver ? '' : '<button id="nx" style="background:var(--acc)">Next field</button>'}<button id="fin" class="p" style="background:var(--brand2)">${approver ? 'Approve' : 'Finish'}</button><button id="dec" style="background:#fee2e2">Decline</button><button id="cm">Comments (${d.comments.length})</button></div>
  <div class="card" id="consent" style="margin-bottom:12px">${session.accessCodeRequired ? `<label class="f">Access code from your email</label><input id="acode" maxlength="6" style="max-width:160px;letter-spacing:3px">` : ''}<label class="row"><input type="checkbox" id="ok"> ${esc(session.consentText).replace('Terms of Use', '<a href="/terms" target="_blank" rel="noopener">Terms of Use</a>')}</label></div><div class="pages" id="pages"></div>`
  await renderPages($('#pages'), d)
  const mine = () => d.fields.filter(f => f.signer === s.id && visible(d.fields, f) && f.type !== 'formula')
  const draw = () => {
    $$('.fld').forEach(x => x.remove())
    d.fields.forEach(f => {
      if (!visible(d.fields, f)) return
      const pg = $(`.page[data-page="${f.page}"]`); if (!pg) return
      const o = partyOf(d, f.signer); const me = f.signer === s.id
      const el = document.createElement('div'); el.className = 'fld' + (me ? ' fill' : '') + (f.value != null && f.value !== '' ? ' done' : ''); el.dataset.id = f.id
      Object.assign(el.style, { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%', borderColor: me ? o.color : '#cbd5e1', color: me ? o.color : '#94a3b8', background: me ? o.color + '22' : '#f8fafc88', borderStyle: me ? 'solid' : 'dashed' })
      let v = f.type === 'formula' ? calc(d.fields, f) : f.value
      const meta = fieldMeta(f.type)
      const ph = `${esc(f.placeholder || f.label)}${f.required ? '*' : ''}`
      if (me && f.type === 'state') {
        el.innerHTML = `<select style="width:100%;height:100%;border:0;background:transparent;font-size:11px">${stateOptions(v)}</select>`
        $('select', el).onchange = e => { f.value = e.target.value || null; push(); prog() }
      } else if (me && f.type === 'dropdown') {
        el.innerHTML = `<select style="width:100%;height:100%;border:0;background:transparent;font-size:11px"><option value="">${ph}</option>${(f.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        $('select', el).onchange = e => { f.value = e.target.value || null; push(); prog() }
      } else if (me && f.type === 'radio') {
        el.innerHTML = `<div class="radios">${(f.options || []).map(opt => `<label><input type="radio" name="r-${f.id}" value="${esc(opt)}" ${v === opt ? 'checked' : ''}> ${esc(opt)}</label>`).join('')}</div>`
        $$('input', el).forEach(r => { r.onchange = () => { f.value = r.value; push(); prog() } })
      } else if (me && (f.type === 'datetime' || f.type === 'date')) {
        el.innerHTML = `<input type="${f.type === 'date' || f.format === 'date' ? 'date' : 'datetime-local'}" value="${esc(v || '')}">`
        $('input', el).onchange = e => { f.value = e.target.value || null; push(); prog(); draw() }
      } else if (me && INPUT_TYPES.includes(f.type)) {
        el.innerHTML = `<input type="text" autocomplete="off" placeholder="${ph}" value="${esc(v || '')}">`
        $('input', el).onchange = () => { const val = $('input', el).value; if (val && !validate(f, val)) { toast(`${f.label} doesn’t look valid.`); return } f.value = isSensitive(f.type) || f.type === 'currency' || f.type === 'phone' || f.type === 'zip' ? formatField(f, val) : (val || null); push(); prog(); draw() }
      } else el.innerHTML = v && String(v).startsWith('data:') ? `<img src="${v}">` : v === true ? '✔' : v ? esc(formatField(f, v)) : f.type === 'checkbox' ? '' : (me ? meta.icon + ' ' + esc(f.label) : (o?.name ? esc(o.name) : 'Filled'))
      if (me && f.type === 'attachment' && !f.value) el.innerHTML = '📎 Drop file or tap'
      if (me && f.type === 'stamp' && !f.value) el.innerHTML = '🏷️ Upload stamp'
      if (me) el.onclick = e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'LABEL') return; fill(f) }
      pg.appendChild(el)
    })
  }
  const prog = () => { const m = mine(); $('#prog').textContent = `${m.filter(f => f.value != null && f.value !== '').length}/${m.length} fields` }
  const fill = f => {
    if (f.type === 'signature' || f.type === 'initials') return sigModal(f.type, s, d, () => { d.fields.filter(x => x.signer === s.id).forEach(x => { if (x.type === 'signature' && s.sigImg) x.value = s.sigImg; if (x.type === 'initials' && s.iniImg) x.value = s.iniImg }); push(); draw(); prog() })
    if (f.type === 'stamp') return pickImageFile(data => { f.value = data; push(); draw(); prog() })
    if (f.type === 'date' && !f.value) f.value = new Date().toISOString().slice(0, 10)
    else if (f.type === 'checkbox') f.value = f.value === true ? false : true
    else if (f.type === 'payment') return modal(`<h3>Acknowledge $${f.amount}</h3><p>This records the amount on the document. Easy Digital Signatures does not collect this payment.</p><button class="p" id="pay">Acknowledge $${f.amount}</button>`), $('#pay').onclick = () => { f.value = `Acknowledged $${f.amount}`; push(); closeModal(); draw(); prog() }
    else if (f.type === 'attachment') { const i = document.createElement('input'); i.type = 'file'; i.onchange = () => { if (i.files[0].size > 10 * 1024 * 1024) return toast('Attachment too large (max 10 MB)'); f.value = '📎 ' + i.files[0].name; push(); draw(); prog() }; i.click(); return }
    else return
    push(); draw(); prog()
  }
  draw(); prog()
  const nx = $('#nx'); if (nx) nx.onclick = () => { const f = mine().find(f => f.value == null || f.value === ''); $$('.fld').forEach(x => x.classList.remove('cur')); if (!f) return toast('All your fields are filled — click Finish'); const el = $(`.fld[data-id="${f.id}"]`); el.classList.add('cur'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (![...INPUT_TYPES, 'dropdown', 'radio'].includes(f.type)) setTimeout(() => fill(f), 400); else $('input,select', el)?.focus() }
  $('#dec').onclick = () => {
    modal(`<h3>Decline this document?</h3>
      <p>The sender will be emailed your reason. This cannot be undone.</p>
      <label class="f">Reason</label>
      <textarea id="dreason" rows="4" maxlength="500" style="width:100%" placeholder="Why are you declining?"></textarea>
      <p class="note"><span id="dcount">0</span>/500</p>
      <div class="row" style="margin-top:14px"><button id="dgo" style="background:#fee2e2">Decline and notify the sender</button><button id="dcx">Cancel</button></div>`)
    const box = $('#dreason')
    const count = $('#dcount')
    box.oninput = () => { count.textContent = box.value.length }
    $('#dcx').onclick = closeModal
    $('#dgo').onclick = async () => {
      const reason = box.value.trim()
      if (!reason) return toast('Add a short reason for declining.')
      $('#dgo').disabled = true
      const r = await fetch('/api/sign/' + token + '/decline', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Local': deviceLocal() }, body: JSON.stringify({ reason }) })
      const j = await r.json()
      if (!r.ok) { $('#dgo').disabled = false; return toast(j.message || 'Could not decline') }
      closeModal()
      V.innerHTML = `<div class="card"><h2>You declined this document.</h2><p>The sender has been emailed:</p><p class="note">${esc(j.reason || reason)}</p>${handBack()}</div>`
    }
    setTimeout(() => box.focus(), 0)
  }
  $('#cm').onclick = () => { modal(`<h3>Comments</h3>${d.comments.map(c => `<div class="card" style="margin:6px 0;padding:10px"><b>${esc(c.who)}</b> <small>${fmt(c.ts)}</small><br>${esc(c.t)}</div>`).join('') || '<p>No comments yet.</p>'}<textarea id="ct" style="width:100%"></textarea><br><br><button class="p" id="cs">Post</button> <button onclick="closeModal()">Close</button>`); $('#cs').onclick = async () => { const t = $('#ct').value.trim(); if (!t) return; await fetch('/api/sign/' + token + '/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) }); d.comments.push({ t, who: s.name, ts: now() }); closeModal(); toast('Comment posted') } }
  $('#fin').onclick = async () => {
    if (!$('#ok').checked) return toast('Please accept the electronic-signature consent first'), $('#consent').scrollIntoView({ block: 'center' })
    const r = await fetch('/api/sign/' + token + '/finish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Local': deviceLocal() }, body: JSON.stringify({ consent: true, accessCode: $('#acode')?.value || '', name: s.name, fields: d.fields.filter(f => f.signer === s.id).map(f => ({ id: f.id, value: f.value })) }) })
    const j = await r.json()
    if (!r.ok) return toast(j.message || 'Could not finish')
    if (j.status === 'completed') V.innerHTML = `<div class="card" style="text-align:center"><h2>Thanks, ${esc(s.name)}. Everyone has signed.</h2><p>A sealed PDF is on its way by email.</p><p><a class="btn p" href="/api/sign/${token}/download">Download the sealed PDF</a></p>${handBack('Hand the device back')}</div>`
    else V.innerHTML = `<div class="card" style="text-align:center"><h2>Thanks, ${esc(s.name)}.</h2><p>${s.role === 'in-person' ? 'Please hand this device back so the next person can sign, or so the sender can finish up.' : 'We’ll email the next recipient. You’ll get the sealed PDF when everyone is done.'}</p>${handBack('Hand the device back')}</div>`
  }
}

function sigModal(kind, s, d, cb) {
  const saved = kind === 'signature' ? s.sigImg : s.iniImg
  let tab = 'auto', nm = s.name, fi = 0
  const SG = kind === 'signature'
  const r = () => {
    modal(`<h3>${SG ? 'Adopt your signature' : 'Adopt your initials'}</h3><div class="tabs">${['auto', 'draw', 'type', 'upload'].concat(saved ? ['current'] : []).map(t => `<button class="${t === tab ? 'on' : ''}" data-tb="${t}">${{ auto: 'Generated', draw: 'Draw', type: 'Type', upload: 'Upload', current: 'Current' }[t]}</button>`).join('')}</div><div id="sb"></div><br><div class="row"><button class="p" id="ad">Adopt & sign</button><button onclick="closeModal()">Cancel</button></div><p style="font-size:11px;color:var(--mut)">By clicking Adopt & sign, I agree this is the electronic representation of my ${SG ? 'signature' : 'initials'} for this document.</p>`)
    $$('[data-tb]').forEach(b => b.onclick = () => { tab = b.dataset.tb; r() })
    const sb = $('#sb'); let get, how
    if (tab === 'auto') {
      const pv = () => { $('#fp').innerHTML = SIGFONTS.map((f, i) => `<div class="genopt ${i === fi ? 'on' : ''}" data-fi="${i}"><img src="${typedSig(nm, f)}"><img src="${typedSig(initialsOf(nm), f)}" class="ini"><small>${esc(f)}</small></div>`).join(''); $$('[data-fi]').forEach(e => e.onclick = () => { fi = +e.dataset.fi; pv() }) }
      sb.innerHTML = `<label class="f">Confirm your full name</label><input id="tn" value="${esc(nm)}" style="width:100%"><p style="font-size:12px;color:var(--mut);margin:6px 0">Initials: <b id="ti">${esc(initialsOf(nm))}</b> · a middle name adds a letter</p><div id="fp"></div>`
      pv(); $('#tn').oninput = () => { nm = $('#tn').value; $('#ti').textContent = initialsOf(nm); pv() }; get = () => nm.trim() ? 'both' : null; how = () => `generated, ${SIGFONTS[fi]}`
    }
    if (tab === 'current') { sb.innerHTML = `<img src="${saved}" style="max-width:100%;border:1px solid var(--line);border-radius:8px">`; get = () => saved; how = () => 'previously adopted' }
    if (tab === 'draw') {
      sb.innerHTML = '<canvas id="sigpad"></canvas><button id="clr" style="margin-top:6px">Clear</button>'
      const c = $('#sigpad'); c.width = c.offsetWidth * 2; c.height = 340; const x = c.getContext('2d'); x.lineWidth = 5; x.lineCap = 'round'; x.strokeStyle = '#1e3a8a'; let dn = false, any = false
      const p = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height] }
      c.onpointerdown = e => { dn = true; c.setPointerCapture(e.pointerId); x.beginPath(); x.moveTo(...p(e)) }
      c.onpointermove = e => { if (dn) { x.lineTo(...p(e)); x.stroke(); any = true } }
      c.onpointerup = () => dn = false
      $('#clr').onclick = () => { x.clearRect(0, 0, c.width, c.height); any = false }
      get = () => any ? c.toDataURL() : null; how = () => 'drawn'
    }
    if (tab === 'type') {
      const v0 = SG ? nm : initialsOf(nm); let ti = 0
      sb.innerHTML = `<input id="tn" value="${esc(v0)}" style="width:100%"><div id="fp">${SIGFONTS.map((f, i) => `<div class="typed" data-fi="${i}" style="font-family:'${f}';cursor:pointer;${i === 0 ? 'background:#ecfdf5' : ''}">${esc(v0)}</div>`).join('')}</div>`
      const up = () => $$('[data-fi]').forEach(e => { e.textContent = $('#tn').value; e.style.background = e.dataset.fi == ti ? '#ecfdf5' : '' })
      $('#tn').oninput = up; $$('[data-fi]').forEach(e => e.onclick = () => { ti = +e.dataset.fi; up() })
      get = () => $('#tn').value.trim() ? typedSig($('#tn').value, SIGFONTS[ti]) : null; how = () => `typed, ${SIGFONTS[ti]}`
    }
    if (tab === 'upload') {
      let u = null; sb.innerHTML = '<input type="file" accept="image/png,image/jpeg" id="si"><div id="pv"></div>'
      $('#si').onchange = e => { const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); u = c.toDataURL('image/png'); $('#pv').innerHTML = `<img src="${u}" style="max-width:100%;max-height:120px">` }; im.src = rd.result }; rd.readAsDataURL(e.target.files[0]) }
      get = () => u; how = () => 'uploaded image'
    }
    $('#ad').onclick = () => {
      const u = get(); if (!u) return toast(SG ? 'Add a signature first' : 'Add initials first')
      if (tab === 'auto') { if (nm.trim() !== s.name) s.name = nm.trim(); s.sigImg = typedSig(s.name, SIGFONTS[fi]); s.iniImg = typedSig(initialsOf(s.name), SIGFONTS[fi]) }
      else if (SG) s.sigImg = u; else s.iniImg = u
      closeModal(); cb()
    }
  }
  r()
}

async function cert(id) {
  const d = doc(id); if (!d) return V.innerHTML = '<p>Not found</p>'
  V.innerHTML = `<div class="row" style="max-width:820px;margin:0 auto 12px"><a href="#/app">← Dashboard</a><span class="sp"></span>${d.status === 'completed' ? `<button class="p" onclick="downloadDoc('${id}')">Download sealed PDF</button>` : `<span class="pill s-${d.status}">${d.status}</span>`}<a class="btn" href="/verify/${id}">Public fingerprint</a></div>
  <div class="cert" style="border-top-color:${esc(S.brand?.color || 'var(--brand)')}"><div class="row">${S.brand?.logoUrl ? `<img src="${esc(S.brand.logoUrl)}" alt="" style="height:36px;max-width:160px;object-fit:contain">` : logoMarkSvg({ size: 36 })}<h1 style="margin:0">Certificate of Completion</h1></div><p style="color:var(--mut)">${esc(S.brand?.company || 'Easy Digital Signatures')} electronic signature record. Compare the complete-file fingerprint at the public verify page.</p>
  <div class="grid3" style="grid-template-columns:1fr 1fr;margin:16px 0"><div><b>Document</b><br>${esc(d.name)}</div><div><b>Status</b><br><span class="pill s-${d.status}">${d.status}</span></div><div><b>Document ID</b><br><span class="mono">${d.id}</span></div><div><b>Completed</b><br>${fmt(d.completed)}</div></div>
  <p><b>Original SHA-256</b><br><span class="mono">${d.hashOrig || '—'}</span></p><p><b>Signed content SHA-256</b><br><span class="mono">${d.hashContent || '—'}</span></p><p><b>Complete file SHA-256</b><br><span class="mono">${d.hashFinal || '—'}</span></p>
  <h3>Recipients</h3>${table(['Name', 'Email', 'Role', 'Status', 'Signed at', 'IP'], d.signers.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${s.role}</td><td>${s.done ? (s.role === 'approver' ? 'Approved' : 'Signed') : s.declined ? 'Declined' + (s.declineReason ? ' — ' + esc(s.declineReason) : '') : s.role === 'cc' ? 'Copied' : 'Pending'}</td><td>${fmt(s.doneAt)}</td><td>${esc(s.signIp || s.viewIp || '—')}</td></tr>`))}
  <h3>Audit trail</h3>${table(['Time', 'Event', 'By', 'IP'], d.events.map(e => `<tr><td>${fmt(e.ts)}</td><td>${esc(e.t)}</td><td>${esc(e.who || '')}</td><td>${esc(e.ip || '')}</td></tr>`))}</div>`
}

function templates() {
  const mine = t => !t.ownerId || t.ownerId === S.me.id
  V.innerHTML = `<div class="row"><h1>Templates</h1><span class="sp"></span><button class="p" onclick="tplBuilder()">+ Create template</button></div><p style="color:var(--mut)">Templates have roles, not people. You build them from a blank page or your own file. We don’t ship prebuilt legal forms.${S.usage?.team ? ' Share a template with your team so anyone can use it, billed from the shared credit pool.' : ''}</p>
  ${S.templates.length ? table(['Name', 'Roles', 'Fields', 'Actions'], S.templates.map(t => `<tr><td>${esc(t.name)}${t.shared ? ' <span class="pill s-draft">team</span>' : ''}${!mine(t) ? ' <span class="note">shared with you</span>' : ''}</td><td>${t.signers.map(s => esc(s.name)).join(', ')}</td><td>${(t.fields || []).length}</td><td><a href="javascript:fromTemplate('${t.id}')">Use</a>${mine(t) ? ` · <a href="javascript:editTpl('${t.id}')">Edit</a> · <a href="javascript:mkLink('${t.id}')">Signing link</a>${S.usage?.team ? ` · <a href="javascript:shareTpl('${t.id}', ${t.shared ? 'false' : 'true'})">${t.shared ? 'Unshare' : 'Share with team'}</a>` : ''} · <a href="javascript:delTpl('${t.id}')">Delete</a>` : ''}</td></tr>`)) : `<div class="card" style="text-align:center;padding:48px 20px"><h2>No templates yet</h2><p style="color:var(--mut)">Upload your PDF or start from a blank page, place fields for each role, and save.</p><button class="p lg" onclick="tplBuilder()">Create template</button></div>`}`
}
async function shareTpl(id, share) {
  const r = await api('/api/documents/' + id + '/share', { method: 'POST', body: { share } })
  if (!r.ok) return toast(r.json?.message || 'Could not update sharing')
  toast(share ? 'Shared with your team' : 'Stopped sharing')
  await hydrate(); templates()
}
async function mkLink(tid) {
  const res = await api('/api/links', { method: 'POST', body: { templateId: tid } })
  if (!res.ok) return toast(res.json?.message || 'Could not create the link')
  location.hash = '#/links'
}
function links() {
  V.innerHTML = `<h1>Reusable signing links</h1><p style="color:var(--mut)">Each person who opens a link gets their own copy. Sending uses your document allowance.</p>
  ${S.links.length ? table(['Name', 'Link', 'Responses', 'Active'], S.links.map(l => `<tr><td>${esc(l.name)}</td><td><a href="#/form/${l.id}">Open</a> · <a href="javascript:navigator.clipboard.writeText(location.origin+'/#/form/${l.id}');toast('Link copied')">Copy</a></td><td>${l.responses}</td><td><input type="checkbox" ${l.active ? 'checked' : ''} data-link="${l.id}"></td></tr>`)) : '<p>Create a link from <a href="#/templates">Templates</a>.</p>'}`
  $$('[data-link]').forEach(el => el.onchange = () => api('/api/links/' + el.dataset.link, { method: 'PATCH', body: { active: el.checked } }))
}
function publicForm(lid) {
  const known = S.links.find(l => l.id === lid)
  V.innerHTML = `<div class="card" style="max-width:460px;margin:auto"><h2>${esc(known?.name || 'Sign a document')}</h2><p>Enter your details to get your own copy.</p><label class="f">Full name</label><input id="pn" style="width:100%"><label class="f">Email</label><input id="pe" type="email" style="width:100%"><br><br><button class="p" id="go">Continue to sign</button></div>`
  $('#go').onclick = async () => {
    const res = await api('/api/links/' + lid + '/start', { method: 'POST', body: { name: $('#pn').value, email: $('#pe').value } })
    if (!res.ok) return toast(res.json?.message || 'This link is not accepting responses')
    const token = (res.json.token || '').replace(/[^A-Za-z0-9_-]/g, '')
    location.hash = '#/sign/' + (token || (res.json.url || '').split('/sign/')[1])
  }
}
function bulk() {
  const oneSigner = t => (t.signers || []).filter(s => s.role !== 'cc').length === 1
  const usable = S.templates.filter(oneSigner)
  const others = S.templates.length - usable.length
  let recipients = []
  let issues = []
  const refresh = () => {
    const tid = $('#bt')?.value; const tpl = S.templates.find(x => x.id === tid); const cost = bulkCostSummary(recipients.length, { ...S.usage, billTeam: !!(tpl && tpl.teamId) })
    const have = allowanceLabel(S.usage)
    $('#berr').innerHTML = issues.map(e => `<p class="banner">${esc(e.message)}</p>`).join('')
    if (!recipients.length) {
      $('#bp').innerHTML = `<p class="note">Add people above or upload a CSV. Each copy uses 1 credit. You have ${esc(have)} (${cost.available} total).</p>`
    } else {
      $('#bp').innerHTML = table(['Name', 'Email'], recipients.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.email)}</td></tr>`)) +
        `<p class="note">${cost.copies} ${cost.copies === 1 ? 'copy' : 'copies'} · <b>${cost.creditsUsed} credit${cost.creditsUsed === 1 ? '' : 's'}</b>. You have ${esc(have)} (${cost.available} total).${cost.enough ? '' : ` You are ${cost.short} short.`}</p>`
    }
    const ready = usable.length && recipients.length && !issues.length
    $('#bs').disabled = !ready
  }
  const applyText = text => {
    const parsed = parseBulkRecipients(text)
    recipients = parsed.recipients
    issues = parsed.errors
    refresh()
  }
  V.innerHTML = `<h1>Bulk send</h1><p style="color:var(--mut)">Send one template to a list of people. Each person gets their own copy, and each copy uses 1 credit.</p>
  <div class="card">${usable.length ? '' : '<p>Create a template with exactly one signer first. Public links and bulk send use a single signing role.</p>'}
  ${others ? `<p class="note">${others} template${others === 1 ? '' : 's'} hidden because they have more than one signer.</p>` : ''}
  <label class="f">Template</label><select id="bt">${usable.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
  <label class="f">Recipients</label>
  <textarea id="bl" rows="6" style="width:100%" placeholder="Jordan Avery, jordan@example.com"></textarea>
  <p class="note">One person per line: name, email. Or upload a CSV with Name and Email columns.</p>
  <label class="btn" style="margin-top:8px">Upload CSV<input id="csv" type="file" accept=".csv,text/csv,text/plain,.txt" hidden></label>
  <div id="berr"></div>
  <div id="bp" style="margin-top:12px"></div>
  <p style="margin-top:16px"><button class="p" id="bs" disabled>Review and send</button></p></div>`
  $('#bl').oninput = () => applyText($('#bl').value)
  $('#csv').onchange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { $('#bl').value = String(reader.result || ''); applyText($('#bl').value) }
    reader.readAsText(file)
  }
  $('#bs').onclick = () => {
    if (!recipients.length || issues.length) return
    const cost = bulkCostSummary(recipients.length, S.usage)
    const have = allowanceLabel(S.usage)
    const after = cost.enough ? ` After this send you’ll have ${Math.max(0, cost.remaining)} left.` : ` You need ${cost.short} more before you can send this list.`
    modal(`<h3>Send ${cost.copies} ${cost.copies === 1 ? 'document' : 'documents'}?</h3>
      <p>Each copy uses <b>1 credit</b>. This will use <b>${cost.creditsUsed} credit${cost.creditsUsed === 1 ? '' : 's'}</b>.</p>
      <p>You currently have ${esc(have)} (${cost.available} total).${after}</p>
      <div class="row" style="margin-top:14px">${cost.enough
        ? `<button class="p" id="bcf">Send ${cost.copies} ${cost.copies === 1 ? 'document' : 'documents'}</button>`
        : `<button class="p" id="bbuy">Buy a pack</button>`}<button id="bcx">Cancel</button></div>`)
    $('#bcx').onclick = closeModal
    const buyBtn = $('#bbuy')
    if (buyBtn) buyBtn.onclick = () => { closeModal(); payModal(null, { message: `You can send ${cost.available} more document${cost.available === 1 ? '' : 's'} right now, and this list has ${cost.copies}.` }) }
    const go = $('#bcf')
    if (!go) return
    go.onclick = async () => {
      go.disabled = true
      const res = await api('/api/bulk', { method: 'POST', body: { templateId: $('#bt').value, recipients: recipients.map(r => ({ name: r.name, email: r.email })) } })
      if (res.status === 402) { closeModal(); return payModal(null, res.json) }
      if (!res.ok) { go.disabled = false; return toast(res.json?.message || 'Could not send') }
      closeModal()
      toast(`Sent ${res.json.sent} ${res.json.sent === 1 ? 'document' : 'documents'} · ${res.json.cost?.creditsUsed || res.json.sent} credit${(res.json.cost?.creditsUsed || res.json.sent) === 1 ? '' : 's'} used`)
      location.hash = '#/app'
    }
  }
  refresh()
}
function proposal() {
  const P = S.prop || (S.prop = { title: 'Proposal', client: '', intro: '', items: [['Service', 1, 0]], disc: 0, tax: 0 })
  const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const tot = () => { const sub = P.items.reduce((a, [, q, p]) => a + q * p, 0); const dis = sub * P.disc / 100; const tx = (sub - dis) * P.tax / 100; return { sub, dis, tx, total: sub - dis + tx } }
  const r = () => {
    const t = tot()
    V.innerHTML = `<div class="row"><h1>Proposal builder</h1><span class="sp"></span><button class="p" id="cv">Convert to PDF and add signers</button></div><div class="card">
    <label class="f">Title</label><input id="ti" value="${esc(P.title)}" style="width:100%"><label class="f">Client</label><input id="cl" value="${esc(P.client)}" style="width:100%"><label class="f">Intro</label><textarea id="in" style="width:100%">${esc(P.intro)}</textarea>
    <h3>Pricing table</h3>${table(['Item', 'Qty', 'Unit price', 'Line total', ''], P.items.map(([n, q, p], i) => `<tr><td><input data-i="${i}" data-c="0" value="${esc(n)}"></td><td><input data-i="${i}" data-c="1" type="number" value="${q}" style="width:70px"></td><td><input data-i="${i}" data-c="2" type="number" value="${p}" style="width:100px"></td><td>${money(q * p)}</td><td><a href="javascript:void 0" data-rm="${i}">✕</a></td></tr>`))}
    <p><button id="ai">+ Add line</button></p><div style="text-align:right">Subtotal ${money(t.sub)}<br>Discount <input id="di" type="number" value="${P.disc}" style="width:60px">%<br>Tax <input id="tx" type="number" value="${P.tax}" style="width:60px">%<br><b>Total ${money(t.total)}</b></div></div>`
    afterRender()
    const sv = () => { api('/api/settings', { method: 'PUT', body: { brand: S.brand, folders: S.folders, proposal: P } }); r() }
    $$('[data-i]').forEach(e => e.onchange = () => { P.items[e.dataset.i][e.dataset.c] = e.dataset.c === '0' ? e.value : +e.value; sv() })
    $$('[data-rm]').forEach(e => e.onclick = () => { P.items.splice(e.dataset.rm, 1); sv() })
    $('#ai').onclick = () => { P.items.push(['New item', 1, 0]); sv() }
    $('#ti').onchange = e => { P.title = e.target.value }
    $('#cl').onchange = e => { P.client = e.target.value }
    $('#in').onchange = e => { P.intro = e.target.value }
    $('#di').onchange = e => { P.disc = +e.target.value; sv() }
    $('#tx').onchange = e => { P.tax = +e.target.value; sv() }
    $('#cv').onclick = async () => {
      const { PDFDocument, StandardFonts, rgb } = PDFLib
      const pd = await PDFDocument.create(); const pg = pd.addPage([612, 792])
      const f = await pd.embedFont(StandardFonts.Helvetica), b = await pd.embedFont(StandardFonts.HelveticaBold)
      let y = 730; const T = (s, x, sz = 11, fn = f) => pg.drawText(String(s).slice(0, 90), { x, y, size: sz, font: fn })
      T(S.brand.company || 'Proposal', 54, 10); y -= 30; T(P.title || 'Proposal', 54, 22, b); y -= 22; T('Prepared for ' + (P.client || ''), 54); y -= 40
      P.items.forEach(([n, q, p]) => { T(n, 54, 10); T(q, 330, 10); T(money(p), 390, 10); T(money(q * p), 480, 10); y -= 18 })
      y -= 10; T('Total ' + money(t.total), 400, 13, b)
      const bytes = await pd.save()
      const file = new File([bytes], (P.title || 'proposal') + '.pdf', { type: 'application/pdf' })
      const fd = new FormData(); fd.append('file', file); fd.append('name', (P.title || 'Proposal') + (P.client ? ' — ' + P.client : ''))
      const up = await fetch('/api/documents/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'X-Device-Local': deviceLocal() }, body: fd })
      const json = await up.json()
      if (!up.ok) return toast(json.message || 'Could not create the proposal')
      json.signers[0].name = P.client || 'Client'
      json.ordered = true; json.expiresDays = 30; json.remindDays = S.me?.reminderDefault ?? 3; json.message = 'Please review and sign.'; json.folder = json.folder || 'Sales'
      json.fields = [
        { id: uid(), page: 0, type: 'signature', signer: json.signers[0].id, x: .09, y: .72, w: .36, h: .06, required: true, label: 'Signature' },
        { id: uid(), page: 0, type: 'date', signer: json.signers[0].id, x: .54, y: .75, w: .2, h: .03, required: true, label: 'Date' }
      ]
      await api('/api/documents/' + json.id, { method: 'PUT', body: payload(json) })
      location.hash = '#/edit/' + json.id
    }
  }
  r()
}
async function developer() {
  const keysRes = await api('/api/developer/keys')
  const hooksRes = await api('/api/developer/webhooks')
  const keys = keysRes.json?.keys || []
  const hooks = hooksRes.json?.webhooks || []
  const revealed = sessionStorage.getItem('eds_new_key')
  const hookSecret = sessionStorage.getItem('eds_new_hook')
  if (revealed) sessionStorage.removeItem('eds_new_key')
  if (hookSecret) sessionStorage.removeItem('eds_new_hook')
  V.innerHTML = `<h1>Developer</h1><p style="color:var(--mut)">Send documents from a template with an API key, and get notified when a document is signed, declined, or expired.</p>
  ${revealed ? `<div class="card" style="border-color:var(--acc)"><h3>Copy your API key now</h3><p>This is the only time it will be shown.</p><p class="mono" style="word-break:break-all">${esc(revealed)}</p><button id="ckey">Copy key</button></div>` : ''}
  <div class="card"><h3>API keys</h3>
    ${keys.length ? table(['Name', 'Key', 'Last used', ''], keys.map(k => `<tr><td>${esc(k.name)}</td><td class="mono">${esc(k.prefix)}</td><td>${fmt(k.lastUsed)}</td><td><a href="javascript:void 0" data-rk="${k.id}">Revoke</a></td></tr>`)) : '<p class="note">No keys yet.</p>'}
    <div class="row" style="margin-top:12px"><input id="kname" placeholder="Key name, e.g. Production" style="max-width:240px"><button class="p" id="kgo">Create key</button></div>
  </div>
  ${hookSecret ? `<div class="card" style="border-color:var(--acc)"><h3>Copy your webhook secret now</h3><p>Use it to verify the <span class="mono">X-EDS-Signature</span> header (sha256=...).</p><p class="mono" style="word-break:break-all">${esc(hookSecret)}</p></div>` : ''}
  <div class="card"><h3>Webhooks</h3><p class="note">We’ll POST JSON to your URL for <span class="mono">document.signed</span>, <span class="mono">document.declined</span>, and <span class="mono">document.expired</span>.</p>
    ${hooks.length ? table(['URL', 'Events', 'Status', ''], hooks.map(h => `<tr><td>${esc(h.url)}</td><td>${esc((h.events || []).join(', '))}</td><td>${h.active ? (h.lastStatus ? h.lastStatus + (h.lastError ? ' · ' + esc(h.lastError) : '') : 'Waiting') : 'Off'}</td><td><a href="javascript:void 0" data-dh="${h.id}">Delete</a></td></tr>`)) : '<p class="note">No webhooks yet.</p>'}
    <label class="f">Endpoint URL</label><input id="hurl" placeholder="https://example.com/webhooks/eds" style="width:100%">
    <p style="margin-top:12px"><button class="p" id="hgo">Add webhook</button></p>
  </div>
  <div class="card"><h3>Send from a template</h3>
    <p class="note">POST <span class="mono">/api/v1/documents/send</span> with <span class="mono">Authorization: Bearer YOUR_KEY</span></p>
    <pre style="white-space:pre-wrap;font-size:12px;background:#f8fafc;padding:12px;border-radius:8px">{
  "templateId": "YOUR_TEMPLATE_ID",
  "name": "Acme NDA",
  "signers": [{ "role": "Client", "name": "Alex Client", "email": "alex@example.com" }]
}</pre>
    <p class="note">List templates at <span class="mono">GET /api/v1/templates</span>. Each send uses 1 credit.</p>
  </div>`
  const copy = $('#ckey')
  if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(revealed); toast('Key copied') } catch { toast('Copy the key from the box above') } }
  $('#kgo').onclick = async () => {
    const r = await api('/api/developer/keys', { method: 'POST', body: { name: $('#kname').value } })
    if (!r.ok) return toast(r.json?.message || 'Could not create the key')
    sessionStorage.setItem('eds_new_key', r.json.key)
    toast('API key created'); developer()
  }
  $$('[data-rk]').forEach(el => el.onclick = async () => {
    if (!confirm('Revoke this key? Anything using it will stop working.')) return
    const r = await api('/api/developer/keys/' + el.dataset.rk, { method: 'DELETE' })
    if (!r.ok) return toast(r.json?.message || 'Could not revoke')
    toast('Key revoked'); developer()
  })
  $('#hgo').onclick = async () => {
    const r = await api('/api/developer/webhooks', { method: 'POST', body: { url: $('#hurl').value } })
    if (!r.ok) return toast(r.json?.message || 'Could not add the webhook')
    if (r.json.secret) sessionStorage.setItem('eds_new_hook', r.json.secret)
    toast('Webhook added'); developer()
  }
  $$('[data-dh]').forEach(el => el.onclick = async () => {
    if (!confirm('Delete this webhook?')) return
    const r = await api('/api/developer/webhooks/' + el.dataset.dh, { method: 'DELETE' })
    if (!r.ok) return toast(r.json?.message || 'Could not delete')
    toast('Webhook deleted'); developer()
  })
}
async function team() {
  const r = await api('/api/team')
  const team = r.json?.team
  const pending = r.json?.pendingInvites || []
  if (!r.ok) return toast(r.json?.message || 'Could not load your team')
  if (!team) {
    V.innerHTML = `<h1>Team</h1><p style="color:var(--mut)">Share templates and a credit pool with coworkers. Each person still has their own account and sent documents.</p>
    ${pending.length ? `<div class="card"><h3>Invites waiting for you</h3>${pending.map(p => `<p><b>${esc(p.name)}</b> invited you as ${esc(p.role)}. <button class="p" data-join="${p.id}">Join</button></p>`).join('')}</div>` : ''}
    <div class="card"><h3>Create a team</h3><label class="f">Team name</label><input id="tn" placeholder="e.g. Northwind Legal" style="max-width:280px"><p style="margin-top:12px"><button class="p" id="tgo">Create team</button></p></div>`
    $('#tgo').onclick = async () => {
      const res = await api('/api/team', { method: 'POST', body: { name: $('#tn').value } })
      if (!res.ok) return toast(res.json?.message || 'Could not create the team')
      toast('Team created'); team()
    }
    $$('[data-join]').forEach(el => el.onclick = async () => {
      const res = await api('/api/team/invites/accept', { method: 'POST', body: { id: el.dataset.join } })
      if (!res.ok) return toast(res.json?.message || 'Could not accept')
      toast('You’re on the team'); team()
    })
    return
  }
  const manager = team.role === 'owner' || team.role === 'admin'
  V.innerHTML = `<h1>${esc(team.name)}</h1><p style="color:var(--mut)">Shared pool: <b>${team.credits}</b> credit${team.credits === 1 ? '' : 's'}. You’re ${esc(team.role)}.</p>
  <div class="card"><h3>Credits</h3><p class="note">Move credits from your personal balance into the shared pool, or back out if you’re an owner or admin. Purchases still go to your own account first.</p>
    <div class="row"><input id="camt" type="number" min="1" value="1" style="max-width:100px"><button class="p" id="cin">Move in</button>${manager ? '<button id="cout">Move back to me</button>' : ''}</div>
  </div>
  <div class="card"><h3>Members</h3>${table(['Name', 'Email', 'Role', ''], team.members.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${esc(m.role)}</td><td>${manager && m.role !== 'owner' && m.id !== S.me.id ? `<a href="javascript:void 0" data-rm="${m.id}">Remove</a>` : ''}</td></tr>`))}</div>
  ${manager ? `<div class="card"><h3>Invite someone</h3><div class="row"><input id="iem" type="email" placeholder="coworker@example.com" style="max-width:260px"><select id="irole"><option value="member">Member</option><option value="admin">Admin</option></select><button class="p" id="igo">Send invite</button></div>
    ${team.invites?.length ? table(['Email', 'Role', 'Expires', ''], team.invites.map(i => `<tr><td>${esc(i.email)}</td><td>${esc(i.role)}</td><td>${fmt(i.expires)}</td><td><a href="javascript:void 0" data-rev="${i.id}">Revoke</a></td></tr>`)) : '<p class="note">No pending invites.</p>'}</div>` : ''}
  <p><button id="tleave">${team.role === 'owner' ? 'Delete team' : 'Leave team'}</button></p>`
  const move = async (amount) => {
    const res = await api('/api/team/credits', { method: 'POST', body: { amount } })
    if (!res.ok) return toast(res.json?.message || 'Could not move credits')
    toast('Credits updated'); await hydrate(); team()
  }
  $('#cin').onclick = () => move(Number($('#camt').value || 0))
  const cout = $('#cout'); if (cout) cout.onclick = () => move(-Number($('#camt').value || 0))
  const igo = $('#igo')
  if (igo) igo.onclick = async () => {
    const res = await api('/api/team/invites', { method: 'POST', body: { email: $('#iem').value, role: $('#irole').value } })
    if (!res.ok) return toast(res.json?.message || 'Could not send the invite')
    toast('Invite sent'); team()
  }
  $$('[data-rm]').forEach(el => el.onclick = async () => {
    if (!confirm('Remove this person from the team?')) return
    const res = await api('/api/team/members/' + el.dataset.rm, { method: 'DELETE' })
    if (!res.ok) return toast(res.json?.message || 'Could not remove')
    toast('Removed'); team()
  })
  $$('[data-rev]').forEach(el => el.onclick = async () => {
    const res = await api('/api/team/invites/' + el.dataset.rev, { method: 'DELETE' })
    if (!res.ok) return toast(res.json?.message || 'Could not revoke')
    toast('Invite revoked'); team()
  })
  $('#tleave').onclick = async () => {
    if (!confirm(team.role === 'owner' ? 'Delete this team? Shared templates will become private again.' : 'Leave this team?')) return
    const res = await api('/api/team/leave', { method: 'POST' })
    if (!res.ok) return toast(res.json?.message || 'Could not leave')
    toast(team.role === 'owner' ? 'Team deleted' : 'You left the team'); await hydrate(); team()
  }
}
async function teamInvite(token) {
  if (!S.me) {
    if (token) sessionStorage.setItem('eds_team_invite', token)
    V.innerHTML = `<div class="card" style="max-width:460px;margin:auto;text-align:center"><h1>You’re invited</h1><p>Log in or create an account with the email this invite was sent to, then we’ll add you to the team.</p><p><a class="btn p" href="#/login">Log in</a> <a class="btn" href="#/signup">Create account</a></p></div>`
    return
  }
  const r = await api('/api/team/invites/accept', { method: 'POST', body: { token } })
  if (!r.ok) {
    V.innerHTML = `<div class="card" style="max-width:460px;margin:auto;text-align:center"><h1>Invite</h1><p>${esc(r.json?.message || 'That invite could not be accepted.')}</p><p><a class="btn p" href="#/team">Go to Team</a></p></div>`
    return
  }
  sessionStorage.removeItem('eds_team_invite')
  toast('You’re on the team')
  location.hash = '#/team'
}
function settings() {
  const phoneLine = S.smsEnabled ? `<p>${S.usage?.phoneVerified ? 'Phone verified ' + esc(S.usage.phone) : 'Phone not verified'}</p><p><a href="#/phone">Update phone</a></p>` : ''
  V.innerHTML = `<h1>Settings</h1><div class="grid3" style="grid-template-columns:1fr 1fr"><div class="card"><h3>Account</h3><p>${esc(S.me.name)}<br>${esc(S.me.email)}</p>${phoneLine}<button id="out">Log out</button>
  <h3 style="margin-top:16px">Folders</h3><p>${S.folders.slice(1).map(esc).join(' · ') || 'None yet'}</p><button id="addf">+ Folder</button></div>
  <div class="card"><h3>Branding</h3><label class="f">Company name</label><input id="bc" value="${esc(S.brand.company || '')}" style="width:100%"><label class="f">Accent color</label><input id="bk" type="color" value="${S.brand.color || '#0f766e'}">
  <label class="f">Logo</label>
  ${S.brand.logoUrl ? `<p><img src="${esc(S.brand.logoUrl)}" alt="" style="height:40px;max-width:180px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px;padding:4px"></p>` : ''}
  <label class="btn">Upload logo<input id="blogo" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
  ${S.brand.logoUrl ? ' <button id="rmlogo">Remove</button>' : ''}
  <p class="note">Shown on signing emails, the signing page, and the certificate. PNG, JPEG, or WebP, under 400 KB.</p>
  <div class="card" style="border-top:5px solid ${S.brand.color || '#0f766e'};margin-top:10px">${S.brand.logoUrl ? `<img src="${esc(S.brand.logoUrl)}" alt="" style="height:28px;max-width:140px;object-fit:contain;vertical-align:middle;margin-right:8px">` : ''}<b>${esc(S.brand.company || 'Your company')}</b> sent you a document</div>
  <p style="margin-top:16px"><button id="portal">Receipts</button></p><p class="note">${esc(meterText())}</p></div>
  <div class="card" id="promo"><h3>Promo code</h3>${(S.usage?.promoCodes || []).map(c => `<p>${esc(c.code)}: ${c.active ? `${c.remaining} of ${c.granted} free documents left` : 'this code has been turned off'}</p>`).join('')}
  <label class="f">Have a code?</label><div class="row"><input id="pcode" placeholder="Enter code" style="text-transform:uppercase;max-width:200px"><button class="p" id="pgo">Apply</button></div><div id="pmsg"></div></div>
  <div class="card"><h3>Reminders</h3><label class="f">Default automatic reminders for new documents</label>${remindSelect('rdef', S.me.reminderDefault ?? 3, 'style="width:100%"')}
  <p class="note">Signers who haven’t signed get a reminder on this schedule, up to 5 times. You can change it on each document.</p>
  <label class="f" style="margin-top:12px">Email me a follow-up about documents still waiting</label>${remindSelect('rnud', S.me.senderNudgeDays ?? 0, 'style="width:100%"')}
  <p class="note">A short digest like “Your NDA is still waiting on Jane, sent 3 days ago” with a one-click Resend link.</p></div>
  ${S.me.isAdmin ? '<div class="card"><h3>Owner</h3><p><a class="btn" href="/admin">Open admin</a></p></div>' : ''}</div>`
  const saveRem = async () => {
    const r = await api('/api/settings', { method: 'PUT', body: { reminderDefault: +$('#rdef').value, senderNudgeDays: +$('#rnud').value } })
    if (r.ok) { S.me = { ...S.me, ...r.json, isAdmin: S.me.isAdmin }; toast('Reminder settings saved') } else toast(r.json?.message || 'Could not save')
  }
  $('#rdef').onchange = saveRem; $('#rnud').onchange = saveRem
  $('#pgo').onclick = async () => {
    const r = await api('/api/promo/redeem', { method: 'POST', body: { code: $('#pcode').value } })
    if (!r.ok) { $('#pmsg').innerHTML = `<p class="banner">${esc(r.json?.message || 'That code could not be applied.')}</p>`; return }
    toast(r.json.message); await hydrate(); route()
  }
  $('#out').onclick = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); setToken(''); S.me = null; location.hash = '#/' }
  $('#addf').onclick = async () => { const n = prompt('Folder name'); if (!n) return; S.folders.push(n); await api('/api/settings', { method: 'PUT', body: { brand: S.brand, folders: S.folders } }); route() }
  const saveBrand = async () => {
    const r = await api('/api/settings', { method: 'PUT', body: { brand: { company: $('#bc').value, color: $('#bk').value }, folders: S.folders } })
    if (r.ok) { S.brand = r.json.brand || S.brand; S.me = { ...S.me, brand: S.brand }; route() }
  }
  $('#bc').onchange = saveBrand; $('#bk').onchange = saveBrand
  $('#blogo').onchange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const up = await fetch('/api/settings/logo', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'X-Device-Local': deviceLocal() }, body: fd })
    const json = await up.json().catch(() => ({}))
    if (!up.ok) return toast(json.message || 'Could not upload the logo')
    S.brand = json.brand || S.brand; S.me = { ...S.me, brand: S.brand, ...json }; toast('Logo saved'); route()
  }
  const rm = $('#rmlogo')
  if (rm) rm.onclick = async () => {
    const r = await api('/api/settings/logo', { method: 'DELETE' })
    if (!r.ok) return toast(r.json?.message || 'Could not remove the logo')
    S.brand = r.json.brand || { ...S.brand, logoUrl: '' }; S.me = { ...S.me, ...r.json }; toast('Logo removed'); route()
  }
  $('#portal').onclick = async () => { const r = await api('/api/billing/portal', { method: 'POST' }); if (r.json?.url) location.href = r.json.url; else toast(r.json?.message || 'Receipts appear after your first purchase.') }
}

Object.assign(window, { closeModal, uploadFiles, fromTemplate, tplBuilder, saveTpl, editTpl, delTpl, remind, timeline, downloadDoc, mkLink, buy, addSigner: () => {} })

function meterText() {
  const u = S.usage
  if (!u) return ''
  const promo = u.promoCredits ? `${u.promoCredits} promo documents` : ''
  if (promo) return [promo, u.freeAvailable ? '1 free document' : '', u.credits ? `${u.credits} credits` : ''].filter(Boolean).join(', then ')
  if (u.freeAvailable && u.credits) return `1 free document, then ${u.credits} credits`
  if (u.freeAvailable) return '1 free document ready'
  const team = u.teamCredits ? `${u.teamCredits} team credit${u.teamCredits === 1 ? '' : 's'}` : ''
  const personal = `${u.credits || 0} document credits`
  return team ? `${personal}, plus ${team}` : personal
}
function adoptPath() {
  const map = { '/contact': '#/contact', '/signup': '#/signup', '/login': '#/login', '/pricing': '#pricing', '/app': '#/app' }
  const params = new URLSearchParams(location.search)
  if (params.get('message')) sessionStorage.setItem('contact_prefill', params.get('message'))
  const next = map[location.pathname]
  if (next) history.replaceState(null, '', '/' + next)
}
async function boot() {
  deviceLocal()
  adoptPath()
  try {
    const cfg = await fetch('/api/config').then(r => r.json())
    S.smsEnabled = cfg.smsEnabled !== false
    S.dropboxAppKey = cfg.dropboxAppKey || ''
    S.googlePickerClientId = cfg.googlePickerClientId || ''
    S.googlePickerApiKey = cfg.googlePickerApiKey || ''
    S.googlePickerAppId = cfg.googlePickerAppId || ''
  } catch { S.smsEnabled = true }
  const params = new URLSearchParams(location.search)
  if (TOKEN) {
    const me = await api('/api/me')
    if (me.ok) { S.me = me.json.me; S.usage = me.json.usage }
  }
  if (params.get('checkout') === 'success' && params.get('session_id') && TOKEN) {
    const confirmed = await api('/api/billing/confirm', { method: 'POST', body: { sessionId: params.get('session_id') } })
    toast(confirmed.ok ? 'Payment received' : (confirmed.json?.message || 'Payment is still processing'))
    history.replaceState({}, '', location.pathname)
  }
  if (params.get('checkout') === 'cancel') { toast('Checkout canceled'); history.replaceState({}, '', location.pathname) }
  await route()
}
Promise.all(['Caveat', 'Dancing Script', 'Great Vibes'].map(f => document.fonts.load(`64px '${f}'`))).catch(() => {}).finally(() => { mountHelp(); boot() })
