import type { Song } from '../types'

const now = Date.now()

// Starter content for testing: public-domain hymns and generic patterns only.
export const SEED_SONGS: Song[] = [
  {
    id: 'seed-amazing-grace',
    title: 'Amazing Grace (simplified sample)',
    artist: 'Public domain',
    key: 'G',
    sections: [{ id: 's1', name: 'Verse', numbers: '1 4 1 1 1 4 1 5 1' }],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-worship-1465',
    title: 'Sample worship pattern 1-4-6-5',
    artist: 'Sample',
    key: 'F',
    sections: [
      { id: 's1', name: 'Verse', numbers: '1 4 6 5' },
      { id: 's2', name: 'Chorus', numbers: '4 1 5 6' },
      { id: 's3', name: 'Vamp', numbers: '1 5 2 4 1' }
    ],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'seed-gospel-251',
    title: 'Sample gospel ending 4-2-5-1',
    artist: 'Sample',
    key: 'F',
    sections: [{ id: 's1', name: 'Ending', numbers: '4 ♭7 2 5 1' }],
    createdAt: now,
    updatedAt: now
  }
]
