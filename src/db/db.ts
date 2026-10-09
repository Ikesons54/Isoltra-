import type { Hymnal, Pattern, PatternKind, SavedItem, SavedKind, Service, Song } from '../types'
import { KEYS } from '../engine'
import { BUILTIN_HYMNAL, HYMN_SEED_VERSION, PD_HYMNS } from '../data/publicDomainHymns'
import { PATTERN_SEED_VERSION, STARTER_PATTERNS } from '../data/starterPatterns'
import { SEED_SONGS } from './seed'

const DB_NAME = 'isoltra'
const SONGS = 'songs'
const SERVICES = 'services'
const HYMNALS = 'hymnals'
const PATTERNS = 'patterns'
const SAVED = 'saved'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 5)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(SERVICES)) db.createObjectStore(SERVICES, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(HYMNALS)) db.createObjectStore(HYMNALS, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(PATTERNS)) db.createObjectStore(PATTERNS, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(SAVED)) db.createObjectStore(SAVED, { keyPath: 'id' })
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


// ---------- Hymnals ----------

export async function listHymnals(): Promise<Hymnal[]> {
  const list = await run<Hymnal[]>(HYMNALS, 'readonly', s => s.getAll() as IDBRequest<Hymnal[]>)
  return list.sort((a, b) => Number(!!b.builtin) - Number(!!a.builtin) || a.name.localeCompare(b.name))
}

export async function getHymnal(id: string): Promise<Hymnal | undefined> {
  return run<Hymnal | undefined>(HYMNALS, 'readonly', s => s.get(id) as IDBRequest<Hymnal | undefined>)
}

export async function saveHymnal(h: Hymnal): Promise<void> {
  await run(HYMNALS, 'readwrite', s => s.put(h))
}

/** Deletes the hymnal and every hymn in it. */
export async function deleteHymnal(id: string): Promise<void> {
  const songs = await listSongs()
  for (const s of songs) if (s.hymnalId === id) await deleteSong(s.id)
  await run(HYMNALS, 'readwrite', s => s.delete(id))
}

export async function listHymns(hymnalId: string): Promise<Song[]> {
  const songs = await listSongs()
  return songs
    .filter(s => s.hymnalId === hymnalId)
    .sort((a, b) => (a.hymnNumber ?? 1e9) - (b.hymnNumber ?? 1e9) || a.title.localeCompare(b.title))
}

/** Installs the built-in public-domain hymnal (once per seed version). */
export async function seedHymnalsIfNeeded(): Promise<void> {
  let done = 0
  try {
    done = Number(localStorage.getItem('isoltra.hymnSeed') || '0')
  } catch {
    /* ignore */
  }
  if (done >= HYMN_SEED_VERSION) return
  const now = Date.now()
  await saveHymnal({ ...BUILTIN_HYMNAL, createdAt: now })
  for (const h of PD_HYMNS) await saveSong({ ...h, createdAt: now, updatedAt: now })
  try {
    localStorage.setItem('isoltra.hymnSeed', String(HYMN_SEED_VERSION))
  } catch {
    /* ignore */
  }
}


// ---------- Chants and pads ----------

export async function listPatterns(kind?: PatternKind): Promise<Pattern[]> {
  const all = await run<Pattern[]>(PATTERNS, 'readonly', s => s.getAll() as IDBRequest<Pattern[]>)
  return all.filter(p => !kind || p.kind === kind).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getPattern(id: string): Promise<Pattern | undefined> {
  return run<Pattern | undefined>(PATTERNS, 'readonly', s => s.get(id) as IDBRequest<Pattern | undefined>)
}

export async function savePattern(p: Pattern): Promise<void> {
  await run(PATTERNS, 'readwrite', s => s.put(p))
}

export async function deletePattern(id: string): Promise<void> {
  await run(PATTERNS, 'readwrite', s => s.delete(id))
}

/** Installs the starter chants and pads (once per seed version). */
export async function seedPatternsIfNeeded(): Promise<void> {
  let done = 0
  try {
    done = Number(localStorage.getItem('isoltra.patternSeed') || '0')
  } catch {
    /* ignore */
  }
  if (done >= PATTERN_SEED_VERSION) return
  const now = Date.now()
  for (const p of STARTER_PATTERNS) {
    const existing = await getPattern(p.id)
    if (!existing) await savePattern({ ...p, createdAt: now })
  }
  try {
    localStorage.setItem('isoltra.patternSeed', String(PATTERN_SEED_VERSION))
  } catch {
    /* ignore */
  }
}


// ---------- Saved (bookmarks) ----------

export async function listSaved(): Promise<SavedItem[]> {
  const all = await run<SavedItem[]>(SAVED, 'readonly', s => s.getAll() as IDBRequest<SavedItem[]>)
  return all.sort((a, b) => b.savedAt - a.savedAt)
}

export async function isSaved(kind: SavedKind, refId: string): Promise<boolean> {
  const hit = await run<SavedItem | undefined>(SAVED, 'readonly', s => s.get(`${kind}:${refId}`) as IDBRequest<SavedItem | undefined>)
  return !!hit
}

/** Returns true if the item is saved after the call. */
export async function toggleSaved(kind: SavedKind, refId: string): Promise<boolean> {
  const id = `${kind}:${refId}`
  if (await isSaved(kind, refId)) {
    await run(SAVED, 'readwrite', s => s.delete(id))
    return false
  }
  await run(SAVED, 'readwrite', s => s.put({ id, kind, refId, savedAt: Date.now() }))
  return true
}

// ---------- Backup ----------

export async function exportBackup(): Promise<string> {
  const [songs, services, hymnals, patterns, saved] = await Promise.all([listSongs(), listServices(), listHymnals(), listPatterns(), listSaved()])
  return JSON.stringify(
    { app: 'isoltra', version: 5, exportedAt: new Date().toISOString(), songs, services, hymnals: hymnals.filter(h => !h.builtin), patterns, saved },
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

function isHymnal(x: any): x is Hymnal {
  return x && typeof x.id === 'string' && typeof x.name === 'string'
}

function isPattern(x: any): x is Pattern {
  return (
    x &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.numbers === 'string' &&
    (x.kind === 'chant' || x.kind === 'pad') &&
    (KEYS as readonly string[]).includes(x.key)
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
export async function importBackup(text: string): Promise<{ songs: number; services: number; hymnals: number; patterns: number }> {
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
  let hymnals = 0
  let patterns = 0
  if (Array.isArray(data.saved)) {
    for (const x of data.saved) {
      if (x && typeof x.id === 'string' && typeof x.refId === 'string' && (x.kind === 'song' || x.kind === 'pattern')) {
        await run(SAVED, 'readwrite', st => st.put(x))
      }
    }
  }
  if (Array.isArray(data.patterns)) {
    for (const p of data.patterns) {
      if (isPattern(p)) {
        await savePattern({ ...p, moods: Array.isArray(p.moods) ? p.moods : [], difficulty: p.difficulty ?? 'Beginner', description: p.description ?? '', createdAt: p.createdAt ?? Date.now() })
        patterns++
      }
    }
  }
  if (Array.isArray(data.hymnals)) {
    for (const h of data.hymnals) {
      if (isHymnal(h) && !h.builtin) {
        await saveHymnal({ ...h, church: h.church ?? '', language: h.language ?? '', edition: h.edition ?? '', notes: h.notes ?? '', createdAt: h.createdAt ?? Date.now() })
        hymnals++
      }
    }
  }
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
  return { songs, services, hymnals, patterns }
}
