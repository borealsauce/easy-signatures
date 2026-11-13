import express from 'express'
import multer from 'multer'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig, PACKS } from './config.js'
import { openDatabase } from './db.js'
import { createStorage } from './storage.js'
import { createEmail, createPayments, createSms, htmlEmail } from './providers.js'
import {
  bulkSend, checkPhone, commentAs, copyAsTemplate, createBlank, createLink, createUpload, instantiateTemplate,
  declineSign, deleteDocument, deviceFrom, fail, finishSign, grantCheckout, login,
  ownerFile, publicStart, remind, resendVerification, runMaintenance,
  saveDraft, saveSettings, saveSignFields, sendDocument, setLinkActive, signSession,
  signerFile, signup, startPhone, stateFor, userFromAuth, verificationRecord,
  verifyEmailToken
} from './service.js'
import { allow } from './ratelimit.js'
import { streamHelp } from './help.js'
import { existsSync } from 'node:fs'

function projectRoot() {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [join(here, '..'), process.cwd(), here]
  return candidates.find(dir => existsSync(join(dir, 'index.html'))) || candidates[0]
}
const root = projectRoot()

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

function pdf(res, file, download) {
  const name = String(file.name || 'document').replace(/[^\w.\-]+/g, '_').slice(0, 80)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${name}.pdf"`)
  res.send(Buffer.from(file.bytes))
}

