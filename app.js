import { initialsOf } from '/shared/names.js'
import { calc, visible, validate } from '/shared/fields.js'
import { marketingHtml } from '/marketing.js'
import { mountHelp } from '/help.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const V = $('#view')
const COLORS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2']
const MIN = { signature: [120, 36], initials: [48, 28], date: [70, 22], name: [70, 22], text: [70, 22], number: [50, 22], checkbox: [16, 16], dropdown: [70, 22], formula: [60, 22], payment: [100, 30], attachment: [90, 26] }
const FT = { signature: ['✍️', 'Signature', .26, .06], initials: ['🔤', 'Initials', .09, .05], date: ['📅', 'Date signed', .16, .035], name: ['👤', 'Full name', .24, .035], text: ['📝', 'Text', .24, .035], number: ['#️⃣', 'Number', .12, .035], checkbox: ['☑️', 'Checkbox', .03, .023], dropdown: ['🔽', 'Dropdown', .18, .035], formula: ['🧮', 'Formula', .14, .035], payment: ['💳', 'Payment', .2, .045], attachment: ['📎', 'Attachment', .2, .04] }
const SIGFONTS = ['Caveat', 'Dancing Script', 'Great Vibes']
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const fmt = d => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const PHONE_NOTE = "Your number is only used to verify your account. We'll never send spam or marketing texts."

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800) }
function modal(html) { $('#mbox').innerHTML = html; $('#modal').classList.remove('hidden') }
function closeModal() { $('#modal').classList.add('hidden') }
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal() }

