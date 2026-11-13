const REQUIRED_IN_PRODUCTION = [
  'APP_URL',
  'DATABASE_URL',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_1DOC',
  'STRIPE_PRICE_10DOC',
  'STRIPE_PRICE_50DOC',
  'SUPPORT_TO_EMAIL',
  'CRON_SECRET'
]

export function loadConfig(env = process.env) {
  const prod = env.NODE_ENV === 'production'
  const config = {
    prod,
    port: Number(env.PORT || 3000),
    appUrl: (env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
    databaseUrl: env.DATABASE_URL || '',
    databaseSsl: env.DATABASE_SSL !== '0' && !!env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(env.DATABASE_URL || ''),
    autoMigrate: env.AUTO_MIGRATE !== '0',
    dataDir: env.DATA_DIR || '',
    jwtSecret: env.JWT_SECRET || (prod ? '' : 'dev-only-jwt-secret-not-for-production'),
    trustProxy: env.TRUST_PROXY === '1' || env.VERCEL === '1',
    devMailbox: !prod && env.DEV_MAILBOX !== '0',
    ipFreeLimit: Number(env.IP_FREE_LIMIT || 3),
    signupPerHour: Number(env.SIGNUP_PER_HOUR || 5),
    signupPerDay: Number(env.SIGNUP_PER_DAY || 20),
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    resendKey: env.RESEND_API_KEY || '',
    emailFrom: env.EMAIL_FROM || 'Easy Digital Signatures <signatures@localhost>',
    twilioSid: env.TWILIO_ACCOUNT_SID || '',
    twilioToken: env.TWILIO_AUTH_TOKEN || '',
    twilioVerifySid: env.TWILIO_VERIFY_SERVICE_SID || '',
    stripeKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
    prices: {
      doc1: env.STRIPE_PRICE_1DOC || '',
      doc10: env.STRIPE_PRICE_10DOC || '',
      doc50: env.STRIPE_PRICE_50DOC || ''
    },
    supportTo: env.SUPPORT_TO_EMAIL || '',
    aiKey: env.AI_API_KEY || '',
    aiBaseUrl: (env.AI_BASE_URL || 'https://api.x.ai/v1').replace(/\/$/, ''),
    aiModel: env.AI_MODEL || 'grok-3',
    cronSecret: env.CRON_SECRET || '',
    vercel: env.VERCEL === '1'
  }
  config.authMode = config.supabaseUrl && config.supabaseServiceKey ? 'supabase' : 'local'
  config.emailMode = config.resendKey ? 'resend' : 'dev'
  const twilioReady = !!(config.twilioSid && config.twilioToken && config.twilioVerifySid)
  const twilioParts = [config.twilioSid, config.twilioToken, config.twilioVerifySid].filter(Boolean).length
  if (prod && twilioParts > 0 && !twilioReady) {
    console.warn('Twilio SMS stays off until TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID are all set.')
  }
  // Production without Twilio does not fall back to the dev code logger.
  config.smsMode = twilioReady ? 'twilio' : (prod ? 'off' : 'dev')
  config.stripeMode = config.stripeKey ? 'stripe' : 'dev'
  config.storageMode = config.supabaseUrl && config.supabaseServiceKey ? 'supabase' : 'disk'

  if (prod) {
    const missing = REQUIRED_IN_PRODUCTION.filter(k => !env[k])
    if (missing.length) {
      const err = new Error('Missing production environment variables: ' + missing.join(', '))
      err.code = 'config'
      throw err
    }
  }
  return config
}

export const PACKS = {
  doc1: { credits: 1, cents: 100, label: '1 document' },
  doc10: { credits: 10, cents: 500, label: '10 documents' },
  doc50: { credits: 50, cents: 1000, label: '50 documents' }
}
