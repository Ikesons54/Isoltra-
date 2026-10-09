import { listPatterns, listServices, listSongs, seedHymnalsIfNeeded, seedIfFirstRun, seedPatternsIfNeeded } from './db/db'
import { songLabel } from './songs'

export interface SearchResult {
  kind: 'song' | 'hymn' | 'pattern' | 'service'
  id: string
  title: string
  sub: string
}

/** One search across songs, hymns, chants, pads and services. */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  await seedIfFirstRun()
  await seedHymnalsIfNeeded()
  await seedPatternsIfNeeded()
  const [songs, patterns, services] = await Promise.all([listSongs(), listPatterns(), listServices()])
  const out: SearchResult[] = []

  for (const s of songs) {
    const isHymn = !!s.hymnalId
    const hit = isHymn
      ? String(s.hymnNumber ?? '').startsWith(q) ||
        `${s.title} ${s.firstLine ?? ''}`.toLowerCase().includes(q)
      : `${s.title} ${s.artist}`.toLowerCase().includes(q)
    if (hit) {
      out.push({
        kind: isHymn ? 'hymn' : 'song',
        id: s.id,
        title: songLabel(s),
        sub: `Key ${s.key}${s.artist ? ` · ${s.artist}` : ''}`
      })
    }
  }
  for (const p of patterns) {
    if (`${p.name} ${p.moods.join(' ')} ${p.description}`.toLowerCase().includes(q)) {
      out.push({ kind: 'pattern', id: p.id, title: p.name, sub: `${p.kind === 'pad' ? 'Pad' : 'Chant'} · ${p.moods.join(', ')}` })
    }
  }
  for (const sv of services) {
    if (sv.name.toLowerCase().includes(q) || sv.date.includes(q)) {
      out.push({ kind: 'service', id: sv.id, title: sv.name, sub: `${sv.date} · ${sv.items.length} items` })
    }
  }
  return out
}
