import { readFileSync } from 'node:fs'

const faq = readFileSync(new URL('../content/help-faq.md', import.meta.url), 'utf8')

const SYSTEM = `You are the help assistant for Easy Digital Signatures, a website that sends documents for electronic signature.

Answer only from the product facts below. Be brief and practical.

Rules:
- Do not give legal advice, and do not say whether a signature is enforceable.
- Do not claim you can see, open, or change anyone's documents, account, or payment history. You only know what the visitor just typed.
- If a question is legal, about a specific document you cannot see, or otherwise outside these facts, say you can't help with that and include the exact token [[contact]] so the page can open the support form.
- Do not invent prices, features, or steps that are not listed.

Product facts:
${faq}`

export async function streamHelp(ctx, rawMessages, res) {
  const messages = (Array.isArray(rawMessages) ? rawMessages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'invalid', message: 'Type a question first.' })
    return
  }
  const smsNote = ctx.config.smsMode === 'off'
    ? '\n\nPhone verification is not offered on this site. The free document unlocks after email confirmation. Do not tell anyone to verify a mobile number.'
    : ''
  const upstream = await fetch(`${ctx.config.aiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.config.aiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ctx.config.aiModel,
      stream: true,
      temperature: 0.2,
      messages: [{ role: 'system', content: SYSTEM + smsNote }, ...messages]
    })
  })
  if (!upstream.ok || !upstream.body) {
    res.status(502).json({ error: 'upstream', message: 'Help chat is unavailable. Use Contact support.' })
    return
  }
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.flushHeaders?.()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') {
        res.write('data: {"done":true}\n\n')
        continue
      }
      try {
        const json = JSON.parse(data)
        const text = json.choices?.[0]?.delta?.content || ''
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
      } catch { /* ignore keepalives */ }
    }
  }
  res.write('data: {"done":true}\n\n')
  res.end()
}
