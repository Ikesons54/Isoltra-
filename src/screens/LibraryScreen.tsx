import { useEffect, useState } from 'react'
import { getPattern, getSong, listSaved, listSongs, seedIfFirstRun } from '../db/db'
import type { KeyName } from '../engine'
import type { Link, Sub } from '../links'
import { songLabel } from '../songs'
import type { Song } from '../types'
import { HymnalForm, HymnalList, HymnList } from './HymnalsPanel'
import PatternsPanel, { PatternDetail, PatternEditor } from './PatternsPanel'
import SongDetail from './SongDetail'
import SongEditor from './SongEditor'

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id?: string; hymnalId?: string }
  | { name: 'hymnal'; id: string }
  | { name: 'hymnalNew' }
  | { name: 'pattern'; id: string }
  | { name: 'patternEdit'; id: string }

const SUBS: { id: Sub; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'hymnals', label: 'Hymnals' },
  { id: 'chants', label: 'Chants' },
  { id: 'pads', label: 'Pads' },
  { id: 'saved', label: 'Saved' }
]

interface Props {
  onPlay: (id: string, key: KeyName) => void
  onPlayPattern: (id: string, key: KeyName) => void
  link: Link | null
  onLinkHandled: () => void
}

export default function LibraryScreen({ onPlay, onPlayPattern, link, onLinkHandled }: Props) {
  const [view, setView] = useState<View>({ name: 'list' })
  const [back, setBack] = useState<View>({ name: 'list' })
  const [sub, setSub] = useState<Sub>('songs')
  const [songs, setSongs] = useState<Song[]>([])
  const [query, setQuery] = useState('')
  const [ready, setReady] = useState(false)

  // jump here from Home (search results, recently played, quick access)
  useEffect(() => {
    if (!link || link.tab !== 'library') return
    if (link.sub) setSub(link.sub)
    setBack({ name: 'list' })
    if (link.songId) setView({ name: 'detail', id: link.songId })
    else if (link.patternId) setView({ name: 'pattern', id: link.patternId })
    else setView({ name: 'list' })
    onLinkHandled()
  }, [link])

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
  const openPattern = (id: string) => {
    setBack(view)
    setView({ name: 'pattern', id })
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
  if (view.name === 'pattern') {
    return (
      <PatternDetail
        id={view.id}
        onBack={() => setView(back)}
        onEdit={() => setView({ name: 'patternEdit', id: view.id })}
        onPlay={onPlayPattern}
      />
    )
  }
  if (view.name === 'patternEdit') {
    return (
      <PatternEditor
        id={view.id}
        kind="chant"
        onCancel={() => setView({ name: 'pattern', id: view.id })}
        onSaved={id => setView({ name: 'pattern', id })}
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
    return <HymnalForm onCancel={() => setView({ name: 'list' })} onSaved={id => setView({ name: 'hymnal', id })} />
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

      {sub === 'saved' && <SavedList onOpenSong={openDetail} onOpenPattern={openPattern} />}

      {(sub === 'chants' || sub === 'pads') && (
        <PatternsPanel key={sub} kind={sub === 'chants' ? 'chant' : 'pad'} onPlay={onPlayPattern} />
      )}

      {sub === 'hymnals' && (
        <HymnalList onOpen={id => setView({ name: 'hymnal', id })} onNew={() => setView({ name: 'hymnalNew' })} />
      )}

      {sub === 'songs' && (
        <>
          <div className="row gap">
            <input className="grow" placeholder="Search songs…" value={query} onChange={e => setQuery(e.target.value)} />
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

// ---------- Saved items ----------

function SavedList({ onOpenSong, onOpenPattern }: { onOpenSong: (id: string) => void; onOpenPattern: (id: string) => void }) {
  const [rows, setRows] = useState<{ kind: 'song' | 'pattern'; id: string; title: string; sub: string }[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const out: { kind: 'song' | 'pattern'; id: string; title: string; sub: string }[] = []
      for (const it of await listSaved()) {
        if (it.kind === 'song') {
          const s = await getSong(it.refId)
          if (s) out.push({ kind: 'song', id: s.id, title: songLabel(s), sub: `${s.hymnalId ? 'Hymn' : 'Song'} · Key ${s.key}` })
        } else {
          const p = await getPattern(it.refId)
          if (p) out.push({ kind: 'pattern', id: p.id, title: p.name, sub: `${p.kind === 'pad' ? 'Pad' : 'Chant'} · ${p.moods.join(', ')}` })
        }
      }
      setRows(out)
      setReady(true)
    })()
  }, [])

  return (
    <div>
      {ready && rows.length === 0 && <p className="muted">Nothing saved yet. Tap the star ☆ on any song, hymn, chant or pad.</p>}
      <ul className="list">
        {rows.map(r => (
          <li key={`${r.kind}:${r.id}`}>
            <button className="list-item" onClick={() => (r.kind === 'song' ? onOpenSong(r.id) : onOpenPattern(r.id))}>
              <span className="li-title">★ {r.title}</span>
              <span className="li-sub">{r.sub}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
