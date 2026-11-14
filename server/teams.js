import { canonicalEmail, hashSecret, randomToken } from './crypto.js'
import { htmlEmail } from './providers.js'

function fail(status, error, message) {
  const err = new Error(message)
  err.status = status
  err.code = error
  err.publicMessage = message
  return err
}

function emailOk(v) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v || '')
}

function iso(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function missingRelation(err) {
  return err?.code === '42P01' || /does not exist|undefined table/i.test(String(err?.message || err))
}

export async function membershipFor(q, userId) {
  try {
    const row = await q(
      `select m.role, m.created_at, t.id, t.name, t.credits, t.created_by
       from team_members m join teams t on t.id = m.team_id
       where m.user_id=$1`,
      [userId]
    )
    const m = row.rows[0]
    if (!m) return null
    return { teamId: m.id, name: m.name, role: m.role, credits: Number(m.credits || 0), createdBy: m.created_by, joined: iso(m.created_at) }
  } catch (err) {
    if (missingRelation(err)) return null
    throw err
  }
}

export async function consumeTeamCredit(q, userId, teamId) {
  const member = await q(`select role from team_members where team_id=$1 and user_id=$2`, [teamId, userId])
  if (!member.rows[0]) return { ok: false, reason: 'not_member' }
  const updated = await q(`update teams set credits = credits - 1 where id=$1 and credits > 0 returning credits`, [teamId])
  if (!updated.rows[0]) return { ok: false, reason: 'team_credits' }
  return { ok: true, remaining: Number(updated.rows[0].credits) }
}

export async function canUseTemplate(q, userId, doc) {
  if (!doc) return false
  if (doc.owner_id === userId) return true
  if (doc.is_template && doc.team_id) {
    const m = await q(`select 1 from team_members where team_id=$1 and user_id=$2`, [doc.team_id, userId])
    return !!m.rows[0]
  }
  return false
}

export async function sharedTemplates(q, userId) {
  const membership = await membershipFor(q, userId)
  if (!membership) return []
  const rows = await q(
    `select * from documents where is_template and team_id=$1 and owner_id<>$2 order by created_at desc`,
    [membership.teamId, userId]
  )
  return rows.rows
}

async function requireMembership(q, userId) {
  const m = await membershipFor(q, userId)
  if (!m) throw fail(404, 'no_team', 'You are not on a team yet.')
  return m
}

function requireManager(m) {
  if (m.role !== 'owner' && m.role !== 'admin') throw fail(403, 'forbidden', 'Only a team owner or admin can do that.')
  return m
}

async function loadMembers(q, teamId) {
  const rows = await q(
    `select m.user_id, m.role, m.created_at, p.full_name, p.email
     from team_members m join profiles p on p.id = m.user_id
     where m.team_id=$1
     order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, p.full_name`,
    [teamId]
  )
  return rows.rows.map(r => ({
    id: r.user_id,
    name: r.full_name,
    email: r.email,
    role: r.role,
    joined: iso(r.created_at)
  }))
}

async function loadInvites(q, teamId) {
  const rows = await q(
    `select id, email, role, created_at, expires_at
     from team_invites
     where team_id=$1 and accepted_at is null and expires_at > now()
     order by created_at desc`,
    [teamId]
  )
  return rows.rows.map(r => ({ id: r.id, email: r.email, role: r.role, invited: iso(r.created_at), expires: iso(r.expires_at) }))
}

async function pendingForEmail(q, email) {
  const addr = canonicalEmail(email)
  const rows = await q(
    `select i.id, i.role, i.expires_at, t.id as team_id, t.name
     from team_invites i join teams t on t.id = i.team_id
     where i.email=$1 and i.accepted_at is null and i.expires_at > now()
     order by i.created_at desc`,
    [addr]
  )
  return rows.rows.map(r => ({ id: r.id, teamId: r.team_id, name: r.name, role: r.role, expires: iso(r.expires_at) }))
}

export async function teamState(ctx, user) {
  const q = ctx.db.query.bind(ctx.db)
  const membership = await membershipFor(q, user.id)
  const pendingInvites = await pendingForEmail(q, user.email)
  if (!membership) return { team: null, pendingInvites }
  const members = await loadMembers(q, membership.teamId)
  const invites = await loadInvites(q, membership.teamId)
  return {
    team: { id: membership.teamId, name: membership.name, role: membership.role, credits: membership.credits, members, invites },
    pendingInvites
  }
}

export async function createTeam(ctx, user, name) {
  const q = ctx.db.query.bind(ctx.db)
  const existing = await membershipFor(q, user.id)
  if (existing) throw fail(409, 'already_on_team', 'Leave your current team before creating a new one.')
  const title = String(name || '').trim().slice(0, 80)
  if (title.length < 2) throw fail(400, 'name', 'Enter a team name.')
  const id = crypto.randomUUID()
  await ctx.db.tx(async qx => {
    await qx(`insert into teams (id, name, created_by, credits) values ($1,$2,$3,0)`, [id, title, user.id])
    await qx(`insert into team_members (team_id, user_id, role) values ($1,$2,'owner')`, [id, user.id])
  })
  return teamState(ctx, user)
}

export async function renameTeam(ctx, user, name) {
  const m = requireManager(await requireMembership(ctx.db.query.bind(ctx.db), user.id))
  const title = String(name || '').trim().slice(0, 80)
  if (title.length < 2) throw fail(400, 'name', 'Enter a team name.')
  await ctx.db.query(`update teams set name=$2 where id=$1`, [m.teamId, title])
  return teamState(ctx, user)
}

export async function transferCredits(ctx, user, amount) {
  const n = Number(amount)
  if (!Number.isInteger(n) || n === 0) throw fail(400, 'amount', 'Enter a whole number of credits to move.')
  if (Math.abs(n) > 10000) throw fail(400, 'amount', 'Move at most 10,000 credits at a time.')
  const result = await ctx.db.tx(async q => {
    const m = await membershipFor(q, user.id)
    if (!m) throw fail(404, 'no_team', 'You are not on a team yet.')
    if (n < 0 && m.role !== 'owner' && m.role !== 'admin') throw fail(403, 'forbidden', 'Only a team owner or admin can move credits back to an account.')
    if (n > 0) {
      const ent = await q(`update entitlements set credits = credits - $2 where user_id=$1 and credits >= $2 returning credits`, [user.id, n])
      if (!ent.rows[0]) throw fail(400, 'credits', 'You do not have that many personal credits to move.')
      await q(`update teams set credits = credits + $2 where id=$1`, [m.teamId, n])
    } else {
      const moved = -n
      const team = await q(`update teams set credits = credits - $2 where id=$1 and credits >= $2 returning credits`, [m.teamId, moved])
      if (!team.rows[0]) throw fail(400, 'credits', 'The team does not have that many credits to move.')
      await q(`update entitlements set credits = credits + $2 where user_id=$1`, [user.id, moved])
    }
    return membershipFor(q, user.id)
  })
  return teamState(ctx, user)
}

export async function inviteToTeam(ctx, user, email, role = 'member') {
  const m = requireManager(await requireMembership(ctx.db.query.bind(ctx.db), user.id))
  const addr = canonicalEmail(String(email || '').trim())
  if (!emailOk(addr)) throw fail(400, 'email', 'Enter a valid email.')
  if (addr === canonicalEmail(user.email)) throw fail(400, 'email', 'You are already on this team.')
  const allowed = role === 'admin' ? 'admin' : 'member'
  const existing = await ctx.db.query(`select id from profiles where email=$1 or canonical_email=$1`, [addr])
  if (existing.rows[0]) {
    const already = await ctx.db.query(`select 1 from team_members where user_id=$1`, [existing.rows[0].id])
    if (already.rows[0]) throw fail(409, 'already_on_team', 'That person is already on a team.')
  }
  const dup = await ctx.db.query(
    `select 1 from team_invites where team_id=$1 and email=$2 and accepted_at is null and expires_at > now()`,
    [m.teamId, addr]
  )
  if (dup.rows[0]) throw fail(409, 'invited', 'An invite is already waiting for that email.')
  const token = randomToken(32)
  const id = crypto.randomUUID()
  await ctx.db.query(
    `insert into team_invites (id, team_id, email, role, token_hash, invited_by, expires_at)
     values ($1,$2,$3,$4,$5,$6, now() + interval '14 days')`,
    [id, m.teamId, addr, allowed, hashSecret(token, ctx.config.jwtSecret), user.id]
  )
  const href = `${ctx.config.appUrl}/#/team-invite/${token}`
  try {
    await ctx.email.send({
      to: addr,
      subject: `${user.full_name} invited you to the ${m.name} team`,
      text: `${user.full_name} invited you to share templates and credits on the ${m.name} team at Easy Digital Signatures. Accept: ${href}`,
      html: htmlEmail({
        title: `Join ${m.name}`,
        intro: `${escName(user.full_name)} invited you to the <b>${escName(m.name)}</b> team. You’ll be able to use shared templates and the team’s document credits.`,
        button: 'Accept invite',
        href,
        note: 'This invite expires in 14 days. If you don’t have an account yet, create one with this email, then open the link again.'
      })
    })
  } catch (err) {
    await ctx.logError?.('email.team_invite', String(err?.message || err))
  }
  const state = await teamState(ctx, user)
  return { ...state, invited: { id, email: addr, role: allowed } }
}

function escName(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

export async function revokeInvite(ctx, user, inviteId) {
  const m = requireManager(await requireMembership(ctx.db.query.bind(ctx.db), user.id))
  const row = await ctx.db.query(`delete from team_invites where id=$1 and team_id=$2 and accepted_at is null returning id`, [inviteId, m.teamId])
  if (!row.rows[0]) throw fail(404, 'not_found', 'That invite was not found.')
  return teamState(ctx, user)
}

export async function acceptInvite(ctx, user, token) {
  const hash = hashSecret(String(token || ''), ctx.config.jwtSecret)
  const result = await ctx.db.tx(async q => {
    const existing = await membershipFor(q, user.id)
    if (existing) throw fail(409, 'already_on_team', 'Leave your current team before accepting another invite.')
    const row = await q(
      `select i.*, t.name from team_invites i join teams t on t.id = i.team_id
       where i.token_hash=$1 and i.accepted_at is null`,
      [hash]
    )
    const invite = row.rows[0]
    if (!invite) throw fail(404, 'not_found', 'That invite is invalid or has already been used.')
    if (new Date(invite.expires_at).getTime() <= Date.now()) throw fail(410, 'expired', 'That invite has expired. Ask for a new one.')
    if (canonicalEmail(user.email) !== canonicalEmail(invite.email)) {
      throw fail(403, 'email', 'Sign in with the email this invite was sent to.')
    }
    await q(`insert into team_members (team_id, user_id, role) values ($1,$2,$3)`, [invite.team_id, user.id, invite.role])
    await q(`update team_invites set accepted_at=now() where id=$1`, [invite.id])
    return invite
  })
  return teamState(ctx, user)
}

export async function acceptPendingById(ctx, user, inviteId) {
  const pending = await pendingForEmail(ctx.db.query.bind(ctx.db), user.email)
  const hit = pending.find(p => p.id === inviteId)
  if (!hit) throw fail(404, 'not_found', 'That invite was not found.')
  const row = await ctx.db.query(`select token_hash from team_invites where id=$1`, [inviteId])
  // Accept without raw token: membership insert directly
  const result = await ctx.db.tx(async q => {
    const existing = await membershipFor(q, user.id)
    if (existing) throw fail(409, 'already_on_team', 'Leave your current team before accepting another invite.')
    const invite = (await q(`select * from team_invites where id=$1 and accepted_at is null and expires_at > now()`, [inviteId])).rows[0]
    if (!invite) throw fail(404, 'not_found', 'That invite is invalid or has already been used.')
    if (canonicalEmail(user.email) !== canonicalEmail(invite.email)) throw fail(403, 'email', 'Sign in with the email this invite was sent to.')
    await q(`insert into team_members (team_id, user_id, role) values ($1,$2,$3)`, [invite.team_id, user.id, invite.role])
    await q(`update team_invites set accepted_at=now() where id=$1`, [invite.id])
  })
  return teamState(ctx, user)
}

export async function removeMember(ctx, user, memberId) {
  const m = requireManager(await requireMembership(ctx.db.query.bind(ctx.db), user.id))
  if (memberId === user.id) throw fail(400, 'member', 'Use leave team to leave yourself.')
  const row = await ctx.db.query(`select role from team_members where team_id=$1 and user_id=$2`, [m.teamId, memberId])
  if (!row.rows[0]) throw fail(404, 'not_found', 'That person is not on this team.')
  if (row.rows[0].role === 'owner') throw fail(403, 'forbidden', 'The team owner cannot be removed.')
  if (row.rows[0].role === 'admin' && m.role !== 'owner') throw fail(403, 'forbidden', 'Only the owner can remove an admin.')
  await ctx.db.query(`delete from team_members where team_id=$1 and user_id=$2`, [m.teamId, memberId])
  return teamState(ctx, user)
}

export async function leaveTeam(ctx, user) {
  const m = await requireMembership(ctx.db.query.bind(ctx.db), user.id)
  if (m.role === 'owner') {
    const others = await ctx.db.query(`select user_id from team_members where team_id=$1 and user_id<>$2`, [m.teamId, user.id])
    if (others.rows[0]) throw fail(409, 'owner', 'Transfer ownership or remove the other members before leaving.')
    await ctx.db.query(`delete from teams where id=$1`, [m.teamId])
    return { team: null, pendingInvites: [] }
  }
  await ctx.db.query(`delete from team_members where team_id=$1 and user_id=$2`, [m.teamId, user.id])
  return { team: null, pendingInvites: await pendingForEmail(ctx.db.query.bind(ctx.db), user.email) }
}

export async function setTemplateShare(ctx, user, documentId, share) {
  const m = share ? await requireMembership(ctx.db.query.bind(ctx.db), user.id) : await membershipFor(ctx.db.query.bind(ctx.db), user.id)
  const doc = (await ctx.db.query(`select * from documents where id=$1 and owner_id=$2`, [documentId, user.id])).rows[0]
  if (!doc) throw fail(404, 'not_found', 'Document not found.')
  if (!doc.is_template) throw fail(400, 'template', 'Only templates can be shared with your team.')
  if (share) {
    if (!m) throw fail(400, 'no_team', 'Create or join a team first.')
    await ctx.db.query(`update documents set team_id=$2 where id=$1`, [documentId, m.teamId])
    return { ok: true, teamId: m.teamId, shared: true }
  }
  await ctx.db.query(`update documents set team_id=null where id=$1`, [documentId])
  return { ok: true, teamId: null, shared: false }
}
