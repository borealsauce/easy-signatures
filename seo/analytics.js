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

  window.edsTrack = function (name, data = {}) {
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

  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('[data-cta]')
    if (a) window.edsTrack('cta_click', { cta: a.getAttribute('data-cta'), page: location.pathname })
  }, true)
})()
