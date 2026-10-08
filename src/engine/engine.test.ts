import { describe, it, expect } from 'vitest'
import { buildEvent, buildProgression, chordToLabel, transposeChord } from './theory.ts'

const chords = (key: any, text: string) => buildProgression(key, text).map(e => e.chord)
const solfa = (key: any, text: string) => buildProgression(key, text).map(e => e.solfa)

describe('single events', () => {
  it('key F, degree 4', () => {
    const e = buildEvent('F', '4')
    expect(e.chord).toBe('Bb')
    expect(e.solfa).toBe('Fa')
    expect(e.notes).toEqual(['Bb', 'D', 'F'])
  })
  it('key G, degree 4', () => {
    const e = buildEvent('G', '4')
    expect(e.chord).toBe('C')
    expect(e.solfa).toBe('Fa')
    expect(e.notes).toEqual(['C', 'E', 'G'])
  })
  it('diatonic 7 is diminished', () => {
    const e = buildEvent('F', '7')
    expect(e.chord).toBe('Edim')
    expect(e.notes).toEqual(['E', 'G', 'Bb'])
  })
  it('chromatic degrees', () => {
    expect(buildEvent('F', '♭7').chord).toBe('Eb')
    expect(buildEvent('F', '♭7').solfa).toBe('Te')
    expect(buildEvent('F', 'b6').chord).toBe('Db')
    expect(buildEvent('F', 'b6').solfa).toBe('Le')
  })
  it('explicit quality override', () => {
    expect(buildEvent('F', '6M').chord).toBe('D')
    expect(buildEvent('F', '2m7').chord).toBe('Gm7')
    expect(buildEvent('F', '5sus4').chord).toBe('Csus4')
  })
  it('rejects bad input', () => {
    expect(() => buildEvent('F', '9')).toThrow()
    expect(() => buildEvent('F', '4xyz')).toThrow()
  })
})

describe('progressions', () => {
  it('1-4-6-5 in F', () => {
    expect(chords('F', '1 4 6 5')).toEqual(['F', 'Bb', 'Dm', 'C'])
    expect(solfa('F', '1 4 6 5')).toEqual(['Doh', 'Fa', 'La', 'Sol'])
  })
  it('1-5-2-4-1 in F', () => {
    expect(chords('F', '1-5-2-4-1')).toEqual(['F', 'C', 'Gm', 'Bb', 'F'])
  })
  it('sharp keys use sharps', () => {
    expect(chords('D', '1 4 5')).toEqual(['D', 'G', 'A'])
    expect(chords('B', '1 4 5 6')).toEqual(['B', 'E', 'F#', 'G#m'])
  })
  it('transposing keeps the numbers', () => {
    const inF = buildProgression('F', '1 4 6 5').map(e => e.label)
    const inEb = buildProgression('Eb', '1 4 6 5')
    expect(inEb.map(e => e.label)).toEqual(inF)
    expect(inEb.map(e => e.chord)).toEqual(['Eb', 'Ab', 'Cm', 'Bb'])
  })
})

describe('chord names to numbers', () => {
  it('reads chord names in a key', () => {
    expect(chordToLabel('F', 'Bb')).toBe('4')
    expect(chordToLabel('F', 'Dm')).toBe('6')
    expect(chordToLabel('F', 'Eb')).toBe('♭7')
    expect(chordToLabel('F', 'D')).toBe('6M')
  })
  it('transposes chord names', () => {
    expect(transposeChord('Dm', 'F', 'Eb')).toBe('Cm')
    expect(transposeChord('Bb', 'F', 'G')).toBe('C')
  })
})
