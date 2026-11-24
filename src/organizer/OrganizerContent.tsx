import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useConfirmation } from '../ui/confirmationContext'
import { UiButton, UiIconButton } from '../ui/Controls'
import { CanvasDetailList } from '../canvas/CanvasDetailList'
import { addField, editField, removeField, saveRecord, type CollectionRecord, type Field, type FieldType, type FieldValue, type Node, type Organizer } from './model'
export type Change = (update: (state: Organizer) => Organizer) => void
export const kindLabel = (node: Node) => ({ user: 'Your organizer', entity: 'Space', skills: 'Personal skills', collection: 'Collection', tasks: 'Tasks', subset: 'Group', item: 'Item' })[node.kind]
export function recordTitle(state: Organizer, record: CollectionRecord) {
  const fields = state.fields.filter(f => f.collectionId === record.collectionId)
  const value = fields.map(f => record.values[f.id]).find(v => v !== undefined && v !== '')
  return value === undefined ? 'Untitled record' : String(value)
}
export function RecordSummary({ state, record }: { state: Organizer; record: CollectionRecord }) {
  return <dl className="kirayana-record-summary">{state.fields.filter(f => f.collectionId === record.collectionId).map(field => <div key={field.id}><dt>{field.name}</dt><dd>{typeof record.values[field.id] === 'boolean' ? record.values[field.id] ? 'Yes' : 'No' : String(record.values[field.id] ?? '—')}</dd></div>)}</dl>
}
export function CollectionList({ state, node, selectedId, onSelect, onDelete }: { state: Organizer; node: Node; selectedId?: string; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  const fields = state.fields.filter(f => f.collectionId === node.id)
  return <><CanvasDetailList label={node.name.toLowerCase()} empty={fields.length ? 'No records yet.' : 'Add fields to define this collection.'} selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} items={state.records.filter(r => r.collectionId === node.id).map(record => ({ key: record.id, label: recordTitle(state, record), searchText: Object.values(record.values).join(' '), content: <><strong>{recordTitle(state, record)}</strong><small>{fields.slice(1).map(f => record.values[f.id]).filter(v => v !== undefined).join(' · ')}</small></> }))} /></>
}
export function CollectionEditor({ state, node, change, recordId, onRecordSaved, onDirty }: { state: Organizer; node: Node; change: Change; recordId?: string | null; onRecordSaved: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [fieldEdit, setFieldEdit] = useState<Field | 'new' | null>(null)
  const [newRecord, setNewRecord] = useState(false)
  const fields = state.fields.filter(f => f.collectionId === node.id), record = state.records.find(r => r.id === recordId)
  return <>{record || recordId === 'new' || newRecord ? <RecordEditor key={`${record?.id ?? 'new'}:${record?.revision ?? 0}`} state={state} node={node} record={record} change={change} onDirty={onDirty} onSaved={id => { setNewRecord(false); onRecordSaved(id) }} /> : <><p>Define the fields for {node.name}, then add records.</p><div className="kirayana-inline-actions"><UiButton onClick={() => setFieldEdit('new')}><Plus size={14} />Add field</UiButton><UiButton onClick={() => setNewRecord(true)} disabled={!fields.length}>Add record</UiButton></div><div className="kirayana-field-list">{fields.map(field => <div key={field.id}><span><strong>{field.name}</strong><small>{field.type}{field.required ? ' · Required' : ''}</small></span><UiIconButton label={`Edit ${field.name} field`} onClick={() => setFieldEdit(field)}><Pencil size={15} /></UiIconButton></div>)}</div></>}{fieldEdit && <FieldEditor key={typeof fieldEdit === 'string' ? fieldEdit : fieldEdit.id} state={state} node={node} field={fieldEdit === 'new' ? undefined : fieldEdit} change={change} onClose={() => setFieldEdit(null)} />}</>
}
function RecordEditor({ state, node, record, change, onSaved, onDirty }: { state: Organizer; node: Node; record?: CollectionRecord; change: Change; onSaved: (id: string) => void; onDirty: (dirty: boolean) => void }) {
  const [values, setValues] = useState<Record<string, FieldValue>>(record?.values ?? {}), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const fields = state.fields.filter(f => f.collectionId === node.id)
  const dirty = JSON.stringify(values) !== JSON.stringify(record?.values ?? {})
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  return <form className="kirayana-data-form" onSubmit={event => {
    event.preventDefault(); setError(''); setNotice('')
    try {
      const result = saveRecord(state, node.id, values, record?.id, record?.revision)
      const saved = record?.id ?? result.records[result.records.length - 1].id
      change(s => { if (!record) return { ...s, records: [...s.records, result.records[result.records.length - 1]] }; return saveRecord(s, node.id, values, record.id, record.revision) }); setNotice('Record saved.'); onSaved(saved)
    } catch (error) { setError(String(error instanceof Error ? error.message : error)) }
  }}>
    <h3>{record ? 'Edit record' : 'Add record'}</h3>
    {fields.map(field => <label key={field.id} className="ui-field">{field.name}{field.required ? ' *' : ''}{field.type === 'long-text' ? <textarea required={field.required} value={String(values[field.id] ?? '')} onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))} /> : field.type === 'select' ? <select required={field.required} value={String(values[field.id] ?? '')} onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}><option value="">Select…</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : <input type={field.type === 'checkbox' ? 'checkbox' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} step={field.type === 'number' ? 'any' : undefined} required={field.required} checked={field.type === 'checkbox' ? values[field.id] === true : undefined} value={field.type === 'checkbox' ? undefined : String(values[field.id] ?? '')} onChange={e => setValues(v => ({ ...v, [field.id]: field.type === 'checkbox' ? e.target.checked : field.type === 'number' ? e.target.value === '' ? '' : e.target.valueAsNumber : e.target.value }))} />}</label>)}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<UiButton type="submit" variant="primary" disabled={!fields.length}>Save record</UiButton>
  </form>
}
export function FieldEditor({ state, node, field, change, onClose }: { state: Organizer; node: Node; field?: Field; change: Change; onClose: () => void }) {
  const confirm = useConfirmation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(field?.name ?? ''), [type, setType] = useState<FieldType>(field?.type ?? 'text'), [required, setRequired] = useState(field?.required ?? false), [options, setOptions] = useState(field?.options.join(', ') ?? '')
  const [error, setError] = useState(''), [clear, setClear] = useState(false), [deleting, setDeleting] = useState(false)
  const used = field ? [...state.records, ...state.nodes].filter(r => r.values?.[field.id] !== undefined).length : 0
  useEffect(() => { dialog.current?.showModal() }, [])
  function requestClose() {
    const dirty = name !== (field?.name ?? '') || type !== (field?.type ?? 'text') || required !== (field?.required ?? false) || options !== (field?.options.join(', ') ?? '')
    if (!dirty) { onClose(); return }
    void confirm({ intent: { kind: 'discard', action: 'leave-field-editor', accountId: state.rootId, version: 1 }, title: 'Discard changes?', description: 'Unsaved field changes will be lost.', confirmLabel: 'Discard changes', action: async () => { onClose() } })
  }
  return <dialog ref={dialog} className="ui-form-dialog" aria-labelledby="field-editor-title" onCancel={e => { e.preventDefault(); requestClose() }}><header className="ui-form-dialog-header"><h2 id="field-editor-title">{field ? 'Edit field' : 'Add field'}</h2><UiIconButton label="Close field editor" onClick={requestClose}><X size={18} /></UiIconButton></header><div className="ui-form-dialog-body"><form className="kirayana-data-form" onSubmit={event => {
    event.preventDefault(); setError('')
    try {
      const definition = { name, type, required, options: [...new Set(options.split(',').map(v => v.trim()).filter(Boolean))] }
      const mutate = (s: Organizer) => field ? editField(s, field.id, definition, clear) : addField(s, node.id, definition)
      mutate(state); change(mutate); onClose()
    } catch (error) { setError(error instanceof Error ? error.message : String(error)) }
  }}><label className="ui-field">Field name<input autoFocus required maxLength={80} value={name} onChange={e => setName(e.target.value)} /></label><label className="ui-field">Field type<select value={type} onChange={e => setType(e.target.value as FieldType)}>{(['text','long-text','number','date','checkbox','select'] as const).map(value => <option key={value} value={value}>{value}</option>)}</select></label>{type === 'select' && <label className="ui-field">Options (comma-separated)<input required value={options} onChange={e => setOptions(e.target.value)} /></label>}<label className="kirayana-check"><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />Required</label>{field && used > 0 && (type !== field.type || (type === 'select' && options !== field.options.join(', '))) && <label className="kirayana-check"><input type="checkbox" checked={clear} onChange={e => setClear(e.target.checked)} />Confirm removing existing values from {used} entries if they are incompatible.</label>}{error && <p role="alert">{error}</p>}{deleting ? <div role="alert"><p>Delete {field?.name} and its values from {used} entries? This cannot be undone.</p><UiButton variant="danger" onClick={() => { if (field) change(s => removeField(s, field.id)); onClose() }}>Delete field and values</UiButton><UiButton onClick={() => setDeleting(false)}>Keep field</UiButton></div> : <div className="ui-form-footer">{field ? <UiButton variant="danger" onClick={() => setDeleting(true)}><Trash2 size={14} />Delete field</UiButton> : <UiButton onClick={requestClose}>Cancel</UiButton>}<UiButton type="submit" variant="primary">Save field</UiButton></div>}</form></div></dialog>
}
export function ItemEditor({ state, node, change, onDirty }: { state: Organizer; node: Node; change: Change; onDirty: (dirty: boolean) => void }) {
  const [content, setContent] = useState(state.items[node.id] ?? ''), [saved, setSaved] = useState(false)
  const dirty = content !== (state.items[node.id] ?? '')
  useEffect(() => { onDirty(dirty); return () => onDirty(false) }, [dirty, onDirty])
  return <form className="kirayana-data-form" onSubmit={event => { event.preventDefault(); change(s => ({ ...s, items: { ...s.items, [node.id]: content } })); setSaved(true) }}><label className="ui-field">Notes<textarea rows={10} value={content} onChange={e => { setContent(e.target.value); setSaved(false) }} /></label><UiButton variant="primary" type="submit">Save item</UiButton>{saved && <p role="status">Item saved.</p>}</form>
}
