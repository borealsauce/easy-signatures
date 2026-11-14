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
export const ROLE_LABELS = [
  { value: 'signer', label: 'Signer', hint: 'Signs the document.' },
  { value: 'approver', label: 'Approver', hint: 'Reviews and approves it before it goes to the next recipients. No signature fields needed. They can approve or decline with a reason.' },
  { value: 'in-person', label: 'In person', hint: 'Signs on this device after you send. Email is optional.' },
  { value: 'cc', label: 'CC', hint: 'Gets a copy only. They don’t sign or approve.' }
]
export const ROLE_OPTIONS = ROLE_LABELS.filter(r => r.value === 'signer' || r.value === 'approver')
export function roleLabel(role) {
  return ROLE_LABELS.find(r => r.value === role)?.label || 'Signer'
}
