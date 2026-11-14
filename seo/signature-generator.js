// Free signature generator. Runs entirely in the browser: nothing is uploaded.
(() => {
  const $ = s => document.querySelector(s)
  const FONTS = ['Great Vibes', 'Dancing Script', 'Caveat', 'Allura', 'Sacramento']
  let font = FONTS[0], color = '#0F172A', mode = 'type'
  const typed = $('#sg-type-canvas'), drawC = $('#sg-draw-canvas')
  const tctx = typed.getContext('2d'), dctx = drawC.getContext('2d')
  const nameIn = $('#sg-name')
  const strokes = []
  let current = null

  function fit(c) {
    const r = c.getBoundingClientRect(), d = Math.max(2, window.devicePixelRatio || 1)
    c.width = Math.round(r.width * d); c.height = Math.round(r.height * d)
    return d
  }

  async function renderTyped() {
    const d = fit(typed)
    const text = nameIn.value.trim() || 'Your Name'
    try { await document.fonts.load(`64px "${font}"`) } catch {}
    tctx.clearRect(0, 0, typed.width, typed.height)
    let size = typed.height * 0.5
    tctx.font = `${size}px "${font}"`
    const max = typed.width * 0.9
    while (tctx.measureText(text).width > max && size > 12) { size -= 2; tctx.font = `${size}px "${font}"` }
    tctx.fillStyle = color; tctx.textAlign = 'center'; tctx.textBaseline = 'middle'
    tctx.globalAlpha = nameIn.value.trim() ? 1 : 0.35
    tctx.fillText(text, typed.width / 2, typed.height / 2 + d)
    tctx.globalAlpha = 1
  }

  function redraw() {
    const d = fit(drawC)
    dctx.clearRect(0, 0, drawC.width, drawC.height)
    dctx.lineCap = 'round'; dctx.lineJoin = 'round'
    const w = Number($('#sg-width').value) * d
    for (const s of strokes) {
      dctx.strokeStyle = s.color; dctx.lineWidth = w
      dctx.beginPath()
      const p = s.pts
      if (p.length === 1) { dctx.arc(p[0][0] * drawC.width, p[0][1] * drawC.height, w / 2, 0, 7); dctx.fillStyle = s.color; dctx.fill(); continue }
      dctx.moveTo(p[0][0] * drawC.width, p[0][1] * drawC.height)
      for (let i = 1; i < p.length - 1; i++) {
        const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2
        dctx.quadraticCurveTo(p[i][0] * drawC.width, p[i][1] * drawC.height, mx * drawC.width, my * drawC.height)
      }
      const last = p[p.length - 1]
      dctx.lineTo(last[0] * drawC.width, last[1] * drawC.height)
      dctx.stroke()
    }
    $('#sg-draw-hint').hidden = strokes.length > 0
  }

  const pos = e => { const r = drawC.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] }
  drawC.addEventListener('pointerdown', e => { drawC.setPointerCapture(e.pointerId); current = { color, pts: [pos(e)] }; strokes.push(current); redraw(); e.preventDefault() })
  drawC.addEventListener('pointermove', e => { if (!current) return; current.pts.push(pos(e)); redraw() })
  const end = () => { current = null }
  drawC.addEventListener('pointerup', end); drawC.addEventListener('pointercancel', end)

  // Crop to the ink so the PNG has no empty margins, keeping a small transparent pad.
  function trimmed(c) {
    const { width: w, height: h } = c
    const data = c.getContext('2d').getImageData(0, 0, w, h).data
    let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    if (x1 < 0) return null
    const pad = Math.round(Math.min(w, h) * 0.06)
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad)
    const out = document.createElement('canvas')
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1
    out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
    return out
  }

  $('#sg-download').addEventListener('click', async () => {
    if (mode === 'type') {
      if (!nameIn.value.trim()) { nameIn.focus(); $('#sg-msg').textContent = 'Type your name first.'; return }
      await renderTyped()
    }
    const out = trimmed(mode === 'type' ? typed : drawC)
    if (!out) { $('#sg-msg').textContent = 'Draw your signature first.'; return }
    const a = document.createElement('a')
    a.download = 'signature.png'
    a.href = out.toDataURL('image/png')
    document.body.appendChild(a); a.click(); a.remove()
    $('#sg-msg').textContent = 'Downloaded signature.png (transparent background).'
    $('#sg-next').hidden = false
    window.edsTrack && window.edsTrack('signature_download', { mode })
  })

  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode
    document.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-selected', String(x === b)))
    $('#sg-type').hidden = mode !== 'type'; $('#sg-draw').hidden = mode !== 'draw'
    $('#sg-msg').textContent = ''
    mode === 'type' ? renderTyped() : redraw()
  }))
  const fontsBox = $('#sg-fonts')
  fontsBox.innerHTML = FONTS.map((f, i) => `<button type="button" class="sg-font" aria-pressed="${i === 0}" data-font="${f}" style="font-family:'${f}',cursive">${f}</button>`).join('')
  fontsBox.addEventListener('click', e => {
    const b = e.target.closest('[data-font]'); if (!b) return
    font = b.dataset.font
    fontsBox.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    renderTyped()
  })
  document.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => {
    color = b.dataset.color
    document.querySelectorAll('[data-color]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    for (const s of strokes) s.color = color
    mode === 'type' ? renderTyped() : redraw()
  }))
  nameIn.addEventListener('input', renderTyped)
  $('#sg-width').addEventListener('input', redraw)
  $('#sg-undo').addEventListener('click', () => { strokes.pop(); redraw() })
  $('#sg-clear').addEventListener('click', () => { strokes.length = 0; redraw() })
  window.addEventListener('resize', () => (mode === 'type' ? renderTyped() : redraw()))
  document.fonts && document.fonts.ready.then(renderTyped)
  renderTyped()
})()
