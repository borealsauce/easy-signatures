// Cookie-free analytics and conversion hooks.
// - Loads Vercel Web Analytics (cookie-free) when it's enabled on the project.
// - window.edsTrack(name, data) sends a custom event to Vercel (custom events need a Pro plan; on
//   Hobby they're ignored) and pushes it to window.dataLayer, so a future Google Ads or GA4 tag can
//   use 'signup' and 'purchase' as conversions without touching app code.
// - Watches the app's own API calls to fire 'signup', 'begin_checkout', and 'purchase'.
// - Keeps first-touch UTM / gclid for this tab in sessionStorage (no cookies) and attaches it to events.
(() => {
  if (window.edsTrack) return
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments) }
  window.dataLayer = window.dataLayer || []
  const prod = /(^|\.)easydigitalsignatures\.com$/.test(location.hostname)
  const s = prod && document.createElement('script')
  if (s) { s.defer = true
  s.src = '/_vercel/insights/script.js'
  document.head.appendChild(s) }
  // Vercel Speed Insights (Core Web Vitals from real visits; enabled on the project).
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments) }
  if (prod) { const si = document.createElement('script'); si.defer = true; si.src = '/_vercel/speed-insights/script.js'; document.head.appendChild(si) }

  // Internal-traffic flag: open any page once with ?internal=1 on each of your own devices.
  // It sets a first-party cookie (2 years) so this browser's visits are left out of "Real visitors".
  // ?internal=0 clears it.
  let internal = false
  try {
    const iq = new URLSearchParams(location.search).get('internal')
    if (iq === '1') { document.cookie = 'eds_internal=1; Max-Age=63072000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); localStorage.setItem('eds_internal', '1') }
    if (iq === '0') { document.cookie = 'eds_internal=; Max-Age=0; Path=/'; localStorage.removeItem('eds_internal') }
    internal = /(?:^|; )eds_internal=1/.test(document.cookie) || localStorage.getItem('eds_internal') === '1'
  } catch {}
  window.edsMarkInternal = function () {
    try { document.cookie = 'eds_internal=1; Max-Age=63072000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); localStorage.setItem('eds_internal', '1'); internal = true } catch {}
  }
  // Random anonymous visitor id kept in this browser's local storage (not a cookie), used to count unique visitors.
  let vid = ''
  try { vid = localStorage.getItem('eds_vid') || ''; if (!vid) { vid = 'v' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('eds_vid', vid) } } catch {}

  const PACK_VALUE = { doc1: 1, doc10: 5, doc50: 10 }
  let touch = {}
  try {
    const q = new URLSearchParams(location.search)
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'msclkid']
    const found = Object.fromEntries(keys.filter(k => q.get(k)).map(k => [k, q.get(k).slice(0, 100)]))
    const saved = JSON.parse(sessionStorage.getItem('eds_touch') || 'null')
    touch = saved || { ...found, landing: location.pathname, ref: document.referrer ? new URL(document.referrer).hostname : '' }
    if (!saved) sessionStorage.setItem('eds_touch', JSON.stringify(touch))
  } catch {}

  // Anonymous per-tab id for the first-party funnel (sessionStorage, not a cookie).
  let sid = ''
  try { sid = sessionStorage.getItem('eds_sid') || ''; if (!sid) { sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem('eds_sid', sid) } } catch {}
  const FUNNEL = ['page_view', 'landing_view', 'cta_click', 'signup_view', 'signup_started', 'pdf_tool_open', 'pdf_signed', 'begin_checkout']
  function beacon(name, data) {
    if (!sid || !FUNNEL.includes(name) || (navigator.webdriver && !localStorage.getItem('eds_track_test'))) return
    const body = JSON.stringify({ name, sid, vid, internal, path: location.pathname + (location.hash.startsWith('#/') ? location.hash.split('?')[0] : ''), data: { ...data, utm_source: touch.utm_source, utm_medium: touch.utm_medium, utm_campaign: touch.utm_campaign, ref: touch.ref, landing: touch.landing } })
    try { if (navigator.sendBeacon && navigator.sendBeacon('/api/ev', new Blob([body], { type: 'text/plain' }))) return } catch {}
    try { fetch('/api/ev', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {}) } catch {}
  }

  window.edsTrack = function (name, data = {}) {
    beacon(name, data)
    const flat = {}
    for (const [k, v] of Object.entries({ ...data, landing: touch.landing, utm_source: touch.utm_source, utm_campaign: touch.utm_campaign })) {
      if (v !== undefined && v !== '') flat[k] = typeof v === 'number' || typeof v === 'boolean' ? v : String(v).slice(0, 255)
    }
    try { window.va('event', { name, data: flat }) } catch {}
    window.dataLayer.push({ event: name, ...flat, gclid: touch.gclid })
  }

  const realFetch = window.fetch
  if (realFetch) {
    window.fetch = function (input, init) {
      const p = realFetch.apply(this, arguments)
      p.then(res => {
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || ''
          const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase()
          if (method !== 'POST' || !res.ok) return
          const path = new URL(url, location.href).pathname
          if (path === '/api/auth/signup') window.edsTrack('signup', { method: 'email' })
          else if (path === '/api/billing/checkout') {
            const body = JSON.parse((init && init.body) || '{}')
            window.edsTrack('begin_checkout', { pack: body.pack || body.kind || '' })
          } else if (path === '/api/billing/confirm') {
            const sid = JSON.parse((init && init.body) || '{}').sessionId || ''
            res.clone().json().then(j => {
              if (!j || !j.ok || !j.kind) return
              const key = 'eds_paid_' + sid
              if (sid && sessionStorage.getItem(key)) return
              if (sid) sessionStorage.setItem(key, '1')
              window.edsTrack('purchase', { pack: j.kind, value: PACK_VALUE[j.kind] || 0, currency: 'USD', transaction_id: sid })
            }).catch(() => {})
          }
        } catch {}
      }).catch(() => {})
      return p
    }
  }

  // First page of this tab's visit.
  try { window.edsTrack('page_view', { ref: document.referrer ? new URL(document.referrer).hostname : '' }) } catch {}
  try { if (!sessionStorage.getItem('eds_lv')) { sessionStorage.setItem('eds_lv', '1'); window.edsTrack('landing_view', {}) } } catch {}

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-cta]')
    if (a) window.edsTrack('cta_click', { cta: a.getAttribute('data-cta'), page: location.pathname })
  }, true)
})()
