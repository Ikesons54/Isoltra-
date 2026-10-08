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
}

export interface ServiceItem {
  id: string
  /** Where it sits in the service: Opening, Praise, Worship, Prayer, Preaching, Altar, Closing... */
  slot: string
  title: string
  /** Linked library song (its progression is used) */
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
