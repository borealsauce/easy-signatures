// Confirmation links for branded emails. We generate a Supabase token with
// admin.generateLink, then wrap the hashed token in our own domain so the
// inbox never shows a raw *.supabase.co URL.

export const CONFIRM_TYPES = new Set(['signup', 'magiclink', 'email', 'invite'])

export function appConfirmUrl(appUrl, properties, type) {
  const tokenHash = String(properties?.hashed_token || '').trim()
  if (!tokenHash) throw new Error('missing confirm token')
  const rawType = String(type || properties?.verification_type || 'signup').trim().toLowerCase()
  const kind = CONFIRM_TYPES.has(rawType) ? rawType : 'signup'
  const base = String(appUrl || '').replace(/\/$/, '')
  return `${base}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(kind)}`
}

export async function confirmEmailLink(ctx, { tokenHash, type }) {
  const token = String(tokenHash || '').trim()
  const kind = String(type || 'signup').trim().toLowerCase()
  if (!token || !CONFIRM_TYPES.has(kind)) return { ok: false }
  if (ctx.config.authMode !== 'supabase') return { ok: false }
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(ctx.config.supabaseUrl, ctx.config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const { data, error } = await admin.auth.verifyOtp({ type: kind, token_hash: token })
  if (error || !data?.user) return { ok: false }
  const confirmedAt = data.user.email_confirmed_at || new Date().toISOString()
  await ctx.db.query(
    `update profiles set email_verified_at=coalesce(email_verified_at, $2) where id=$1`,
    [data.user.id, confirmedAt]
  )
  return { ok: true, email: data.user.email }
}
