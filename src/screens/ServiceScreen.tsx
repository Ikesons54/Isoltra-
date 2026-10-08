import { useEffect, useState } from 'react'
import { KEYS } from '../engine'
import type { KeyName } from '../engine'
import { deleteService, getService, listServices, listSongs, saveService, seedIfFirstRun } from '../db/db'
import { newId, normalizeInput } from '../songs'
import type { Service, ServiceItem, Song } from '../types'

const SLOTS = ['Prelude', 'Opening', 'Praise', 'Worship', 'Prayer', 'Preaching', 'Altar', 'Offering', 'Closing']

type View = { name: 'list' } | { name: 'service'; id: string } | { name: 'item'; serviceId: string; itemId?: string }

export function todayString(): string {
  return new Date().toLocaleDateString('en-CA') // yyyy-mm-dd in local time
}

export default function ServiceScreen({ onStart }: { onStart: (id: string) => void }) {
  const [view, setView] = useState<View>({ name: 'list' })

  if (view.name === 'service') {
    return (
      <ServiceEditor
        id={view.id}
        onBack={() => setView({ name: 'list' })}
        onStart={onStart}
        onAddItem={() => setView({ name: 'item', serviceId: view.id })}
        onEditItem={itemId => setView({ name: 'item', serviceId: view.id, itemId })}
        onOpen={id => setView({ name: 'service', id })}
      />
    )
  }
  if (view.name === 'item') {
    return (
      <ItemForm
        serviceId={view.serviceId}
        itemId={view.itemId}
        onDone={() => setView({ name: 'service', id: view.serviceId })}
      />
    )
  }
  return <ServiceList onOpen={id => setView({ name: 'service', id })} />
}

// ---------- List of services ----------

