export type RecentKind = 'song' | 'pattern' | 'service'
export interface Recent {
  kind: RecentKind
  id: string
}

const KEY = 'isoltra.recents'

export function getRecents(): Recent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.filter(r => r && typeof r.id === 'string') : []
  } catch {
    return []
  }
}

export function addRecent(kind: RecentKind, id: string): void {
  try {
    const rest = getRecents().filter(r => !(r.kind === kind && r.id === id))
    localStorage.setItem(KEY, JSON.stringify([{ kind, id }, ...rest].slice(0, 8)))
  } catch {
    /* storage unavailable */
  }
}
