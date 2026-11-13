export function mountHelp() {
  fetch('/api/config').then(r => r.json()).then(cfg => {
    if (!cfg.helpChat || document.querySelector('.help-launcher')) return
    const btn = document.createElement('button')
    btn.className = 'help-launcher'
    btn.type = 'button'
    btn.textContent = 'Help'
    const panel = document.createElement('div')
    panel.className = 'help-panel'
    panel.hidden = true
    panel.innerHTML = `<header><div><strong>Help</strong><span>Using the site, not legal advice</span></div><button type="button" aria-label="Close">×</button></header>
      <div class="help-log"></div>
      <form class="help-form"><input name="q" placeholder="How do I send a document?" autocomplete="off"><button type="submit">Send</button></form>
      <div class="help-foot"><span>Can’t see your documents.</span><a href="#/contact">Contact support</a></div>`
    document.body.append(btn, panel)
    const log = panel.querySelector('.help-log')
    const messages = []
    const add = (cls, text) => {
      const el = document.createElement('div')
      el.className = 'bubble ' + cls
      el.textContent = text
      log.append(el)
      log.scrollTop = log.scrollHeight
      return el
    }
    add('bot', 'Ask how to upload, place fields, send, track status, or download a signed PDF. I can’t give legal advice or look up an account.')
    btn.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) panel.querySelector('input').focus() }
    panel.querySelector('header button').onclick = () => { panel.hidden = true }
    panel.querySelector('form').onsubmit = async (e) => {
      e.preventDefault()
      const input = panel.querySelector('input')
      const text = input.value.trim()
      if (!text) return
      input.value = ''
      add('me', text)
      messages.push({ role: 'user', content: text })
      const bubble = add('bot', '')
      try {
        const res = await fetch('/api/help/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}))
          bubble.textContent = err.message || 'Help chat is unavailable.'
          return
        }
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let full = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const data = line.slice(5).trim()
            if (!data) continue
            try {
              const json = JSON.parse(data)
              if (json.text) { full += json.text; bubble.textContent = full.replace('[[contact]]', '').trim() }
            } catch { /* partial */ }
          }
        }
        const handoff = full.includes('[[contact]]')
        full = full.replace('[[contact]]', '').trim()
        bubble.textContent = full || 'I can’t help with that.'
        messages.push({ role: 'assistant', content: full })
        if (handoff || /contact support/i.test(full)) {
          const a = document.createElement('a')
          a.href = '/contact?message=' + encodeURIComponent(text)
          a.textContent = 'Contact support'
          a.style.display = 'inline-block'
          a.style.marginTop = '8px'
          bubble.append(document.createElement('br'), a)
        }
      } catch {
        bubble.textContent = 'Help chat is unavailable right now.'
      }
    }
  }).catch(() => {})
}