function ServiceList({ onOpen }: { onOpen: (id: string) => void }) {
  const [services, setServices] = useState<Service[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    listServices().then(s => {
      setServices(s)
      setReady(true)
    })
  }, [])

  const create = async () => {
    const now = Date.now()
    const service: Service = { id: newId(), name: 'Sunday Service', date: todayString(), items: [], createdAt: now, updatedAt: now }
    await saveService(service)
    onOpen(service.id)
  }

  return (
    <div>
      <div className="row between">
        <h1>Service</h1>
        <button className="play on" onClick={create}>+ New</button>
      </div>
      {ready && services.length === 0 && (
        <p className="muted">No services yet. Tap + New to plan your first one.</p>
      )}
      <ul className="list">
        {services.map(s => (
          <li key={s.id}>
            <button className="list-item" onClick={() => onOpen(s.id)}>
              <span className="li-title">{s.name}</span>
              <span className="li-sub">
                {s.date} · {s.items.length} item{s.items.length === 1 ? '' : 's'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- One service ----------

function ServiceEditor({
  id,
  onBack,
  onStart,
  onAddItem,
  onEditItem,
  onOpen
}: {
  id: string
  onBack: () => void
  onStart: (id: string) => void
  onAddItem: () => void
  onEditItem: (itemId: string) => void
  onOpen: (id: string) => void
}) {
  const [service, setService] = useState<Service | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    getService(id).then(s => (s ? setService(s) : setMissing(true)))
  }, [id])

  if (missing) {
    return (
      <div>
        <button className="link" onClick={onBack}>← Back</button>
        <p>This service could not be found.</p>
      </div>
    )
  }
  if (!service) return <p className="muted">Loading…</p>

  const commit = (next: Service) => {
    setService(next)
    saveService(next)
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= service.items.length) return
    const items = [...service.items]
    ;[items[index], items[j]] = [items[j], items[index]]
    commit({ ...service, items })
  }

  const remove = (itemId: string) => commit({ ...service, items: service.items.filter(i => i.id !== itemId) })

  const duplicate = async () => {
    const now = Date.now()
    const copy: Service = {
      ...service,
      id: newId(),
      name: `${service.name} (copy)`,
      date: todayString(),
      items: service.items.map(i => ({ ...i, id: newId() })),
      createdAt: now,
      updatedAt: now
    }
    await saveService(copy)
    onOpen(copy.id)
  }

  const removeService = async () => {
    if (window.confirm(`Delete "${service.name}"?`)) {
      await deleteService(service.id)
      onBack()
    }
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onBack}>← Services</button>
        <div className="row gap">
          <button className="link" onClick={duplicate}>Duplicate</button>
          <button className="link danger" onClick={removeService}>Delete</button>
        </div>
      </div>

      <label className="field">
        Service name
        <input value={service.name} onChange={e => commit({ ...service, name: e.target.value })} />
      </label>
      <label className="field">
        Date
        <input type="date" value={service.date} onChange={e => commit({ ...service, date: e.target.value })} />
      </label>

      <button
        className="play on wide"
        disabled={service.items.length === 0}
        onClick={() => onStart(service.id)}
      >
        ▶ Start service
      </button>

      <h2 className="small-head">Order of service</h2>
      {service.items.length === 0 && <p className="muted">No items yet. Add your first one.</p>}

      <ol className="items">
        {service.items.map((item, i) => (
          <li className="item-row" key={item.id}>
            <button className="item-main" onClick={() => onEditItem(item.id)}>
              <span className="item-slot">{item.slot || 'Item'}</span>
              <span className="li-title">{item.title}</span>
              <span className="li-sub">
                Key {item.key}
                {!item.songId && !item.numbers ? ' · no music' : ''}
              </span>
            </button>
            <div className="item-ctl">
              <button className="mini" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button className="mini" onClick={() => move(i, 1)} disabled={i === service.items.length - 1} aria-label="Move down">↓</button>
              <button className="mini danger" onClick={() => remove(item.id)} aria-label="Remove">✕</button>
            </div>
          </li>
        ))}
      </ol>

      <button className="link" onClick={onAddItem}>+ Add item</button>
    </div>
  )
}

// ---------- Add / edit an item ----------

function ItemForm({ serviceId, itemId, onDone }: { serviceId: string; itemId?: string; onDone: () => void }) {
  const [service, setService] = useState<Service | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [slot, setSlot] = useState('Praise')
  const [songId, setSongId] = useState('')
  const [title, setTitle] = useState('')
  const [key, setKey] = useState<KeyName>('F')
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getService(serviceId), seedIfFirstRun().then(listSongs)]).then(([sv, list]) => {
      setSongs(list)
      if (!sv) return
      setService(sv)
      const item = sv.items.find(i => i.id === itemId)
      if (item) {
        setSlot(item.slot)
        setSongId(item.songId ?? '')
        setTitle(item.title)
        setKey(item.key)
        setText(item.numbers ?? '')
        setNotes(item.notes)
      }
    })
  }, [serviceId, itemId])

  if (!service) return <p className="muted">Loading…</p>

  const pickSong = (id: string) => {
    setSongId(id)
    const s = songs.find(x => x.id === id)
    if (s) {
      setTitle(s.title)
      setKey(s.key)
    }
  }

  const save = async () => {
    setError('')
    if (!title.trim() && !songId) return setError('Choose a song or enter a title.')
    let numbers: string | undefined
    if (!songId && text.trim()) {
      try {
        numbers = normalizeInput(text, key)
      } catch (e) {
        return setError((e as Error).message)
      }
    }
    const item: ServiceItem = {
      id: itemId ?? newId(),
      slot: slot.trim(),
      title: title.trim() || songs.find(s => s.id === songId)?.title || 'Untitled',
      songId: songId || undefined,
      key,
      numbers,
      notes: notes.trim()
    }
    const items = itemId ? service.items.map(i => (i.id === itemId ? item : i)) : [...service.items, item]
    await saveService({ ...service, items })
    onDone()
  }

  return (
    <div>
      <div className="row between">
        <button className="link" onClick={onDone}>Cancel</button>
        <button className="play on" onClick={save}>Save</button>
      </div>
      <h1 className="song-title">{itemId ? 'Edit item' : 'Add item'}</h1>

      <label className="field">
        Slot
        <input list="slots" value={slot} onChange={e => setSlot(e.target.value)} placeholder="Praise, Worship, Prayer…" />
      </label>
      <datalist id="slots">
        {SLOTS.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <label className="field">
        Song from your library (optional)
        <select value={songId} onChange={e => pickSong(e.target.value)}>
          <option value="">— none —</option>
          {songs.map(s => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.key})
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Title
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Prayer pad, Hymn 125" />
      </label>

      <label className="field">
        Key
        <select value={key} onChange={e => setKey(e.target.value as KeyName)}>
          {KEYS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </label>

      {!songId && (
        <label className="field">
          Progression (optional)
          <textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="1 4 6 5  or  F Bb Dm C" />
          <span className="hint">For pads, chants and anything not in your library. It plays in Live mode.</span>
        </label>
      )}

      <label className="field">
        Notes (optional)
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}
    </div>
  )
}
