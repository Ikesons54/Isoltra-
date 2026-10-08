import { useEffect, useState } from 'react'
import { listSongs, seedIfFirstRun } from '../db/db'
import type { KeyName } from '../engine'
import type { Song } from '../types'
import SongDetail from './SongDetail'
import SongEditor from './SongEditor'

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'edit'; id?: string }
type Sub = 'songs' | 'hymnals' | 'chants' | 'pads' | 'saved'

const SUBS: { id: Sub; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'hymnals', label: 'Hymnals' },
  { id: 'chants', label: 'Chants' },
  { id: 'pads', label: 'Pads' },
  { id: 'saved', label: 'Saved' }
]

export default function LibraryScreen({ onPlay }: { onPlay: (id: string, key: KeyName) => void }) {
  const [view, setView] = useState<View>({ name: 'list' })
  const [sub, setSub] = useState<Sub>('songs')
  const [songs, setSongs] = useState<Song[]>([])
  const [query, setQuery] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (view.name !== 'list') return
    seedIfFirstRun()
      .then(listSongs)
      .then(s => {
        setSongs(s)
        setReady(true)
      })
  }, [view.name])

  if (view.name === 'detail') {
    return (
      <SongDetail
        id={view.id}
        onBack={() => setView({ name: 'list' })}
        onEdit={() => setView({ name: 'edit', id: view.id })}
        onPlay={onPlay}
      />
    )
  }
  if (view.name === 'edit') {
    return (
      <SongEditor
        id={view.id}
        onCancel={() => setView(view.id ? { name: 'detail', id: view.id } : { name: 'list' })}
        onSaved={id => setView({ name: 'detail', id })}
      />
    )
  }

  const q = query.trim().toLowerCase()
  const shown = q ? songs.filter(s => `${s.title} ${s.artist}`.toLowerCase().includes(q)) : songs

  return (
    <div>
      <h1>Library</h1>
      <div className="chips">
        {SUBS.map(s => (
          <button key={s.id} className={s.id === sub ? 'chip on' : 'chip'} onClick={() => setSub(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {sub !== 'songs' && <p className="muted">Coming soon.</p>}

      {sub === 'songs' && (
        <>
          <div className="row gap">
            <input
              className="grow"
              placeholder="Search songs…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="play on" onClick={() => setView({ name: 'edit' })}>+ Add</button>
          </div>

          {ready && shown.length === 0 && <p className="muted">No songs yet. Tap + Add to create one.</p>}

          <ul className="list">
            {shown.map(s => (
              <li key={s.id}>
                <button className="list-item" onClick={() => setView({ name: 'detail', id: s.id })}>
                  <span className="li-title">{s.title}</span>
                  <span className="li-sub">
                    Key {s.key}
                    {s.artist ? ` · ${s.artist}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
