import type { MusicalEvent, Voicing } from '../engine'
import type { DisplayMode } from '../songs'
import { useViewportWidth } from '../useViewportWidth'

interface Props {
  events: MusicalEvent[]
  mode: DisplayMode
  /** Left/right hand shapes, one per chord (rows are hidden when omitted) */
  voiced?: Voicing[]
  /** Short cue words, one per chord */
  cues?: string[]
}

/** Chords laid out left to right like a chart. Wraps into lines of 4 on a phone, more when turned sideways. */
export default function ChartStrip({ events, mode, voiced, cues }: Props) {
  const width = useViewportWidth()
  const perRow = Math.max(3, Math.min(8, Math.floor((width - 72) / 78)))
  const hasCues = !!cues && cues.some(c => c)

  const lines: number[][] = []
  for (let i = 0; i < events.length; i += perRow) {
    lines.push(Array.from({ length: perRow }, (_, k) => i + k))
  }

  const cols = `38px repeat(${perRow}, minmax(0, 1fr))`

  return (
    <div className="chart">
      {lines.map((line, li) => (
        <div className="chart-line" key={li} style={{ gridTemplateColumns: cols }}>
          {/* number row (always handy for the number-system musician) */}
          {mode !== 'numbers' && mode !== 'combined' && (
            <>
              <div className="lbl">No.</div>
              {line.map(i => (
                <div className="col c-num" key={i}>{events[i] ? events[i].label : ''}</div>
              ))}
            </>
          )}

          {mode === 'combined' && (
            <>
              <div className="lbl">No.</div>
              {line.map(i => (
                <div className="col c-num" key={i}>{events[i] ? events[i].label : ''}</div>
              ))}
            </>
          )}

          <div className="lbl">{mode === 'numbers' ? 'No.' : mode === 'solfa' ? 'Solfa' : mode === 'notes' ? 'Note' : 'Chord'}</div>
          {line.map(i => {
            const e = events[i]
            if (!e) return <div className="col" key={i} />
            const main = mode === 'numbers' ? e.label : mode === 'solfa' ? e.solfa : mode === 'notes' ? e.root : e.chord
            return <div className="col c-chord" key={i}>{main}</div>
          })}

          {(mode === 'chords' || mode === 'combined') && (
            <>
              <div className="lbl">Notes</div>
              {line.map(i => (
                <div className="col c-notes" key={i}>{events[i] ? events[i].notes.join(' ') : ''}</div>
              ))}
            </>
          )}

          {mode === 'combined' && (
            <>
              <div className="lbl">Solfa</div>
              {line.map(i => (
                <div className="col c-sol" key={i}>{events[i] ? events[i].solfa : ''}</div>
              ))}
            </>
          )}

          {voiced && (
            <>
              <div className="lbl">LH</div>
              {line.map(i => (
                <div className="col c-lh" key={i}>{voiced[i] ? voiced[i].lh : ''}</div>
              ))}
              <div className="lbl">RH</div>
              {line.map(i => (
                <div className="col c-rh" key={i}>{voiced[i] ? voiced[i].rh.join(' ') : ''}</div>
              ))}
            </>
          )}

          {hasCues && (
            <>
              <div className="lbl">Cue</div>
              {line.map(i => (
                <div className="col c-cue" key={i}>{cues && cues[i] ? cues[i] : ''}</div>
              ))}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
