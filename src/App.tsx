import { useState } from 'react'
import LibraryScreen from './screens/LibraryScreen'
import LiveScreen from './screens/LiveScreen'
import type { LiveTarget } from './screens/LiveScreen'
import MoreScreen from './screens/MoreScreen'

type Tab = 'home' | 'library' | 'service' | 'live' | 'more'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'library', label: 'Library' },
  { id: 'service', label: 'Service' },
  { id: 'live', label: 'Live' },
  { id: 'more', label: 'More' }
]

const PLACEHOLDERS: Record<'home' | 'service', { title: string; text: string }> = {
  home: { title: 'What are you playing today?', text: 'Open Library to add songs, then tap Play to perform them in Live.' },
  service: { title: 'Service', text: 'Build and reorder your Sunday service. Coming soon.' }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [live, setLive] = useState<LiveTarget | null>(null)
  const [stage, setStage] = useState(false)

  const play = (t: LiveTarget) => {
    setLive(t)
    setTab('live')
  }

  return (
    <div className={stage ? 'app stage' : 'app'}>
      {!stage && (
        <header className="top">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
          <span className="brand">Isoltra</span>
        </header>
      )}

      <main className="content">
        {tab === 'library' && <LibraryScreen onPlay={(id, key) => play({ id, key })} />}
        {tab === 'live' && (
          <LiveScreen target={live} stage={stage} setStage={setStage} onPick={play} onClear={() => setLive(null)} />
        )}
        {tab === 'more' && <MoreScreen />}
        {(tab === 'home' || tab === 'service') && (
          <>
            <h1>{PLACEHOLDERS[tab].title}</h1>
            <p>{PLACEHOLDERS[tab].text}</p>
          </>
        )}
      </main>

      {!stage && (
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
