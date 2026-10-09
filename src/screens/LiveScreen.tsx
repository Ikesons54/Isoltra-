import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { buildProgression, KEYS, voiceProgression } from '../engine'
import type { KeyName, MusicalEvent, Voicing } from '../engine'
import { getPattern, getService, getSong, listPatterns, listServices, listSongs, seedIfFirstRun, seedPatternsIfNeeded } from '../db/db'
import { getPref, setPref, songLabel } from '../songs'
import type { DisplayMode } from '../songs'
import type { Pattern, Service, Song } from '../types'

export type LiveTarget =
  | { kind: 'song'; id: string; key: KeyName }
  | { kind: 'pattern'; id: string; key: KeyName }
  | { kind: 'service'; id: string }

interface PlanItem {
  title: string
  chip: string
  key: KeyName
  bpm?: number
  timeSig?: string
  sections: { name: string; numbers: string; cues?: string[] }[]
}

interface Plan {
  title: string
  single: boolean
  /** Loops forever (chants and pads) */
  loop: boolean
  items: PlanItem[]
  skipped: number
}

interface Step {
  itemIndex: number
  itemTitle: string
  section: string
  group: number
  pos: number
  total: number
  cue?: string
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

const SIGNATURES: Record<string, number> = { '4/4': 4, '3/4': 3, '6/8': 2, '12/8': 4 }
const BARS = [
  { id: '0.5', label: 'Half a bar' },
  { id: '1', label: '1 bar' },
  { id: '2', label: '2 bars' }
]

async function loadPlan(target: LiveTarget): Promise<Plan | null> {
  if (target.kind === 'song') {
    const song = await getSong(target.id)
    if (!song) return null
    return {
      title: song.title,
      single: true,
      loop: false,
      skipped: 0,
      items: [{ title: song.title, chip: song.title, key: target.key, bpm: song.bpm, timeSig: song.timeSig, sections: song.sections }]
    }
  }
  if (target.kind === 'pattern') {
    const p = await getPattern(target.id)
    if (!p) return null
    return {
      title: p.name,
      single: true,
      loop: true,
      skipped: 0,
      items: [
        {
          title: p.name,
          chip: p.name,
          key: target.key,
          bpm: p.bpm,
          timeSig: p.timeSig,
          sections: [{ name: p.kind === 'pad' ? 'Pad' : 'Chant', numbers: p.numbers }]
        }
      ]
    }
  }
  const service = await getService(target.id)
  if (!service) return null
  const songs = await listSongs()
  const items: PlanItem[] = []
  let skipped = 0
  for (const it of service.items) {
    const song = it.songId ? songs.find(s => s.id === it.songId) : undefined
    let sections: { name: string; numbers: string; cues?: string[] }[] = []
    if (song) sections = song.sections
    else if (it.numbers) sections = [{ name: it.slot || 'Progression', numbers: it.numbers }]
    if (sections.length === 0) {
      skipped++
      continue
    }
    items.push({ title: it.title, chip: it.slot || it.title, key: it.key, bpm: song?.bpm, timeSig: song?.timeSig, sections })
  }
  return { title: service.name, single: false, loop: false, items, skipped }
}

function buildSteps(plan: Plan, keyOverride: KeyName): Step[] {
  const steps: Step[] = []
  plan.items.forEach((item, itemIndex) => {
    const key = plan.single ? keyOverride : item.key
    item.sections.forEach((section, sectionIndex) => {
      let events: MusicalEvent[] = []
      try {
        events = buildProgression(key, section.numbers)
      } catch {
        events = []
      }
      events.forEach((ev, i) =>
        steps.push({
          itemIndex,
          itemTitle: item.title,
          section: section.name,
          group: plan.single ? sectionIndex : itemIndex,
          pos: i + 1,
          cue: section.cues?.[i] || undefined,
          total: events.length,
          ev
        })
      )
    })
  })
  return steps
}

/** Left/right hand shapes for every step, voice-led within each item of the plan. */
function voiceSteps(steps: Step[], plan: Plan, keyOverride: KeyName): Voicing[] {
  const out: Voicing[] = new Array(steps.length)
  plan.items.forEach((item, itemIndex) => {
    const idx: number[] = []
    steps.forEach((st, i) => {
      if (st.itemIndex === itemIndex) idx.push(i)
    })
    const voiced = voiceProgression(idx.map(i => steps[i].ev), plan.single ? keyOverride : item.key)
    idx.forEach((i, j) => {
      out[i] = voiced[j]
    })
  })
  return out
}

/** Chords: the chord symbol. Notes: one single note (the root). */
function mainText(ev: MusicalEvent, mode: DisplayMode): string {
  if (mode === 'numbers') return ev.label
  if (mode === 'solfa') return ev.solfa
  if (mode === 'notes') return ev.root
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
  return (
    <Runner
      key={target.kind === 'service' ? `service:${target.id}` : `${target.kind}:${target.id}:${target.key}`}
      target={target}
      stage={stage}
      setStage={setStage}
      onClear={onClear}
    />
  )
}

// ---------- Picker ----------

function Picker({ onPick }: { onPick: (t: LiveTarget) => void }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      seedIfFirstRun().then(listSongs),
      listServices(),
      seedPatternsIfNeeded().then(() => listPatterns())
    ]).then(([s, sv, p]) => {
      setSongs(s)
      setServices(sv)
      setPatterns(p)
      setReady(true)
    })
  }, [])

  return (
    <div>
      <h1>Live</h1>
      <p className="muted">Start a service, or perform a song, chant or pad. You can also tap Play inside any of them.</p>

      <h2 className="small-head">Services</h2>
      {ready && services.filter(s => s.items.length > 0).length === 0 && (
        <p className="muted">No services yet. Plan one in the Service tab.</p>
      )}
      <ul className="list">
        {services
          .filter(s => s.items.length > 0)
          .map(s => (
            <li key={s.id}>
              <button className="list-item" onClick={() => onPick({ kind: 'service', id: s.id })}>
                <span className="li-title">▶ {s.name}</span>
                <span className="li-sub">
                  {s.date} · {s.items.length} items
                </span>
              </button>
            </li>
          ))}
      </ul>

      <h2 className="small-head">Chants and pads</h2>
      <ul className="list">
        {patterns.map(p => (
          <li key={p.id}>
            <button className="list-item" onClick={() => onPick({ kind: 'pattern', id: p.id, key: p.key })}>
              <span className="li-title">{p.name}</span>
              <span className="li-sub">
                {p.kind === 'pad' ? 'Pad' : 'Chant'} · {p.moods.join(', ')}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="small-head">Songs and hymns</h2>
      {ready && songs.length === 0 && <p className="muted">No songs yet. Add one in the Library tab.</p>}
      <ul className="list">
        {songs.map(s => (
          <li key={s.id}>
            <button className="list-item" onClick={() => onPick({ kind: 'song', id: s.id, key: s.key })}>
              <span className="li-title">{songLabel(s)}</span>
              <span className="li-sub">Key {s.key}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Loads the plan, then shows the stage ----------

function Runner({
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
  const [plan, setPlan] = useState<Plan | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    loadPlan(target).then(p => (p ? setPlan(p) : setMissing(true)))
  }, [])

  if (missing) {
    return (
      <div>
        <button className="link" onClick={onClear}>← Back</button>
        <p>That could not be found. It may have been deleted.</p>
      </div>
    )
  }
  if (!plan) return <p className="muted">Loading…</p>
  if (plan.items.length === 0) {
    return (
      <div>
        <button className="link" onClick={onClear}>← Back</button>
        <p className="muted">Nothing to play yet. Add songs, or a progression, to the service items.</p>
      </div>
    )
  }
  return (
    <Stage
      plan={plan}
      startKey={target.kind === 'service' ? plan.items[0].key : target.key}
      stage={stage}
      setStage={setStage}
      onClear={onClear}
    />
  )
}

// ---------- Stage view ----------

function Stage({
  plan,
  startKey,
  stage,
  setStage,
  onClear
}: {
  plan: Plan
  startKey: KeyName
  stage: boolean
  setStage: (on: boolean) => void
  onClear: () => void
}) {
  const first = plan.items[0]
  const [key, setKey] = useState<KeyName>(startKey)
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<DisplayMode>(getPref('liveMode', 'chords') as DisplayMode)
  const [size, setSize] = useState<Size>(getPref('liveSize', 'M') as Size)
  const [wake, setWake] = useState(getPref('liveWake', '1') === '1')
  const [voicing, setVoicing] = useState(getPref('liveVoicing', '0') === '1')
  const [panel, setPanel] = useState(false)

  // auto-advance (off until you start it)
  const [auto, setAuto] = useState(false)
  const [bpm, setBpm] = useState<number>(first.bpm ?? Number(getPref('liveBpm', '72')))
  const [sig, setSig] = useState<string>(first.timeSig && SIGNATURES[first.timeSig] ? first.timeSig : getPref('liveSig', '4/4'))
  const [bars, setBars] = useState<string>(getPref('liveBars', '1'))
  const [click, setClick] = useState(getPref('liveClick', '0') === '1')
  const [beat, setBeat] = useState(1)
  const [sync, setSync] = useState(0)

  const touchX = useRef<number | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const steps = buildSteps(plan, key)
  const last = Math.max(steps.length - 1, 0)
  const voiced = voicing ? voiceSteps(steps, plan, key) : []
  const beatsPerChord = Math.max(1, Math.round((SIGNATURES[sig] ?? 4) * Number(bars)))

  const paramsRef = useRef({ last, loop: plan.loop })
  paramsRef.current = { last, loop: plan.loop }

  const manual = () => setSync(s => s + 1)
  const next = () => {
    manual()
    setIndex(i => (i >= paramsRef.current.last ? (paramsRef.current.loop ? 0 : i) : i + 1))
  }
  const prev = () => {
    manual()
    setIndex(i => Math.max(i - 1, 0))
  }

  const playClick = (accent: boolean) => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!audioRef.current) audioRef.current = new Ctx()
      const ctx = audioRef.current as AudioContext
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = accent ? 1200 : 800
      gain.gain.value = 0.15
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.04)
    } catch {
      /* audio not available */
    }
  }

  const toggleAuto = () => {
    if (!auto) {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!audioRef.current) audioRef.current = new Ctx()
        audioRef.current?.resume()
      } catch {
        /* ignore */
      }
    }
    setAuto(a => !a)
  }

  // keyboard / pedal
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
  }, [])

  // auto-advance clock: counts beats, moves to the next chord every `beatsPerChord` beats
  useEffect(() => {
    if (!auto) return
    const beatMs = 60000 / bpm
    let count = 0
    let cancelled = false
    let id = 0
    const t0 = performance.now()
    setBeat(1)
    if (click) playClick(true)
    const tick = () => {
      if (cancelled) return
      count++
      const pos = count % beatsPerChord
      if (pos === 0) setIndex(i => (i >= paramsRef.current.last ? (paramsRef.current.loop ? 0 : i) : i + 1))
      setBeat(pos + 1)
      if (click) playClick(pos === 0)
      id = window.setTimeout(tick, Math.max(0, t0 + (count + 1) * beatMs - performance.now()))
    }
    id = window.setTimeout(tick, beatMs)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [auto, bpm, beatsPerChord, click, sync])

  // stop at the end of a song (chants and pads keep looping)
  useEffect(() => {
    if (auto && !plan.loop && index >= last) setAuto(false)
  }, [index])

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

  if (steps.length === 0) {
    return (
      <div>
        <button className="link" onClick={onClear}>← Back</button>
        <p className="muted">There is no progression to play yet.</p>
      </div>
    )
  }

  const cur = steps[Math.min(index, last)]
  const nxt = index < last ? steps[index + 1] : plan.loop ? steps[0] : null
  const atEnd = index >= last && !plan.loop

  const groupLabels: string[] = plan.single ? plan.items[0].sections.map(s => s.name) : plan.items.map(i => i.chip)
  const jump = (group: number) => {
    const i = steps.findIndex(s => s.group === group)
    if (i >= 0) {
      manual()
      setIndex(i)
    }
  }

  const where = plan.single
    ? `${cur.section} · ${cur.pos}/${cur.total}`
    : `${cur.itemTitle} · ${cur.section} ${cur.pos}/${cur.total}`

  let nextTag = ''
  if (nxt) {
    if (plan.loop && index >= last) nextTag = '↺ repeat'
    else if (nxt.itemIndex !== cur.itemIndex) nextTag = nxt.itemTitle
    else if (nxt.section !== cur.section) nextTag = nxt.section
  }

  const setBpmClamped = (v: number) => {
    const n = Math.max(30, Math.min(250, Math.round(v) || 72))
    setBpm(n)
    setPref('liveBpm', String(n))
  }

  return (
    <div className={`live size-${size}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!stage && (
        <div className="row between">
          <button className="link" onClick={onClear}>← Back</button>
          <div className="live-title">
            {plan.title}
            {plan.single && <span className="muted"> · {key}</span>}
          </div>
          <button className="link" onClick={() => setPanel(p => !p)}>{panel ? 'Close' : 'Settings'}</button>
        </div>
      )}

      {stage && <button className="stage-exit" onClick={exitStage}>Exit stage</button>}

      {!stage && plan.skipped > 0 && (
        <p className="muted hint">
          {plan.skipped} item{plan.skipped === 1 ? ' has' : 's have'} no music and {plan.skipped === 1 ? 'is' : 'are'} skipped.
        </p>
      )}

      {panel && !stage && (
        <div className="panel">
          {plan.single && (
            <div className="row gap center wrap">
              <label className="key-label">
                Key
                <select
                  value={key}
                  onChange={e => {
                    setKey(e.target.value as KeyName)
                    setIndex(0)
                    manual()
                  }}
                >
                  {KEYS.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

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

          <h2 className="small-head">Auto-advance</h2>
          <p className="muted hint">
            Moves to the next chord by itself using tempo and time signature. Tap Auto on the stage to start or pause. Swiping
            or tapping Next re-syncs it.
          </p>
          <div className="row gap center wrap">
            <label className="key-label">
              Tempo
              <button className="mini" onClick={() => setBpmClamped(bpm - 1)}>−</button>
              <input
                className="bpm"
                inputMode="numeric"
                value={bpm}
                onChange={e => setBpm(Number(e.target.value.replace(/\D/g, '')) || 0)}
                onBlur={() => setBpmClamped(bpm)}
              />
              <button className="mini" onClick={() => setBpmClamped(bpm + 1)}>+</button>
              BPM
            </label>
          </div>
          <div className="row gap center wrap">
            <label className="key-label">
              Time
              <select
                value={sig}
                onChange={e => {
                  setSig(e.target.value)
                  setPref('liveSig', e.target.value)
                }}
              >
                {Object.keys(SIGNATURES).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="key-label">
              Chord lasts
              <select
                value={bars}
                onChange={e => {
                  setBars(e.target.value)
                  setPref('liveBars', e.target.value)
                }}
              >
                {BARS.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted hint">= {beatsPerChord} beat{beatsPerChord === 1 ? '' : 's'} per chord</p>
          <label className="check">
            <input
              type="checkbox"
              checked={click}
              onChange={e => {
                setClick(e.target.checked)
                setPref('liveClick', e.target.checked ? '1' : '0')
              }}
            />
            Metronome click
          </label>

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
          <label className="check">
            <input
              type="checkbox"
              checked={voicing}
              onChange={e => {
                setVoicing(e.target.checked)
                setPref('liveVoicing', e.target.checked ? '1' : '0')
              }}
            />
            Show hand voicing (LH / RH)
          </label>
          <button className="play on" onClick={enterStage}>Enter stage mode</button>
        </div>
      )}

      {!stage && groupLabels.length > 1 && (
        <div className="chips">
          {groupLabels.map((label, i) => (
            <button key={i} className={i === cur.group ? 'chip on' : 'chip'} onClick={() => jump(i)}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="live-current">
        <div className="live-where">{where}</div>
        {mode === 'combined' ? (
          <>
            <div className="live-num">{cur.ev.label}</div>
            <div className="live-main">{cur.ev.chord}</div>
            <div className="live-sol">{cur.ev.solfa}</div>
            <div className="live-notes">{cur.ev.notes.join(' ')}</div>
          </>
        ) : (
          <>
            <div className="live-main">{mainText(cur.ev, mode)}</div>
            {mode === 'chords' && <div className="live-notes">{cur.ev.notes.join(' ')}</div>}
          </>
        )}
        {voicing && voiced[Math.min(index, last)] && (
          <div className="live-voicing">
            LH {voiced[Math.min(index, last)].lh} · RH {voiced[Math.min(index, last)].rh.join('-')}
          </div>
        )}
        {cur.cue && <div className="live-cue">{cur.cue}</div>}
        {auto && (
          <div className="beats">
            {Array.from({ length: beatsPerChord }, (_, i) => (
              <span key={i} className={i + 1 === beat ? 'dot on' : 'dot'} />
            ))}
          </div>
        )}
      </div>

      <div className="live-next">
        <span className="live-next-label">NEXT</span>
        {nxt ? (
          <>
            <span className="live-next-val">
              {mode === 'combined' ? `${nxt.ev.chord} · ${nxt.ev.label}` : mainText(nxt.ev, mode)}
            </span>
            {nextTag && <span className="live-next-sec">{nextTag}</span>}
            {nxt.cue && <span className="live-next-cue">{nxt.cue}</span>}
          </>
        ) : (
          <span className="live-next-val">End of {plan.single ? 'song' : 'service'}</span>
        )}
      </div>

      <div className="live-controls">
        <button className="ctl" onClick={prev} disabled={index === 0}>◀ Prev</button>
        <button className={auto ? 'ctl auto on' : 'ctl auto'} onClick={toggleAuto} disabled={atEnd}>
          {auto ? '⏸ Auto' : '▶ Auto'}
        </button>
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
