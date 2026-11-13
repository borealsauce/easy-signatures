const REQUIRED_IN_PRODUCTION = [
  'APP_URL',
  'DATABASE_URL',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_VERIFY_SERVICE_SID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_SINGLE',
  'STRIPE_PRICE_PACK10',
  'STRIPE_PRICE_PACK25',
  'STRIPE_PRICE_MONTHLY',
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
      single: env.STRIPE_PRICE_SINGLE || '',
      pack10: env.STRIPE_PRICE_PACK10 || '',
      pack25: env.STRIPE_PRICE_PACK25 || '',
      sub: env.STRIPE_PRICE_MONTHLY || ''
    },
    cronSecret: env.CRON_SECRET || '',
    vercel: env.VERCEL === '1'
  }
  config.authMode = config.supabaseUrl && config.supabaseServiceKey ? 'supabase' : 'local'
  config.emailMode = config.resendKey ? 'resend' : 'dev'
  config.smsMode = config.twilioSid && config.twilioToken && config.twilioVerifySid ? 'twilio' : 'dev'
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
  single: { credits: 1, cents: 100, label: '1 document', mode: 'payment' },
  pack10: { credits: 10, cents: 1000, label: '10 documents', mode: 'payment' },
  pack25: { credits: 25, cents: 2500, label: '25 documents', mode: 'payment' },
  sub: { credits: 0, cents: 1000, label: '100 documents / month', mode: 'subscription' }
}
