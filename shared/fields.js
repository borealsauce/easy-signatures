// Field rules shared by the browser and the PDF stamper.
export const ME_ID = 'me'
export const ME_COLOR = '#0f766e'
export const SENSITIVE_TYPES = ['ssn', 'rtn']

export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
]

const VALID = {
  email: /^[^@\s]+@[^@\s]+\.\w+$/,
  number: /^-?\d+(\.\d+)?$/,
  zip: /^\d{5}(-\d{4})?$/,
  phone: /^[\d\s()+.-]{7,}$/,
  currency: /^-?\$?\d{1,3}(,\d{3})*(\.\d{1,2})?$|^-?\$?\d+(\.\d{1,2})?$/
}

export const INPUT_TYPES = ['text', 'name', 'number', 'phone', 'email', 'state', 'zip', 'ssn', 'rtn', 'age', 'currency', 'date', 'datetime']

export function digits(v) {
  return String(v ?? '').replace(/\D/g, '')
}

export function abaValid(n) {
  const d = digits(n)
  if (!/^\d{9}$/.test(d)) return false
  const s = 3 * (+d[0] + +d[3] + +d[6]) + 7 * (+d[1] + +d[4] + +d[7]) + (+d[2] + +d[5] + +d[8])
  return s % 10 === 0
}

export function isSensitive(type) {
  return SENSITIVE_TYPES.includes(type)
}

export function looksMasked(type, v) {
  const s = String(v ?? '')
  if (!s) return false
  if (s.includes('•') || s.includes('*')) return true
  if (type === 'ssn') return /^\*+-\*+-\d{0,4}$/.test(s)
  if (type === 'rtn') return /^\*+\d{0,4}$/.test(s)
  return false
}

export function normalizeSensitive(type, v) {
  const d = digits(v)
  if (type === 'ssn') return d.length === 9 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : d
  if (type === 'rtn') return d.slice(0, 9)
  return String(v ?? '')
}

export function maskSensitive(type, v) {
  if (v == null || v === '') return ''
  const d = digits(v)
  if (type === 'ssn') return d.length >= 4 ? `***-**-${d.slice(-4)}` : '***-**-****'
  if (type === 'rtn') return d.length >= 4 ? `*****${d.slice(-4)}` : '*********'
  return '••••'
}

export function formatField(f, v) {
  if (v == null || v === '' || v === false) return ''
  if (v === true) return 'Yes'
  if (typeof v === 'string' && v.startsWith('data:')) return v
  if (f.type === 'ssn') return normalizeSensitive('ssn', v)
  if (f.type === 'rtn') return digits(v).slice(0, 9)
  if (f.type === 'currency') {
    const n = Number(String(v).replace(/[$,]/g, ''))
    if (!Number.isFinite(n)) return String(v)
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: f.currency || 'USD' }).format(n)
    } catch {
      return `$${n.toFixed(2)}`
    }
  }
  if (f.type === 'phone') {
    const d = digits(v)
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    if (d.length === 11 && d[0] === '1') return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
    return String(v)
  }
  if (f.type === 'zip') {
    const d = digits(v)
    return d.length === 9 ? `${d.slice(0, 5)}-${d.slice(5)}` : d || String(v)
  }
  return String(v)
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
      const raw = r && r.type === 'currency' ? String(r.value).replace(/[$,]/g, '') : r && r.value
      return String(Number(raw) || 0)
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
  if (v == null || v === '' || v === false) return true
  const type = f.type
  if (type === 'rtn' || f.valid === 'rtn') return abaValid(v)
  if (type === 'ssn' || f.valid === 'ssn') return /^\d{9}$/.test(digits(v))
  if (type === 'age') {
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 && n <= 150
  }
  if (type === 'state') {
    const s = String(v).trim().toUpperCase()
    return US_STATES.some(([c, n]) => c === s || n.toUpperCase() === s)
  }
  if (type === 'currency' || f.valid === 'currency') {
    const n = Number(String(v).replace(/[$,]/g, ''))
    return Number.isFinite(n)
  }
  if (type === 'email' || f.valid === 'email') return VALID.email.test(String(v).trim())
  if (type === 'phone' || f.valid === 'phone') return VALID.phone.test(String(v)) && digits(v).length >= 7
  if (type === 'zip' || f.valid === 'zip') return VALID.zip.test(String(v).trim())
  if (type === 'number' || f.valid === 'number') return VALID.number.test(String(v).trim())
  if (f.valid && f.valid !== 'none') {
    const re = VALID[f.valid]
    return re ? re.test(String(v)) : true
  }
  return true
}

