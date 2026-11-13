// Field rules shared by the browser and the PDF stamper.
const VALID = {
  email: /^[^@\s]+@[^@\s]+\.\w+$/,
  number: /^-?\d+(\.\d+)?$/,
  zip: /^\d{5}(-\d{4})?$/,
  phone: /^[\d\s()+-]{7,}$/
}

export function visible(fields, f) {
  if (!f.cond) return true
  const c = fields.find(x => x.id === f.cond)
  return !!(c && c.value === true)
}

export function calc(fields, f) {
  try {
    const expr = String(f.formula || '').replace(/\{([^}]+)\}/g, (_, label) => {
      const r = fields.find(x => x.label === label)
      return String(Number(r && r.value) || 0)
    })
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return 'ERR'
    const n = Function(`"use strict"; return (${expr})`)()
    if (typeof n !== 'number' || !Number.isFinite(n)) return 'ERR'
    return Math.round(n * 100) / 100
  } catch {
    return 'ERR'
  }
}

export function validate(f, v) {
  if (!v || !f.valid || f.valid === 'none') return true
  const re = VALID[f.valid]
  return re ? re.test(String(v)) : true
}

export const FIELD_TYPES = ['signature', 'initials', 'date', 'name', 'text', 'number', 'checkbox', 'dropdown', 'formula', 'payment', 'attachment']
export const ROLES = ['signer', 'approver', 'in-person', 'cc']
