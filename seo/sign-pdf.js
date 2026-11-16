// Free "Sign PDF / Fill & Sign" tool. Everything happens in the browser: the PDF is read with
// pdf.js, signed with pdf-lib, and downloaded. Nothing is uploaded to our servers.
(() => {
  const $ = s => document.querySelector(s)
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  const PDFLIB = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
  const MAX_BYTES = 50 * 1024 * 1024
  const FONTS = ['Great Vibes', 'Dancing Script', 'Caveat', 'Allura', 'Sacramento']
  const track = (n, d) => { try { window.edsTrack && window.edsTrack(n, d) } catch {} }

  const scripts = {}
  const load = src => scripts[src] || (scripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true
    s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('Could not load ' + src)) }
    document.head.appendChild(s)
  }))
  const libs = () => Promise.all([load(PDFJS), load(PDFLIB)]).then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER })
  let fontsLinked = false
  const linkFonts = () => {
    if (fontsLinked) return; fontsLinked = true
    const l = document.createElement('link'); l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@600&family=Caveat:wght@600&family=Allura&family=Sacramento&display=swap'
    document.head.appendChild(l)
  }

  const msg = (t, bad) => { const m = $('#sp-msg'); m.textContent = t || ''; m.classList.toggle('bad', !!bad) }

  // ---------- state ----------
  let bytes = null, fileName = 'document.pdf', pdf = null
  const pages = [] // { el, canvas, vp (scale-1 viewport), rendered }
  const items = [] // { id, kind, page, x, y, w, h, src, text, el }
  let seq = 0, selected = null, signature = null

  // ---------- open a PDF ----------
  async function openFile(file) {
    if (!file) return
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return msg('Please choose a PDF file.', true)
    if (file.size > MAX_BYTES) return msg('That file is over 50 MB. Try a smaller PDF.', true)
    msg('Opening your PDF on this device…')
    try {
      await libs()
      bytes = new Uint8Array(await file.arrayBuffer())
      fileName = file.name || 'document.pdf'
      pdf = await window.pdfjsLib.getDocument({ data: bytes.slice() }).promise
    } catch (e) {
      const pw = e && e.name === 'PasswordException'
      return msg(pw ? 'This PDF is password-protected. Open it with the password, save an unprotected copy, and try again.' : 'We couldn’t open that PDF. It may be damaged. Try another file.', true)
    }
    items.splice(0).forEach(i => i.el.remove())
    pages.splice(0).forEach(p => p.el.remove())
    const box = $('#sp-pages')
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const vp = page.getViewport({ scale: 1 })
      const el = document.createElement('div')
      el.className = 'sp-page'; el.dataset.n = n
      el.style.aspectRatio = `${vp.width} / ${vp.height}`
      el.setAttribute('aria-label', `Page ${n} of ${pdf.numPages}`)
      const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true')
      const label = document.createElement('span'); label.className = 'sp-pn'; label.textContent = `${n} / ${pdf.numPages}`
      el.append(canvas, label)
      el.addEventListener('pointerdown', e => { if (e.target === el || e.target === canvas) select(null) })
      box.appendChild(el)
      pages.push({ el, canvas, vp, page, rendered: 0 })
    }
    $('#sp-start').hidden = true; $('#sp-editor').hidden = false; $('#sp-done').hidden = true
    $('#sp-file-name').textContent = fileName
    observe()
    msg('')
    track('pdf_tool_open', { pages: pdf.numPages })
    $('#sp-editor').scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  let io
  function observe() {
    io && io.disconnect()
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) render(pages[e.target.dataset.n - 1]) }), { rootMargin: '600px 0px' })
    pages.forEach(p => io.observe(p.el))
  }
  async function render(p) {
    const cssW = p.el.clientWidth
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    let scale = (cssW * dpr) / p.vp.width
    const maxPx = 5e6; if (p.vp.width * p.vp.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (p.vp.width * p.vp.height))
    if (p.rendered && Math.abs(p.rendered - scale) / scale < 0.25) return
    p.rendered = scale
    const vp = p.page.getViewport({ scale })
    const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height); c.setAttribute('aria-hidden', 'true')
    await p.page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
    p.canvas.replaceWith(c); p.canvas = c
  }

  // ---------- items on pages ----------
  function visiblePage() {
    const mid = window.innerHeight / 2
    let best = pages[0], bestD = Infinity
    for (const p of pages) { const r = p.el.getBoundingClientRect(); const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bestD) { bestD = d; best = p } }
    return best
  }
  function addItem(kind, opts) {
    const p = visiblePage(); const r = p.el.getBoundingClientRect()
    const pageAspect = r.height / r.width
    // Keep new items big enough to grab with a finger on small screens.
    let w = Math.max(opts.w, (opts.minPx || 0) / r.width), h
    if (opts.ratio) h = w / opts.ratio / pageAspect // ratio = pixel width/height of the image
    else h = opts.h
    // Centre of the part of the page that's on screen.
    const top = Math.max(r.top, 70), bottom = Math.min(r.bottom, window.innerHeight)
    const cy = bottom > top ? ((top + bottom) / 2 - r.top) / r.height : 0.5
    const it = { id: ++seq, kind, page: +p.el.dataset.n, w, h, x: 0.5 - w / 2, y: Math.min(Math.max(cy - h / 2, 0), 1 - h), src: opts.src, ratio: opts.ratio, text: opts.text || '' }
    // Don't stack new items exactly on top of earlier ones.
    for (let n = 0; n < 12 && items.some(o => o.page === it.page && Math.abs(o.y - it.y) < Math.max(o.h, it.h) * 0.9 && Math.abs(o.x - it.x) < 0.15); n++) it.y = Math.min(it.y + Math.max(h, 0.03) + 0.01, 1 - h)
    const el = document.createElement('div'); el.className = 'sp-item sp-' + kind; it.el = el
    if (kind === 'text') {
      const inp = document.createElement('input'); inp.type = 'text'; inp.value = it.text; inp.placeholder = opts.placeholder || 'Type here'
      inp.setAttribute('aria-label', opts.label || 'Text'); inp.spellcheck = false; inp.autocomplete = 'off'
      inp.addEventListener('input', () => { it.text = inp.value; fitText(it) })
      el.appendChild(inp)
    } else {
      const img = document.createElement('img'); img.src = it.src; img.alt = opts.label || 'Signature'; img.draggable = false
      el.appendChild(img)
    }
    const del = document.createElement('button'); del.type = 'button'; del.className = 'sp-del'; del.setAttribute('aria-label', 'Remove'); del.textContent = '×'
    del.addEventListener('pointerdown', e => e.stopPropagation())
    del.addEventListener('click', () => { items.splice(items.indexOf(it), 1); el.remove(); if (selected === it) selected = null; updateCount() })
    const rs = document.createElement('span'); rs.className = 'sp-rs'; rs.setAttribute('aria-hidden', 'true')
    el.append(del, rs)
    p.el.appendChild(el)
    items.push(it)
    wire(it, rs)
    layout(it)
    if (kind === 'text') fitText(it)
    select(it)
    updateCount()
    if (kind === 'text' && opts.focus) el.querySelector('input').focus({ preventScroll: true })
    return it
  }
  const pageOf = it => pages[it.page - 1]
  function layout(it) {
    const s = it.el.style
    s.left = it.x * 100 + '%'; s.top = it.y * 100 + '%'; s.width = it.w * 100 + '%'; s.height = it.h * 100 + '%'
    if (it.kind === 'text') it.el.querySelector('input').style.fontSize = (it.h * pageOf(it).el.clientHeight * 0.72) + 'px'
  }
  const measure = document.createElement('canvas').getContext('2d')
  function fitText(it) {
    const pe = pageOf(it).el, fs = it.h * pe.clientHeight * 0.72
    measure.font = `${fs}px Helvetica, Arial, sans-serif`
    const txt = it.text || it.el.querySelector('input').placeholder
    const wpx = measure.measureText(txt).width + fs * 0.6
    it.w = Math.min(Math.max(wpx / pe.clientWidth, 0.04), 1 - it.x)
    layout(it)
  }
  function select(it) {
    if (selected && selected.el) selected.el.classList.remove('sel')
    selected = it
    if (it) it.el.classList.add('sel')
  }
  function updateCount() { $('#sp-download').disabled = items.length === 0 }

  function wire(it, rs) {
    const el = it.el
    let mode = null, sx, sy, ox, oy, sw, moved, pid, downOnInput
    el.addEventListener('pointerdown', e => {
      if (e.button > 0) return
      select(it)
      downOnInput = e.target.tagName === 'INPUT'
      if (downOnInput && document.activeElement === e.target) return // let the user place the caret
      e.preventDefault()
      mode = e.target === rs ? 'resize' : 'move'
      const r = el.getBoundingClientRect()
      sx = e.clientX; sy = e.clientY; ox = e.clientX - r.left; oy = e.clientY - r.top; sw = it.w; moved = false; pid = e.pointerId
      // Listen on window: moving the box to another page re-parents it, which would drop pointer capture.
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end)
    })
    let last = null, raf = 0
    // Auto-scroll when dragging near the top or bottom edge, so items can move to pages off screen.
    const tick = () => {
      raf = 0
      if (!mode || !last || mode !== 'move') return
      const edge = 60, y = last.clientY, H = window.innerHeight
      const v = y > H - edge ? (y - (H - edge)) / 3 : y < edge + 60 ? -((edge + 60) - y) / 3 : 0
      if (v) { window.scrollBy(0, v); onMove(last, true); raf = requestAnimationFrame(tick) }
    }
    const onMove = (e, fromTick) => {
      if (!mode || e.pointerId !== pid) return
      if (!fromTick) { last = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, preventDefault() {} }; if (!raf) raf = requestAnimationFrame(tick) }
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 4) return
      moved = true; el.classList.add('drag')
      if (mode === 'move') {
        // Switch pages if the pointer is over a different one.
        let p = pageOf(it), bestD = Infinity
        for (const q of pages) { const r = q.el.getBoundingClientRect(); const d = e.clientY < r.top ? r.top - e.clientY : e.clientY > r.bottom ? e.clientY - r.bottom : 0; if (d < bestD) { bestD = d; p = q } }
        if (+p.el.dataset.n !== it.page) {
          const oldH = pageOf(it).el.clientHeight
          it.page = +p.el.dataset.n; p.el.appendChild(el)
          it.h = it.h * oldH / p.el.clientHeight
        }
        const r = p.el.getBoundingClientRect()
        it.x = Math.min(Math.max((e.clientX - ox - r.left) / r.width, 0), Math.max(0, 1 - it.w))
        it.y = Math.min(Math.max((e.clientY - oy - r.top) / r.height, 0), Math.max(0, 1 - it.h))
      } else {
        const r = pageOf(it).el.getBoundingClientRect()
        const nw = Math.min(Math.max(sw + (e.clientX - sx) / r.width, 0.03), 1 - it.x)
        const k = nw / it.w
        const nh = it.h * k
        if (it.y + nh > 1) return
        it.w = nw; it.h = nh
      }
      layout(it)
      e.preventDefault()
    }
    const end = e => {
      if (!mode || e.pointerId !== pid) return
      if (raf) cancelAnimationFrame(raf), raf = 0
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end)
      el.classList.remove('drag')
      if (!moved && downOnInput) el.querySelector('input').focus()
      else if (moved && it.kind === 'text' && mode === 'resize') fitText(it)
      mode = null
    }
  }
  window.addEventListener('resize', () => { items.forEach(layout); pages.forEach(p => { if (p.rendered) { p.rendered = 0; render(p) } }) })

  // ---------- signature dialog ----------
  const dlg = $('#sp-dlg')
  let sigMode = 'draw', sigFont = FONTS[0], ink = '#0F172A', strokes = [], cur = null, uploaded = null
  const drawC = $('#sp-draw'), dctx = drawC.getContext('2d'), typeC = $('#sp-typec'), tctx = typeC.getContext('2d')
  const fit = c => { const r = c.getBoundingClientRect(), d = Math.max(2, window.devicePixelRatio || 1); c.width = Math.round(r.width * d) || 600; c.height = Math.round(r.height * d) || 220; return d }
  function redraw() {
    const d = fit(drawC); dctx.clearRect(0, 0, drawC.width, drawC.height); dctx.lineCap = dctx.lineJoin = 'round'
    for (const s of strokes) {
      dctx.strokeStyle = dctx.fillStyle = ink; dctx.lineWidth = 3 * d; const p = s
      if (p.length === 1) { dctx.beginPath(); dctx.arc(p[0][0] * drawC.width, p[0][1] * drawC.height, 1.5 * d, 0, 7); dctx.fill(); continue }
      dctx.beginPath(); dctx.moveTo(p[0][0] * drawC.width, p[0][1] * drawC.height)
      for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; dctx.quadraticCurveTo(p[i][0] * drawC.width, p[i][1] * drawC.height, mx * drawC.width, my * drawC.height) }
      const l = p[p.length - 1]; dctx.lineTo(l[0] * drawC.width, l[1] * drawC.height); dctx.stroke()
    }
    $('#sp-draw-hint').hidden = strokes.length > 0
  }
  const pos = e => { const r = drawC.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] }
  drawC.addEventListener('pointerdown', e => { drawC.setPointerCapture(e.pointerId); cur = [pos(e)]; strokes.push(cur); redraw(); e.preventDefault() })
  drawC.addEventListener('pointermove', e => { if (cur) { cur.push(pos(e)); redraw() } })
  drawC.addEventListener('pointerup', () => { cur = null }); drawC.addEventListener('pointercancel', () => { cur = null })
  async function renderTyped() {
    fit(typeC); const t = $('#sp-name').value.trim() || 'Your Name'
    try { await document.fonts.load(`64px "${sigFont}"`) } catch {}
    tctx.clearRect(0, 0, typeC.width, typeC.height)
    let size = typeC.height * 0.5; tctx.font = `${size}px "${sigFont}"`
    while (tctx.measureText(t).width > typeC.width * 0.9 && size > 12) { size -= 2; tctx.font = `${size}px "${sigFont}"` }
    tctx.fillStyle = ink; tctx.textAlign = 'center'; tctx.textBaseline = 'middle'
    tctx.globalAlpha = $('#sp-name').value.trim() ? 1 : 0.35; tctx.fillText(t, typeC.width / 2, typeC.height / 2); tctx.globalAlpha = 1
  }
  function trimmed(c) {
    const { width: w, height: h } = c; const data = c.getContext('2d').getImageData(0, 0, w, h).data
    let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (x1 < 0) return null
    const pad = Math.round(Math.min(w, h) * 0.04)
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height)
    return o
  }
  function setSigMode(m) {
    sigMode = m
    document.querySelectorAll('[data-sigmode]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.sigmode === m)))
    $('#sp-m-draw').hidden = m !== 'draw'; $('#sp-m-type').hidden = m !== 'type'; $('#sp-m-up').hidden = m !== 'upload'
    $('#sp-dlg-msg').textContent = ''
    if (m === 'draw') redraw(); if (m === 'type') { linkFonts(); renderTyped() }
  }
  let sigTarget = 'signature'
  function openSig(target) {
    sigTarget = target
    $('#sp-dlg-title').textContent = target === 'initials' ? 'Add your initials' : 'Add your signature'
    $('#sp-name').placeholder = target === 'initials' ? 'JH' : 'Jordan Hale'
    dlg.hidden = false; document.body.classList.add('sp-noscroll')
    strokes = []; uploaded = null; $('#sp-up-prev').hidden = true
    setSigMode(sigMode)
    setTimeout(() => (sigMode === 'type' ? $('#sp-name') : $('#sp-sig-use')).focus({ preventScroll: true }), 30)
  }
  function closeSig() { dlg.hidden = true; document.body.classList.remove('sp-noscroll') }
  async function useSig() {
    let c
    if (sigMode === 'draw') c = strokes.length && trimmed(drawC)
    else if (sigMode === 'type') { if (!$('#sp-name').value.trim()) { $('#sp-dlg-msg').textContent = 'Type your name first.'; return } await renderTyped(); c = trimmed(typeC) }
    else c = uploaded
    if (!c) { $('#sp-dlg-msg').textContent = sigMode === 'upload' ? 'Choose an image of your signature first.' : 'Draw your signature first.'; return }
    const src = c.toDataURL('image/png'), ratio = c.width / c.height
    if (sigTarget === 'signature') signature = { src, ratio }
    closeSig()
    addItem('img', { src, ratio, w: sigTarget === 'initials' ? 0.12 : 0.28, minPx: sigTarget === 'initials' ? 60 : 120, label: sigTarget === 'initials' ? 'Initials' : 'Signature' })
    track('pdf_tool_add', { kind: sigTarget, mode: sigMode })
  }
  $('#sp-up-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return
    try {
      const url = URL.createObjectURL(f); const img = new Image(); img.src = url; await img.decode()
      const k = Math.min(1, 1200 / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
      // Make a white or light paper background transparent.
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data
      for (let i = 0; i < a.length; i += 4) { const l = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]; if (l > 225) a[i + 3] = 0; else if (l > 180) a[i + 3] = Math.min(a[i + 3], Math.round((225 - l) / 45 * 255)) }
      x.putImageData(d, 0, 0)
      uploaded = trimmed(c) || c
      const pv = $('#sp-up-prev'); pv.src = uploaded.toDataURL('image/png'); pv.hidden = false
      $('#sp-dlg-msg').textContent = ''
    } catch { $('#sp-dlg-msg').textContent = 'That image couldn’t be read. Try a PNG or JPG.' }
  })
  document.querySelectorAll('[data-sigmode]').forEach(b => b.addEventListener('click', () => setSigMode(b.dataset.sigmode)))
  $('#sp-fonts').innerHTML = FONTS.map((f, i) => `<button type="button" class="sp-font" aria-pressed="${i === 0}" data-font="${f}" style="font-family:'${f}',cursive">Signature</button>`).join('')
  $('#sp-fonts').addEventListener('click', e => { const b = e.target.closest('[data-font]'); if (!b) return; sigFont = b.dataset.font; $('#sp-fonts').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); renderTyped() })
  document.querySelectorAll('[data-ink]').forEach(b => b.addEventListener('click', () => { ink = b.dataset.ink; document.querySelectorAll('[data-ink]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); sigMode === 'draw' ? redraw() : renderTyped() }))
  $('#sp-name').addEventListener('input', renderTyped)
  $('#sp-undo').addEventListener('click', () => { strokes.pop(); redraw() })
  $('#sp-clear').addEventListener('click', () => { strokes = []; redraw() })
  $('#sp-sig-use').addEventListener('click', useSig)
  $('#sp-sig-cancel').addEventListener('click', closeSig)
  dlg.addEventListener('pointerdown', e => { if (e.target === dlg) closeSig() })
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) closeSig() })

  // ---------- toolbar ----------
  const today = () => new Date().toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
  // About 12pt on a letter page; a bit larger on phones so it's readable while typing.
  const textH = () => { const el = visiblePage().el; return Math.max(0.022, Math.min(0.035, 14 / el.clientHeight)) }
  function checkImage() {
    const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d')
    x.strokeStyle = '#0F172A'; x.lineWidth = 16; x.lineCap = x.lineJoin = 'round'
    x.beginPath(); x.moveTo(18, 64); x.lineTo(48, 94); x.lineTo(102, 26); x.stroke()
    return c.toDataURL('image/png')
  }
  $('#sp-add-sig').addEventListener('click', () => {
    if (signature) { addItem('img', { ...signature, w: 0.28, label: 'Signature' }); track('pdf_tool_add', { kind: 'signature', mode: 'reuse' }) }
    else openSig('signature')
  })
  $('#sp-new-sig').addEventListener('click', () => openSig('signature'))
  $('#sp-add-init').addEventListener('click', () => openSig('initials'))
  $('#sp-add-text').addEventListener('click', () => { addItem('text', { h: textH(), w: 0.2, placeholder: 'Type here', label: 'Text', focus: true }); track('pdf_tool_add', { kind: 'text' }) })
  $('#sp-add-date').addEventListener('click', () => { addItem('text', { h: textH(), w: 0.15, text: today(), label: 'Date' }); track('pdf_tool_add', { kind: 'date' }) })
  $('#sp-add-check').addEventListener('click', () => { addItem('img', { src: checkImage(), ratio: 1, w: 0.035, label: 'Check mark', minPx: 30 }); track('pdf_tool_add', { kind: 'check' }) })
  $('#sp-reset').addEventListener('click', () => {
    items.splice(0).forEach(i => i.el.remove()); pages.splice(0).forEach(p => p.el.remove()); bytes = pdf = null
    $('#sp-editor').hidden = true; $('#sp-done').hidden = true; $('#sp-start').hidden = false; $('#sp-file').value = ''; msg('')
  })

  // ---------- build the signed PDF ----------
  function textPng(text, hPt) {
    const k = 4, fs = hPt * 0.72 * k
    measure.font = `${fs}px Helvetica, Arial, sans-serif`
    const c = document.createElement('canvas'); c.width = Math.ceil(measure.measureText(text).width + fs * 0.2); c.height = Math.ceil(hPt * k)
    const x = c.getContext('2d'); x.font = measure.font; x.fillStyle = '#0F172A'; x.textBaseline = 'alphabetic'
    x.fillText(text, fs * 0.1, c.height * 0.5 + fs * 0.3)
    return c
  }
  async function build() {
    const { PDFDocument, StandardFonts, degrees, rgb } = window.PDFLib
    let doc, raster = false
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false })
    } catch (e) {
      // Encrypted (permissions-locked) PDFs: rebuild from page images so the result opens everywhere.
      raster = true
      doc = await PDFDocument.create()
      for (const p of pages) {
        const s = Math.min(2.5, Math.sqrt(9e6 / (p.vp.width * p.vp.height)))
        const vp = p.page.getViewport({ scale: s })
        const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height)
        await p.page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
        const img = await doc.embedJpg(c.toDataURL('image/jpeg', 0.9))
        doc.addPage([p.vp.width, p.vp.height]).drawImage(img, { x: 0, y: 0, width: p.vp.width, height: p.vp.height })
      }
    }
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const docPages = doc.getPages()
    for (const it of items) {
      const p = pageOf(it), vp = p.vp, dp = docPages[it.page - 1]
      const L = it.x * vp.width, T = it.y * vp.height, W = it.w * vp.width, H = it.h * vp.height
      let rot = 0, pt
      if (raster) pt = [L, vp.height - T - H]
      else { rot = ((vp.rotation % 360) + 360) % 360; pt = vp.convertToPdfPoint(L, T + H) }
      if (it.kind === 'img') {
        const img = await doc.embedPng(it.src)
        dp.drawImage(img, { x: pt[0], y: pt[1], width: W, height: H, rotate: degrees(rot) })
      } else if (it.text.trim()) {
        const size = H * 0.72
        // Baseline sits about 0.28 of the box height above its bottom edge.
        const bx = L + size * 0.3, by = T + H - H * 0.284
        const b = raster ? [bx, vp.height - by] : vp.convertToPdfPoint(bx, by)
        let ok = true
        try { font.encodeText(it.text) } catch { ok = false }
        if (ok) dp.drawText(it.text, { x: b[0], y: b[1], size, font, color: rgb(0.06, 0.09, 0.16), rotate: degrees(rot) })
        else {
          const c = textPng(it.text, H), img = await doc.embedPng(c.toDataURL('image/png'))
          dp.drawImage(img, { x: pt[0], y: pt[1], width: H * c.width / c.height, height: H, rotate: degrees(rot) })
        }
      }
    }
    return { out: await doc.save(), raster }
  }

  $('#sp-download').addEventListener('click', async () => {
    if (!items.length) return msg('Add a signature, text, or date first.', true)
    const btn = $('#sp-download'); btn.disabled = true; msg('Creating your signed PDF…')
    try {
      document.activeElement && document.activeElement.blur && document.activeElement.blur()
      const { out, raster } = await build()
      const blob = new Blob([out], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob), a = document.createElement('a')
      a.href = url; a.download = fileName.replace(/\.pdf$/i, '') + '-signed.pdf'
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000)
      window.__spLastPdf = out
      msg(raster ? 'Downloaded. This PDF was protected, so the signed copy is saved as page images.' : 'Downloaded ' + a.download + '.')
      $('#sp-done').hidden = false
      track('pdf_signed', { items: items.length, pages: pages.length })
    } catch (e) {
      console.error(e); msg('Something went wrong creating the PDF. Please try again.', true)
    } finally { btn.disabled = false }
  })

  // ---------- start screen ----------
  const fileIn = $('#sp-file'), drop = $('#sp-drop')
  fileIn.addEventListener('change', () => openFile(fileIn.files[0]))
  const warm = () => { libs().catch(() => {}) }
  drop.addEventListener('pointerenter', warm, { once: true }); drop.addEventListener('touchstart', warm, { once: true, passive: true }); fileIn.addEventListener('focus', warm, { once: true })
  ;['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over') }))
  ;['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('over')))
  drop.addEventListener('drop', e => { e.preventDefault(); openFile(e.dataTransfer.files[0]) })
  $('#sp-sample').addEventListener('click', async () => {
    msg('Loading a sample PDF…')
    try { await libs(); const { PDFDocument, StandardFonts } = window.PDFLib; const d = await PDFDocument.create(); const f = await d.embedFont(StandardFonts.Helvetica); const pg = d.addPage([612, 792])
      pg.drawText('Sample agreement', { x: 72, y: 700, size: 22, font: f }); pg.drawText('Try it: add a signature, a date, and some text, then download.', { x: 72, y: 670, size: 12, font: f })
      pg.drawText('Signature: ______________________________     Date: ______________', { x: 72, y: 200, size: 12, font: f })
      const b = await d.save(); openFile(new File([b], 'sample.pdf', { type: 'application/pdf' }))
    } catch { msg('Couldn’t load the sample. Check your connection and try again.', true) }
  })
})()
