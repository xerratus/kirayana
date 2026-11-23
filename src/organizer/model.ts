import { initialCamera, type Camera, type Point } from '../canvas/canvasCamera'

export type Node = { id: string; parentId: string | null; kind: 'user' | 'entity' | 'skills' | 'collection' | 'subset' | 'item'; name: string; color: string; position: Point; collapsed: boolean; anchorAngle?: number; fanOpen?: boolean; fanCollapsed?: boolean; createdAt: string; updatedAt: string }
export type View = { camera: Camera; panels: Record<string, Point>; openPanels: string[]; expandedEntities?: string[]; subPositions?: Record<string, Point>; selectedRecords?: Record<string, string> }
export type LocalAttachment = { id: string; name: string; size: number; blob: Blob }
export type Organizer = { schemaVersion: 2; fields: Field[]; records: CollectionRecord[]; items: Record<string, string>; revision: number; rootId: string; viewId: string; nodes: Node[]; views: Record<string, View>; attachments: LocalAttachment[] }
export type FieldType = 'text' | 'long-text' | 'number' | 'date' | 'checkbox' | 'select'
export type Field = { id: string; collectionId: string; name: string; type: FieldType; required: boolean; options: string[] }
export type FieldValue = string | number | boolean
export type CollectionRecord = { id: string; collectionId: string; values: Record<string, FieldValue>; revision: number; createdAt: string; updatedAt: string }
export const palette = ['#4c9df4', '#41c7ae', '#f2ad58', '#a68cff', '#5ac3dc', '#cfca6f', '#fa8499']
export const emptyView = (): View => ({ camera: structuredClone(initialCamera), panels: {}, openPanels: [] })
export function initialOrganizer(): Organizer {
  const id = crypto.randomUUID(), time = new Date().toISOString()
  return { schemaVersion: 2, fields: [], records: [], items: {}, revision: 0, rootId: id, viewId: id, nodes: [
    { id, parentId: null, kind: 'user', name: 'You', color: palette[0], position: { x: 0, y: 0 }, collapsed: false, createdAt: time, updatedAt: time },
    { id: crypto.randomUUID(), parentId: id, kind: 'skills', name: 'Skills', color: '#b8a4ef', position: { x: 220, y: -160 }, collapsed: true, createdAt: time, updatedAt: time },
  ], views: { [id]: emptyView() }, attachments: [] }
}
export function validateName(name: string) {
  const clean = name.trim()
  if (!clean || clean.length > 80) throw new Error('Use a name between 1 and 80 characters.')
  return clean
}
export function validateColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Choose a valid color.')
  return color
}
export function updateNode(state: Organizer, id: string, patch: Partial<Pick<Node, 'name' | 'color' | 'position' | 'collapsed'>>) {
  if (!state.nodes.some(node => node.id === id)) throw new Error('This entity no longer exists.')
  if (patch.name !== undefined) patch = { ...patch, name: validateName(patch.name) }
  if (patch.color !== undefined) patch = { ...patch, color: validateColor(patch.color) }
  if (patch.position && (!Number.isFinite(patch.position.x) || !Number.isFinite(patch.position.y))) throw new Error('Invalid position.')
  return { ...state, nodes: state.nodes.map(node => node.id === id ? { ...node, ...patch, updatedAt: new Date().toISOString() } : node) }
}
export function addEntity(state: Organizer, parentId: string, name: string, color: string, position: Point): Organizer {
  return addNode(state, parentId, 'entity', name, color, position)
}
export function addNode(state: Organizer, parentId: string, kind: 'entity' | 'collection' | 'subset' | 'item', name: string, color: string, position: Point): Organizer {
  const parent = state.nodes.find(node => node.id === parentId)
  if (!parent || !['user','entity','subset'].includes(parent.kind) || (parent.kind === 'subset' && kind !== 'entity')) throw new Error('Choose an entity or user hub.')
  if (!['entity','collection','subset','item'].includes(kind)) throw new Error('Invalid branch type.')
  const node: Node = { id: crypto.randomUUID(), parentId, kind, anchorAngle: kind === 'subset' ? -Math.PI / 3 + state.nodes.filter(n => n.parentId === parentId && n.kind === 'subset').length * .8 : kind === 'item' ? Math.PI / 4 + state.nodes.filter(n => n.parentId === parentId && n.kind === 'item').length * .7 : -Math.PI / 3, fanOpen: kind === 'subset', fanCollapsed: false, name: validateName(name), color: validateColor(color), position, collapsed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  return { ...state, nodes: [...state.nodes, node] }
}
export function assertOrganizer(value: unknown): asserts value is Organizer {
  const s = value as Organizer
  if (!s || s.schemaVersion !== 2 || !Number.isInteger(s.revision) || !Array.isArray(s.nodes) || !s.views || !Array.isArray(s.attachments)) throw new Error('The saved organizer has an unsupported format. Your data has not been replaced.')
  const root = s.nodes.find(n => n.id === s.rootId)
  if (!root || root.kind !== 'user' || root.parentId !== null || !s.nodes.some(n => n.id === s.viewId) || new Set(s.nodes.map(n => n.id)).size !== s.nodes.length) throw new Error('The saved organizer is invalid. Your data has not been replaced.')
  for (const node of s.nodes) {
    validateName(node.name); validateColor(node.color)
    if (!['user', 'entity', 'skills', 'collection', 'subset', 'item'].includes(node.kind) || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) throw new Error('Invalid saved entity.')
    const owner = node.parentId ? s.nodes.find(n => n.id === node.parentId) : undefined
    if (node.anchorAngle !== undefined && !Number.isFinite(node.anchorAngle)) throw new Error('Invalid anchor angle.')
    const visited = new Set([node.id]); let parent = node.parentId
    while (parent) { if (visited.has(parent)) throw new Error('Circular entity relationship.'); visited.add(parent); const next = s.nodes.find(n => n.id === parent); if (!next) throw new Error('Missing entity parent.'); parent = next.parentId }
    if (node.id !== s.rootId && (!owner || !['user','entity','subset'].includes(owner.kind) || (owner.kind === 'subset' && node.kind !== 'entity') || node.kind === 'user')) throw new Error('Invalid entity parent.')
  }
  if (!Array.isArray(s.fields) || !Array.isArray(s.records) || !s.items) throw new Error('Invalid organizer content.')
  for (const field of s.fields) if (!s.nodes.some(n => n.id === field.collectionId && n.kind === 'collection') || !['text','long-text','number','date','checkbox','select'].includes(field.type)) throw new Error('Invalid collection field.')
  for (const record of s.records) if (!s.nodes.some(n => n.id === record.collectionId && n.kind === 'collection')) throw new Error('Invalid collection record.')
  for (const view of Object.values(s.views)) {
    if (!view.camera || !Number.isFinite(view.camera.zoom) || view.camera.zoom < .5 || view.camera.zoom > 2 || !Number.isFinite(view.camera.pan.x) || !Number.isFinite(view.camera.pan.y) || !view.panels || !Array.isArray(view.openPanels)) throw new Error('Invalid saved camera.')
    for (const p of Object.values(view.panels)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Invalid saved panel.')
  }
}

/** Snapshot migration leaves the original stored data untouched until a valid save succeeds. */
export function migrateOrganizer(value: unknown): Organizer {
  const old = value as { schemaVersion?: number }
  const state = old?.schemaVersion === 1 ? { ...old, schemaVersion: 2, fields: [], records: [], items: {} } : old
  assertOrganizer(state)
  return state
}
export function nodeColor(state: Organizer, node: Node): string {
  return node.kind === 'item' ? state.nodes.find(n => n.id === node.parentId)?.color ?? node.color : node.color
}
export function addField(state: Organizer, collectionId: string, field: Omit<Field, 'id' | 'collectionId'>): Organizer {
  if (!state.nodes.some(n => n.id === collectionId && n.kind === 'collection')) throw new Error('Collection not found.')
  if (!['text','long-text','number','date','checkbox','select'].includes(field.type)) throw new Error('Invalid field type.')
  const next = { ...field, name: validateName(field.name), options: field.options.map(v => v.trim()).filter(Boolean) }
  if (next.type === 'select' && !next.options.length) throw new Error('Add at least one option.')
  return { ...state, fields: [...state.fields, { ...next, id: crypto.randomUUID(), collectionId }] }
}
export function removeField(state: Organizer, id: string): Organizer {
  return { ...state, fields: state.fields.filter(f => f.id !== id), records: state.records.map(record => { if (record.values[id] === undefined) return record; const values = { ...record.values }; delete values[id]; return { ...record, values, revision: record.revision + 1 } }) }
}
export function editField(state: Organizer, id: string, patch: Omit<Field, 'id' | 'collectionId'>, clearValues = false): Organizer {
  const old = state.fields.find(f => f.id === id)
  if (!old) throw new Error('Field no longer exists.')
  const incompatible = old.type !== patch.type || (patch.type === 'select' && state.records.some(r => r.values[id] !== undefined && !patch.options.includes(String(r.values[id]))))
  if (incompatible && state.records.some(r => r.values[id] !== undefined) && !clearValues) throw new Error('Confirm removing existing values before changing this field type or options.')
  if (patch.type === 'select' && !patch.options.length) throw new Error('Add at least one option.')
  const base = incompatible && clearValues ? removeField(state, id) : state
  return { ...base, fields: incompatible && clearValues ? state.fields.map(f => f.id === id ? { ...old, ...patch, name: validateName(patch.name) } : f) : state.fields.map(f => f.id === id ? { ...f, ...patch, name: validateName(patch.name) } : f) }
}
export function saveRecord(state: Organizer, collectionId: string, values: Record<string, FieldValue>, id?: string, expectedRevision?: number): Organizer {
  if (!state.nodes.some(n => n.id === collectionId && n.kind === 'collection')) throw new Error('Collection not found.')
  const fields = state.fields.filter(f => f.collectionId === collectionId), clean: Record<string, FieldValue> = {}
  if (!fields.length) throw new Error('Add a field before adding records.')
  for (const field of fields) {
    const value = values[field.id]
    if (field.required && (value === undefined || value === '' || (field.type === 'checkbox' && value !== true))) throw new Error(`${field.name} is required.`)
    if (value === undefined || value === '') continue
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`${field.name} must be a number.`)
    if (field.type === 'checkbox' && typeof value !== 'boolean') throw new Error(`${field.name} must be a checkbox value.`)
    if (['text','long-text','date','select'].includes(field.type) && typeof value !== 'string') throw new Error(`${field.name} must be text.`)
    if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(Date.parse(String(value))) || new Date(String(value)).toISOString().slice(0,10) !== value)) throw new Error(`${field.name} must be a date.`)
    if (field.type === 'select' && !field.options.includes(String(value))) throw new Error(`Choose a valid ${field.name}.`)
    clean[field.id] = value
  }
  const old = id ? state.records.find(r => r.id === id && r.collectionId === collectionId) : undefined
  if (id && (!old || old.revision !== expectedRevision)) throw new Error('This record changed. Close and reopen it before saving.')
  const now = new Date().toISOString()
  const record: CollectionRecord = { id: old?.id ?? crypto.randomUUID(), collectionId, values: clean, revision: (old?.revision ?? 0) + 1, createdAt: old?.createdAt ?? now, updatedAt: now }
  return { ...state, records: old ? state.records.map(r => r.id === id ? record : r) : [...state.records, record] }
}
export function moveNode(state: Organizer, id: string, parentId: string): Organizer {
  const node = state.nodes.find(n => n.id === id), parent = state.nodes.find(n => n.id === parentId)
  if (!node || node.kind === 'user' || node.kind === 'skills' || !parent || !['user','entity','subset'].includes(parent.kind) || (parent.kind === 'subset' && node.kind !== 'entity')) throw new Error('Invalid destination.')
  let ancestor: Node | undefined = parent
  while (ancestor) { if (ancestor.id === id) throw new Error('An entity cannot move inside itself.'); ancestor = state.nodes.find(n => n.id === ancestor!.parentId) }
  return { ...state, nodes: state.nodes.map(n => n.id === id ? { ...n, parentId } : n) }
}
