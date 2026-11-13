import { num } from './db.js'

export async function allow(db, bucket, { limit, windowMs }) {
  const since = new Date(Date.now() - windowMs).toISOString()
  const count = await db.query(
    `select count(*)::int as n from rate_limits where bucket=$1 and created_at > $2`,
    [bucket, since]
  )
  if (num(count.rows[0].n) >= limit) return false
  await db.query(`insert into rate_limits (bucket) values ($1)`, [bucket])
  return true
}
