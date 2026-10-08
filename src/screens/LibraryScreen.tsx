import { useEffect, useState } from 'react'
import { listSongs, seedIfFirstRun } from '../db/db'
import type { KeyName } from '../engine'
import type { Song } from '../types'
import { HymnalForm, HymnalList, HymnList } from './HymnalsPanel'
import SongDetail from './SongDetail'
import SongEditor from './SongEditor'

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id?: string; hymnalId?: string }
  | { name: 'hymnal'; id: string }
  | { name: 'hymnalNew' }

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
  const [back, setBack] = useState<View>({ name: 'list' })
  const [sub, setSub] = useState<Sub>('songs')
  const [songs, setSongs] = useState<Song[]>([])
  const [query, setQuery] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (view.name !== 'list') return
    seedIfFirstRun()
      .then(listSongs)
      .then(s => {
        setSongs(s.filter(x => !x.hymnalId))
        setReady(true)
      })
  }, [view.name])

  const openDetail = (id: string) => {
    setBack(view)
    setView({ name: 'detail', id })
  }

  if (view.name === 'detail') {
    return (
      <SongDetail
        id={view.id}
        onBack={() => setView(back)}
        onEdit={() => setView({ name: 'edit', id: view.id })}
        onPlay={onPlay}
      />
    )
  }
  if (view.name === 'edit') {
    return (
      <SongEditor
        id={view.id}
        hymnalId={view.hymnalId}
        onCancel={() => setView(view.id ? { name: 'detail', id: view.id } : view.hymnalId ? { name: 'hymnal', id: view.hymnalId } : { name: 'list' })}
        onSaved={id => {
          setBack(view.hymnalId ? { name: 'hymnal', id: view.hymnalId } : view.id ? back : { name: 'list' })
          setView({ name: 'detail', id })
        }}
      />
    )
  }
  if (view.name === 'hymnal') {
    return (
      <HymnList
        id={view.id}
        onBack={() => {
          setSub('hymnals')
          setView({ name: 'list' })
        }}
        onOpenHymn={openDetail}
        onAddHymn={() => setView({ name: 'edit', hymnalId: view.id })}
      />
    )
  }
  if (view.name === 'hymnalNew') {
    return (
      <HymnalForm
        onCancel={() => setView({ name: 'list' })}
        onSaved={id => setView({ name: 'hymnal', id })}
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

      {(sub === 'chants' || sub === 'pads' || sub === 'saved') && <p className="muted">Coming soon.</p>}

      {sub === 'hymnals' && (
        <HymnalList onOpen={id => setView({ name: 'hymnal', id })} onNew={() => setView({ name: 'hymnalNew' })} />
      )}

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
                <button className="list-item" onClick={() => openDetail(s.id)}>
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
