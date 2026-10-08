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

export interface ServiceItem {
  id: string
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
