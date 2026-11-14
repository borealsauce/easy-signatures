// Parse a pasted list or CSV into bulk-send recipients.
// Each copy of a template uses 1 credit.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function splitCsvLine(line, delim) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else quoted = false
      } else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) { out.push(cur.trim()); cur = '' }
    else cur += ch
  }
  out.push(cur.trim())
  return out
}

function detectDelim(line) {
  const counts = { ',': 0, ';': 0, '\t': 0 }
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') quoted = !quoted
    else if (!quoted && ch in counts) counts[ch]++
  }
  if (counts['\t']) return '\t'
  if (counts[';'] > counts[',']) return ';'
  return ','
}

function isHeader(cells) {
  const keys = cells.map(c => String(c || '').trim().toLowerCase().replace(/[_-]+/g, ' '))
  return keys.some(k => /^(full\s*)?name$/.test(k) || /^e-?mail( address)?$/.test(k))
}

function columnMap(headers) {
  const keys = headers.map(c => String(c || '').trim().toLowerCase().replace(/[_-]+/g, ' '))
  const name = keys.findIndex(k => /^(full\s*)?name$/.test(k) || k === 'signer' || k === 'recipient')
  const email = keys.findIndex(k => /^e-?mail( address)?$/.test(k))
  return {
    name: name >= 0 ? name : 0,
    email: email >= 0 ? email : (name === 0 ? 1 : 0)
  }
}

export function parseBulkRecipients(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/)
  const recipients = []
  const errors = []
  const seen = new Set()
  let started = false
  let delim = ','
  let map = { name: 0, email: 1 }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue
    if (!started) {
      delim = detectDelim(raw)
      const cells = splitCsvLine(raw, delim)
      if (isHeader(cells)) {
        map = columnMap(cells)
        started = true
        continue
      }
      started = true
    }
    const cells = splitCsvLine(raw, delim)
    let name = (cells[map.name] || '').trim()
    let email = (cells[map.email] || '').trim().toLowerCase()
    if (!email && cells.length === 1 && EMAIL_RE.test(name.toLowerCase())) {
      email = name.toLowerCase()
      name = email.split('@')[0]
    }
    if (!name && !email) continue
    if (!name) {
      errors.push({ line: i + 1, message: `Line ${i + 1} is missing a name.` })
      continue
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ line: i + 1, message: `Line ${i + 1} (${name}) needs a valid email.` })
      continue
    }
    const key = email
    if (seen.has(key)) {
      errors.push({ line: i + 1, message: `${email} is listed more than once.` })
      continue
    }
    seen.add(key)
    recipients.push({ name: name.slice(0, 120), email, line: i + 1 })
  }
  return { recipients, errors }
}

export function bulkCapacity(usage = {}) {
  if (usage.billTeam) {
    const team = Number(usage.teamCredits || 0)
    return { credits: 0, promo: 0, free: 0, team, total: team }
  }
  const credits = Number(usage.credits || 0)
  const promo = Number(usage.promoCredits || 0)
  const free = usage.freeAvailable ? 1 : 0
  return { credits, promo, free, team: 0, total: credits + promo + free }
}

export function allowanceLabel(usage) {
  if (usage.billTeam) {
    const n = Number(usage.teamCredits || 0)
    return n ? `${n} team credit${n === 1 ? '' : 's'}` : 'no team credits left'
  }
  const cap = bulkCapacity(usage)
  const parts = [
    cap.free ? '1 free document' : '',
    cap.promo ? `${cap.promo} promo document${cap.promo === 1 ? '' : 's'}` : '',
    cap.credits ? `${cap.credits} credit${cap.credits === 1 ? '' : 's'}` : ''
  ].filter(Boolean)
  if (!parts.length) return 'no documents left'
  return parts.join(', then ')
}

export function bulkCostSummary(count, usage) {
  const cap = bulkCapacity(usage)
  const copies = Math.max(0, Number(count || 0))
  const short = Math.max(0, copies - cap.total)
  return {
    copies,
    creditsEach: 1,
    creditsUsed: copies,
    available: cap.total,
    short,
    enough: short === 0,
    remaining: cap.total - copies
  }
}
