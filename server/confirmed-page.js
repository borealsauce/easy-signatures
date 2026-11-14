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
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%2314C4B0%22/><path d=%22M7.5 18.5c3-1.2 5 1.6 7.4-.2 2.6-1.9 4-5 8.9-3.6%22 stroke=%22%23042F2E%22 stroke-width=%222%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>">
  <style>
    :root { --teal:#14C4B0; --ink:#042F2E; --paper:#F8FAFC; --mut:rgba(226,232,240,.8); }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      font-family: Inter, system-ui, sans-serif;
      color: var(--paper);
      background: #06141E;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 28px 16px;
      overflow-x: hidden;
    }
    .bg {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background:
        radial-gradient(ellipse 70% 80% at 70% 0%, rgba(20,184,166,.22), transparent 55%),
        radial-gradient(ellipse 50% 50% at 8% 90%, rgba(13,148,136,.16), transparent 50%),
        radial-gradient(ellipse 40% 40% at 90% 80%, rgba(94,234,212,.1), transparent 50%),
        linear-gradient(180deg, #06141E 0%, #0A1C28 60%, #0C2430 100%);
    }
    .bg::before {
      content: ""; position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,.13) 1px, transparent 1px);
      background-size: 18px 18px;
      mask-image: radial-gradient(ellipse 80% 80% at 50% 30%, #000 20%, transparent 75%);
    }
    #fx { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }
    .scribble {
      position: fixed; z-index: 1; pointer-events: none; overflow: visible;
      opacity: .55;
    }
    .scribble path { fill: none; stroke: #5EEAD4; stroke-linecap: round; stroke-linejoin: round; }
    .s1 { left: 6%; top: 14%; width: 220px; animation: drift 14s ease-in-out infinite; }
    .s2 { right: 5%; top: 22%; width: 180px; animation: drift 16s ease-in-out infinite reverse; }
    .s3 { left: 10%; bottom: 12%; width: 200px; animation: drift 18s 1s ease-in-out infinite; }
    .s4 { right: 8%; bottom: 16%; width: 240px; animation: drift 15s .6s ease-in-out infinite reverse; }
    @keyframes drift {
      0%, 100% { transform: translate(0, 0) rotate(-4deg); }
      50% { transform: translate(12px, -18px) rotate(3deg); }
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
    .brand svg { display: block; flex-shrink: 0; }
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
    body.invalid .bg {
      background:
        radial-gradient(ellipse 70% 80% at 70% 0%, rgba(20,184,166,.1), transparent 55%),
        linear-gradient(180deg, #06141E 0%, #0A1C28 60%, #0C2430 100%);
    }
    body.invalid .scribble { opacity: .22; animation: none; }
    @media (max-width: 560px) {
      body { padding: 20px 14px; }
      .card { padding: 32px 20px 24px; border-radius: 20px; }
      .s1, .s2, .s3, .s4 { width: 120px; opacity: .35; }
    }
    @media (prefers-reduced-motion: reduce) {
      .scribble { animation: none; }
    }
  </style>
</head>
<body>
  <div class="bg" aria-hidden="true"></div>
  <canvas id="fx" aria-hidden="true"></canvas>
  <svg class="scribble s1" viewBox="0 0 220 70" aria-hidden="true"><path d="M8 48c22-28 42 18 68-8 22-22 38-32 86-6" stroke-width="2.2"/><path d="M28 58h72" stroke-width="1.6" opacity=".65"/></svg>
  <svg class="scribble s2" viewBox="0 0 180 60" aria-hidden="true"><path d="M6 34c18-22 36 14 58-6 20-18 40-8 70 4" stroke-width="2"/></svg>
  <svg class="scribble s3" viewBox="0 0 200 60" aria-hidden="true"><path d="M10 38c28-24 44 20 74-4 26-20 48-22 96 6" stroke-width="2.1"/><path d="M40 50h64" stroke-width="1.5" opacity=".6"/></svg>
  <svg class="scribble s4" viewBox="0 0 240 70" aria-hidden="true"><path d="M12 44c26-32 58 22 92-10 28-26 54-8 120 8" stroke-width="2.3"/></svg>
  <main class="wrap">
    <div class="card">
      <a class="brand" href="/">
        <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect width="28" height="28" rx="7" fill="#14C4B0"/><path d="M6.5 16.2c2.6-1.1 4.4 1.4 6.5-.2 2.3-1.7 3.5-4.4 7.8-3.2" stroke="#042F2E" stroke-width="1.8" stroke-linecap="round"/><path d="M7.2 19.4h8.4" stroke="#042F2E" stroke-width="1.5" stroke-linecap="round" opacity="0.65"/></svg>
        Easy Digital Signatures
      </a>
      <div id="panel"></div>
    </div>
  </main>
  <script>
    const panel = document.getElementById('panel')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function esc(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    }
    function emailOk(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v || '').trim()) }
    function paramsFrom(str) { return new URLSearchParams(String(str || '').replace(/^[?#]/, '')) }

    function burst() {
      if (reduce) return
      const canvas = document.getElementById('fx')
      const ctx = canvas.getContext('2d')
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const size = () => {
        canvas.width = innerWidth * dpr
        canvas.height = innerHeight * dpr
        canvas.style.width = innerWidth + 'px'
        canvas.style.height = innerHeight + 'px'
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      size()
      window.addEventListener('resize', size)
      const colors = ['#14C4B0','#5EEAD4','#99F6E4','#F8FAFC','#F59E0B','#2DD4BF','#A7F3D0','#5EEAD4']
      const cx = innerWidth / 2, cy = Math.min(innerHeight * 0.32, 280)
      const bits = Array.from({ length: 130 }, (_, i) => {
        const a = Math.random() * Math.PI * 2
        const sp = 3.2 + Math.random() * 9
        return {
          x: cx, y: cy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3.5,
          w: 4 + Math.random() * 7, h: 6 + Math.random() * 10,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.28,
          color: colors[i % colors.length],
          circle: Math.random() < 0.28,
          a: 1, g: 0.11 + Math.random() * 0.08
        }
      })
      let n = 0
      const tick = () => {
        n++
        ctx.clearRect(0, 0, innerWidth, innerHeight)
        let live = false
        for (const p of bits) {
          p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.992; p.rot += p.vr
          if (n > 70) p.a -= 0.014
          if (p.a <= 0) continue
          live = true
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.a)
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillStyle = p.color
          if (p.circle) { ctx.beginPath(); ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2); ctx.fill() }
          else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
        if (live) requestAnimationFrame(tick)
        else ctx.clearRect(0, 0, innerWidth, innerHeight)
      }
      requestAnimationFrame(tick)
    }

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
        panel.innerHTML = '<h1>You\\'re in! 🎉</h1>' +
          '<p class="sub">Email confirmed. Your first document is free — let’s get signing.</p>' +
          '<a class="btn" id="go" href="/#/app">Go to my dashboard</a>' +
          (email ? '<p class="foot">' + esc(email) + '</p>' : '')
        return
      }
      panel.innerHTML = '<h1>You\\'re in! 🎉</h1>' +
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
      burst()
    }

    start()
  </script>
</body>
</html>`
}