export const FIELD_LIBRARY = [
  {
    section: 'General',
    items: [
      { type: 'signature', label: 'Signature', icon: '✍️', w: .26, h: .06, min: [120, 36] },
      { type: 'initials', label: 'Initials', icon: '🔤', w: .09, h: .05, min: [48, 28] },
      { type: 'text', label: 'Text', icon: 'T', w: .24, h: .035, min: [70, 22], placeholder: '' },
      { type: 'number', label: 'Number', icon: '#', w: .12, h: .035, min: [50, 22], valid: 'number', placeholder: '0' },
      { type: 'stamp', label: 'Stamp', icon: '🏷️', w: .2, h: .08, min: [80, 40] },
      { type: 'datetime', label: 'Date and Time', icon: '📅', w: .22, h: .035, min: [110, 22], format: 'datetime' },
      { type: 'date', label: 'Date', icon: '📆', w: .16, h: .035, min: [70, 22] },
      { type: 'radio', label: 'Radio buttons', icon: '🔘', w: .22, h: .09, min: [90, 40], options: ['Yes', 'No'] },
      { type: 'checkbox', label: 'Checkbox', icon: '☑️', w: .03, h: .023, min: [16, 16] },
      { type: 'attachment', label: 'Attachment', icon: '📎', w: .2, h: .04, min: [90, 26] },
      { type: 'formula', label: 'Formula', icon: 'ƒx', w: .14, h: .035, min: [60, 22] },
      { type: 'dropdown', label: 'Dropdown', icon: '🔽', w: .18, h: .035, min: [70, 22], options: ['Option A', 'Option B'] },
      { type: 'currency', label: 'Currency', icon: '$', w: .14, h: .035, min: [70, 22], currency: 'USD', placeholder: '$0.00' },
      { type: 'payment', label: 'Payment', icon: '💳', w: .2, h: .045, min: [100, 30], amount: 100 }
    ]
  },
  {
    section: 'Personal data',
    items: [
      { type: 'name', label: 'Full name', icon: '👤', w: .24, h: .035, min: [70, 22], placeholder: 'Full name' },
      { type: 'phone', label: 'Phone number', icon: '📞', w: .2, h: .035, min: [90, 22], placeholder: '(555) 555-0100' },
      { type: 'email', label: 'Email', icon: '✉️', w: .24, h: .035, min: [110, 22], placeholder: 'name@example.com' },
      { type: 'state', label: 'State', icon: '🗺️', w: .16, h: .035, min: [70, 22], placeholder: 'State' },
      { type: 'zip', label: 'ZIP', icon: '📍', w: .12, h: .035, min: [56, 22], placeholder: '12345' },
      { type: 'ssn', label: 'SSN', icon: '🔒', w: .16, h: .035, min: [80, 22], placeholder: 'XXX-XX-XXXX' },
      { type: 'rtn', label: 'RTN (Bank routing)', icon: '🏦', w: .2, h: .035, min: [100, 22], placeholder: '9-digit routing number' },
      { type: 'age', label: 'Age', icon: '🎂', w: .1, h: .035, min: [40, 22], placeholder: 'Age' }
    ]
  }
]

export const FIELD_TYPES = FIELD_LIBRARY.flatMap(s => s.items.map(i => i.type))

export function fieldMeta(type) {
  for (const sec of FIELD_LIBRARY) {
    const it = sec.items.find(i => i.type === type)
    if (it) return it
  }
  return { type, label: type, icon: '•', w: .2, h: .035, min: [70, 22] }
}

export const FT = Object.fromEntries(FIELD_TYPES.map(t => {
  const m = fieldMeta(t)
  return [t, [m.icon, m.label, m.w, m.h]]
}))

export const MIN = Object.fromEntries(FIELD_TYPES.map(t => [t, fieldMeta(t).min || [70, 22]]))

export const DEFAULT_FAVORITES = ['signature', 'initials']

export const FIELD_TYPES_LEGACY = ['signature', 'initials', 'date', 'name', 'text', 'number', 'checkbox', 'dropdown', 'formula', 'payment', 'attachment']

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
