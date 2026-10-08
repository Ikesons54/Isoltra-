import { useEffect, useState } from 'react'
import { deleteHymnal, getHymnal, listHymnals, listHymns, listSongs, saveHymnal, seedHymnalsIfNeeded } from '../db/db'
import { newId, songLabel } from '../songs'
import type { Hymnal, Song } from '../types'

const CHURCHES = [
  'The Church of Pentecost',
  'Presbyterian Church of Ghana',
  'Methodist Church Ghana',
  'Baptist',
  'Assemblies of God',
  'Church of Ghana',
  'Other'
]

// ---------- List of hymnals (shown inside Library > Hymnals) ----------

export function HymnalList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [hymnals, setHymnals] = useState<Hymnal[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    seedHymnalsIfNeeded()
      .then(() => Promise.all([listHymnals(), listSongs()]))
      .then(([h, songs]) => {
        const c: Record<string, number> = {}
        for (const s of songs) if (s.hymnalId) c[s.hymnalId] = (c[s.hymnalId] ?? 0) + 1
        setHymnals(h)
        setCounts(c)
        setReady(true)
      })
  }, [])

  return (
    <div>
      <div className="row between">
        <p className="muted hint grow">Your hymnals. Add your own church's hymns, or use the free starter set.</p>
        <button className="play on" onClick={onNew}>+ Hymnal</button>
      </div>
      {ready && hymnals.length === 0 && <p className="muted">No hymnals yet.</p>}
      <ul className="list">
        {hymnals.map(h => (
          <li key={h.id}>
            <button className="list-item" onClick={() => onOpen(h.id)}>
              <span className="li-title">{h.name}</span>
              <span className="li-sub">
                {[h.church, h.language].filter(Boolean).join(' · ')} · {counts[h.id] ?? 0} hymn
                {(counts[h.id] ?? 0) === 1 ? '' : 's'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Create a hymnal ----------

export function HymnalForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState('')
  const [church, setChurch] = useState(CHURCHES[0])
  const [language, setLanguage] = useState('English')
  const [edition, setEdition] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const save = async () => {
    if (!name.trim()) return setError('Please enter a name for the hymnal.')
    const h: Hymnal = {
      id: newId(),
      name: name.trim(),
      church,
      language: language.trim(),
      edition: edition.trim(),
      notes: notes.trim(),
      createdAt: Date.now()
    }
    await saveHymnal(h)
    onSaved(h.id)
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onCancel}>Cancel</button>
        <button className="play on" onClick={save}>Save</button>
      </div>
      <h1 className="song-title">New hymnal</h1>

      <label className="field">
        Name
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Church hymn book, Twi hymns" />
      </label>
      <label className="field">
        Church / denomination
        <select value={church} onChange={e => setChurch(e.target.value)}>
          {CHURCHES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Language
        <input value={language} onChange={e => setLanguage(e.target.value)} placeholder="English, Twi, Ga, Ewe…" />
      </label>
      <label className="field">
        Edition (optional)
        <input value={edition} onChange={e => setEdition(e.target.value)} />
      </label>
      <label className="field">
        Source / permission notes (optional)
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Where this content comes from" />
      </label>
      <p className="muted hint">
        Only add hymn content you have the right to use. Only the first line and your own chord progressions are stored.
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

// ---------- Hymns inside one hymnal ----------

export function HymnList({
  id,
  onBack,
  onOpenHymn,
  onAddHymn
}: {
  id: string
  onBack: () => void
  onOpenHymn: (songId: string) => void
  onAddHymn: () => void
}) {
  const [hymnal, setHymnal] = useState<Hymnal | null>(null)
  const [hymns, setHymns] = useState<Song[]>([])
  const [missing, setMissing] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    Promise.all([getHymnal(id), listHymns(id)]).then(([h, list]) => {
      if (!h) return setMissing(true)
      setHymnal(h)
      setHymns(list)
    })
  }, [id])

  if (missing) {
    return (
      <div>
        <button className="link" onClick={onBack}>← Back</button>
        <p>This hymnal could not be found.</p>
      </div>
    )
  }
  if (!hymnal) return <p className="muted">Loading…</p>

  const q = query.trim().toLowerCase()
  const shown = !q
    ? hymns
    : hymns.filter(
        h =>
          String(h.hymnNumber ?? '').startsWith(q) ||
          h.title.toLowerCase().includes(q) ||
          (h.firstLine ?? '').toLowerCase().includes(q)
      )

  const remove = async () => {
    if (window.confirm(`Delete "${hymnal.name}" and all ${hymns.length} hymns in it?`)) {
      await deleteHymnal(hymnal.id)
      onBack()
    }
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onBack}>← Hymnals</button>
        {!hymnal.builtin && <button className="link danger" onClick={remove}>Delete hymnal</button>}
      </div>

      <h1 className="song-title">{hymnal.name}</h1>
      <p className="muted hint">{[hymnal.church, hymnal.language, hymnal.edition].filter(Boolean).join(' · ')}</p>
      {hymnal.notes && <p className="muted hint">{hymnal.notes}</p>}

      <div className="row gap">
        <input
          className="grow"
          inputMode="search"
          placeholder="Search by number or title…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="play on" onClick={onAddHymn}>+ Hymn</button>
      </div>

      {shown.length === 0 && <p className="muted">{hymns.length === 0 ? 'No hymns yet. Tap + Hymn to add one.' : 'No match.'}</p>}

      <ul className="list">
        {shown.map(h => (
          <li key={h.id}>
            <button className="list-item" onClick={() => onOpenHymn(h.id)}>
              <span className="li-title">{songLabel(h)}</span>
              <span className="li-sub">
                Key {h.key}
                {h.firstLine ? ` · ${h.firstLine}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
