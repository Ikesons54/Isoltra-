import { buildEvent, chordToLabel } from './engine'
import type { KeyName } from './engine'

export function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * Turn what a musician typed into a key-independent progression.
 * Accepts numbers ("1 4 6 5", "1-5-2-4-1", "4 b7 2") and/or chord names ("F Bb Dm C").
 * Bar lines "|" are allowed. Throws an Error with a readable message if something is wrong.
 */
export function normalizeInput(text: string, key: KeyName): string {
  const tokens = text
    .replace(/\|/g, ' ')
    .split(/[\s,→>\-–—]+/)
    .filter(Boolean)
  return tokens
    .map(tok => (/^[A-G]/.test(tok) ? chordToLabel(key, tok) : buildEvent(key, tok).label))
    .join(' ')
}

export const SECTION_NAMES = ['Intro', 'Verse', 'Chorus', 'Pre-Chorus', 'Bridge', 'Vamp', 'Turnaround', 'Ending']

export type DisplayMode = 'chords' | 'numbers' | 'solfa' | 'notes' | 'combined'

export function getPref(name: string, fallback: string): string {
  try {
    return localStorage.getItem(`isoltra.${name}`) ?? fallback
  } catch {
    return fallback
  }
}

export function setPref(name: string, value: string): void {
  try {
    localStorage.setItem(`isoltra.${name}`, value)
  } catch {
    /* storage can be unavailable; ignore */
  }
}

/** "12. Amazing Grace" for hymns, plain title for songs */
export function songLabel(s: { title: string; hymnNumber?: number }): string {
  return s.hymnNumber !== undefined ? `${s.hymnNumber}. ${s.title}` : s.title
}
