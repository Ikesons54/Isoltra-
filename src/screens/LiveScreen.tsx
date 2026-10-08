import { useEffect, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { buildProgression, KEYS } from '../engine'
import type { KeyName, MusicalEvent } from '../engine'
import { getService, getSong, listServices, listSongs, seedIfFirstRun } from '../db/db'
import { getPref, setPref } from '../songs'
import type { DisplayMode } from '../songs'
import type { Service, Song } from '../types'

export type LiveTarget =
  | { kind: 'song'; id: string; key: KeyName }
  | { kind: 'service'; id: string }

interface PlanItem {
  title: string
  chip: string
  key: KeyName
  sections: { name: string; numbers: string }[]
}

interface Plan {
  title: string
  single: boolean
  items: PlanItem[]
  skipped: number
}

interface Step {
  itemIndex: number
  itemTitle: string
  section: string
  sectionIndex: number
  group: number
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

async function loadPlan(target: LiveTarget): Promise<Plan | null> {
  if (target.kind === 'song') {
    const song = await getSong(target.id)
    if (!song) return null
    return {
      title: song.title,
      single: true,
      skipped: 0,
      items: [{ title: song.title, chip: song.title, key: target.key, sections: song.sections }]
    }
  }
  const service = await getService(target.id)
  if (!service) return null
  const songs = await listSongs()
  const items: PlanItem[] = []
  let skipped = 0
  for (const it of service.items) {
    const song = it.songId ? songs.find(s => s.id === it.songId) : undefined
    let sections: { name: string; numbers: string }[] = []
    if (song) sections = song.sections
    else if (it.numbers) sections = [{ name: it.slot || 'Progression', numbers: it.numbers }]
    if (sections.length === 0) {
      skipped++
      continue
    }
    items.push({ title: it.title, chip: it.slot || it.title, key: it.key, sections })
  }
  return { title: service.name, single: false, items, skipped }
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
          sectionIndex,
          group: plan.single ? sectionIndex : itemIndex,
          pos: i + 1,
          total: events.length,
          ev
        })
      )
    })
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
  return (
    <Runner
      key={target.kind === 'song' ? `song:${target.id}:${target.key}` : `service:${target.id}`}
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([seedIfFirstRun().then(listSongs), listServices()]).then(([s, sv]) => {
      setSongs(s)
      setServices(sv)
      setReady(true)
    })
  }, [])

  return (
    <div>
      <h1>Live</h1>
      <p className="muted">Start a service, or perform a single song. You can also tap Play inside any song.</p>

      <h2 className="small-head">Services</h2>
      {ready && services.length === 0 && <p className="muted">No services yet. Plan one in the Service tab.</p>}
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

      <h2 className="small-head">Songs</h2>
      {ready && songs.length === 0 && <p className="muted">No songs yet. Add one in the Library tab.</p>}
      <ul className="list">
        {songs.map(s => (
          <li key={s.id}>
            <button className="list-item" onClick={() => onPick({ kind: 'song', id: s.id, key: s.key })}>
              <span className="li-title">{s.title}</span>
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
      startKey={target.kind === 'song' ? target.key : plan.items[0].key}
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
  const [key, setKey] = useState<KeyName>(startKey)
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<DisplayMode>(getPref('liveMode', 'chords') as DisplayMode)
  const [size, setSize] = useState<Size>(getPref('liveSize', 'M') as Size)
  const [wake, setWake] = useState(getPref('liveWake', '1') === '1')
  const [panel, setPanel] = useState(false)
  const touchX = useRef<number | null>(null)

  const steps = buildSteps(plan, key)
  const last = Math.max(steps.length - 1, 0)

  const next = () => setIndex(i => Math.min(i + 1, last))
  const prev = () => setIndex(i => Math.max(i - 1, 0))

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
  const nxt = index < last ? steps[index + 1] : null
  const atEnd = index >= last

  const groupLabels: string[] = plan.single ? plan.items[0].sections.map(s => s.name) : plan.items.map(i => i.chip)
  const jump = (group: number) => {
    const i = steps.findIndex(s => s.group === group)
    if (i >= 0) setIndex(i)
  }

  const where = plan.single
    ? `${cur.section} · ${cur.pos}/${cur.total}`
    : `${cur.itemTitle} · ${cur.section} ${cur.pos}/${cur.total}`

  let nextTag = ''
  if (nxt) {
    if (nxt.itemIndex !== cur.itemIndex) nextTag = nxt.itemTitle
    else if (nxt.section !== cur.section) nextTag = nxt.section
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
          <div className={mode === 'notes' ? 'live-main notes' : 'live-main'}>{mainText(cur.ev, mode)}</div>
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
          </>
        ) : (
          <span className="live-next-val">End of {plan.single ? 'song' : 'service'}</span>
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
