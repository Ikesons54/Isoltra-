import { useState } from 'react'

type Tab = 'home' | 'library' | 'service' | 'live' | 'more'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'library', label: 'Library' },
  { id: 'service', label: 'Service' },
  { id: 'live', label: 'Live' },
  { id: 'more', label: 'More' }
]

const PLACEHOLDERS: Record<Tab, { title: string; text: string }> = {
  home: { title: 'What are you playing today?', text: 'Search, quick access and your next service will appear here.' },
  library: { title: 'Library', text: 'Songs, Hymnals, Chants, Pads and Saved.' },
  service: { title: 'Service', text: 'Build and reorder your Sunday service.' },
  live: { title: 'Live', text: 'Stage mode: current chord, next chord, numbers and solfa.' },
  more: { title: 'More', text: 'Settings, backup and about.' }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const page = PLACEHOLDERS[tab]

  return (
    <div className="app">
      <header className="top">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
        <span className="brand">Isoltra</span>
      </header>

      <main className="content">
        <h1>{page.title}</h1>
        <p>{page.text}</p>
        {tab === 'more' && <p className="powered">Powered by FWX plus</p>}
      </main>

      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
