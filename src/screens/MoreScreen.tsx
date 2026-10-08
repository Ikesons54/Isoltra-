import { useState } from 'react'
import { exportBackup, importBackup } from '../db/db'

export default function MoreScreen() {
  const [message, setMessage] = useState('')
  const [pasted, setPasted] = useState('')

  const say = (m: string) => setMessage(m)

  const download = async () => {
    const text = await exportBackup()
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `isoltra-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    say('Backup file created.')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(await exportBackup())
      say('Backup copied. Paste it into Notes or a message to keep it safe.')
    } catch {
      say('Could not copy. Try the download button instead.')
    }
  }

  const doImport = async (text: string) => {
    try {
      const r = await importBackup(text)
      say(`Imported ${r.songs} song(s) and ${r.services} service(s).`)
      setPasted('')
    } catch (e) {
      say((e as Error).message)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (file) await doImport(await file.text())
  }

  return (
    <div>
      <h1>More</h1>

      <h2 className="small-head">Backup</h2>
      <p className="muted hint">Songs are stored on this device only. Back them up so you can restore or move them.</p>
      <div className="row gap wrap">
        <button className="play on" onClick={download}>Download backup</button>
        <button className="play on" onClick={copy}>Copy backup</button>
      </div>

      <h2 className="small-head">Restore</h2>
      <input type="file" accept="application/json,.json" onChange={e => onFile(e.target.files?.[0])} />
      <textarea
        rows={3}
        placeholder="Or paste backup text here"
        value={pasted}
        onChange={e => setPasted(e.target.value)}
      />
      <button className="play on" disabled={!pasted.trim()} onClick={() => doImport(pasted)}>
        Restore from pasted text
      </button>

      {message && <p className="notice">{message}</p>}

      <p className="powered">Isoltra · Powered by FWX plus</p>
    </div>
  )
}