export async function createApp(env = process.env) {
  const config = loadConfig(env)
  const db = await openDatabase(config)
  const storage = createStorage(config)
  const mailbox = []
  const email = createEmail(config, mailbox)
  const sms = createSms(config, mailbox)
  const payments = createPayments(config)
  const ctx = { config, db, storage, email, sms, payments, mailbox }
  const app = express()
  app.disable('x-powered-by')
  app.locals.ctx = ctx

  app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }), asyncRoute(async (req, res) => {
    if (config.stripeMode !== 'stripe') return res.status(404).json({ error: 'not_found', message: 'Stripe is not configured.' })
    const stripe = await payments.client()
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret)
    } catch {
      return res.status(400).json({ error: 'signature', message: 'Invalid Stripe signature.' })
    }
    const seen = await db.query(`insert into stripe_events (id) values ($1) on conflict do nothing returning id`, [event.id])
    if (!seen.rows[0]) return res.json({ received: true, duplicate: true })
    if (event.type === 'checkout.session.completed') {
      const full = await payments.retrieve(event.data.object.id)
      await grantCheckout(ctx, full)
    }
    res.json({ received: true })
  }))

  app.use(express.json({ limit: '8mb' }))
  app.use((req, res, next) => {
    req.device = deviceFrom(req, res, config)
    next()
  })

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

  async function auth(req, res, next) {
    try {
      const header = req.headers.authorization || ''
      const token = header.startsWith('Bearer ') ? header.slice(7) : ''
      const user = await userFromAuth(ctx, token)
      if (!user) return res.status(401).json({ error: 'auth', message: 'Log in again.' })
      req.user = user
      next()
    } catch (err) { next(err) }
  }

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, auth: config.authMode, email: config.emailMode, sms: config.smsMode, stripe: config.stripeMode, storage: storage.mode })
  })

  app.get('/api/config', (req, res) => {
    res.json({
      authMode: config.authMode,
      stripeMode: config.stripeMode,
      smsMode: config.smsMode,
      emailMode: config.emailMode,
      appUrl: config.appUrl,
      publishableKey: config.stripePublishableKey || '',
      helpChat: !!config.aiKey,
      prices: { doc1: 1, doc10: 5, doc50: 10, credits: { doc1: 1, doc10: 10, doc50: 50 } }
    })
  })

  app.get('/api/dev/mailbox', (req, res) => {
    if (!config.devMailbox) return res.status(404).json({ error: 'not_found' })
    res.json(mailbox)
  })

  app.post('/api/auth/signup', asyncRoute(async (req, res) => {
    const user = await signup(ctx, { name: req.body.name, email: req.body.email, password: req.body.password, ip: req.device.ip })
    res.status(201).json({ ok: true, email: user.email })
  }))

  app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const out = await login(ctx, req.body)
    res.json(out)
  }))

  app.post('/api/auth/resend', auth, asyncRoute(async (req, res) => {
    res.json(await resendVerification(ctx, req.user))
  }))

  app.get('/auth/verify', asyncRoute(async (req, res) => {
    const ok = await verifyEmailToken(ctx, req.query.token)
    res.redirect(ok ? '/?verified=1#/login' : '/?verified=0#/login')
  }))

  app.get('/auth/confirmed', (req, res) => {
    res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Email confirmed</title>
      <body style="font-family:Inter,system-ui,sans-serif;background:#f4f7fb;color:#14213d;display:grid;place-items:center;min-height:100vh">
      <div style="background:#fff;padding:28px;border-radius:16px;max-width:420px;text-align:center">
      <h1>Email confirmed</h1><p>You can log in and verify a phone number to unlock your free document.</p>
      <p><a href="/#/login">Continue to log in</a></p></div></body>`)
  })

  app.get('/api/me', auth, asyncRoute(async (req, res) => {
    const state = await stateFor(ctx, req.user, req.device)
    res.json({ me: state.me, usage: state.usage })
  }))

  app.get('/api/state', auth, asyncRoute(async (req, res) => {
    res.json(await stateFor(ctx, req.user, req.device))
  }))

  app.put('/api/settings', auth, asyncRoute(async (req, res) => {
    res.json(await saveSettings(ctx, req.user, req.body || {}))
  }))

  app.post('/api/phone/start', auth, asyncRoute(async (req, res) => {
    res.json(await startPhone(ctx, req.user, req.body.phone))
  }))

  app.post('/api/phone/check', auth, asyncRoute(async (req, res) => {
    res.json(await checkPhone(ctx, req.user, req.body.phone, req.body.code))
    req.user = (await userFromAuth(ctx, (req.headers.authorization || '').slice(7))) || req.user
  }))

  app.post('/api/documents/blank', auth, asyncRoute(async (req, res) => {
    res.status(201).json(await createBlank(ctx, req.user, req.body || {}))
  }))

  app.post('/api/documents/upload', auth, upload.single('file'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file', message: 'Choose a file.' })
    res.status(201).json(await createUpload(ctx, req.user, {
      bytes: req.file.buffer,
      filename: req.file.originalname,
      name: req.body.name,
      template: req.body.template === 'true' || req.body.template === true
    }))
  }))

  app.put('/api/documents/:id', auth, asyncRoute(async (req, res) => {
    res.json(await saveDraft(ctx, req.user, req.params.id, req.body || {}))
  }))

  app.post('/api/documents/from-template', auth, asyncRoute(async (req, res) => {
    res.status(201).json(await instantiateTemplate(ctx, req.user, req.body.templateId))
  }))

  app.post('/api/documents/:id/template', auth, asyncRoute(async (req, res) => {
    res.status(201).json(await copyAsTemplate(ctx, req.user, req.params.id, req.body.name))
  }))

  app.delete('/api/documents/:id', auth, asyncRoute(async (req, res) => {
    res.json(await deleteDocument(ctx, req.user, req.params.id))
  }))

  app.post('/api/documents/:id/send', auth, asyncRoute(async (req, res) => {
    const result = await sendDocument(ctx, req.user, req.params.id, req.device)
    if (!result.ok) return res.status(result.status || 400).json(result)
    res.json(result)
  }))

  app.post('/api/documents/:id/remind', auth, asyncRoute(async (req, res) => {
    res.json(await remind(ctx, req.user, req.params.id))
  }))

  app.post('/api/documents/:id/comment', auth, asyncRoute(async (req, res) => {
    await commentAs(ctx, { docId: req.params.id, who: req.user.full_name, text: req.body.text, ip: req.device.ip, ua: req.device.ua })
    res.json({ ok: true })
  }))

  app.get('/api/documents/:id/file', auth, asyncRoute(async (req, res) => {
    pdf(res, await ownerFile(ctx, req.user, req.params.id, false), false)
  }))

  app.get('/api/documents/:id/download', auth, asyncRoute(async (req, res) => {
    pdf(res, await ownerFile(ctx, req.user, req.params.id, true), true)
  }))

  app.post('/api/links', auth, asyncRoute(async (req, res) => {
    res.status(201).json(await createLink(ctx, req.user, req.body.templateId))
  }))

  app.patch('/api/links/:id', auth, asyncRoute(async (req, res) => {
    res.json(await setLinkActive(ctx, req.user, req.params.id, req.body.active))
  }))

  app.post('/api/links/:id/start', asyncRoute(async (req, res) => {
    res.json(await publicStart(ctx, req.params.id, req.body || {}, req.device))
  }))

  app.post('/api/bulk', auth, asyncRoute(async (req, res) => {
    const result = await bulkSend(ctx, req.user, req.body || {}, req.device)
    if (!result.ok) return res.status(result.status || 400).json(result)
    res.json(result)
  }))

  app.get('/api/sign/:token', asyncRoute(async (req, res) => {
    res.json(await signSession(ctx, req.params.token, req.device, { markView: true }))
  }))

  app.put('/api/sign/:token/fields', asyncRoute(async (req, res) => {
    res.json(await saveSignFields(ctx, req.params.token, req.body || {}, req.device))
  }))

  app.post('/api/sign/:token/finish', asyncRoute(async (req, res) => {
    res.json(await finishSign(ctx, req.params.token, req.body || {}, req.device))
  }))

  app.post('/api/sign/:token/decline', asyncRoute(async (req, res) => {
    res.json(await declineSign(ctx, req.params.token, req.body.reason, req.device))
  }))

  app.post('/api/sign/:token/comment', asyncRoute(async (req, res) => {
    const session = await signSession(ctx, req.params.token, req.device, { markView: false })
    if (!session.document) throw fail(409, 'status', 'This document is not open.')
    await commentAs(ctx, {
      docId: session.document.id,
      who: session.me?.name || 'Signer',
      text: req.body.text,
      signerId: session.me?.id,
      ip: req.device.ip,
      ua: req.device.ua
    })
    res.json({ ok: true })
  }))

  app.get('/api/sign/:token/file', asyncRoute(async (req, res) => {
    pdf(res, await signerFile(ctx, req.params.token, false), false)
  }))

  app.get('/api/sign/:token/download', asyncRoute(async (req, res) => {
    pdf(res, await signerFile(ctx, req.params.token, true), true)
  }))

  app.post('/api/billing/checkout', auth, asyncRoute(async (req, res) => {
    const kind = req.body.kind
    if (!PACKS[kind]) return res.status(400).json({ error: 'kind', message: 'Choose 1, 10, or 50 documents.' })
    if (req.body.documentId) {
      const owned = await db.query(`select id, status from documents where id=$1 and owner_id=$2`, [req.body.documentId, req.user.id])
      if (!owned.rows[0]) return res.status(404).json({ error: 'not_found', message: 'Document not found.' })
      if (owned.rows[0].status !== 'draft') return res.status(409).json({ error: 'status', message: 'That document has already been sent.' })
    }
    let customerId = req.user.stripe_customer_id
    if (payments.mode === 'stripe' && !customerId) {
      customerId = await payments.createCustomer({ email: req.user.email, name: req.user.full_name, userId: req.user.id })
      await db.query(`update profiles set stripe_customer_id=$2 where id=$1`, [req.user.id, customerId])
    }
    const session = await payments.checkout({
      userId: req.user.id,
      email: req.user.email,
      name: req.user.full_name,
      customerId,
      kind,
      documentId: req.body.documentId || ''
    })
    res.json({ url: session.url, id: session.id })
  }))

  app.post('/api/billing/confirm', auth, asyncRoute(async (req, res) => {
    const session = await payments.retrieve(req.body.sessionId)
    if (!session) return res.status(404).json({ error: 'not_found', message: 'Checkout session not found.' })
    if ((session.metadata || {}).userId !== req.user.id) return res.status(403).json({ error: 'auth', message: 'That payment belongs to another account.' })
    const result = await grantCheckout(ctx, session)
    if (!result.ok) return res.status(result.status || 400).json(result)
    res.json(result)
  }))

  app.post('/api/billing/dev/complete', asyncRoute(async (req, res) => {
    if (payments.mode !== 'dev') return res.status(404).json({ error: 'not_found' })
    const session = await payments.markPaid(req.body.sessionId, { cardFingerprint: req.body.cardFingerprint })
    if (!session) return res.status(404).json({ error: 'not_found', message: 'Checkout session not found.' })
    res.json(await grantCheckout(ctx, session))
  }))

  app.post('/api/billing/portal', auth, asyncRoute(async (req, res) => {
    if (payments.mode !== 'stripe' || !req.user.stripe_customer_id) {
      return res.status(400).json({ error: 'stripe', message: 'Receipts are available after your first purchase.' })
    }
    res.json({ url: await payments.portal({ customerId: req.user.stripe_customer_id }) })
  }))

  const cron = asyncRoute(async (req, res) => {
    const expected = config.cronSecret || (config.prod ? '' : 'dev-cron')
    if (!expected || req.headers.authorization !== `Bearer ${expected}`) {
      return res.status(401).json({ error: 'auth', message: 'Cron secret required.' })
    }
    res.json(await runMaintenance(ctx))
  })
  app.get('/api/cron/reminders', cron)
  app.post('/api/cron/reminders', cron)

  app.get('/verify/:id', asyncRoute(async (req, res) => {
    const rec = await verificationRecord(ctx, req.params.id)
    if (!rec) return res.status(404).type('html').send('<!doctype html><title>Not found</title><p>No completed document matches that id.</p>')
    const row = (label, value) => `<p><b>${label}</b><br><span style="font-family:ui-monospace,monospace;word-break:break-all">${value || '—'}</span></p>`
    res.type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Verify document</title>
      <body style="font-family:Inter,system-ui,sans-serif;background:#eef3f8;color:#14213d;margin:0">
      <main style="max-width:720px;margin:40px auto;background:#fff;padding:28px;border-radius:16px">
      <p style="letter-spacing:.08em;text-transform:uppercase;color:#0f766e;font-size:12px">Easy Digital Signatures</p>
      <h1>Document fingerprint</h1>
      <p>${escapeHtml(rec.name)}</p>
      <p>Completed ${escapeHtml(rec.completed || '')}. Compare these values with the certificate page. If someone edits the file, the complete-file SHA-256 will no longer match.</p>
      ${row('Original document SHA-256', rec.originalSha256)}
      ${row('Signed content SHA-256', rec.contentSha256)}
      ${row('Complete file SHA-256', rec.finalSha256)}
      </main></body>`)
  }))

  app.get('/dev/checkout', (req, res) => {
    if (payments.mode !== 'dev') return res.status(404).send('Not found')
    const id = String(req.query.session || '')
    res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Test checkout</title>
      <body style="font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh">
      <form id="f" style="background:#111827;padding:28px;border-radius:16px;max-width:420px">
        <p style="color:#5eead4;font-size:12px;letter-spacing:.08em">LOCAL TEST MODE</p>
        <h1>Simulate card payment</h1>
        <p>No charge is made. Apple Pay and Google Pay appear on the real Stripe Checkout page once test keys are configured.</p>
        <button style="background:#0f766e;color:#fff;border:0;border-radius:8px;padding:12px 16px;font-weight:700">Pay with test card</button>
      </form>
      <script>
        document.getElementById('f').onsubmit = async (e) => {
          e.preventDefault()
          const r = await fetch('/api/billing/dev/complete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId: ${JSON.stringify(id)} }) })
          if (!r.ok) return alert('Payment could not be completed')
          location.href = '/?checkout=success&session_id=' + encodeURIComponent(${JSON.stringify(id)}) + '#/app'
        }
      </script></body>`)
  })

  app.post('/api/contact', asyncRoute(async (req, res) => {
    if (req.body?.company_url) return res.json({ ok: true })
    const name = String(req.body?.name || '').trim().slice(0, 120)
    const email = String(req.body?.email || '').trim().toLowerCase()
    const message = String(req.body?.message || '').trim().slice(0, 5000)
    const documentId = String(req.body?.documentId || '').trim().slice(0, 80)
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 4) {
      return res.status(400).json({ error: 'invalid', message: 'Enter your name, email, and a message.' })
    }
    const ok = await allow(db, `contact:${req.device.ip || 'unknown'}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!ok) return res.status(429).json({ error: 'rate_limit', message: 'Too many messages from this network. Try again in an hour.' })
    const to = config.supportTo || 'support@localhost'
    const brand = { company: 'Easy Digital Signatures', color: '#0E6B62' }
    await ctx.email.send({
      to,
      replyTo: email,
      subject: `Help request from ${name}`,
      text: `${name} <${email}>\nDocument: ${documentId || '—'}\n\n${message}`,
      html: htmlEmail({
        title: 'New help request',
        intro: `<b>${escapeHtml(name)}</b> &lt;${escapeHtml(email)}&gt;<br>Document: ${escapeHtml(documentId || '—')}<br><br>${escapeHtml(message).replace(/\n/g, '<br>')}`,
        brand
      })
    })
    await ctx.email.send({
      to: email,
      subject: 'We received your message',
      text: `Hi ${name}, we received your note and will reply to this email address.`,
      html: htmlEmail({
        title: 'We received your message',
        intro: `Hi ${escapeHtml(name)}, thanks for writing. We’ll reply to ${escapeHtml(email)}.`,
        brand
      })
    })
    res.json({ ok: true })
  }))

  app.post('/api/help/chat', asyncRoute(async (req, res) => {
    if (!config.aiKey) return res.status(404).json({ error: 'disabled', message: 'Help chat is not configured.' })
    const ip = req.device.ip || 'unknown'
    if (!await allow(db, `chatm:${ip}`, { limit: 8, windowMs: 60 * 1000 })) {
      return res.status(429).json({ error: 'rate_limit', message: 'Too many questions. Use Contact support if you’re stuck.' })
    }
    if (!await allow(db, `chat:${ip}`, { limit: 30, windowMs: 60 * 60 * 1000 })) {
      return res.status(429).json({ error: 'rate_limit', message: 'Too many questions. Use Contact support if you’re stuck.' })
    }
    await streamHelp(ctx, req.body?.messages, res)
  }))

  app.get('/', (req, res) => res.sendFile(join(root, 'index.html')))
  for (const page of ['/contact', '/signup', '/login', '/pricing', '/app']) {
    app.get(page, (req, res) => res.sendFile(join(root, 'index.html')))
  }
  app.get('/app.js', (req, res) => res.sendFile(join(root, 'app.js')))
  app.get('/app.css', (req, res) => res.sendFile(join(root, 'app.css')))
  app.get('/home.css', (req, res) => res.sendFile(join(root, 'home.css')))
  app.get('/help.css', (req, res) => res.sendFile(join(root, 'help.css')))
  app.get('/help.js', (req, res) => res.sendFile(join(root, 'help.js')))
  app.get('/marketing.js', (req, res) => res.sendFile(join(root, 'marketing.js')))
  app.use('/shared', express.static(join(root, 'shared')))
  app.get('/layouts', (req, res) => res.sendFile(join(root, 'layouts', 'index.html')))
  app.get('/layouts/:id', (req, res, next) => {
    if (!['a', 'b', 'c'].includes(req.params.id)) return next()
    res.sendFile(join(root, 'layouts', req.params.id + '.html'))
  })
  app.use('/layouts', express.static(join(root, 'layouts')))

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err)
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'too_large', message: 'Files must be 10 MB or smaller.' })
    const status = err.status || 500
    if (status >= 500) console.error(err)
    res.status(status).json({
      error: err.code || 'server',
      message: err.publicMessage || (status >= 500 ? 'Something went wrong.' : err.message)
    })
  })

  return {
    app,
    config,
    mailbox,
    async close() { await db.close() }
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}
