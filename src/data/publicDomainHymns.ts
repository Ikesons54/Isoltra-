import type { KeyName } from '../engine'
import type { Hymnal, Song } from '../types'

export const BUILTIN_HYMNAL_ID = 'builtin-pd'
export const HYMN_SEED_VERSION = 1

export const BUILTIN_HYMNAL: Hymnal = {
  id: BUILTIN_HYMNAL_ID,
  name: 'Public Domain Hymns',
  church: 'Free / open',
  language: 'English',
  edition: 'Isoltra starter set',
  notes:
    'Hymn texts here are in the public domain. Numbering is Isoltra\'s own, not any church hymnal\'s. ' +
    'Chord progressions are simplified starter outlines: check and edit them to match your arrangement.',
  builtin: true,
  createdAt: 0
}

// [number, title, author (year), key, first line, progression]
const RAW: [number, string, string, KeyName, string, string][] = [
  [1, 'Abide with Me', 'Henry F. Lyte (1847)', 'F', 'Abide with me; fast falls the eventide', '1 4 1 5 1 6 4 5 1 4 1 5 1 5 1'],
  [2, "All Hail the Power of Jesus' Name", 'Edward Perronet (1779)', 'D', "All hail the power of Jesus' name", '1 1 4 1 5 5 1 1 4 1 6 5 5 1'],
  [3, 'Amazing Grace', 'John Newton (1779)', 'G', 'Amazing grace! how sweet the sound', '1 1 4 1 1 6 5 5 1 1 4 1 1 5 1 1'],
  [4, 'Blessed Assurance', 'Fanny J. Crosby (1873)', 'D', 'Blessed assurance, Jesus is mine', '1 1 4 1 1 5 5 1 1 4 1 1 5 1'],
  [5, 'Come, Thou Fount of Every Blessing', 'Robert Robinson (1758)', 'D', 'Come, thou Fount of every blessing', '1 1 5 1 4 1 5 5 1 1 5 1 4 5 1'],
  [6, 'Holy, Holy, Holy', 'Reginald Heber (1826)', 'D', 'Holy, holy, holy! Lord God Almighty', '1 4 1 5 1 4 1 5 1 4 1 5 1 4 5 1'],
  [7, 'It Is Well with My Soul', 'Horatio G. Spafford (1873)', 'Eb', 'When peace, like a river, attendeth my way', '1 1 4 1 5 5 1 1 1 4 1 5 1 1'],
  [8, 'Joy to the World', 'Isaac Watts (1719)', 'C', 'Joy to the world! the Lord is come', '1 5 1 4 1 5 1 1 1 5 1 4 1 5 1'],
  [9, 'Just As I Am', 'Charlotte Elliott (1835)', 'F', 'Just as I am, without one plea', '1 4 1 5 1 4 5 1 1 4 1 5 1 5 1'],
  [10, 'O for a Thousand Tongues to Sing', 'Charles Wesley (1739)', 'G', 'O for a thousand tongues to sing', '1 4 1 5 1 6 5 1 1 4 1 5 1 5 1'],
  [11, 'Rock of Ages', 'Augustus M. Toplady (1776)', 'F', 'Rock of Ages, cleft for me', '1 4 1 5 1 4 5 1 1 6 4 5 1 5 1'],
  [12, 'Silent Night', 'Joseph Mohr (1818)', 'C', 'Silent night, holy night', '1 1 5 1 1 5 1 4 4 1 1 5 1'],
  [13, 'What a Friend We Have in Jesus', 'Joseph M. Scriven (1855)', 'F', 'What a friend we have in Jesus', '1 1 4 1 5 5 1 1 1 4 1 5 1 1'],
  [14, 'When I Survey the Wondrous Cross', 'Isaac Watts (1707)', 'G', 'When I survey the wondrous cross', '1 4 1 5 6 4 5 1 4 1 5 1 5 1']
]

export const PD_HYMNS: Song[] = RAW.map(([n, title, author, key, firstLine, numbers]) => ({
  id: `pd-${n}`,
  title,
  artist: `${author} · public domain · simplified chords`,
  key,
  sections: [{ id: 'v', name: 'Verse', numbers }],
  createdAt: 0,
  updatedAt: 0,
  hymnalId: BUILTIN_HYMNAL_ID,
  hymnNumber: n,
  firstLine
}))
