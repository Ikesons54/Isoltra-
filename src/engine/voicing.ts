// Suggested hand voicings: left hand plays the root, right hand uses the closest inversion
// to the previous chord so the hand moves as little as possible.
import { CHORD_TYPES, degreeSemitones, keyIndex, noteName } from './theory.ts'
import type { KeyName, MusicalEvent } from './theory.ts'

export interface Voicing {
  lh: string
  rh: string[]
}

const LOW = 55 // G3
const HIGH = 79 // G5
const CENTER = 66 // around F#4

const mod12 = (n: number) => ((n % 12) + 12) % 12

/** Every close-position inversion of a chord, as ascending MIDI numbers inside the playing range. */
function inversions(pcs: number[]): number[][] {
  const out: number[][] = []
  const n = pcs.length
  for (let r = 0; r < n; r++) {
    const rotated = [...pcs.slice(r), ...pcs.slice(0, r)]
    for (let start = LOW; start < LOW + 12; start++) {
      if (mod12(start) !== rotated[0]) continue
      const notes = [start]
      for (let i = 1; i < n; i++) {
        let m = notes[i - 1] + 1
        while (mod12(m) !== rotated[i]) m++
        notes.push(m)
      }
      if (notes[n - 1] <= HIGH) out.push(notes)
      const up = notes.map(x => x + 12)
      if (up[n - 1] <= HIGH) out.push(up)
    }
  }
  return out
}

export function voiceProgression(events: MusicalEvent[], key: KeyName): Voicing[] {
  const result: Voicing[] = []
  let prev: number[] | null = null
  for (const ev of events) {
    const rootPc = mod12(keyIndex(key) + degreeSemitones(ev.degree))
    const pcs = CHORD_TYPES[ev.chordType].intervals.map(i => mod12(rootPc + i))
    let best: number[] = []
    let bestCost = Infinity
    for (const cand of inversions(pcs)) {
      let cost: number
      if (prev) {
        const len = Math.min(cand.length, prev.length)
        cost = 0
        for (let i = 0; i < len; i++) cost += Math.abs(cand[i] - prev[i])
        cost += Math.abs(cand.length - prev.length) * 2
      } else {
        const avg = cand.reduce((a, b) => a + b, 0) / cand.length
        cost = Math.abs(avg - CENTER)
      }
      cost += (cand[cand.length - 1] - cand[0]) * 0.01 // prefer compact shapes
      if (cost < bestCost) {
        bestCost = cost
        best = cand
      }
    }
    prev = best
    result.push({ lh: ev.root, rh: best.map(m => noteName(m, key)) })
  }
  return result
}
