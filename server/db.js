import { readFileSync } from 'node:fs'

const schemaSql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')

function statements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean)
}

export async function openDatabase(config) {
  if (config.databaseUrl) {
    const pg = (await import('pg')).default
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: 8
    })
    if (config.autoMigrate) {
      for (const statement of statements(schemaSql)) await pool.query(statement)
    }
    return {
      driver: 'postgres',
      async query(text, params) { return pool.query(text, params) },
      async tx(fn) {
        const client = await pool.connect()
        try {
          await client.query('begin')
          const out = await fn((text, params) => client.query(text, params))
          await client.query('commit')
          return out
        } catch (err) {
          try { await client.query('rollback') } catch { /* already aborted */ }
          throw err
        } finally {
          client.release()
        }
      },
      async close() { await pool.end() }
    }
  }

  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite()
  await db.exec(schemaSql)
  return {
    driver: 'pglite',
    async query(text, params) { return db.query(text, params) },
    async tx(fn) {
      return db.transaction(async tx => fn((text, params) => tx.query(text, params)))
    },
    async close() { await db.close() }
  }
}

export function num(v) {
  return typeof v === 'number' ? v : Number(v || 0)
}
