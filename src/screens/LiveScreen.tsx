import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { buildProgression, KEYS } from '../engine'
import type { KeyName, MusicalEvent } from '../engine'
import { getSong, listSongs, seedIfFirstRun } from '../db/db'
import { getPref, setPref } from '../songs'
import type { DisplayMode } from '../songs'
import type { Song } from '../types'

export interface LiveTarget {
  id: string
  key: KeyName
}

interface Step {
  section: string
  sectionIndex: number
  pos: number
  total: number
  ev: MusicalEvent
}

type Size = 'S' | 'M' | 'L'

const MODES: { id: DisplayMode; label: string }[] = [
  { id: 'chords', label: 'Chords' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'solfa', label: 'Solfa' },
  { id: 'notes', label: 'Notes' },
  { id: 'combined', label: 'Combined' }
]

function buildSteps(song: Song, key: KeyName): Step[] {
  const steps: Step[] = []
  song.sections.forEach((section, sectionIndex) => {
    let events: MusicalEvent[] = []
    try {
      events = buildProgression(key, section.numbers)
    } catch {
      events = []
    }
    events.forEach((ev, i) => steps.push({ section: section.name, sectionIndex, pos: i + 1, total: events.length, ev }))
  })
  return steps
}

function mainText(ev: MusicalEvent, mode: DisplayMode): string {
  if (mode === 'numbers') return ev.label
  if (mode === 'solfa') return ev.solfa
  if (mode === 'notes') return ev.notes.join(' ')
  return ev.chord
}

interface Props {
  target: LiveTarget | null
  stage: boolean
  setStage: (on: boolean) => void
  onPick: (t: LiveTarget) => void
  onClear: () => void
}

export default function LiveScreen({ target, stage, setStage, onPick, onClear }: Props) {
  if (!target) return <Picker onPick={onPick} />
  return <Stage target={target} stage={stage} setStage={setStage} onClear={onClear} />
}

// ---------- Song picker ----------

