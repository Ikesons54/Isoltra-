import { useEffect, useState } from 'react'
import { buildProgression, KEYS, voiceProgression } from '../engine'
import type { KeyName } from '../engine'
import { MOODS } from '../data/starterPatterns'
import { deletePattern, getPattern, isSaved, listPatterns, savePattern, seedPatternsIfNeeded, toggleSaved } from '../db/db'
import { getPref, newId, normalizeInput, setPref } from '../songs'
import type { DisplayMode } from '../songs'
import type { Difficulty, Pattern, PatternKind } from '../types'
import ChartStrip from './ChartStrip'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'edit'; id?: string }

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']
const MODES: { id: DisplayMode; label: string }[] = [
  { id: 'chords', label: 'Chords' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'solfa', label: 'Solfa' },
  { id: 'notes', label: 'Notes' },
  { id: 'combined', label: 'Combined' }
]
const LEVELS = [
  { id: 'simple', label: 'Simple (1 chord)', count: 1 },
  { id: 'medium', label: 'Medium (2 chords)', count: 2 },
  { id: 'full', label: 'Full', count: 99 }
]

export default function PatternsPanel({
  kind,
  onPlay
}: {
  kind: PatternKind
  onPlay: (id: string, key: KeyName) => void
}) {
  const [view, setView] = useState<View>({ name: 'list' })

  if (view.name === 'detail') {
    return (
      <PatternDetail
        id={view.id}
        onBack={() => setView({ name: 'list' })}
        onEdit={() => setView({ name: 'edit', id: view.id })}
        onPlay={onPlay}
      />
    )
  }
  if (view.name === 'edit') {
    return (
      <PatternEditor
        id={view.id}
        kind={kind}
        onCancel={() => setView(view.id ? { name: 'detail', id: view.id } : { name: 'list' })}
        onSaved={id => setView({ name: 'detail', id })}
      />
    )
  }
  return <PatternList kind={kind} onOpen={id => setView({ name: 'detail', id })} onNew={() => setView({ name: 'edit' })} />
}

// ---------- List with filters ----------

