import { useEffect, useState } from 'react'
import { buildProgression, KEYS } from '../engine'
import type { KeyName } from '../engine'
import { getPattern, getService, getSong, listPatterns, listServices, seedPatternsIfNeeded } from '../db/db'
import type { Link } from '../links'
import { getRecents } from '../recents'
import { searchAll } from '../search'
import type { SearchResult } from '../search'
import { songLabel } from '../songs'
import type { Pattern, Service } from '../types'
import { todayString } from './ServiceScreen'

const SITUATIONS = [
  { id: 'preaching', label: 'Pastor is preaching', tag: 'preaching', moods: ['peaceful', 'reflective', 'build', 'tension'] },
  { id: 'prayer', label: 'Prayer time', tag: 'prayer', moods: ['peaceful', 'deep', 'intercession'] },
  { id: 'worship', label: 'Worship', tag: 'worship', moods: ['intimate', 'deep', 'spontaneous'] },
  { id: 'altar', label: 'Altar call', tag: 'altar', moods: ['prayer', 'worship', 'peaceful'] }
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface Props {
  go: (l: Link) => void
  onStartService: (id: string) => void
  onPlayPattern: (id: string, key: KeyName) => void
}

export default function HomeScreen({ go, onStartService, onPlayPattern }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [next, setNext] = useState<Service | null>(null)
  const [recents, setRecents] = useState<{ kind: 'song' | 'pattern' | 'service'; id: string; title: string }[]>([])

  useEffect(() => {
    listServices().then(list => {
      const today = todayString()
      const upcoming = list.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))
      setNext(upcoming[0] ?? list[0] ?? null)
    })
    ;(async () => {
      const out: { kind: 'song' | 'pattern' | 'service'; id: string; title: string }[] = []
      for (const r of getRecents()) {
        if (r.kind === 'song') {
          const s = await getSong(r.id)
          if (s) out.push({ kind: 'song', id: s.id, title: songLabel(s) })
        } else if (r.kind === 'pattern') {
          const p = await getPattern(r.id)
          if (p) out.push({ kind: 'pattern', id: p.id, title: p.name })
        } else {
          const sv = await getService(r.id)
          if (sv) out.push({ kind: 'service', id: sv.id, title: sv.name })
        }
      }
      setRecents(out)
    })()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }
    const t = window.setTimeout(() => {
      searchAll(query).then(setResults)
    }, 150)
    return () => window.clearTimeout(t)
  }, [query])

  const open = (r: { kind: string; id: string }) => {
    if (r.kind === 'service') go({ tab: 'service', serviceId: r.id })
    else if (r.kind === 'pattern') go({ tab: 'library', patternId: r.id })
    else go({ tab: 'library', songId: r.id })
  }

  return (
    <div>
      <p className="muted hint">{greeting()}</p>
      <h1>What are you playing today?</h1>

      <input
        className="search-box"
        placeholder="Search songs, hymns, chants, pads…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      {results !== null ? (
        <>
          {results.length === 0 && <p className="muted">No matches for "{query}".</p>}
          <ul className="list">
            {results.map(r => (
              <li key={`${r.kind}:${r.id}`}>
                <button className="list-item" onClick={() => open(r)}>
                  <span className="li-title">{r.title}</span>
                  <span className="li-sub">
                    <span className="badge">{r.kind === 'pattern' ? 'chant / pad' : r.kind}</span> {r.sub}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="small-head">Your next service</h2>
          {next ? (
            <div className="home-card">
              <div className="li-title">{next.name}</div>
              <div className="li-sub">
                {next.date} · {next.items.length} item{next.items.length === 1 ? '' : 's'}
              </div>
              <div className="row gap center">
                <button className="play on" disabled={next.items.length === 0} onClick={() => onStartService(next.id)}>
                  ▶ Start service
                </button>
                <button className="link" onClick={() => go({ tab: 'service', serviceId: next.id })}>Open</button>
              </div>
            </div>
          ) : (
            <div className="home-card">
              <div className="muted">No service planned yet.</div>
              <button className="link" onClick={() => go({ tab: 'service' })}>Plan a service</button>
            </div>
          )}

          {recents.length > 0 && (
            <>
              <h2 className="small-head">Recently played</h2>
              <ul className="list">
                {recents.slice(0, 5).map(r => (
                  <li key={`${r.kind}:${r.id}`}>
                    <button className="list-item" onClick={() => open(r)}>
                      <span className="li-title">{r.title}</span>
                      <span className="li-sub">{r.kind === 'pattern' ? 'chant / pad' : r.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <MoodShortcut onPlayPattern={onPlayPattern} />

          <h2 className="small-head">Quick access</h2>
          <div className="chips">
            <button className="chip" onClick={() => go({ tab: 'library', sub: 'songs' })}>Songs</button>
            <button className="chip" onClick={() => go({ tab: 'library', sub: 'hymnals' })}>Hymnals</button>
            <button className="chip" onClick={() => go({ tab: 'library', sub: 'chants' })}>Chants</button>
            <button className="chip" onClick={() => go({ tab: 'library', sub: 'pads' })}>Pads</button>
            <button className="chip" onClick={() => go({ tab: 'library', sub: 'saved' })}>Saved</button>
            <button className="chip" onClick={() => go({ tab: 'service' })}>Services</button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------- "Chords to play while…" ----------

function MoodShortcut({ onPlayPattern }: { onPlayPattern: (id: string, key: KeyName) => void }) {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [situation, setSituation] = useState('')
  const [mood, setMood] = useState('')
  const [key, setKey] = useState<KeyName>('F')

  useEffect(() => {
    seedPatternsIfNeeded()
      .then(() => listPatterns())
      .then(setPatterns)
  }, [])

  const sit = SITUATIONS.find(s => s.id === situation)

  let matches: Pattern[] = []
  let exact = true
  if (sit && mood) {
    matches = patterns.filter(p => p.moods.includes(sit.tag) && p.moods.includes(mood))
    if (matches.length === 0) {
      exact = false
      matches = patterns.filter(p => p.moods.includes(sit.tag) || p.moods.includes(mood))
    }
    matches = [...matches].sort((a, b) => Number(b.kind === 'pad') - Number(a.kind === 'pad')).slice(0, 5)
  }

  const chordLine = (p: Pattern) => {
    try {
      return buildProgression(key, p.numbers).map(e => e.chord).join(' → ')
    } catch {
      return ''
    }
  }

  return (
    <>
      <h2 className="small-head">Chords to play while…</h2>
      <div className="chips">
        {SITUATIONS.map(s => (
          <button
            key={s.id}
            className={s.id === situation ? 'chip on' : 'chip'}
            onClick={() => {
              setSituation(s.id === situation ? '' : s.id)
              setMood('')
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sit && (
        <div className="chips">
          {sit.moods.map(m => (
            <button key={m} className={m === mood ? 'chip on' : 'chip'} onClick={() => setMood(m === mood ? '' : m)}>
              {m}
            </button>
          ))}
        </div>
      )}

      {sit && mood && (
        <div className="home-card">
          <label className="key-label">
            Key
            <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
              {KEYS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          {!exact && <p className="muted hint">No exact match yet. Closest options:</p>}
          {matches.length === 0 && <p className="muted">Nothing tagged for this yet. Add your own in Library → Pads.</p>}
          {matches.map(p => (
            <div className="mood-row" key={p.id}>
              <div className="grow">
                <div className="li-title">{p.name}</div>
                <div className="li-sub">{p.numbers.replace(/ /g, ' · ')} · {chordLine(p)}</div>
              </div>
              <button className="play on" onClick={() => onPlayPattern(p.id, key)}>▶</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
