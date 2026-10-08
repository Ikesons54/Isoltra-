import { useEffect, useState } from 'react'
import { KEYS } from '../engine'
import type { KeyName } from '../engine'
import { getSong, saveSong } from '../db/db'
import { newId, normalizeInput, SECTION_NAMES } from '../songs'
import type { Song } from '../types'

interface DraftSection {
  id: string
  name: string
  text: string
}

interface Props {
  id?: string
  onCancel: () => void
  onSaved: (id: string) => void
}

export default function SongEditor({ id, onCancel, onSaved }: Props) {
  const [loaded, setLoaded] = useState(!id)
  const [existing, setExisting] = useState<Song | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState<KeyName>('F')
  const [sections, setSections] = useState<DraftSection[]>([{ id: newId(), name: 'Verse', text: '' }])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getSong(id).then(s => {
      if (s) {
        setExisting(s)
        setTitle(s.title)
        setArtist(s.artist)
        setKey(s.key)
        setSections(s.sections.map(x => ({ id: x.id, name: x.name, text: x.numbers })))
      }
      setLoaded(true)
    })
  }, [id])

  if (!loaded) return <p className="muted">Loading…</p>

  const update = (sid: string, patch: Partial<DraftSection>) =>
    setSections(list => list.map(s => (s.id === sid ? { ...s, ...patch } : s)))

  const save = async () => {
    setError('')
    if (!title.trim()) return setError('Please enter a title.')
    const out: { id: string; name: string; numbers: string }[] = []
    for (const s of sections) {
      if (!s.text.trim()) continue
      try {
        out.push({ id: s.id, name: s.name.trim() || 'Section', numbers: normalizeInput(s.text, key) })
      } catch (e) {
        return setError(`${s.name || 'Section'}: ${(e as Error).message}`)
      }
    }
    if (out.length === 0) return setError('Add a progression to at least one section.')
    const now = Date.now()
    const song: Song = {
      id: existing?.id ?? newId(),
      title: title.trim(),
      artist: artist.trim(),
      key,
      sections: out,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    await saveSong(song)
    onSaved(song.id)
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onCancel}>Cancel</button>
        <button className="play on" onClick={save}>Save</button>
      </div>
      <h1 className="song-title">{existing ? 'Edit song' : 'Add song'}</h1>

      <label className="field">
        Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song or hymn title" />
      </label>
      <label className="field">
        Artist / source (optional)
        <input value={artist} onChange={e => setArtist(e.target.value)} />
      </label>
      <label className="field">
        Key
        <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
          {KEYS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </label>

      <h2 className="small-head">Sections</h2>
      <p className="muted hint">
        Type numbers (1 4 6 5, or 1-5-2-4-1, ♭7 or b7) or chord names in the key above (F Bb Dm C).
        Plain 2, 3 and 6 are minor; add M for major (6M).
      </p>

      {sections.map(s => (
        <div className="section-box" key={s.id}>
          <div className="row gap">
            <input
              list="section-names"
              value={s.name}
              onChange={e => update(s.id, { name: e.target.value })}
              placeholder="Section name"
            />
            {sections.length > 1 && (
              <button className="link danger" onClick={() => setSections(list => list.filter(x => x.id !== s.id))}>
                Remove
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={s.text}
            onChange={e => update(s.id, { text: e.target.value })}
            placeholder="1 4 6 5"
          />
        </div>
      ))}
      <datalist id="section-names">
        {SECTION_NAMES.map(n => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <button className="link" onClick={() => setSections(l => [...l, { id: newId(), name: '', text: '' }])}>
        + Add section
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  )
}
