import { hashSecret, randomToken } from './crypto.js'
import { PACKS } from './config.js'

// Email, SMS, and Stripe. Each has a dev driver so the product runs and the
// test suite completes with no third-party accounts. Production boot refuses
// to start on the dev drivers (see loadConfig).

export function createMailbox() {
  return []
}

function remember(config, mailbox, entry) {
  if (config.devMailbox) mailbox.push({ ...entry, at: new Date().toISOString() })
  if (!config.prod) {
    const extra = entry.url || entry.code || entry.text || ''
    console.log(`[eds ${entry.type}] to=${entry.to} ${entry.subject || ''} ${extra}`.trim())
  }
}

export function createEmail(config, mailbox) {
  return {
    mode: config.emailMode,
    async send({ to, subject, html, text, attachments, replyTo }) {
      if (!to) return
      remember(config, mailbox, { type: 'email', to, subject, replyTo: replyTo || '', text: text || html?.replace(/<[^>]+>/g, ' ').slice(0, 500), url: (html || '').match(/https?:\/\/[^\s"<]+/)?.[0] || '' })
      if (config.emailMode !== 'resend') return
      const body = {
        from: config.emailFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      }
      if (replyTo) body.reply_to = replyTo
      if (attachments?.length) body.attachments = attachments
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error('Email failed: ' + detail.slice(0, 300))
      }
    }
  }
}

const VOIP = new Set(['fixedvoip', 'nonfixedvoip', 'voip', 'voicemail', 'pager'])

export function isVoipLine(type) {
  return VOIP.has(String(type || '').toLowerCase())
}

export function createSms(config, mailbox) {
  const pepper = config.jwtSecret
  async function twilio(path, params) {
    const auth = Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString('base64')
    const res = await fetch('https://verify.twilio.com' + path, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(json.message || 'SMS provider error')
      err.status = res.status === 429 ? 429 : 400
      err.code = 'sms'
      throw err
    }
    return json
  }
  return {
    mode: config.smsMode,
    async lookup(phone) {
      if (config.smsMode !== 'twilio') {
        // Test hook: a number ending in 0000 is treated as a virtual line.
        return String(phone).endsWith('0000') ? 'nonFixedVoip' : 'mobile'
      }
      const auth = Buffer.from(`${config.twilioSid}:${config.twilioToken}`).toString('base64')
      const res = await fetch(`https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence`, {
        headers: { Authorization: `Basic ${auth}` }
      })
      if (!res.ok) return 'unknown'
      const json = await res.json()
      return json?.lineTypeIntelligence?.type || json?.line_type_intelligence?.type || 'unknown'
    },
    async start({ userId, phone, lineType, db }) {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      if (config.smsMode === 'twilio') {
        await twilio(`/v2/Services/${config.twilioVerifySid}/Verifications`, { To: phone, Channel: 'sms' })
        await db.query(
          `insert into phone_otps (user_id, phone_e164, line_type, expires_at) values ($1,$2,$3,$4)`,
          [userId, phone, lineType, expires]
        )
      } else {
        await db.query(
          `insert into phone_otps (user_id, phone_e164, code_hash, line_type, expires_at) values ($1,$2,$3,$4,$5)`,
          [userId, phone, hashSecret(code, pepper), lineType, expires]
        )
        remember(config, mailbox, { type: 'sms', to: phone, code, subject: 'Verification code' })
      }
    },
    async check({ userId, phone, code, db }) {
      const found = await db.query(
        `select * from phone_otps where user_id=$1 and phone_e164=$2 and expires_at > now() order by created_at desc limit 1`,
        [userId, phone]
      )
      const row = found.rows[0]
      if (!row) return { ok: false, message: 'That code is expired. Request a new one.' }
      if (row.attempts >= 5) return { ok: false, message: 'Too many attempts. Request a new code.' }
      await db.query(`update phone_otps set attempts = attempts + 1 where id=$1`, [row.id])
      if (config.smsMode === 'twilio') {
        const json = await twilio(`/v2/Services/${config.twilioVerifySid}/VerificationCheck`, { To: phone, Code: String(code || '') })
        if (json.status !== 'approved') return { ok: false, message: 'That code does not match.' }
        return { ok: true, lineType: row.line_type }
      }
      const good = row.code_hash === hashSecret(String(code || '').trim(), pepper)
      if (!good) return { ok: false, message: 'That code does not match.' }
      return { ok: true, lineType: row.line_type }
    }
  }
}

export function createPayments(config) {
  const sessions = new Map()
  if (config.stripeMode !== 'stripe') {
    return {
      mode: 'dev',
      async createCustomer() { return 'cus_dev_' + randomToken(6) },
      async checkout({ userId, email, kind, documentId }) {
        const pack = PACKS[kind]
        const id = 'cs_dev_' + randomToken(8)
        const session = {
          id,
          paid: false,
          mode: 'payment',
          amount_cents: pack.cents,
          customer_email: email,
          metadata: { userId, kind, documentId: documentId || '', credits: String(pack.credits) },
          card_fingerprint: null
        }
        sessions.set(id, session)
        return { id, url: `${config.appUrl}/dev/checkout?session=${id}` }
      },
      async markPaid(sessionId, { cardFingerprint } = {}) {
        const session = sessions.get(sessionId)
        if (!session) return null
        session.paid = true
        session.card_fingerprint = cardFingerprint || `fp_dev_${String(session.metadata.userId).slice(0, 8)}`
        return session
      },
      get(sessionId) { return sessions.get(sessionId) || null },
      async retrieve(sessionId) { return sessions.get(sessionId) || null }
    }
  }

  let stripe
  async function client() {
    if (!stripe) {
      const { default: Stripe } = await import('stripe')
      stripe = new Stripe(config.stripeKey)
    }
    return stripe
  }
  return {
    mode: 'stripe',
    client,
    async createCustomer({ email, name, userId }) {
      const s = await client()
      const customer = await s.customers.create({ email, name, metadata: { userId } })
      return customer.id
    },
    async checkout({ userId, email, name, customerId, kind, documentId }) {
      const s = await client()
      const pack = PACKS[kind]
      const price = config.prices[kind]
      if (!price) {
        const err = new Error('Stripe price is not configured for ' + kind)
        err.status = 500
        throw err
      }
      let customer = customerId
      if (!customer) customer = await this.createCustomer({ email, name, userId })
      // Apple Pay and Google Pay are wallets on the card method. Stripe Checkout
      // shows them when the Stripe account has both wallets enabled (the default
      // for new accounts) and the buyer's device supports them. Hosted Checkout
      // runs on Stripe's domain, which is already verified for Apple Pay.
      const session = await s.checkout.sessions.create({
        mode: 'payment',
        customer,
        client_reference_id: userId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${config.appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#/app`,
        cancel_url: `${config.appUrl}/?checkout=cancel#/`,
        metadata: { userId, kind, documentId: documentId || '', credits: String(pack.credits) },
        payment_method_types: ['card'],
        allow_promotion_codes: false
      })
      return { id: session.id, url: session.url, customerId: customer }
    },
    async retrieve(sessionId) {
      const s = await client()
      const session = await s.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.payment_method', 'subscription.default_payment_method']
      })
      const card = session.payment_intent?.payment_method?.card
        || session.subscription?.default_payment_method?.card
      return {
        id: session.id,
        paid: session.payment_status === 'paid' || session.status === 'complete',
        mode: session.mode,
        amount_cents: session.amount_total || 0,
        metadata: session.metadata || {},
        card_fingerprint: card?.fingerprint || null,
        subscription: session.subscription && typeof session.subscription === 'object' ? session.subscription : null,
        customer: session.customer
      }
    },
    async portal({ customerId }) {
      const s = await client()
      const portal = await s.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${config.appUrl}/#/pricing`
      })
      return portal.url
    }
  }
}

export function htmlEmail({ title, intro, button, href, note, brand }) {
  const color = brand?.color || '#0f766e'
  const company = brand?.company || 'Easy Digital Signatures'
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#14213d">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e3e6ee">
      <div style="background:${color};color:#fff;padding:18px 22px;font-weight:700">${escapeHtml(company)}</div>
      <div style="padding:22px">
        <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
        <p style="line-height:1.5;color:#334155">${intro}</p>
        ${href ? `<p><a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">${escapeHtml(button || 'Open')}</a></p>
        <p style="font-size:12px;color:#64748b;word-break:break-all">${href}</p>` : ''}
        ${note ? `<p style="font-size:13px;color:#64748b">${note}</p>` : ''}
      </div>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center">Sent by Easy Digital Signatures</p>
  </div></body></html>`
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
