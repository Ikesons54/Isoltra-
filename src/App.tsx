import { useState } from 'react'
import LibraryScreen from './screens/LibraryScreen'
import MoreScreen from './screens/MoreScreen'

type Tab = 'home' | 'library' | 'service' | 'live' | 'more'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'library', label: 'Library' },
  { id: 'service', label: 'Service' },
  { id: 'live', label: 'Live' },
  { id: 'more', label: 'More' }
]

const PLACEHOLDERS: Record<'home' | 'service' | 'live', { title: string; text: string }> = {
  home: { title: 'What are you playing today?', text: 'Open the Library tab to add and play your songs.' },
  service: { title: 'Service', text: 'Build and reorder your Sunday service. Coming soon.' },
  live: { title: 'Live', text: 'Stage mode: current chord, next chord, numbers and solfa. Coming soon.' }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="app">
      <header className="top">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
        <span className="brand">Isoltra</span>
      </header>

      <main className="content">
        {tab === 'library' && <LibraryScreen />}
        {tab === 'more' && <MoreScreen />}
        {(tab === 'home' || tab === 'service' || tab === 'live') && (
          <>
            <h1>{PLACEHOLDERS[tab].title}</h1>
            <p>{PLACEHOLDERS[tab].text}</p>
          </>
        )}
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
