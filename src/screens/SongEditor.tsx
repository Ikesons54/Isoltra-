import { useEffect, useState } from 'react'
import { buildProgression, KEYS } from '../engine'
import type { KeyName } from '../engine'
import { getSong, saveSong } from '../db/db'
import { newId, normalizeInput, SECTION_NAMES } from '../songs'
import type { Song } from '../types'

interface DraftSection {
  id: string
  name: string
  text: string
  cues: string[]
}

interface Props {
  id?: string
  /** Set when adding a hymn to a hymnal */
  hymnalId?: string
  onCancel: () => void
  onSaved: (id: string) => void
}

export default function SongEditor({ id, hymnalId, onCancel, onSaved }: Props) {
  const [loaded, setLoaded] = useState(!id)
  const [existing, setExisting] = useState<Song | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [key, setKey] = useState<KeyName>('F')
  const [sections, setSections] = useState<DraftSection[]>([{ id: newId(), name: 'Verse', text: '', cues: [] }])
  const [number, setNumber] = useState('')
  const [bpm, setBpm] = useState('')
  const [timeSig, setTimeSig] = useState('')
  const [firstLine, setFirstLine] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getSong(id).then(s => {
      if (s) {
        setExisting(s)
        setTitle(s.title)
        setArtist(s.artist)
        setKey(s.key)
        setNumber(s.hymnNumber !== undefined ? String(s.hymnNumber) : '')
        setBpm(s.bpm ? String(s.bpm) : '')
        setTimeSig(s.timeSig ?? '')
        setFirstLine(s.firstLine ?? '')
        setSections(s.sections.map(x => ({ id: x.id, name: x.name, text: x.numbers, cues: x.cues ?? [] })))
      }
      setLoaded(true)
    })
  }, [id])

  if (!loaded) return <p className="muted">Loading…</p>

  const owner = existing?.hymnalId ?? hymnalId
  const isHymn = !!owner

  const setCue = (sid: string, index: number, value: string) =>
    setSections(list =>
      list.map(s => {
        if (s.id !== sid) return s
        const cues = [...s.cues]
        while (cues.length <= index) cues.push('')
        cues[index] = value
        return { ...s, cues }
      })
    )

  /** Chords of a section, for the cue-word rows (empty while the text cannot be read yet) */
  const previewChords = (text: string) => {
    if (!text.trim()) return []
    try {
      return buildProgression(key, normalizeInput(text, key))
    } catch {
      return []
    }
  }

  const update = (sid: string, patch: Partial<DraftSection>) =>
    setSections(list => list.map(s => (s.id === sid ? { ...s, ...patch } : s)))

  const save = async () => {
    setError('')
    if (!title.trim()) return setError('Please enter a title.')
    let tempo: number | undefined
    if (bpm.trim()) {
      tempo = Number(bpm)
      if (!Number.isFinite(tempo) || tempo < 30 || tempo > 250) return setError('Tempo should be between 30 and 250 BPM.')
    }
    let hymnNumber: number | undefined
    if (isHymn && number.trim()) {
      hymnNumber = Number(number.trim())
      if (!Number.isInteger(hymnNumber) || hymnNumber < 0) return setError('Hymn number must be a whole number.')
    }
    const out: { id: string; name: string; numbers: string; cues?: string[] }[] = []
    for (const s of sections) {
      if (!s.text.trim()) continue
      try {
        const numbers = normalizeInput(s.text, key)
        const count = numbers.split(' ').filter(Boolean).length
        const cues = s.cues.slice(0, count).map(c => c.trim())
        out.push({
          id: s.id,
          name: s.name.trim() || 'Section',
          numbers,
          ...(cues.some(c => c) ? { cues } : {})
        })
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
      updatedAt: now,
      bpm: tempo,
      timeSig: timeSig || undefined,
      ...(isHymn ? { hymnalId: owner, hymnNumber, firstLine: firstLine.trim() || undefined } : {})
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
      <h1 className="song-title">{existing ? (isHymn ? 'Edit hymn' : 'Edit song') : isHymn ? 'Add hymn' : 'Add song'}</h1>

      {isHymn && (
        <label className="field">
          Hymn number
          <input inputMode="numeric" value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 125" />
        </label>
      )}

      <label className="field">
        Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song or hymn title" />
      </label>
      {isHymn && (
        <label className="field">
          First line (optional)
          <input value={firstLine} onChange={e => setFirstLine(e.target.value)} placeholder="Helps you recognise the hymn" />
        </label>
      )}
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

      <div className="row gap">
        <label className="field grow">
          Tempo BPM (optional)
          <input inputMode="numeric" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="e.g. 72" />
        </label>
        <label className="field grow">
          Time signature
          <select value={timeSig} onChange={e => setTimeSig(e.target.value)}>
            <option value="">Not set</option>
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
            <option value="12/8">12/8</option>
          </select>
        </label>
      </div>

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
          {previewChords(s.text).length > 0 && (
            <div className="cues">
              <p className="muted hint">
                Cue words (optional): a few words to tell you when to change chord, such as "on the word Lord". Short notes
                only, not full lyrics.
              </p>
              {previewChords(s.text).map((ev, i) => (
                <label className="cue-row" key={i}>
                  <span className="cue-chord">{ev.chord}</span>
                  <input
                    maxLength={40}
                    value={s.cues[i] ?? ''}
                    onChange={e => setCue(s.id, i, e.target.value)}
                    placeholder="cue"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <datalist id="section-names">
        {SECTION_NAMES.map(n => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <button className="link" onClick={() => setSections(l => [...l, { id: newId(), name: '', text: '', cues: [] }])}>
        + Add section
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  )
}
