import type { KeyName } from './engine'

export interface SongSection {
  id: string
  name: string
  /** Key-independent progression, e.g. "1 4 6 5" */
  numbers: string
}

export interface Song {
  id: string
  title: string
  artist: string
  key: KeyName
  sections: SongSection[]
  createdAt: number
  updatedAt: number
  /** Set when this song is a hymn that belongs to a hymnal */
  hymnalId?: string
  hymnNumber?: number
  /** First line of the hymn, for recognition (not full lyrics) */
  firstLine?: string
  /** Optional tempo and time signature (used by Live auto-advance) */
  bpm?: number
  timeSig?: string
}

export interface Hymnal {
  id: string
  name: string
  church: string
  language: string
  edition: string
  /** Source / licence notes */
  notes: string
  builtin?: boolean
  createdAt: number
}

export type ItemType = 'Song' | 'Hymn' | 'Chant' | 'Prayer' | 'Preaching' | 'Pad' | 'Custom'

export interface ServiceItem {
  id: string
  /** What kind of item this is (older items may not have one) */
  type?: ItemType
  /** Where it sits in the service: Opening, Praise, Worship, Prayer, Preaching, Altar, Closing... */
  slot: string
  title: string
  /** Linked library song or hymn (its progression is used) */
  songId?: string
  key: KeyName
  /** Own progression (key-independent) for pads, chants or custom items without a song */
  numbers?: string
  notes: string
}

export interface Service {
  id: string
  name: string
  /** yyyy-mm-dd */
  date: string
  items: ServiceItem[]
  createdAt: number
  updatedAt: number
}

export type PatternKind = 'chant' | 'pad'
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

/** A reusable loop: a worship chant or an atmosphere pad. Stored as numbers, played in any key. */
export interface Pattern {
  id: string
  kind: PatternKind
  name: string
  /** Key-independent progression, e.g. "1 5 2 4 1" */
  numbers: string
  /** Suggested key to show first */
  key: KeyName
  moods: string[]
  bpm?: number
  timeSig?: string
  difficulty: Difficulty
  description: string
  builtin?: boolean
  createdAt: number
}

export type SavedKind = 'song' | 'pattern'

/** A bookmarked song, hymn, chant or pad */
export interface SavedItem {
  id: string
  kind: SavedKind
  refId: string
  savedAt: number
}
