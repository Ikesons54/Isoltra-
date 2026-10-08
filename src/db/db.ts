import type { Service, Song } from '../types'
import { KEYS } from '../engine'
import { SEED_SONGS } from './seed'

const DB_NAME = 'isoltra'
const SONGS = 'songs'
const SERVICES = 'services'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(SERVICES)) db.createObjectStore(SERVICES, { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ---------- Songs ----------

export async function listSongs(): Promise<Song[]> {
  const songs = await run<Song[]>(SONGS, 'readonly', s => s.getAll() as IDBRequest<Song[]>)
  return songs.sort((a, b) => a.title.localeCompare(b.title))
}

export async function getSong(id: string): Promise<Song | undefined> {
  return run<Song | undefined>(SONGS, 'readonly', s => s.get(id) as IDBRequest<Song | undefined>)
}

export async function saveSong(song: Song): Promise<void> {
  await run(SONGS, 'readwrite', s => s.put(song))
}

export async function deleteSong(id: string): Promise<void> {
  await run(SONGS, 'readwrite', s => s.delete(id))
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
  const count = await run<number>(SONGS, 'readonly', s => s.count())
  if (count === 0) {
    for (const song of SEED_SONGS) await saveSong(song)
  }
  try {
    localStorage.setItem('isoltra.seeded', '1')
  } catch {
    /* ignore */
  }
}

// ---------- Services ----------

/** Newest date first */
export async function listServices(): Promise<Service[]> {
  const list = await run<Service[]>(SERVICES, 'readonly', s => s.getAll() as IDBRequest<Service[]>)
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)
}

export async function getService(id: string): Promise<Service | undefined> {
  return run<Service | undefined>(SERVICES, 'readonly', s => s.get(id) as IDBRequest<Service | undefined>)
}

export async function saveService(service: Service): Promise<void> {
  await run(SERVICES, 'readwrite', s => s.put({ ...service, updatedAt: Date.now() }))
}

export async function deleteService(id: string): Promise<void> {
  await run(SERVICES, 'readwrite', s => s.delete(id))
}

// ---------- Backup ----------

export async function exportBackup(): Promise<string> {
  const [songs, services] = await Promise.all([listSongs(), listServices()])
  return JSON.stringify(
    { app: 'isoltra', version: 2, exportedAt: new Date().toISOString(), songs, services },
    null,
    2
  )
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

function isService(x: any): x is Service {
  return (
    x &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.date === 'string' &&
    Array.isArray(x.items) &&
    x.items.every(
      (i: any) => i && typeof i.id === 'string' && typeof i.title === 'string' && (KEYS as readonly string[]).includes(i.key)
    )
  )
}

/** Throws if the text is not an Isoltra backup. Older backups (songs only) still work. */
export async function importBackup(text: string): Promise<{ songs: number; services: number }> {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That is not valid backup text.')
  }
  if (!data || data.app !== 'isoltra' || !Array.isArray(data.songs)) {
    throw new Error('That does not look like an Isoltra backup.')
  }
  let songs = 0
  let services = 0
  for (const s of data.songs) {
    if (isSong(s)) {
      await saveSong({ ...s, artist: s.artist ?? '', updatedAt: Date.now() })
      songs++
    }
  }
  if (Array.isArray(data.services)) {
    for (const sv of data.services) {
      if (isService(sv)) {
        await saveService({ ...sv, items: sv.items.map((i: any) => ({ ...i, slot: i.slot ?? '', notes: i.notes ?? '' })) })
        services++
      }
    }
  }
  return { songs, services }
}
