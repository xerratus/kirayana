import { useEffect, useRef, useState } from 'react'
import { Copy, X } from 'lucide-react'
import { UiButton, UiIconButton } from '../ui/Controls'
import { collectionSiblings, duplicateCollection } from './duplicateCollection'
import type { Node, Organizer } from './model'
import type { Change } from './OrganizerContent'
export function DuplicateCollectionDialog({ state, node, change, onClose }: { state: Organizer; node: Node; change: Change; onClose: () => void }) {
  const targets = collectionSiblings(state, node.id), dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState(targets.map(n => n.id)), [includeRecords, setIncludeRecords] = useState(false), [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  const owner = state.nodes.find(n => n.id === node.parentId), subset = state.nodes.find(n => n.id === owner?.parentId)
  return <dialog ref={dialog} className="ui-form-dialog" aria-labelledby="duplicate-list-title" onCancel={event => { event.preventDefault(); onClose() }}><header className="ui-form-dialog-header"><h2 id="duplicate-list-title">Duplicate {node.name}</h2><UiIconButton label="Close duplicate dialog" onClick={onClose}><X size={18} /></UiIconButton></header><div className="ui-form-dialog-body"><form className="kirayana-data-form" onSubmit={event => {
    event.preventDefault(); setError('')
    try { const next = duplicateCollection(state, node.id, selected, includeRecords); change(() => next); onClose() } catch (error) { setError(error instanceof Error ? error.message : String(error)) }
  }}><p>Copy this collection and its fields from {owner?.name} to other entities in {subset?.name}. Copies can be edited independently. Existing collections are kept; duplicate names get a “copy” suffix.</p><fieldset className="kirayana-data-form"><legend>Copy to</legend>{targets.map(target => <label className="kirayana-check" key={target.id}><input type="checkbox" checked={selected.includes(target.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, target.id] : ids.filter(id => id !== target.id))} />{target.name}</label>)}</fieldset><label className="kirayana-check"><input type="checkbox" checked={includeRecords} onChange={event => setIncludeRecords(event.target.checked)} />Also copy existing records ({state.records.filter(r => r.collectionId === node.id).length})</label><p>Without records, each copy starts empty with the same fields and color.</p>{error && <p role="alert">{error}</p>}<div className="ui-form-footer"><UiButton onClick={onClose}>Cancel</UiButton><UiButton variant="primary" type="submit" disabled={!selected.length}><Copy size={16} />Duplicate to {selected.length} {selected.length === 1 ? 'entity' : 'entities'}</UiButton></div></form></div></dialog>
}
