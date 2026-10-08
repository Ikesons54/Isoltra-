import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LibraryScreen from './screens/LibraryScreen'
import LiveScreen from './screens/LiveScreen'
import type { LiveTarget } from './screens/LiveScreen'
import MoreScreen from './screens/MoreScreen'
import ServiceScreen from './screens/ServiceScreen'

type Tab = 'home' | 'library' | 'service' | 'live' | 'more'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'library', label: 'Library' },
  { id: 'service', label: 'Service' },
  { id: 'live', label: 'Live' },
  { id: 'more', label: 'More' }
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [live, setLive] = useState<LiveTarget | null>(null)
  const [stage, setStage] = useState(false)

  const play = (t: LiveTarget) => {
    setLive(t)
    setTab('live')
  }
  const startService = (id: string) => play({ kind: 'service', id })

  return (
    <div className={stage ? 'app stage' : 'app'}>
      {!stage && (
        <header className="top">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
          <span className="brand">Isoltra</span>
        </header>
      )}

      <main className="content">
        {tab === 'home' && (
          <HomeScreen onStart={startService} goService={() => setTab('service')} goLibrary={() => setTab('library')} />
        )}
        {tab === 'library' && <LibraryScreen
            onPlay={(id, key) => play({ kind: 'song', id, key })}
            onPlayPattern={(id, key) => play({ kind: 'pattern', id, key })}
          />}
        {tab === 'service' && <ServiceScreen onStart={startService} />}
        {tab === 'live' && (
          <LiveScreen target={live} stage={stage} setStage={setStage} onPick={play} onClear={() => setLive(null)} />
        )}
        {tab === 'more' && <MoreScreen />}
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