function Picker({ onPick }: { onPick: (t: LiveTarget) => void }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedIfFirstRun()
      .then(listSongs)
      .then(s => {
        setSongs(s)
        setReady(true)
      })
  }, [])

  return (
    <div>
      <h1>Live</h1>
      <p className="muted">Choose a song to perform. You can also tap Play inside any song.</p>
      {ready && songs.length === 0 && <p className="muted">No songs yet. Add one in the Library tab.</p>}
      <ul className="list">
        {songs.map(s => (
          <li key={s.id}>
            <button className="list-item" onClick={() => onPick({ id: s.id, key: s.key })}>
              <span className="li-title">{s.title}</span>
              <span className="li-sub">Key {s.key}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Stage view ----------

function Stage({
  target,
  stage,
  setStage,
  onClear
}: {
  target: LiveTarget
  stage: boolean
  setStage: (on: boolean) => void
  onClear: () => void
}) {
  const [song, setSong] = useState<Song | null>(null)
  const [missing, setMissing] = useState(false)
  const [key, setKey] = useState<KeyName>(target.key)
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<DisplayMode>(getPref('liveMode', 'chords') as DisplayMode)
  const [size, setSize] = useState<Size>(getPref('liveSize', 'M') as Size)
  const [wake, setWake] = useState(getPref('liveWake', '1') === '1')
  const [panel, setPanel] = useState(false)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    setKey(target.key)
    setIndex(0)
    getSong(target.id).then(s => (s ? setSong(s) : setMissing(true)))
  }, [target.id, target.key])

  const steps = song ? buildSteps(song, key) : []
  const last = Math.max(steps.length - 1, 0)

  const next = () => setIndex(i => Math.min(i + 1, last))
  const prev = () => setIndex(i => Math.max(i - 1, 0))

  // keyboard: arrows / space (handy with a Bluetooth page-turn pedal or keyboard)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        prev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  // keep the screen awake while performing
  useEffect(() => {
    if (!wake) return
    let sentinel: any = null
    let cancelled = false
    const request = async () => {
      try {
        const s = await (navigator as any).wakeLock?.request('screen')
        if (cancelled) s?.release()
        else sentinel = s
      } catch {
        /* not supported or denied */
      }
    }
    request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      try {
        sentinel?.release()
      } catch {
        /* ignore */
      }
    }
  }, [wake])

  // leaving the Live tab always leaves stage mode
  useEffect(() => () => setStage(false), [])

  const enterStage = () => {
    setPanel(false)
    setStage(true)
    try {
      document.documentElement.requestFullscreen?.()
    } catch {
      /* iPhone does not support this; stage mode still hides the menus */
    }
  }
  const exitStage = () => {
    setStage(false)
    try {
      if (document.fullscreenElement) document.exitFullscreen()
    } catch {
      /* ignore */
    }
  }

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)()
  }

  if (missing) {
    return (
      <div>
        <button className="link" onClick={onClear}>← Songs</button>
        <p>This song could not be found.</p>
      </div>
    )
  }
  if (!song) return <p className="muted">Loading…</p>
  if (steps.length === 0) {
    return (
      <div>
        <button className="link" onClick={onClear}>← Songs</button>
        <p className="muted">This song has no progression to play yet.</p>
      </div>
    )
  }

  const cur = steps[Math.min(index, last)]
  const nxt = index < last ? steps[index + 1] : null
  const sectionChange = nxt && nxt.sectionIndex !== cur.sectionIndex
  const atEnd = index >= last

  const jump = (sectionIndex: number) => {
    const i = steps.findIndex(s => s.sectionIndex === sectionIndex)
    if (i >= 0) setIndex(i)
  }

  return (
    <div className={`live size-${size}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!stage && (
        <div className="row between">
          <button className="link" onClick={onClear}>← Songs</button>
          <div className="live-title">
            {song.title} <span className="muted">· {key}</span>
          </div>
          <button className="link" onClick={() => setPanel(p => !p)}>{panel ? 'Close' : 'Settings'}</button>
        </div>
      )}

      {stage && (
        <button className="stage-exit" onClick={exitStage}>Exit stage</button>
      )}

      {panel && !stage && (
        <div className="panel">
          <div className="row gap center wrap">
            <label className="key-label">
              Key
              <select
                value={key}
                onChange={e => {
                  setKey(e.target.value as KeyName)
                  setIndex(0)
                }}
              >
                {KEYS.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="chips">
            {MODES.map(m => (
              <button
                key={m.id}
                className={m.id === mode ? 'chip on' : 'chip'}
                onClick={() => {
                  setMode(m.id)
                  setPref('liveMode', m.id)
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="chips">
            {(['S', 'M', 'L'] as Size[]).map(s => (
              <button
                key={s}
                className={s === size ? 'chip on' : 'chip'}
                onClick={() => {
                  setSize(s)
                  setPref('liveSize', s)
                }}
              >
                Text {s}
              </button>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={wake}
              onChange={e => {
                setWake(e.target.checked)
                setPref('liveWake', e.target.checked ? '1' : '0')
              }}
            />
            Keep screen on
          </label>
          <button className="play on" onClick={enterStage}>Enter stage mode</button>
        </div>
      )}

      {!stage && (
        <div className="chips">
          {song.sections.map((s, i) => (
            <button key={s.id} className={i === cur.sectionIndex ? 'chip on' : 'chip'} onClick={() => jump(i)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="live-current">
        <div className="live-where">
          {cur.section} · {cur.pos}/{cur.total}
        </div>
        {mode === 'combined' ? (
          <>
            <div className="live-num">{cur.ev.label}</div>
            <div className="live-main">{cur.ev.chord}</div>
            <div className="live-sol">{cur.ev.solfa}</div>
            <div className="live-notes">{cur.ev.notes.join(' ')}</div>
          </>
        ) : (
          <div className={mode === 'notes' ? 'live-main notes' : 'live-main'}>{mainText(cur.ev, mode)}</div>
        )}
      </div>

      <div className="live-next">
        <span className="live-next-label">NEXT</span>
        {nxt ? (
          <>
            <span className="live-next-val">{mode === 'combined' ? `${nxt.ev.chord} · ${nxt.ev.label}` : mainText(nxt.ev, mode)}</span>
            {sectionChange && <span className="live-next-sec">{nxt.section}</span>}
          </>
        ) : (
          <span className="live-next-val">End of song</span>
        )}
      </div>

      <div className="live-controls">
        <button className="ctl" onClick={prev} disabled={index === 0}>◀ Prev</button>
        {atEnd ? (
          <button className="ctl go" onClick={() => setIndex(0)}>↺ Restart</button>
        ) : (
          <button className="ctl go" onClick={next}>Next ▶</button>
        )}
      </div>
      {!stage && <p className="muted hint center-text">Swipe left or right, or use arrow keys.</p>}
    </div>
  )
}
