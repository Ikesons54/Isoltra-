// Isoltra music engine: key + number system -> chords, notes, solfa.
// Pure TypeScript, no UI, so it can be tested and reused anywhere.

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const
export type KeyName = (typeof KEYS)[number]

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const FLAT_KEYS = new Set<string>(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'])

const mod12 = (n: number) => ((n % 12) + 12) % 12

export function keyIndex(key: KeyName): number {
  return FLAT_NAMES.indexOf(key)
}

/** Spell a pitch class using sharps or flats depending on the key (F uses Bb, not A#). */
export function noteName(pitchClass: number, key: KeyName): string {
  return (FLAT_KEYS.has(key) ? FLAT_NAMES : SHARP_NAMES)[mod12(pitchClass)]
}

// ---------- Degrees (the number system) ----------

export interface Degree {
  num: 1 | 2 | 3 | 4 | 5 | 6 | 7
  acc: -1 | 0 | 1 // flat, natural, sharp
}

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]

export function parseDegree(text: string): Degree {
  const m = /^([b♭#♯]?)([1-7])$/.exec(text.trim())
  if (!m) throw new Error(`Invalid degree: "${text}"`)
  const acc = m[1] === '' ? 0 : m[1] === 'b' || m[1] === '♭' ? -1 : 1
  return { num: Number(m[2]) as Degree['num'], acc }
}

export function degreeToString(d: Degree): string {
  return (d.acc < 0 ? '♭' : d.acc > 0 ? '♯' : '') + d.num
}

export function degreeSemitones(d: Degree): number {
  return mod12(MAJOR_STEPS[d.num - 1] + d.acc)
}

// Semitones above the key note -> degree (used when entering songs by chord names)
const SEMITONE_TO_DEGREE = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7']

// ---------- Chord types ----------

export type ChordType = 'major' | 'minor' | 'dim' | 'aug' | 'sus2' | 'sus4' | '7' | 'maj7' | 'm7'

export const CHORD_TYPES: Record<ChordType, { suffix: string; intervals: number[] }> = {
  major: { suffix: '', intervals: [0, 4, 7] },
  minor: { suffix: 'm', intervals: [0, 3, 7] },
  dim: { suffix: 'dim', intervals: [0, 3, 6] },
  aug: { suffix: 'aug', intervals: [0, 4, 8] },
  sus2: { suffix: 'sus2', intervals: [0, 2, 7] },
  sus4: { suffix: 'sus4', intervals: [0, 5, 7] },
  '7': { suffix: '7', intervals: [0, 4, 7, 10] },
  maj7: { suffix: 'maj7', intervals: [0, 4, 7, 11] },
  m7: { suffix: 'm7', intervals: [0, 3, 7, 10] }
}

// Natural chord quality of each scale degree in a major key (1 maj, 2 min, 3 min, 4 maj, 5 maj, 6 min, 7 dim)
const DIATONIC_TYPE: ChordType[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim']

// Typed after the number to override the default quality: "6" = Dm in F, "6M" = D major.
const TOKEN_SUFFIX: Record<string, ChordType> = {
  M: 'major',
  m: 'minor',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  '7': '7',
  maj7: 'maj7',
  m7: 'm7'
}

// Chord-name suffixes accepted when reading chord names such as "Dm" or "Bbmaj7"
const NAME_SUFFIX: Record<string, ChordType> = {
  '': 'major',
  m: 'minor',
  min: 'minor',
  '-': 'minor',
  dim: 'dim',
  aug: 'aug',
  sus2: 'sus2',
  sus4: 'sus4',
  '7': '7',
  maj7: 'maj7',
  M7: 'maj7',
  m7: 'm7'
}

export function defaultChordType(d: Degree): ChordType {
  return d.acc === 0 ? DIATONIC_TYPE[d.num - 1] : 'major'
}

// ---------- Solfa ----------

const SOLFA = ['Doh', 'Ray', 'Mi', 'Fa', 'Sol', 'La', 'Ti']
// Chromatic names (default convention; user choice can come later)
const SOLFA_FLAT: Record<number, string> = { 2: 'Ra', 3: 'Me', 5: 'Se', 6: 'Le', 7: 'Te' }
const SOLFA_SHARP: Record<number, string> = { 1: 'Di', 2: 'Ri', 4: 'Fi', 5: 'Si', 6: 'Li' }

export function solfaFor(d: Degree): string {
  const base = SOLFA[d.num - 1]
  if (d.acc === 0) return base
  if (d.acc < 0) return SOLFA_FLAT[d.num] ?? `${base}♭`
  return SOLFA_SHARP[d.num] ?? `${base}♯`
}

// ---------- Musical event ----------

export interface MusicalEvent {
  key: KeyName
  degree: Degree
  chordType: ChordType
  /** Key-independent label, e.g. "4", "♭7", "6M" */
  label: string
  root: string
  chord: string
  bass: string
  solfa: string
  notes: string[]
}

/** token examples: "4", "6", "♭7", "6M", "2m7", "5sus4" */
export function buildEvent(key: KeyName, token: string): MusicalEvent {
  const m = /^([b♭#♯]?[1-7])(.*)$/.exec(token.trim())
  if (!m) throw new Error(`Invalid chord token: "${token}"`)
  const degree = parseDegree(m[1])
  const suffixText = m[2]
  let chordType = defaultChordType(degree)
  if (suffixText !== '') {
    const t = TOKEN_SUFFIX[suffixText]
    if (!t) throw new Error(`Unknown chord suffix "${suffixText}" in "${token}"`)
    chordType = t
  }
  const rootPc = keyIndex(key) + degreeSemitones(degree)
  const root = noteName(rootPc, key)
  const def = CHORD_TYPES[chordType]
  const overridden = chordType !== defaultChordType(degree)
  return {
    key,
    degree,
    chordType,
    label: degreeToString(degree) + (overridden ? (chordType === 'major' ? 'M' : def.suffix) : ''),
    root,
    chord: root + def.suffix,
    bass: root,
    solfa: solfaFor(degree),
    notes: def.intervals.map(i => noteName(rootPc + i, key))
  }
}

export function buildProgression(key: KeyName, text: string): MusicalEvent[] {
  return text
    .split(/[\s,→>\-–—]+/)
    .filter(Boolean)
    .map(token => buildEvent(key, token))
}

// ---------- Chord names <-> numbers ----------

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Turn a chord name in a key into its number label, e.g. ("F","Bb") -> "4", ("F","Dm") -> "6". */
export function chordToLabel(key: KeyName, chordName: string): string {
  const m = /^([A-G])([b#]?)(.*)$/.exec(chordName.trim())
  if (!m) throw new Error(`Invalid chord name: "${chordName}"`)
  const type = NAME_SUFFIX[m[3]]
  if (!type) throw new Error(`Unknown chord type "${m[3]}" in "${chordName}"`)
  const rootPc = mod12(LETTER_PC[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0))
  const degree = parseDegree(SEMITONE_TO_DEGREE[mod12(rootPc - keyIndex(key))])
  const def = CHORD_TYPES[type]
  const overridden = type !== defaultChordType(degree)
  return degreeToString(degree) + (overridden ? (type === 'major' ? 'M' : def.suffix) : '')
}

/** Move a chord name from one key to another, keeping its number. */
export function transposeChord(chordName: string, fromKey: KeyName, toKey: KeyName): string {
  return buildEvent(toKey, chordToLabel(fromKey, chordName)).chord
}
