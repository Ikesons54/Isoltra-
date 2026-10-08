import type { Song } from '../types'
import { KEYS } from '../engine'
import { SEED_SONGS } from './seed'

const DB_NAME = 'isoltra'
const STORE = 'songs'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listSongs(): Promise<Song[]> {
  const songs = await run<Song[]>('readonly', s => s.getAll() as IDBRequest<Song[]>)
  return songs.sort((a, b) => a.title.localeCompare(b.title))
}

export async function getSong(id: string): Promise<Song | undefined> {
  return run<Song | undefined>('readonly', s => s.get(id) as IDBRequest<Song | undefined>)
}

export async function saveSong(song: Song): Promise<void> {
  await run('readwrite', s => s.put(song))
}

export async function deleteSong(id: string): Promise<void> {
  await run('readwrite', s => s.delete(id))
}

/** Add starter songs once, on the very first launch only (deleted seeds stay deleted). */
export async function seedIfFirstRun(): Promise<void> {
  let seeded = false
  try {
    seeded = localStorage.getItem('isoltra.seeded') === '1'
  } catch {
    /* ignore */
  }
  if (seeded) return
  const count = await run<number>('readonly', s => s.count())
  if (count === 0) {
    for (const song of SEED_SONGS) await saveSong(song)
  }
  try {
    localStorage.setItem('isoltra.seeded', '1')
  } catch {
    /* ignore */
  }
}

// ---------- Backup ----------

export async function exportBackup(): Promise<string> {
  const songs = await listSongs()
  return JSON.stringify({ app: 'isoltra', version: 1, exportedAt: new Date().toISOString(), songs }, null, 2)
}

function isSong(x: any): x is Song {
  return (
    x &&
    typeof x.id === 'string' &&
    typeof x.title === 'string' &&
    (KEYS as readonly string[]).includes(x.key) &&
    Array.isArray(x.sections) &&
    x.sections.every((s: any) => s && typeof s.name === 'string' && typeof s.numbers === 'string')
  )
}

/** Returns how many songs were imported. Throws if the text is not an Isoltra backup. */
export async function importBackup(text: string): Promise<number> {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That is not valid backup text.')
  }
  if (!data || data.app !== 'isoltra' || !Array.isArray(data.songs)) {
    throw new Error('That does not look like an Isoltra backup.')
  }
  let n = 0
  for (const s of data.songs) {
    if (isSong(s)) {
      await saveSong({ ...s, artist: s.artist ?? '', updatedAt: Date.now() })
      n++
    }
  }
  return n
}
