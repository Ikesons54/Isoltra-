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
