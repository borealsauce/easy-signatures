import { logoMarkSvg, WORDMARK, BRAND_NAME } from '../shared/logo.js'
// Standalone HTML for /auth/confirmed — the page after an email confirmation link.
export function confirmedPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>You're in! · Easy Digital Signatures</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <style>
    :root { --teal:#14C4B0; --ink:#042F2E; --paper:#F8FAFC; --mut:rgba(226,232,240,.8); }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Inter, system-ui, sans-serif;
      color: var(--paper);
      background: #05080C;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px 16px;
      overflow-x: hidden;
    }
    .scene {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: #05080C;
    }
    .aurora {
      position: absolute; inset: -25%;
      filter: blur(48px);
      opacity: .95;
      background:
        radial-gradient(ellipse 55% 35% at 28% 22%, rgba(20,196,176,.38), transparent 62%),
        radial-gradient(ellipse 45% 40% at 78% 18%, rgba(56,189,248,.20), transparent 58%),
        radial-gradient(ellipse 50% 45% at 62% 78%, rgba(13,148,136,.22), transparent 60%),
        radial-gradient(ellipse 40% 35% at 18% 72%, rgba(45,212,191,.12), transparent 55%),
        radial-gradient(ellipse 30% 28% at 88% 68%, rgba(125,211,252,.08), transparent 55%);
      animation: aurora 22s ease-in-out infinite alternate;
    }
    .aurora2 {
      position: absolute; inset: -20%;
      filter: blur(60px);
      background:
        radial-gradient(ellipse 40% 28% at 50% 0%, rgba(153,246,228,.18), transparent 55%),
        radial-gradient(ellipse 35% 30% at 40% 60%, rgba(8,47,73,.4), transparent 60%);
      animation: aurora 28s ease-in-out infinite alternate-reverse;
    }
    @keyframes aurora {
      0% { transform: translate(0, 0) rotate(0deg) scale(1); }
      100% { transform: translate(3%, -4%) rotate(6deg) scale(1.08); }
    }
    .vignette {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse 65% 65% at 50% 45%, transparent 30%, rgba(2,6,10,.55) 100%);
    }
    .grain {
      position: fixed; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 1; mix-blend-mode: overlay; opacity: .14;
    }
    .sparkle {
      position: fixed; z-index: 2; pointer-events: none;
      width: 3px; height: 3px; border-radius: 50%;
      background: #F0FFFC;
      box-shadow: 0 0 8px 2px rgba(94,234,212,.75);
      animation: twinkle 3.6s ease-in-out infinite;
    }
    @keyframes twinkle {
      0%, 100% { opacity: .15; transform: scale(.6); }
      50% { opacity: .9; transform: scale(1); }
    }
    .wrap { position: relative; z-index: 3; width: min(440px, 100%); }
    .card {
      background: rgba(8, 24, 36, .78);
      border: 1px solid rgba(94,234,212,.2);
      border-radius: 24px;
      padding: 44px 36px 36px;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03) inset;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .brand {
      display: inline-flex; align-items: center; gap: 10px;
      color: var(--paper); text-decoration: none;
      font-weight: 700; font-size: 15px; letter-spacing: -.02em;
      margin-bottom: 28px;
    }
    .brand svg, .brand .logo-mark { display: block; flex-shrink: 0; }
    h1 {
      font-family: "Inter Tight", Inter, sans-serif;
      font-size: clamp(28px, 7vw, 42px);
      line-height: 1.1;
      letter-spacing: -.04em;
      font-weight: 700;
      margin: 0 0 12px;
    }
    .sub { margin: 0 auto 28px; font-size: 16.5px; line-height: 1.55; color: var(--mut); max-width: 34em; }
    label.f { display: block; text-align: left; font-size: 13px; font-weight: 500; color: rgba(248,250,252,.7); margin: 0 0 6px; }
    input[type=email], input[type=password] {
      width: 100%; font: inherit; color: var(--paper);
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 14px;
      outline: none;
    }
    input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(20,196,176,.22); }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 100%; min-height: 56px; padding: 12px 22px;
      border-radius: 999px; border: 0; cursor: pointer;
      background: var(--teal); color: var(--ink);
      font-family: inherit; font-size: 17px; font-weight: 700; letter-spacing: -.02em;
      text-decoration: none;
      box-shadow: 0 10px 28px rgba(20,196,176,.28);
    }
    .btn:hover { filter: brightness(1.06); }
    .btn:disabled { opacity: .65; cursor: default; filter: none; }
    .msg { min-height: 1.3em; margin: 12px 0 0; font-size: 13.5px; color: #FCA5A5; }
    .msg.ok { color: #5EEAD4; }
    .foot { margin-top: 18px; font-size: 13.5px; color: rgba(226,232,240,.7); }
    .foot a { color: #5EEAD4; text-decoration: none; font-weight: 550; }
    .foot a:hover { text-decoration: underline; }
    body.invalid .aurora, body.invalid .aurora2 { opacity: .35; animation: none; }
    body.invalid .sparkle { animation: none; opacity: .2; }
    body.invalid .grain { opacity: .08; }
    @media (max-width: 560px) {
      body { padding: 20px 14px; }
      .card { padding: 32px 20px 24px; border-radius: 20px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .aurora, .aurora2, .sparkle { animation: none; }
      .sparkle { opacity: .45; }
    }
  </style>
</head>
<body>
  <div class="scene" aria-hidden="true">
    <div class="aurora"></div>
    <div class="aurora2"></div>
    <div class="vignette"></div>
  </div>
  <span class="sparkle" style="left:12%; top:18%; animation-delay:-.4s"></span>
  <span class="sparkle" style="left:22%; top:62%; width:2px; height:2px; animation-delay:-1.6s; animation-duration:4.2s"></span>
  <span class="sparkle" style="left:8%; top:42%; animation-delay:-2.2s"></span>
  <span class="sparkle" style="left:78%; top:16%; animation-delay:-.8s"></span>
  <span class="sparkle" style="left:86%; top:38%; width:2px; height:2px; animation-delay:-2.8s; animation-duration:3.2s"></span>
  <span class="sparkle" style="left:72%; top:72%; animation-delay:-1.1s"></span>
  <span class="sparkle" style="left:90%; top:64%; width:2px; height:2px; animation-delay:-3s"></span>
  <span class="sparkle" style="left:18%; top:80%; animation-delay:-2.5s; animation-duration:4.8s"></span>
  <span class="sparkle" style="left:48%; top:10%; width:2px; height:2px; animation-delay:-1.9s"></span>
  <span class="sparkle" style="left:58%; top:86%; animation-delay:-.2s"></span>
  <span class="sparkle" style="left:34%; top:14%; animation-delay:-3.4s; width:2px; height:2px"></span>
  <span class="sparkle" style="left:94%; top:24%; animation-delay:-.6s"></span>
  <svg class="grain" aria-hidden="true">
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="8" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#grain)"></rect>
  </svg>
  <main class="wrap">
    <div class="card">
      <a class="brand" href="/" aria-label="${BRAND_NAME}">
        ${logoMarkSvg({ size: 32 })}
        ${WORDMARK}
      </a>
      <div id="panel"></div>
    </div>
  </main>
  <script>
    const panel = document.getElementById('panel')

    function esc(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    }
    function emailOk(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v || '').trim()) }
    function paramsFrom(str) { return new URLSearchParams(String(str || '').replace(/^[?#]/, '')) }

    async function api(path, opt) {
      opt = opt || {}
      const headers = Object.assign({}, opt.headers || {})
      if (opt.body) headers['content-type'] = 'application/json'
      if (opt.token) headers.authorization = 'Bearer ' + opt.token
      const res = await fetch(path, {
        method: opt.method || 'GET',
        headers: headers,
        body: opt.body ? JSON.stringify(opt.body) : undefined
      })
      const json = await res.json().catch(function () { return {} })
      return { ok: res.ok, status: res.status, json: json }
    }

    async function afterLogin(token) {
      localStorage.setItem('eds_token', token)
      let dest = '/#/app'
      try {
        const cfg = await api('/api/config')
        const me = await api('/api/me', { token: token })
        if (cfg.json && cfg.json.smsEnabled && me.json && me.json.usage && !me.json.usage.phoneVerified) dest = '/#/phone'
      } catch (e) {}
      location.href = dest
    }

    function renderSuccess(email, signedIn) {
      document.title = "You're in! · Easy Digital Signatures"
      if (signedIn) {
        panel.innerHTML = '<h1>You\\'re in! 🤙</h1>' +
          '<p class="sub">Email confirmed. Your first document is free — let’s get signing.</p>' +
          '<a class="btn" id="go" href="/#/app">Go to my dashboard</a>' +
          (email ? '<p class="foot">' + esc(email) + '</p>' : '')
        return
      }
      panel.innerHTML = '<h1>You\\'re in! 🤙</h1>' +
        '<p class="sub">Email confirmed. Your first document is free — let’s get signing.</p>' +
        '<form id="lf">' +
          '<label class="f" for="em">Email</label>' +
          '<input id="em" name="email" type="email" autocomplete="username" value="' + esc(email) + '">' +
          '<label class="f" for="pw">Password</label>' +
          '<input id="pw" name="password" type="password" autocomplete="current-password" required>' +
          '<button class="btn" id="go" type="submit">Log in</button>' +
          '<p class="msg" id="msg"></p>' +
        '</form>' +
        '<p class="foot"><a href="/#/forgot">Forgot password?</a></p>'
      const form = document.getElementById('lf')
      const msg = document.getElementById('msg')
      const btn = document.getElementById('go')
      form.onsubmit = async function (e) {
        e.preventDefault()
        btn.disabled = true
        msg.textContent = ''
        const res = await api('/api/auth/login', { method: 'POST', body: { email: document.getElementById('em').value, password: document.getElementById('pw').value } })
        if (!res.ok) {
          btn.disabled = false
          msg.textContent = (res.json && res.json.message) || 'Could not log in'
          return
        }
        await afterLogin(res.json.token)
      }
    }

    function renderInvalid(email) {
      document.body.classList.add('invalid')
      document.title = 'This link is no longer valid · Easy Digital Signatures'
      panel.innerHTML = '<h1>This link is no longer valid</h1>' +
        '<p class="sub">It may have expired or already been used. If you already confirmed your email, you can log in. Otherwise we’ll send a fresh link.</p>' +
        '<form id="rf">' +
          '<label class="f" for="em">Email</label>' +
          '<input id="em" name="email" type="email" autocomplete="email" value="' + esc(email) + '" placeholder="you@example.com" required>' +
          '<button class="btn" id="go" type="submit">Resend confirmation</button>' +
          '<p class="msg" id="msg"></p>' +
        '</form>' +
        '<p class="foot"><a href="/#/login">Back to log in</a></p>'
      const form = document.getElementById('rf')
      const msg = document.getElementById('msg')
      const btn = document.getElementById('go')
      form.onsubmit = async function (e) {
        e.preventDefault()
        const emailVal = document.getElementById('em').value.trim()
        if (!emailOk(emailVal)) { msg.textContent = 'Enter a valid email address.'; return }
        btn.disabled = true
        msg.textContent = ''
        const res = await api('/api/auth/resend-email', { method: 'POST', body: { email: emailVal } })
        btn.disabled = false
        if (!res.ok && res.status === 429) {
          msg.textContent = (res.json && res.json.message) || 'Too many requests. Try again later.'
          return
        }
        msg.className = 'msg ok'
        msg.textContent = (res.json && res.json.message) || 'If that account is waiting for confirmation, we sent the link again.'
      }
    }

    async function start() {
      const query = paramsFrom(location.search)
      const hash = paramsFrom(location.hash)
      const error = hash.get('error') || hash.get('error_code') || query.get('error') || query.get('error_code')
      const accessToken = hash.get('access_token') || query.get('access_token')
      let email = ''
      const rawEmail = query.get('email') || hash.get('email') || ''
      if (emailOk(rawEmail)) email = rawEmail.trim().toLowerCase()
      const verified = query.get('verified')

      if (accessToken || error || location.hash) {
        history.replaceState({}, '', location.pathname + location.search)
      }

      let me = null
      let usage = null
      let token = accessToken || localStorage.getItem('eds_token') || ''
      if (accessToken) localStorage.setItem('eds_token', accessToken)
      if (token) {
        const res = await api('/api/me', { token: token })
        if (res.ok) {
          me = res.json && res.json.me
          usage = res.json && res.json.usage
          if (me && me.email) email = me.email
        } else if (accessToken) {
          localStorage.removeItem('eds_token')
          token = localStorage.getItem('eds_token') || ''
        }
      }

      const sessionOn = !!(me && (usage && usage.emailVerified || accessToken || verified === '1'))
      const invalid = !!(error || verified === '0') && !sessionOn
      if (invalid) {
        renderInvalid(email)
        return
      }
      renderSuccess(email, sessionOn)
    }

    start()
  </script>
</body>
</html>`
}
