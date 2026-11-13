import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'

function safeKey(key) {
  const clean = normalize(String(key || '')).replace(/^(\.\.(\/|\\|$))+/, '')
  if (!clean || clean.includes('..')) throw new Error('Bad storage key')
  return clean
}

function disk(root) {
  return {
    mode: 'disk',
    async put(key, bytes) {
      const path = join(root, safeKey(key))
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, Buffer.from(bytes))
    },
    async get(key) {
      return readFile(join(root, safeKey(key)))
    }
  }
}

function supabaseStorage(config) {
  let client
  async function sb() {
    if (!client) {
      const { createClient } = await import('@supabase/supabase-js')
      client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    }
    return client
  }
  return {
    mode: 'supabase',
    async put(key, bytes, contentType = 'application/pdf') {
      const supabase = await sb()
      const { error } = await supabase.storage.from('documents').upload(safeKey(key), Buffer.from(bytes), {
        contentType,
        upsert: true
      })
      if (error) throw new Error(error.message)
    },
    async get(key) {
      const supabase = await sb()
      const { data, error } = await supabase.storage.from('documents').download(safeKey(key))
      if (error) throw new Error(error.message)
      return Buffer.from(await data.arrayBuffer())
    }
  }
}

export function createStorage(config) {
  if (config.storageMode === 'supabase') return supabaseStorage(config)
  const root = config.dataDir || join(process.cwd(), 'data', 'blobs')
  return disk(root)
}
