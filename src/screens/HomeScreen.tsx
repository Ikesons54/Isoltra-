import { useEffect, useState } from 'react'
import { listServices } from '../db/db'
import type { Service } from '../types'
import { todayString } from './ServiceScreen'

export default function HomeScreen({
  onStart,
  goService,
  goLibrary
}: {
  onStart: (id: string) => void
  goService: () => void
  goLibrary: () => void
}) {
  const [next, setNext] = useState<Service | null>(null)

  useEffect(() => {
    listServices().then(list => {
      const today = todayString()
      const upcoming = list.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))
      setNext(upcoming[0] ?? list[0] ?? null)
    })
  }, [])

  return (
    <div>
      <h1>What are you playing today?</h1>

      <h2 className="small-head">Your next service</h2>
      {next ? (
        <div className="home-card">
          <div className="li-title">{next.name}</div>
          <div className="li-sub">
            {next.date} · {next.items.length} item{next.items.length === 1 ? '' : 's'}
          </div>
          <div className="row gap center">
            <button className="play on" disabled={next.items.length === 0} onClick={() => onStart(next.id)}>
              ▶ Start service
            </button>
            <button className="link" onClick={goService}>Open</button>
          </div>
        </div>
      ) : (
        <div className="home-card">
          <div className="muted">No service planned yet.</div>
          <button className="link" onClick={goService}>Plan a service</button>
        </div>
      )}

      <h2 className="small-head">Quick access</h2>
      <div className="row gap wrap">
        <button className="play" onClick={goLibrary}>Songs</button>
        <button className="play" onClick={goService}>Services</button>
      </div>
    </div>
  )
}
