import { useEffect, useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LibraryScreen from './screens/LibraryScreen'
import LiveScreen from './screens/LiveScreen'
import type { LiveTarget } from './screens/LiveScreen'
import MoreScreen from './screens/MoreScreen'
import ServiceScreen from './screens/ServiceScreen'
import type { Link } from './links'
import { addRecent } from './recents'

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
  const [link, setLink] = useState<Link | null>(null)
  const [splash, setSplash] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setSplash(false), 1500)
    return () => window.clearTimeout(t)
  }, [])

  const play = (t: LiveTarget) => {
    addRecent(t.kind, t.id)
    setLive(t)
    setTab('live')
  }
  const go = (l: Link) => {
    setLink(l)
    setTab(l.tab)
  }
  const clearLink = () => setLink(null)

  return (
    <div className={stage ? 'app stage' : 'app'}>
      {splash && (
        <div className="splash" onClick={() => setSplash(false)}>
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={96} height={96} />
          <div className="splash-name">Isoltra</div>
          <div className="splash-tag">Music in sync. Worship in flow.</div>
          <div className="splash-powered">Powered by FWX plus</div>
        </div>
      )}

      {!stage && (
        <header className="top">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={28} height={28} />
          <span className="brand">Isoltra</span>
        </header>
      )}

      <main className="content">
        {tab === 'home' && (
          <HomeScreen
            go={go}
            onStartService={id => play({ kind: 'service', id })}
            onPlayPattern={(id, key) => play({ kind: 'pattern', id, key })}
          />
        )}
        {tab === 'library' && (
          <LibraryScreen
            onPlay={(id, key) => play({ kind: 'song', id, key })}
            onPlayPattern={(id, key) => play({ kind: 'pattern', id, key })}
            link={link}
            onLinkHandled={clearLink}
          />
        )}
        {tab === 'service' && (
          <ServiceScreen
            onStart={id => play({ kind: 'service', id })}
            openId={link && link.tab === 'service' ? link.serviceId : undefined}
            onOpened={clearLink}
          />
        )}
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
