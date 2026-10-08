import { useEffect, useState } from 'react'
import { buildProgression, KEYS } from '../engine'
import type { KeyName } from '../engine'
import { deleteSong, getSong } from '../db/db'
import { getPref, setPref } from '../songs'
import type { DisplayMode } from '../songs'
import type { Song } from '../types'

const MODES: { id: DisplayMode; label: string }[] = [
  { id: 'chords', label: 'Chords' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'solfa', label: 'Solfa' },
  { id: 'notes', label: 'Notes' },
  { id: 'combined', label: 'Combined' }
]

interface Props {
  id: string
  onBack: () => void
  onEdit: () => void
  onPlay: (id: string, key: KeyName) => void
}

export default function SongDetail({ id, onBack, onEdit, onPlay }: Props) {
  const [song, setSong] = useState<Song | null>(null)
  const [missing, setMissing] = useState(false)
  const [viewKey, setViewKey] = useState<KeyName>('C')
  const [sectionId, setSectionId] = useState('')
  const [mode, setMode] = useState<DisplayMode>(getPref('display', 'chords') as DisplayMode)

  useEffect(() => {
    getSong(id).then(s => {
      if (!s) return setMissing(true)
      setSong(s)
      setViewKey(s.key)
      setSectionId(s.sections[0]?.id ?? '')
    })
  }, [id])

  if (missing) {
    return (
      <div>
        <button className="link" onClick={onBack}>← Back</button>
        <p>This song could not be found.</p>
      </div>
    )
  }
  if (!song) return <p className="muted">Loading…</p>

  const section = song.sections.find(s => s.id === sectionId) ?? song.sections[0]
  let events: ReturnType<typeof buildProgression> = []
  if (section) {
    try {
      events = buildProgression(viewKey, section.numbers)
    } catch {
      events = []
    }
  }

  const pickMode = (m: DisplayMode) => {
    setMode(m)
    setPref('display', m)
  }

  const remove = async () => {
    if (window.confirm(`Delete "${song.title}"?`)) {
      await deleteSong(song.id)
      onBack()
    }
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onBack}>← Back</button>
        <div className="row gap">
          <button className="link" onClick={onEdit}>Edit</button>
          <button className="link danger" onClick={remove}>Delete</button>
        </div>
      </div>

      {song.hymnNumber !== undefined && <p className="muted hint">Hymn {song.hymnNumber}</p>}
      <h1 className="song-title">{song.title}</h1>
      {song.firstLine && <p className="muted"><em>{song.firstLine}</em></p>}
      {song.artist && <p className="muted hint">{song.artist}</p>}

      <div className="row gap center">
        <label className="key-label">
          Key
          <select value={viewKey} onChange={e => setViewKey(e.target.value as KeyName)}>
            {KEYS.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        {viewKey !== song.key && (
          <button className="link" onClick={() => setViewKey(song.key)}>Reset to {song.key}</button>
        )}
        <button className="play on" onClick={() => onPlay(song.id, viewKey)}>Play</button>
      </div>

      <div className="chips">
        {MODES.map(m => (
          <button key={m.id} className={m.id === mode ? 'chip on' : 'chip'} onClick={() => pickMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <h2 className="small-head">Sections</h2>
      <div className="chips">
        {song.sections.map(s => (
          <button key={s.id} className={s.id === section?.id ? 'chip on' : 'chip'} onClick={() => setSectionId(s.id)}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="cards">
        {events.map((e, i) => (
          <div className="card" key={i}>
            {mode === 'chords' && <div className="big">{e.chord}</div>}
            {mode === 'numbers' && <div className="big">{e.label}</div>}
            {mode === 'solfa' && <div className="big">{e.solfa}</div>}
            {mode === 'notes' && <div className="mid">{e.notes.join(' ')}</div>}
            {mode === 'combined' && (
              <>
                <div className="num">{e.label}</div>
                <div className="big">{e.chord}</div>
                <div className="sol">{e.solfa}</div>
                <div className="nts">{e.notes.join(' ')}</div>
              </>
            )}
          </div>
        ))}
        {events.length === 0 && <p className="muted">No progression in this section.</p>}
      </div>
    </div>
  )
}