function PatternList({ kind, onOpen, onNew }: { kind: PatternKind; onOpen: (id: string) => void; onNew: () => void }) {
  const [items, setItems] = useState<Pattern[]>([])
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [mood, setMood] = useState('')
  const [level, setLevel] = useState('')

  useEffect(() => {
    seedPatternsIfNeeded()
      .then(() => listPatterns(kind))
      .then(list => {
        setItems(list)
        setReady(true)
      })
  }, [kind])

  const q = query.trim().toLowerCase()
  const shown = items.filter(
    p =>
      (!mood || p.moods.includes(mood)) &&
      (!level || p.difficulty === level) &&
      (!q || `${p.name} ${p.description}`.toLowerCase().includes(q))
  )
  const usedMoods = MOODS.filter(m => items.some(p => p.moods.includes(m)))

  return (
    <div>
      <div className="row gap">
        <input className="grow" placeholder={`Search ${kind}s…`} value={query} onChange={e => setQuery(e.target.value)} />
        <button className="play on" onClick={onNew}>+ Add</button>
      </div>

      <div className="chips">
        <button className={mood === '' ? 'chip on' : 'chip'} onClick={() => setMood('')}>All moods</button>
        {usedMoods.map(m => (
          <button key={m} className={mood === m ? 'chip on' : 'chip'} onClick={() => setMood(mood === m ? '' : m)}>
            {m}
          </button>
        ))}
      </div>
      <div className="chips">
        <button className={level === '' ? 'chip on' : 'chip'} onClick={() => setLevel('')}>Any level</button>
        {DIFFICULTIES.map(d => (
          <button key={d} className={level === d ? 'chip on' : 'chip'} onClick={() => setLevel(level === d ? '' : d)}>
            {d}
          </button>
        ))}
      </div>

      {ready && shown.length === 0 && <p className="muted">Nothing matches. Try another mood or add your own.</p>}

      <ul className="list">
        {shown.map(p => (
          <li key={p.id}>
            <button className="list-item" onClick={() => onOpen(p.id)}>
              <span className="li-title">{p.name}</span>
              <span className="li-sub">
                {p.numbers.replace(/ /g, ' · ')} · {p.difficulty}
                {p.bpm ? ` · ${p.bpm} BPM` : ''}
              </span>
              <span className="li-sub">{p.moods.join(', ')}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Detail with key, display, level and voicings ----------

export function PatternDetail({
  id,
  onBack,
  onEdit,
  onPlay
}: {
  id: string
  onBack: () => void
  onEdit: () => void
  onPlay: (id: string, key: KeyName) => void
}) {
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [missing, setMissing] = useState(false)
  const [key, setKey] = useState<KeyName>('F')
  const [mode, setMode] = useState<DisplayMode>(getPref('display', 'chords') as DisplayMode)
  const [level, setLevel] = useState('full')
  const [voicings, setVoicings] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    isSaved('pattern', id).then(setSaved)
  }, [id])

  useEffect(() => {
    getPattern(id).then(p => {
      if (!p) return setMissing(true)
      setPattern(p)
      setKey(p.key)
    })
  }, [id])

  if (missing) {
    return (
      <div>
        <button className="link" onClick={onBack}>← Back</button>
        <p>This pattern could not be found.</p>
      </div>
    )
  }
  if (!pattern) return <p className="muted">Loading…</p>

  let events: ReturnType<typeof buildProgression> = []
  try {
    events = buildProgression(key, pattern.numbers)
  } catch {
    events = []
  }
  const count = LEVELS.find(l => l.id === level)?.count ?? 99
  const shownEvents = events.slice(0, count)
  const voiced = voicings ? voiceProgression(shownEvents, key) : []

  const remove = async () => {
    if (window.confirm(`Delete "${pattern.name}"?`)) {
      await deletePattern(pattern.id)
      onBack()
    }
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onBack}>← Back</button>
        <div className="row gap">
          <button className="link" onClick={async () => setSaved(await toggleSaved('pattern', pattern.id))}>
            {saved ? '★ Saved' : '☆ Save'}
          </button>
          <button className="link" onClick={onEdit}>Edit</button>
          <button className="link danger" onClick={remove}>Delete</button>
        </div>
      </div>

      <h1 className="song-title">{pattern.name}</h1>
      <p className="muted hint">
        {pattern.kind === 'pad' ? 'Pad' : 'Chant'} · {pattern.difficulty}
        {pattern.bpm ? ` · ${pattern.bpm} BPM` : ''}
        {pattern.timeSig ? ` · ${pattern.timeSig}` : ''}
      </p>
      {pattern.moods.length > 0 && <p className="muted hint">Mood: {pattern.moods.join(', ')}</p>}
      {pattern.description && <p className="muted">{pattern.description}</p>}

      <div className="row gap center">
        <label className="key-label">
          Key
          <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
            {KEYS.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <button className="play on" onClick={() => onPlay(pattern.id, key)}>▶ Play</button>
      </div>

      <div className="chips">
        {MODES.map(m => (
          <button
            key={m.id}
            className={m.id === mode ? 'chip on' : 'chip'}
            onClick={() => {
              setMode(m.id)
              setPref('display', m.id)
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="chips">
        {LEVELS.map(l => (
          <button key={l.id} className={l.id === level ? 'chip on' : 'chip'} onClick={() => setLevel(l.id)}>
            {l.label}
          </button>
        ))}
      </div>

      <label className="check">
        <input type="checkbox" checked={voicings} onChange={e => setVoicings(e.target.checked)} />
        Show voicings (left hand / right hand)
      </label>

      <ChartStrip events={shownEvents} mode={mode} voiced={voicings ? voiced : undefined} />
      {voicings && (
        <p className="muted hint">
          Right-hand shapes are chosen so your hand moves as little as possible between chords. Treat them as suggestions.
        </p>
      )}
    </div>
  )
}

// ---------- Add / edit ----------

export function PatternEditor({
  id,
  kind,
  onCancel,
  onSaved
}: {
  id?: string
  kind: PatternKind
  onCancel: () => void
  onSaved: (id: string) => void
}) {
  const [loaded, setLoaded] = useState(!id)
  const [existing, setExisting] = useState<Pattern | null>(null)
  const [name, setName] = useState('')
  const [key, setKey] = useState<KeyName>('F')
  const [text, setText] = useState('')
  const [moods, setMoods] = useState<string[]>([])
  const [bpm, setBpm] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getPattern(id).then(p => {
      if (p) {
        setExisting(p)
        setName(p.name)
        setKey(p.key)
        setText(p.numbers)
        setMoods(p.moods)
        setBpm(p.bpm ? String(p.bpm) : '')
        setDifficulty(p.difficulty)
        setDescription(p.description)
      }
      setLoaded(true)
    })
  }, [id])

  if (!loaded) return <p className="muted">Loading…</p>

  const toggleMood = (m: string) => setMoods(list => (list.includes(m) ? list.filter(x => x !== m) : [...list, m]))

  const save = async () => {
    setError('')
    if (!name.trim()) return setError('Please enter a name.')
    if (!text.trim()) return setError('Add a progression, for example 1 5 2 4 1.')
    let numbers: string
    try {
      numbers = normalizeInput(text, key)
    } catch (e) {
      return setError((e as Error).message)
    }
    let tempo: number | undefined
    if (bpm.trim()) {
      tempo = Number(bpm)
      if (!Number.isFinite(tempo) || tempo < 30 || tempo > 250) return setError('Tempo should be between 30 and 250 BPM.')
    }
    const p: Pattern = {
      id: existing?.id ?? newId(),
      kind: existing?.kind ?? kind,
      name: name.trim(),
      numbers,
      key,
      moods,
      bpm: tempo,
      timeSig: existing?.timeSig ?? '4/4',
      difficulty,
      description: description.trim(),
      builtin: existing?.builtin,
      createdAt: existing?.createdAt ?? Date.now()
    }
    await savePattern(p)
    onSaved(p.id)
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onCancel}>Cancel</button>
        <button className="play on" onClick={save}>Save</button>
      </div>
      <h1 className="song-title">{existing ? 'Edit' : 'Add'} {(existing?.kind ?? kind) === 'pad' ? 'pad' : 'chant'}</h1>

      <label className="field">
        Name
        <input value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="field">
        Key to show first
        <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
          {KEYS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Progression
        <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="1 5 2 4 1  or  F C Gm Bb F" />
      </label>

      <div className="field">
        Mood
        <div className="chips">
          {MOODS.map(m => (
            <button key={m} className={moods.includes(m) ? 'chip on' : 'chip'} onClick={() => toggleMood(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        Tempo in BPM (optional)
        <input inputMode="numeric" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="e.g. 66" />
      </label>
      <label className="field">
        Difficulty
        <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
          {DIFFICULTIES.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Description (optional)
        <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
    </div>
  )
}