let TOKEN = localStorage.getItem('eds_token') || ''
let S = { docs: [], templates: [], links: [], me: null, usage: null, brand: { company: '', color: '#0f766e' }, folders: ['All', 'Sales', 'HR', 'Real Estate', 'Legal'], prop: null }
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
  if (res.status === 401 && TOKEN && !path.startsWith('/api/sign')) {
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
async function pdfBytes(d) {
  if (d._bytes) return d._bytes
  const res = await fetch(d._fileUrl || ('/api/documents/' + d.id + '/file'), { headers: authHeaders(false) })
  if (!res.ok) throw new Error('Could not load the PDF')
  d._bytes = new Uint8Array(await res.arrayBuffer())
  return d._bytes
}
async function renderPages(el, d) {
  el.innerHTML = '<p>Loading document…</p>'
  const pdf = await pdfjsLib.getDocument({ data: await pdfBytes(d) }).promise
  el.innerHTML = ''
  for (let i = 0; i < pdf.numPages; i++) {
    const p = await pdf.getPage(i + 1), vp = p.getViewport({ scale: 1.6 })
    const w = document.createElement('div'); w.className = 'page'; w.dataset.page = i
    w.style.width = Math.min(820, vp.width / 1.6 * 1.35) + 'px'
    w.dataset.pw = vp.width / 1.6; w.dataset.ph = vp.height / 1.6
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
    w.appendChild(c); el.appendChild(w)
    await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
  }
  d._pages = pdf.numPages
}
function sigOf(d, id) { return d.signers.find(s => s.id === id) }
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

const NAV = [['#/app', 'Dashboard'], ['#/templates', 'Templates'], ['#/links', 'Signing links'], ['#/bulk', 'Bulk send'], ['#/proposal', 'Proposals'], ['#/settings', 'Settings'], ['#/pricing', 'Pricing']]
function meter() {
  const u = S.usage
  if (!u) return ''
  const bits = []
  if (u.credits) bits.push(`${u.credits} credit${u.credits === 1 ? '' : 's'}`)
  if (u.freeAvailable) bits.push('1 free document')
  if (!bits.length) bits.push('Buy documents')
  return `<a class="meter" href="#/pricing">${bits.join(' · ')}</a>`
}
function nav() {
  const h = location.hash || '#/'
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
  const pub = ['', 'pricing', 'login', 'signup', 'sign', 'form', 'phone', 'contact']
  document.body.classList.toggle('marketing', (r || '') === '')
  if (S.me) { await flushNow(); activeId = null; if (r !== 'sign') await hydrate() }
  nav()
  window.scrollTo(0, 0)
  if (!S.me && !pub.includes(r || '')) { location.hash = '#/login'; return }
  const R = {
    '': landing, pricing, login, signup, phone, contact, app: dashboard, new: newDoc, edit: () => editor(a),
    sign: () => signToken(a), cert: () => cert(a), templates, links, form: () => publicForm(a), bulk, proposal, settings
  }
  await (R[r] || landing)()
  if (pricingAnchor) document.getElementById('pricing')?.scrollIntoView()
  afterRender()
}
window.onhashchange = () => { route().catch(e => toast(e.message || 'Something went wrong')) }

function landing() { V.innerHTML = marketingHtml({ loggedIn: !!S.me }) }

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
  <br><br><button class="p" id="go">Log in</button>
  <p><a href="#/signup">Create an account</a></p></div>`
  $('#go').onclick = async () => {
    const res = await api('/api/auth/login', { method: 'POST', body: { email: $('#em').value, password: $('#pw').value } })
    if (!res.ok) return toast(res.json?.message || 'Could not log in')
    setToken(res.json.token)
    await hydrate()
    if (sessionStorage.getItem('eds_buy')) { await resumeBuy(); return }
    location.hash = S.usage?.phoneVerified ? '#/app' : '#/phone'
  }
}

function signup() {
  V.innerHTML = `<div class="card auth"><h1>Create your account</h1><p>You’ll confirm your email, then a mobile number, before the free document unlocks.</p>
  <label class="f">Full name</label><input id="nm" autocomplete="name" style="width:100%">
  <label class="f">Email</label><input id="em" type="email" autocomplete="email" style="width:100%">
  <label class="f">Password</label><input id="pw" type="password" autocomplete="new-password" style="width:100%">
  <br><br><button class="p" id="go">Create account</button>
  <p><a href="#/login">I already have an account</a></p></div>`
  $('#go').onclick = async () => {
    const res = await api('/api/auth/signup', { method: 'POST', body: { name: $('#nm').value, email: $('#em').value, password: $('#pw').value } })
    if (!res.ok) return toast(res.json?.message || 'Could not sign up')
    V.innerHTML = `<div class="card auth"><h1>Check your email</h1><p>We sent a confirmation link to <b>${esc($('#em').value)}</b>. Open it, then log in.</p><a class="btn p" href="#/login">Go to log in</a></div>`
  }
}

function phone() {
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
  if (!S.usage?.phoneVerified) return `<div class="banner"><b>Verify your phone to unlock 1 free document.</b><br><a href="#/phone">Add a mobile number</a><p class="note">${esc(PHONE_NOTE)}</p></div>`
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
  V.innerHTML = `${phoneBanner()}<div class="row"><h1 style="margin:0">Documents</h1><span class="sp"></span>${meter()}<a class="btn" href="#/bulk">Bulk send</a><a class="btn p" href="#/new">+ New document</a><label class="btn">⬆ Upload<input type="file" accept="application/pdf,image/png,image/jpeg" multiple hidden onchange="uploadFiles(this.files)"></label></div>
  <div class="grid4" style="margin:18px 0">${[['Drafts', c('draft')], ['Awaiting signatures', c('sent') + c('waiting')], ['Completed', c('completed')], ['Avg. hours to complete', avg]].map(([l, v]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
  <div class="card" style="margin-bottom:18px"><h3>Documents sent per month</h3><div class="bar" style="margin:16px 0 22px">${per.map((v, i) => `<div style="height:${v / mx * 100}%" title="${v}"><span>${months[i].toLocaleString('en', { month: 'short' })} · ${v}</span></div>`).join('') || '<p>No documents yet.</p>'}</div></div>
  <div class="row" style="margin-bottom:10px">${S.folders.map(f => `<button class="${f === folder ? 'p' : ''}" data-f="${esc(f)}">📁 ${esc(f)}</button>`).join('')}<span class="sp"></span><input id="q" placeholder="Search documents…"></div><div id="dt"></div>`
  const drawT = () => {
    const q = ($('#q').value || '').toLowerCase()
    const rows = ds.filter(d => (folder === 'All' || d.folder === folder) && d.name.toLowerCase().includes(q)).map(d => {
      const sg = d.signers.filter(s => s.role !== 'cc'); const n = sg.filter(s => s.done).length; const st = d.status
      const next = d.signers.find(s => s.role !== 'cc' && !s.done)
      return `<tr><td><a href="#/${st === 'draft' ? 'edit' : st === 'completed' ? 'cert' : 'edit'}/${d.id}">${esc(d.name)}</a></td><td data-v="${st}"><span class="pill s-${st}">${st[0].toUpperCase() + st.slice(1)}</span></td><td>${esc(d.folder)}</td><td>${sg.map(s => esc(s.name)).join(', ')}</td><td data-v="${n / Math.max(1, sg.length)}">${n}/${sg.length}</td><td data-v="${d.created}">${fmt(d.created)}</td><td data-v="${d.events.at(-1)?.ts || ''}">${fmt(d.events.at(-1)?.ts)}</td><td>${st === 'draft' ? `<a href="#/edit/${d.id}">Edit</a>` : ''}${['sent', 'waiting'].includes(st) && next?.token ? `<a href="#/sign/${next.token}">Signing link</a> · <a href="javascript:remind('${d.id}')">Remind</a>` : ''}${st === 'completed' ? `<a href="javascript:downloadDoc('${d.id}')">PDF</a> · <a href="#/cert/${d.id}">Certificate</a>` : ''}${st !== 'draft' ? ` · <a href="javascript:timeline('${d.id}')">Timeline</a>` : ''}</td></tr>`
    })
    $('#dt').innerHTML = rows.length ? table(['Document', 'Status', 'Folder', 'Recipients', 'Signed', 'Created', 'Last activity', 'Actions'], rows) : '<div class="card"><h3>No documents yet</h3><p><a href="#/new">Upload a PDF or start from a blank page.</a></p></div>'
    afterRender()
  }
  $$('[data-f]').forEach(b => b.onclick = () => { sessionStorage.qpf = b.dataset.f; dashboard() })
  const resend = $('#resend'); if (resend) resend.onclick = async () => { const r = await api('/api/auth/resend', { method: 'POST' }); toast(r.ok ? 'Confirmation email sent' : (r.json?.message || 'Could not send')) }
  $('#q').oninput = drawT; drawT()
}
async function remind(id) { const r = await api('/api/documents/' + id + '/remind', { method: 'POST' }); toast(r.ok ? 'Reminder sent' : (r.json?.message || 'Could not remind')); if (r.ok) { await hydrate(); route() } }
function timeline(id) { const d = doc(id); modal(`<h3>${esc(d.name)}</h3><div class="tl">${d.events.map(e => `<div><b>${esc(e.t)}</b><br><small>${fmt(e.ts)} · ${esc(e.who || '')}${e.ip ? ' · ' + esc(e.ip) : ''}</small></div>`).join('') || '<p>No activity yet.</p>'}</div><p><button onclick="closeModal()">Close</button></p>`) }
async function downloadDoc(id) {
  const res = await fetch('/api/documents/' + id + '/download', { headers: authHeaders(false) })
  if (!res.ok) return toast('The sealed PDF is not ready yet')
  const blob = await res.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = (doc(id)?.name || 'document').replace(/[^\w\-]+/g, '_') + '_signed.pdf'; a.click()
}

function newDoc() {
  V.innerHTML = `<h1>Start a document</h1><div id="dz" class="dz"><div class="ic">⬆️</div><h3>Drag & drop PDFs or images here</h3><p>Multiple files OK · PDF, PNG, JPG · up to 10 MB each</p><label class="btn p lg" style="margin-top:10px">Browse files<input type="file" id="up" accept="application/pdf,image/png,image/jpeg" multiple hidden></label></div>
  <div class="grid3">${S.templates.map(t => `<div class="card"><div class="ic">📄</div><h3>${esc(t.name)}</h3><p>Your template · roles: ${t.signers.map(s => esc(s.name)).join(', ')}</p><br><button class="p" onclick="fromTemplate('${t.id}')">Use template</button></div>`).join('')}
  <div class="card"><div class="ic">🧩</div><h3>Create a template</h3><p>Upload your own PDF or start from a blank page, then place fields by role. Nothing prebuilt.</p><br><button onclick="tplBuilder()">Create template</button></div>
  <div class="card"><div class="ic">🧾</div><h3>Build a proposal</h3><p>Pricing table → PDF → signature.</p><br><a class="btn" href="#/proposal">Open builder</a></div></div>`
  $('#up').onchange = e => uploadFiles(e.target.files)
  const dz = $('#dz'); dz.ondragover = e => { e.preventDefault(); dz.classList.add('over') }; dz.ondragleave = () => dz.classList.remove('over')
  dz.ondrop = e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); uploadFiles(e.dataTransfer.files) }
}
async function uploadFiles(list) {
  const files = [...list || []]
  if (!files.length) return
  const errs = []; let first = null
  for (const f of files) {
    if (f.size > 10 * 1024 * 1024) { errs.push(`${f.name}: too large (max 10 MB)`); continue }
    const fd = new FormData(); fd.append('file', f, f.name)
    const res = await fetch('/api/documents/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'X-Device-Local': deviceLocal() }, body: fd })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) errs.push(`${f.name}: ${json.message || 'could not upload'}`)
    else if (!first) first = json.id
  }
  if (errs.length) modal(`<h3>${errs.length} file(s) not uploaded</h3><ul>${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul><button class="p" onclick="closeModal()">OK</button>`)
  if (first) { toast('Draft created'); location.hash = '#/edit/' + first }
}
;(() => {
  const ov = document.createElement('div'); ov.id = 'dropov'; ov.innerHTML = '<div>📄 Drop PDFs to upload</div>'; document.body.appendChild(ov); let n = 0
  const ok = () => /^#\/(app|new)$/.test(location.hash)
  addEventListener('dragenter', e => { if (!ok() || ![...e.dataTransfer.types].includes('Files')) return; n++; ov.classList.add('on') })
  addEventListener('dragleave', () => { if (--n <= 0) { n = 0; ov.classList.remove('on') } })
  addEventListener('dragover', e => { if (ok()) e.preventDefault() })
  addEventListener('drop', e => { n = 0; ov.classList.remove('on'); if (!ok() || e.defaultPrevented || !S.me) return; e.preventDefault(); uploadFiles(e.dataTransfer.files) })
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
  <input type="file" id="tbf" accept="application/pdf,image/png,image/jpeg" style="margin-top:8px"><br><br>
  <div class="row"><button class="p" id="tbg">Continue to place fields</button><button onclick="closeModal()">Cancel</button></div>`)
  $('#tbf').onchange = () => { $('[name=tbs][value=up]').checked = true; if (!$('#tbn').value && $('#tbf').files[0]) $('#tbn').value = $('#tbf').files[0].name.replace(/\.(pdf|png|jpe?g)$/i, '') }
  $('#tbg').onclick = async () => {
    const name = $('#tbn').value.trim() || 'Untitled template'
    const roles = $('#tbr').value.split(',').map(x => x.trim()).filter(Boolean)
    if ($('[name=tbs]:checked').value === 'up') {
      const f = $('#tbf').files[0]
      if (!f) return toast('Choose a file, or pick Blank page')
      const fd = new FormData(); fd.append('file', f); fd.append('template', 'true'); fd.append('name', name)
      const res = await fetch('/api/documents/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'X-Device-Local': deviceLocal() }, body: fd })
      const json = await res.json()
      if (!res.ok) return toast(json.message || 'Upload failed')
      if (roles.length) {
        json.signers = roles.map((r, i) => ({ id: json.signers[i]?.id || uid(), name: r, email: '', role: 'signer', color: COLORS[i % 6] }))
        json.ordered = true; json.fields = []; json.expiresDays = 30; json.remindDays = 3; json.message = json.message || 'Please review and sign.'; json.folder = json.folder || 'Sales'
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
  <div class="editor"><div class="panel"><h4>Fields — drag onto page</h4><div class="ftools">${Object.entries(FT).map(([k, [i, l]]) => `<div class="ftool" data-t="${k}">${i} ${l}</div>`).join('')}</div><p style="font-size:12px;color:var(--mut)">Click a field, then click the page. Shift+click keeps placing. Esc cancels.</p></div>
  <div class="pages" id="pages"></div>
  <div class="panel"><h4>${d.tpl ? 'Roles' : 'Recipients'}</h4><label class="row" style="font-size:13px"><input type="checkbox" id="ord" ${d.ordered ? 'checked' : ''}> Sign in order</label><div id="sg"></div>${locked ? '' : '<button onclick="addSigner()" style="width:100%">+ Add recipient</button>'}
  <h4 style="margin-top:16px">Field properties</h4><div id="props"><p style="font-size:13px;color:var(--mut)">Select a field.</p></div>
  <h4 style="margin-top:16px">Settings</h4><label class="f">Folder</label><select id="fo">${S.folders.slice(1).map(f => `<option ${f === d.folder ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
  <label class="f">Expires after (days)</label><input id="ex" type="number" value="${d.expiresDays}" style="width:100%"><label class="f">Remind every (days)</label><input id="rm" type="number" value="${d.remindDays}" style="width:100%">
  <label class="row" style="font-size:13px;margin-top:8px"><input type="checkbox" id="idv" ${d.idv ? 'checked' : ''}> Email an access code</label><label class="f">Message</label><textarea id="msg" style="width:100%">${esc(d.message || '')}</textarea>
  ${locked && d.signers.some(s => s.token) ? `<h4>Signing links</h4>${d.signers.filter(s => s.token).map(s => `<p style="font-size:12px"><b>${esc(s.name)}</b><br><a href="#/sign/${s.token}">Open link</a></p>`).join('')}` : ''}</div></div>`
  window.addSigner = () => { d.signers.push({ id: uid(), name: 'Signer ' + (d.signers.length + 1), email: '', role: 'signer', color: COLORS[d.signers.length % 6], done: false }); save(); drawS() }
  const drawS = () => {
    $('#sg').innerHTML = d.signers.map((s, i) => `<div style="border:1px solid ${s.id === cur ? s.color : 'var(--line)'};border-radius:8px;padding:6px;margin-bottom:6px" data-s="${s.id}"><div class="signer"><span class="dot" style="background:${s.color}"></span><b style="font-size:12px">${d.ordered ? i + 1 + '.' : ''}</b><input value="${esc(s.name)}" data-k="name" placeholder="${d.tpl ? 'Role name' : 'Full name'}" ${locked ? 'disabled' : ''}>${i > 0 && !locked ? `<span style="cursor:pointer" data-up="${i}">↑</span><span style="cursor:pointer" data-del="${i}">✕</span>` : ''}</div><div class="signer"><input value="${esc(s.email || '')}" data-k="email" placeholder="email@example.com" ${locked ? 'disabled' : ''}><select data-k="role" ${locked ? 'disabled' : ''}>${['signer', 'approver', 'in-person', 'cc'].map(r => `<option ${r === s.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>${d.tpl || s.role === 'cc' ? '' : `<div class="asig"><img data-ps="sig" src="${s.name.trim() ? typedSig(s.name) : ''}"><img data-ps="ini" src="${s.name.trim() ? typedSig(initialsOf(s.name)) : ''}"><small data-ps="txt">${s.name.trim() ? initialsOf(s.name) : ''}</small></div>`}</div>`).join('')
    $$('[data-s]').forEach(el => {
      el.onclick = e => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') { cur = el.dataset.s; drawS() } }
      const nm = $('[data-k=name]', el)
      if (nm) nm.oninput = () => { const v = nm.value.trim(), a = $('[data-ps=sig]', el); if (!a) return; a.src = v ? typedSig(v) : ''; $('[data-ps=ini]', el).src = v ? typedSig(initialsOf(v)) : ''; $('[data-ps=txt]', el).textContent = v ? initialsOf(v) : '' }
      $$('[data-k]', el).forEach(inp => inp.onchange = () => { const s = sigOf(d, el.dataset.s); s[inp.dataset.k] = inp.value; save(); drawF() })
    })
    $$('[data-del]').forEach(x => x.onclick = () => { const s = d.signers.splice(+x.dataset.del, 1)[0]; d.fields = d.fields.filter(f => f.signer !== s.id); save(); drawS(); drawF() })
    $$('[data-up]').forEach(x => x.onclick = () => { const i = +x.dataset.up; [d.signers[i - 1], d.signers[i]] = [d.signers[i], d.signers[i - 1]]; save(); drawS() })
  }
  const drawF = () => {
    $$('.fld').forEach(x => x.remove())
    d.fields.forEach(f => {
      const pg = $(`.page[data-page="${f.page}"]`); if (!pg) return
      const s = sigOf(d, f.signer) || d.signers[0]
      const el = document.createElement('div'); el.className = 'fld' + (sel === f.id ? ' sel' : ''); el.dataset.id = f.id
      Object.assign(el.style, { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%', borderColor: s.color, color: s.color, background: s.color + '22' })
      const v = f.type === 'formula' ? '= ' + calc(d.fields, f) : f.value
      el.innerHTML = (v && String(v).startsWith('data:') ? `<img src="${v}">` : v === true ? '✔' : v ? esc(v) : `${FT[f.type][0]} ${esc(f.label)}${f.required ? '*' : ''}`) + (locked ? '' : '<span class="x">×</span>' + (sel === f.id ? '<span class="h hl"></span><span class="h hr"></span><span class="h ht"></span>' : ''))
      pg.appendChild(el)
      if (locked) return
      el.onpointerdown = e => {
        if (e.target.classList.contains('x')) { d.fields = d.fields.filter(x => x.id !== f.id); save(); drawF(); return }
        const was = sel === f.id; sel = f.id; props(); if (!was) { el.classList.add('sel'); el.insertAdjacentHTML('beforeend', '<span class="h hl"></span><span class="h hr"></span><span class="h ht"></span>') }
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
    $('#props').innerHTML = `<label class="f">Type</label><b>${FT[f.type][1]}</b><label class="f">Assigned to</label><select id="pa" style="width:100%">${d.signers.filter(s => s.role !== 'cc').map(s => `<option value="${s.id}" ${s.id === f.signer ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
    <label class="f">Label</label><input id="pl" value="${esc(f.label)}" style="width:100%"><label class="row" style="font-size:13px;margin-top:6px"><input type="checkbox" id="pr" ${f.required ? 'checked' : ''}> Required</label>
    ${['text', 'name'].includes(f.type) ? `<label class="f">Validation</label><select id="pv" style="width:100%">${['none', 'email', 'number', 'zip', 'phone'].map(v => `<option ${f.valid === v ? 'selected' : ''}>${v}</option>`).join('')}</select>` : ''}
    ${f.type === 'dropdown' ? `<label class="f">Options (comma separated)</label><input id="po" value="${esc((f.options || ['Option A', 'Option B']).join(', '))}" style="width:100%">` : ''}
    ${f.type === 'formula' ? `<label class="f">Formula — use {Label} of number fields</label><input id="pf" value="${esc(f.formula || '')}" placeholder="{Qty}*{Price}" style="width:100%">` : ''}
    ${f.type === 'payment' ? `<label class="f">Amount ($)</label><input id="pm" type="number" value="${f.amount || 100}" style="width:100%">` : ''}
    <label class="f">Show only when checkbox is checked</label><select id="pc" style="width:100%"><option value="">Always show</option>${d.fields.filter(x => x.type === 'checkbox' && x.id !== f.id).map(x => `<option value="${x.id}" ${f.cond === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select>`
    const on = (i, fn) => { const e = $(i); if (e) e.onchange = () => { fn(e); save(); drawF() } }
    on('#pa', e => f.signer = e.value); on('#pl', e => f.label = e.value); on('#pr', e => f.required = e.checked); on('#pv', e => f.valid = e.value)
    on('#po', e => f.options = e.value.split(',').map(s => s.trim()).filter(Boolean)); on('#pf', e => f.formula = e.value); on('#pm', e => f.amount = +e.value); on('#pc', e => f.cond = e.value || null)
  }
  drawS(); await renderPages($('#pages'), d); drawF(); if (locked) return
  const addAt = (t, pg, fx, fy) => {
    let [, l, w, h] = FT[t]; const PW = +pg.dataset.pw || 612, PH = +pg.dataset.ph || 792
    w = Math.max(w, MIN[t][0] / PW); h = Math.max(h, MIN[t][1] / PH); if (t === 'checkbox') h = w * PW / PH
    const f = { id: uid(), page: +pg.dataset.page, type: t, signer: cur, x: Math.max(0, Math.min(1 - w, fx - w / 2)), y: Math.max(0, Math.min(1 - h, fy - h / 2)), w, h, required: t !== 'checkbox', label: l, value: null }
    if (t === 'dropdown') f.options = ['Option A', 'Option B']; if (t === 'payment') f.amount = 100
    d.fields.push(f); sel = f.id; save(); drawF(); props()
  }
  let armed = null
  $$('.ftool').forEach(tl => {
    tl.onpointerdown = e => {
      e.preventDefault(); const t = tl.dataset.t
      const g = document.createElement('div'); g.className = 'fld'; const s = sigOf(d, cur) || d.signers[0]
      Object.assign(g.style, { position: 'fixed', width: '120px', height: '30px', borderColor: s.color, color: s.color, background: s.color + '33', pointerEvents: 'none', zIndex: 99, left: e.clientX - 60 + 'px', top: e.clientY - 15 + 'px' })
      g.textContent = FT[t][1]; document.body.appendChild(g); let moved = false
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
  let ghost = null; const hint = document.createElement('div'); hint.id = 'hint'; hint.textContent = 'Click to place · Shift+click to repeat · Esc to cancel'
  const disarm = () => { armed = null; ghost && ghost.remove(); ghost = null; hint.remove(); $('#pages')?.classList.remove('placing'); $$('.ftool').forEach(x => x.style.borderColor = '') }
  function arm(t, tl) { disarm(); armed = t; tl.style.borderColor = 'var(--brand)'; $('#pages').classList.add('placing'); document.body.appendChild(hint); const s = sigOf(d, cur) || d.signers[0]; ghost = document.createElement('div'); ghost.className = 'fld ghost'; Object.assign(ghost.style, { borderColor: s.color, color: s.color, background: s.color + '33', display: 'none' }); ghost.textContent = FT[t][0] + ' ' + FT[t][1] }
  const pos = (e, pg) => { const r = pg.getBoundingClientRect(), PW = +pg.dataset.pw || 612, PH = +pg.dataset.ph || 792; let [, , w, h] = FT[armed]; w = Math.max(w, MIN[armed][0] / PW); h = Math.max(h, MIN[armed][1] / PH); if (armed === 'checkbox') h = w * PW / PH; return { x: Math.max(0, Math.min(1 - w, (e.clientX - r.left) / r.width - w / 2)), y: Math.max(0, Math.min(1 - h, (e.clientY - r.top) / r.height - h / 2)), w, h } }
  $('#pages').onpointermove = e => { if (!armed || !ghost) return; const pg = e.target.closest('.page'); if (!pg) { ghost.style.display = 'none'; return } if (ghost.parentNode !== pg) pg.appendChild(ghost); const p = pos(e, pg); Object.assign(ghost.style, { display: 'flex', left: p.x * 100 + '%', top: p.y * 100 + '%', width: p.w * 100 + '%', height: p.h * 100 + '%' }) }
  $('#pages').onpointerleave = () => { if (ghost) ghost.style.display = 'none' }
  $('#pages').onclick = e => { if (!armed || (e.target.closest('.fld') && !e.target.closest('.ghost'))) return; const pg = e.target.closest('.page'); if (!pg) return; const r = pg.getBoundingClientRect(); addAt(armed, pg, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); if (!e.shiftKey) disarm() }
  $('#pages').oncontextmenu = e => { if (armed) { e.preventDefault(); disarm() } }
  const onKey = e => { if (e.key === 'Escape' && armed) disarm() }
  addEventListener('keydown', onKey)
  addEventListener('hashchange', () => { removeEventListener('keydown', onKey); disarm() }, { once: true })
  $('#dn').onchange = e => { d.name = e.target.value; save() }
  $('#ord').onchange = e => { d.ordered = e.target.checked; save(); drawS() }
  $('#fo').onchange = e => { d.folder = e.target.value; save() }
  $('#ex').onchange = e => { d.expiresDays = +e.target.value; save() }
  $('#rm').onchange = e => { d.remindDays = +e.target.value; save() }
  $('#idv').onchange = e => { d.idv = e.target.checked; save() }
  $('#msg').onchange = e => { d.message = e.target.value; save() }
  if ($('#send')) $('#send').onclick = async () => {
    await flushNow()
    const res = await api('/api/documents/' + d.id + '/send', { method: 'POST' })
    if (res.status === 402) return payModal(d.id, res.json)
    if (!res.ok) return toast(res.json?.message || 'Could not send')
    const links = res.json.links || []
    modal(`<h3>Sent</h3><p>Each recipient with an email address got a secure link. You can also open a link here.</p>${links.map(l => `<div class="card" style="margin:8px 0"><b>${esc(l.name)}</b> ${l.email ? `&lt;${esc(l.email)}&gt;` : '(no email — open the link on this device)'}<br><a class="btn p" style="margin-top:8px" href="${l.url.replace(/^https?:\/\/[^/]+/, '')}">Open signing link</a></div>`).join('')}<button onclick="closeModal();location.hash='#/app'">Back to dashboard</button>`)
    await hydrate()
  }
}

function payModal(id, info) {
  const extra = id ? `,'${id}'` : ''
  modal(`<h3>This send needs a credit</h3><p>${esc(info?.message || 'Buy a pack, then send.')}</p>
  <div class="row" style="margin-top:10px"><button class="p" onclick="buy('doc1'${extra})">1 document · $1</button><button onclick="buy('doc10'${extra})">10 documents · $5</button><button onclick="buy('doc50'${extra})">50 documents · $10</button></div>
  <p class="note">Apple Pay and Google Pay show on the secure checkout page when your device supports them. The free-document checks never block a paid send.</p>`)
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

async function signToken(token) {
  if (!token) return V.innerHTML = '<p>Missing signing link.</p>'
  const res = await fetch('/api/sign/' + token, { headers: { 'X-Device-Local': deviceLocal() } })
  const session = await res.json().catch(() => null)
  if (!res.ok) return V.innerHTML = `<div class="card"><h2>${esc(session?.message || 'This link is not valid.')}</h2></div>`
  if (session.status === 'expired' || session.status === 'declined') return V.innerHTML = `<div class="card"><h2>This document is ${esc(session.status)}.</h2></div>`
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
  V.innerHTML = `<div class="signbar"><b>${esc(d.name)}</b><span>· ${esc(s.name)} ${s.role === 'in-person' ? '(in person — hand the device to the signer)' : ''}</span><span class="sp"></span><span id="prog"></span>${approver ? '' : '<button id="nx" style="background:var(--acc)">Next field</button>'}<button id="fin" class="p" style="background:var(--brand2)">${approver ? 'Approve' : 'Finish'}</button><button id="dec" style="background:#fee2e2">Decline</button><button id="cm">Comments (${d.comments.length})</button></div>
  <div class="card" id="consent" style="margin-bottom:12px">${session.accessCodeRequired ? `<label class="f">Access code from your email</label><input id="acode" maxlength="6" style="max-width:160px;letter-spacing:3px">` : ''}<label class="row"><input type="checkbox" id="ok"> ${esc(session.consentText)}</label></div><div class="pages" id="pages"></div>`
  await renderPages($('#pages'), d)
  const mine = () => d.fields.filter(f => f.signer === s.id && visible(d.fields, f) && f.type !== 'formula')
  const draw = () => {
    $$('.fld').forEach(x => x.remove())
    d.fields.forEach(f => {
      if (!visible(d.fields, f)) return
      const pg = $(`.page[data-page="${f.page}"]`); if (!pg) return
      const o = sigOf(d, f.signer) || s; const me = f.signer === s.id
      const el = document.createElement('div'); el.className = 'fld' + (me ? ' fill' : '') + (f.value != null && f.value !== '' ? ' done' : ''); el.dataset.id = f.id
      Object.assign(el.style, { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%', borderColor: me ? o.color : '#cbd5e1', color: me ? o.color : '#94a3b8', background: me ? o.color + '22' : '#f8fafc88', borderStyle: me ? 'solid' : 'dashed' })
      let v = f.type === 'formula' ? calc(d.fields, f) : f.value
      if (me && ['text', 'name', 'number'].includes(f.type)) {
        el.innerHTML = `<input type="text" placeholder="${esc(f.label)}${f.required ? '*' : ''}" value="${esc(v || '')}">`
        $('input', el).onchange = () => { const ok = validate(f, $('input', el).value); if (!ok) { toast(`${f.label}: invalid ${f.valid}`); $('input', el).value = ''; f.value = null } else f.value = $('input', el).value; push(); prog(); draw() }
      } else if (me && f.type === 'dropdown') {
        el.innerHTML = `<select style="width:100%;height:100%;border:0;background:transparent;font-size:11px"><option value="">${esc(f.label)}…</option>${(f.options || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        $('select', el).onchange = e => { f.value = e.target.value || null; push(); prog() }
      } else el.innerHTML = v && String(v).startsWith('data:') ? `<img src="${v}">` : v === true ? '✔' : v ? esc(v) : f.type === 'checkbox' ? '' : (me ? FT[f.type][0] + ' ' + esc(f.label) : esc(o.name))
      if (me && f.type === 'attachment' && !f.value) el.innerHTML = '📎 Drop file or tap'
      if (me) el.onclick = e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; fill(f) }
      pg.appendChild(el)
    })
  }
  const prog = () => { const m = mine(); $('#prog').textContent = `${m.filter(f => f.value != null && f.value !== '').length}/${m.length} fields` }
  const fill = f => {
    if (f.type === 'signature' || f.type === 'initials') return sigModal(f.type, s, d, () => { d.fields.filter(x => x.signer === s.id).forEach(x => { if (x.type === 'signature' && s.sigImg) x.value = s.sigImg; if (x.type === 'initials' && s.iniImg) x.value = s.iniImg }); push(); draw(); prog() })
    if (f.type === 'date') f.value = new Date().toLocaleDateString()
    else if (f.type === 'checkbox') f.value = f.value === true ? false : true
    else if (f.type === 'payment') return modal(`<h3>Acknowledge $${f.amount}</h3><p>This records the amount on the document. Easy Digital Signatures does not collect this payment.</p><button class="p" id="pay">Acknowledge $${f.amount}</button>`), $('#pay').onclick = () => { f.value = `Acknowledged $${f.amount}`; push(); closeModal(); draw(); prog() }
    else if (f.type === 'attachment') { const i = document.createElement('input'); i.type = 'file'; i.onchange = () => { if (i.files[0].size > 10 * 1024 * 1024) return toast('Attachment too large (max 10 MB)'); f.value = '📎 ' + i.files[0].name; push(); draw(); prog() }; i.click(); return }
    push(); draw(); prog()
  }
  draw(); prog()
  const nx = $('#nx'); if (nx) nx.onclick = () => { const f = mine().find(f => f.value == null || f.value === ''); $$('.fld').forEach(x => x.classList.remove('cur')); if (!f) return toast('All your fields are filled — click Finish'); const el = $(`.fld[data-id="${f.id}"]`); el.classList.add('cur'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (!['text', 'name', 'number', 'dropdown'].includes(f.type)) setTimeout(() => fill(f), 400); else $('input,select', el)?.focus() }
  $('#dec').onclick = async () => { const reason = prompt('Reason for declining?'); if (!reason) return; const r = await fetch('/api/sign/' + token + '/decline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }); const j = await r.json(); if (!r.ok) return toast(j.message || 'Could not decline'); V.innerHTML = '<div class="card"><h2>You declined this document.</h2><p>The sender has been emailed.</p></div>' }
  $('#cm').onclick = () => { modal(`<h3>Comments</h3>${d.comments.map(c => `<div class="card" style="margin:6px 0;padding:10px"><b>${esc(c.who)}</b> <small>${fmt(c.ts)}</small><br>${esc(c.t)}</div>`).join('') || '<p>No comments yet.</p>'}<textarea id="ct" style="width:100%"></textarea><br><br><button class="p" id="cs">Post</button> <button onclick="closeModal()">Close</button>`); $('#cs').onclick = async () => { const t = $('#ct').value.trim(); if (!t) return; await fetch('/api/sign/' + token + '/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) }); d.comments.push({ t, who: s.name, ts: now() }); closeModal(); toast('Comment posted') } }
  $('#fin').onclick = async () => {
    if (!$('#ok').checked) return toast('Please accept the electronic-signature consent first'), $('#consent').scrollIntoView({ block: 'center' })
    const r = await fetch('/api/sign/' + token + '/finish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Local': deviceLocal() }, body: JSON.stringify({ consent: true, accessCode: $('#acode')?.value || '', name: s.name, fields: d.fields.filter(f => f.signer === s.id).map(f => ({ id: f.id, value: f.value })) }) })
    const j = await r.json()
    if (!r.ok) return toast(j.message || 'Could not finish')
    if (j.status === 'completed') V.innerHTML = `<div class="card" style="text-align:center"><h2>Thanks, ${esc(s.name)}. Everyone has signed.</h2><p>A sealed PDF is on its way by email.</p><p><a class="btn p" href="/api/sign/${token}/download">Download the sealed PDF</a></p></div>`
    else V.innerHTML = `<div class="card" style="text-align:center"><h2>Thanks, ${esc(s.name)}.</h2><p>We’ll email the next recipient. You’ll get the sealed PDF when everyone is done.</p></div>`
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
  <div class="cert"><div class="row"><span class="mark">E</span><h1 style="margin:0">Certificate of Completion</h1></div><p style="color:var(--mut)">Electronic signature record. Compare the complete-file fingerprint at the public verify page.</p>
  <div class="grid3" style="grid-template-columns:1fr 1fr;margin:16px 0"><div><b>Document</b><br>${esc(d.name)}</div><div><b>Status</b><br><span class="pill s-${d.status}">${d.status}</span></div><div><b>Document ID</b><br><span class="mono">${d.id}</span></div><div><b>Completed</b><br>${fmt(d.completed)}</div></div>
  <p><b>Original SHA-256</b><br><span class="mono">${d.hashOrig || '—'}</span></p><p><b>Signed content SHA-256</b><br><span class="mono">${d.hashContent || '—'}</span></p><p><b>Complete file SHA-256</b><br><span class="mono">${d.hashFinal || '—'}</span></p>
  <h3>Recipients</h3>${table(['Name', 'Email', 'Role', 'Status', 'Signed at', 'IP'], d.signers.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${s.role}</td><td>${s.done ? 'Signed' : s.role === 'cc' ? 'Copied' : 'Pending'}</td><td>${fmt(s.doneAt)}</td><td>${esc(s.signIp || s.viewIp || '—')}</td></tr>`))}
  <h3>Audit trail</h3>${table(['Time', 'Event', 'By', 'IP'], d.events.map(e => `<tr><td>${fmt(e.ts)}</td><td>${esc(e.t)}</td><td>${esc(e.who || '')}</td><td>${esc(e.ip || '')}</td></tr>`))}</div>`
}

function templates() {
  V.innerHTML = `<div class="row"><h1>Templates</h1><span class="sp"></span><button class="p" onclick="tplBuilder()">+ Create template</button></div><p style="color:var(--mut)">Templates have roles, not people. You build them from a blank page or your own file. We don’t ship prebuilt legal forms.</p>
  ${S.templates.length ? table(['Name', 'Roles', 'Fields', 'Actions'], S.templates.map(t => `<tr><td>${esc(t.name)}</td><td>${t.signers.map(s => esc(s.name)).join(', ')}</td><td>${(t.fields || []).length}</td><td><a href="javascript:fromTemplate('${t.id}')">Use</a> · <a href="javascript:editTpl('${t.id}')">Edit</a> · <a href="javascript:mkLink('${t.id}')">Signing link</a> · <a href="javascript:delTpl('${t.id}')">Delete</a></td></tr>`)) : `<div class="card" style="text-align:center;padding:48px 20px"><h2>No templates yet</h2><p style="color:var(--mut)">Upload your PDF or start from a blank page, place fields for each role, and save.</p><button class="p lg" onclick="tplBuilder()">Create template</button></div>`}`
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
  V.innerHTML = `<h1>Bulk send</h1><p style="color:var(--mut)">Each person gets their own document and email. Every copy uses your allowance.</p><div class="card">${S.templates.length ? '' : '<p>Create a one-signer template first.</p>'}
  <label class="f">Template</label><select id="bt">${S.templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
  <label class="f">Recipients, one per line: name, email</label><textarea id="bl" rows="6" style="width:100%" placeholder="Jordan Avery, jordan@example.com"></textarea><br><br><button class="p" id="bs">Send to all</button></div>`
  $('#bs').onclick = async () => {
    const recipients = $('#bl').value.split('\n').map(r => r.split(',')).map(([name, email]) => ({ name: (name || '').trim(), email: (email || '').trim() })).filter(r => r.name)
    const res = await api('/api/bulk', { method: 'POST', body: { templateId: $('#bt').value, recipients } })
    if (res.status === 402) return payModal(null, res.json)
    if (!res.ok) return toast(res.json?.message || 'Could not send')
    toast(`Sent ${res.json.sent}`)
    location.hash = '#/app'
  }
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
      json.ordered = true; json.expiresDays = 30; json.remindDays = 3; json.message = 'Please review and sign.'; json.folder = json.folder || 'Sales'
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
function settings() {
  V.innerHTML = `<h1>Settings</h1><div class="grid3" style="grid-template-columns:1fr 1fr"><div class="card"><h3>Account</h3><p>${esc(S.me.name)}<br>${esc(S.me.email)}</p><p>${S.usage?.phoneVerified ? 'Phone verified ' + esc(S.usage.phone) : 'Phone not verified'}</p><p><a href="#/phone">Update phone</a></p><button id="out">Log out</button>
  <h3 style="margin-top:16px">Folders</h3><p>${S.folders.slice(1).map(esc).join(' · ') || 'None yet'}</p><button id="addf">+ Folder</button></div>
  <div class="card"><h3>Branding</h3><label class="f">Company name</label><input id="bc" value="${esc(S.brand.company || '')}" style="width:100%"><label class="f">Accent color</label><input id="bk" type="color" value="${S.brand.color || '#0f766e'}"><p class="note">Used on signer emails and the certificate.</p>
  <div class="card" style="border-top:5px solid ${S.brand.color || '#0f766e'};margin-top:10px"><b>${esc(S.brand.company || 'Your company')}</b> sent you a document</div>
  <p style="margin-top:16px"><button id="portal">Receipts</button></p><p class="note">${esc(meterText())}</p></div></div>`
  $('#out').onclick = () => { setToken(''); S.me = null; location.hash = '#/' }
  $('#addf').onclick = async () => { const n = prompt('Folder name'); if (!n) return; S.folders.push(n); await api('/api/settings', { method: 'PUT', body: { brand: S.brand, folders: S.folders } }); route() }
  const saveBrand = async () => { S.brand = { company: $('#bc').value, color: $('#bk').value }; await api('/api/settings', { method: 'PUT', body: { brand: S.brand, folders: S.folders } }); route() }
  $('#bc').onchange = saveBrand; $('#bk').onchange = saveBrand
  $('#portal').onclick = async () => { const r = await api('/api/billing/portal', { method: 'POST' }); if (r.json?.url) location.href = r.json.url; else toast(r.json?.message || 'Receipts appear after your first purchase.') }
}

Object.assign(window, { closeModal, uploadFiles, fromTemplate, tplBuilder, saveTpl, editTpl, delTpl, remind, timeline, downloadDoc, mkLink, buy, addSigner: () => {} })

function meterText() {
  const u = S.usage
  if (!u) return ''
  if (u.freeAvailable && u.credits) return `1 free document, then ${u.credits} credits`
  if (u.freeAvailable) return '1 free document ready'
  return `${u.credits || 0} document credits`
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
