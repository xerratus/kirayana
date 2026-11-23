import { useCallback, useEffect, useRef, useState } from 'react'
import { brand } from './brand'
import { CanvasWorkspace } from '../canvas/CanvasWorkspace'
import { initialOrganizer, type Organizer } from '../organizer/model'
import { createLocalRepository } from '../storage/indexedDb'
import type { OrganizerRepository } from '../storage/repository'

export function App() {
  const [state, setState] = useState<Organizer | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Loading browser storage…')
  const repository = useRef<OrganizerRepository | null>(null)
  useEffect(() => {
    let active = true
    try {
      const repo = createLocalRepository(); repository.current = repo
      void repo.load().then(async saved => {
        const current = saved ?? initialOrganizer()
        if (!saved) await repo.save(current)
        if (active) { setState(current); setStatus('Saved in this browser') }
      }).catch(cause => { if (active) { setError(String(cause)); setStatus('Storage unavailable') } })
    } catch (cause) { setError(String(cause)); setStatus('Storage unavailable') }
    return () => { active = false; repository.current?.close() }
  }, [])
  useEffect(() => {
    if (!state) return
    const timer = window.setTimeout(() => {
      setStatus('Saving…')
      void repository.current?.save(state).then(() => { setStatus('Saved in this browser'); setError('') }).catch(cause => { setError(String(cause)); setStatus('Unsaved changes') })
    }, 180)
    return () => clearTimeout(timer)
  }, [state])
  const change = useCallback((update: (current: Organizer) => Organizer) => {
    setStatus('Saving…')
    setState(current => { if (!current) return current; const next = update(current); return { ...next, revision: current.revision + 1 } })
  }, [])
  useEffect(() => {
    if (status !== 'Saving…' && status !== 'Unsaved changes') return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])
  return state ? <CanvasWorkspace state={state} change={change} storageStatus={status} storageError={error} /> : <main className="kirayana-loading" role={error ? 'alert' : 'status'}><h1>{brand.name}</h1><p>{error || status}</p>{error && <button type="button" onClick={() => location.reload()}>Retry</button>}</main>
}
