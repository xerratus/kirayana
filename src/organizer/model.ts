import { defaultArcSpacing, pushArcAngles } from '../canvas/arcSpacing'
import { initialCamera, type Camera, type Point } from '../canvas/canvasCamera'

export type Node = { id: string; parentId: string | null; kind: 'user' | 'entity' | 'skills' | 'collection' | 'subset' | 'item'; name: string; color: string; position: Point; collapsed: boolean; itemLabel?: string; values?: Record<string, FieldValue>; anchorAngle?: number; fanOpen?: boolean; fanCollapsed?: boolean; createdAt: string; updatedAt: string }
export type View = { camera: Camera; panels: Record<string, Point>; openPanels: string[]; expandedEntities?: string[]; subPositions?: Record<string, Point>; selectedRecords?: Record<string, string> }
export type LocalAttachment = { id: string; name: string; size: number; blob: Blob }
export type Organizer = { schemaVersion: 3; skills: Skill[]; fields: Field[]; records: CollectionRecord[]; items: Record<string, string>; revision: number; rootId: string; viewId: string; nodes: Node[]; views: Record<string, View>; attachments: LocalAttachment[] }
export type Skill = { id: string; name: string; command: string; description: string; instructions: string; enabled: boolean; version: number; scope: string | null }
export type FieldType = 'text' | 'long-text' | 'number' | 'date' | 'checkbox' | 'select'
export type Field = { id: string; collectionId: string; name: string; type: FieldType; required: boolean; options: string[] }
export type FieldValue = string | number | boolean
export type CollectionRecord = { id: string; collectionId: string; values: Record<string, FieldValue>; revision: number; createdAt: string; updatedAt: string }
export const palette = ['#4c9df4', '#41c7ae', '#f2ad58', '#a68cff', '#5ac3dc', '#cfca6f', '#fa8499']
export const emptyView = (): View => ({ camera: structuredClone(initialCamera), panels: {}, openPanels: [] })
export function initialOrganizer(): Organizer {
  const id = crypto.randomUUID(), time = new Date().toISOString()
  return { schemaVersion: 3, skills: [], fields: [], records: [], items: {}, revision: 0, rootId: id, viewId: id, nodes: [
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
  if (kind === 'subset') {
    const siblings = [...state.nodes.filter(n => n.kind === 'subset' && n.parentId === parentId), node]
    if (siblings.length * defaultArcSpacing > Math.PI * 2) throw new Error('No room for another arc on this entity. Move a Subset to another entity first.')
    const angles = pushArcAngles(siblings.map(n => ({ id: n.id, angle: n.anchorAngle ?? -Math.PI / 3 })), node.id, node.anchorAngle!)
    return { ...state, nodes: [...state.nodes, node].map(n => angles.has(n.id) ? { ...n, anchorAngle: angles.get(n.id)! } : n) }
  }
  return { ...state, nodes: [...state.nodes, node] }
}
export function assertOrganizer(value: unknown): asserts value is Organizer {
  const s = value as Organizer
  if (!s || s.schemaVersion !== 3 || !Number.isInteger(s.revision) || !Array.isArray(s.nodes) || !s.views || !Array.isArray(s.attachments)) throw new Error('The saved organizer has an unsupported format. Your data has not been replaced.')
  const root = s.nodes.find(n => n.id === s.rootId)
  if (!root || root.kind !== 'user' || root.parentId !== null || !s.nodes.some(n => n.id === s.viewId && ['user','entity'].includes(n.kind)) || !s.views[s.viewId] || new Set(s.nodes.map(n => n.id)).size !== s.nodes.length) throw new Error('The saved organizer is invalid. Your data has not been replaced.')
  for (const node of s.nodes) {
    validateName(node.name); validateColor(node.color)
    if (node.itemLabel !== undefined) validateName(node.itemLabel)
    if (node.values) validateFieldValues(s.fields.filter(f => f.collectionId === node.parentId).map(f => ({ ...f, required: false })), node.values)
    if (!['user', 'entity', 'skills', 'collection', 'subset', 'item'].includes(node.kind) || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) throw new Error('Invalid saved entity.')
    const owner = node.parentId ? s.nodes.find(n => n.id === node.parentId) : undefined
    if (node.anchorAngle !== undefined && !Number.isFinite(node.anchorAngle)) throw new Error('Invalid anchor angle.')
    const visited = new Set([node.id]); let parent = node.parentId
    while (parent) { if (visited.has(parent)) throw new Error('Circular entity relationship.'); visited.add(parent); const next = s.nodes.find(n => n.id === parent); if (!next) throw new Error('Missing entity parent.'); parent = next.parentId }
    if (node.id !== s.rootId && (!owner || !['user','entity','subset'].includes(owner.kind) || (owner.kind === 'subset' && node.kind !== 'entity') || node.kind === 'user')) throw new Error('Invalid entity parent.')
  }
  if (!Array.isArray(s.fields) || !Array.isArray(s.records) || !s.items) throw new Error('Invalid organizer content.')
  if (new Set(s.fields.map(f => f.id)).size !== s.fields.length || new Set(s.records.map(r => r.id)).size !== s.records.length) throw new Error('Duplicate content IDs.')
  for (const field of s.fields) { validateName(field.name); if (!Array.isArray(field.options) || field.options.some(option => typeof option !== 'string') || typeof field.required !== 'boolean') throw new Error('Invalid field options.'); }
  for (const [id, notes] of Object.entries(s.items)) if (typeof notes !== 'string' || !s.nodes.some(n => n.id === id && n.kind === 'item')) throw new Error('Invalid Item notes.')
  for (const field of s.fields) if (!s.nodes.some(n => n.id === field.collectionId && ['collection','subset'].includes(n.kind)) || !['text','long-text','number','date','checkbox','select'].includes(field.type)) throw new Error('Invalid collection field.')
  for (const record of s.records) {
    if (!Number.isInteger(record.revision) || record.revision < 1 || !record.values || !s.nodes.some(n => n.id === record.collectionId && n.kind === 'collection') || Object.keys(record.values).some(id => !s.fields.some(f => f.id === id && f.collectionId === record.collectionId))) throw new Error('Invalid collection record.')
    saveRecord({ ...s, fields: s.fields.map(f => ({ ...f, required: false })) }, record.collectionId, record.values, record.id, record.revision)
  }
  if (!Array.isArray(s.skills) || new Set(s.skills.map(skill => skill.id)).size !== s.skills.length) throw new Error('Invalid skills.')
  for (const skill of s.skills) validateSkill(s, skill)
  for (const view of Object.values(s.views)) {
    if (!view.camera || !Number.isFinite(view.camera.zoom) || view.camera.zoom < .5 || view.camera.zoom > 2 || !Number.isFinite(view.camera.pan.x) || !Number.isFinite(view.camera.pan.y) || !view.panels || !Array.isArray(view.openPanels)) throw new Error('Invalid saved camera.')
    for (const p of Object.values(view.panels)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Invalid saved panel.')
  }
}

/** Snapshot migration leaves the original stored data untouched until a valid save succeeds. */
export function migrateOrganizer(value: unknown): Organizer {
  const old = value as { schemaVersion?: number }
  const previous = old?.schemaVersion === 1 ? { ...old, schemaVersion: 3, skills: [], fields: [], records: [], items: {} } : old
  const state = previous?.schemaVersion === 2 ? { ...previous, schemaVersion: 3, skills: [] } : previous
  assertOrganizer(state)
  return state
}
export function nodeColor(state: Organizer, node: Node): string {
  return node.kind === 'item' ? state.nodes.find(n => n.id === node.parentId)?.color ?? node.color : node.color
}
export function addField(state: Organizer, collectionId: string, field: Omit<Field, 'id' | 'collectionId'>): Organizer {
  if (!state.nodes.some(n => n.id === collectionId && ['collection','subset'].includes(n.kind))) throw new Error('Collection not found.')
  if (!['text','long-text','number','date','checkbox','select'].includes(field.type)) throw new Error('Invalid field type.')
  if (state.nodes.some(n => n.id === collectionId && n.kind === 'subset') && field.name.trim().toLowerCase() === 'name') throw new Error('Name is already a required field for every entity.')
  const next = { ...field, name: validateName(field.name), options: field.options.map(v => v.trim()).filter(Boolean) }
  if (next.type === 'select' && !next.options.length) throw new Error('Add at least one option.')
  return { ...state, fields: [...state.fields, { ...next, id: crypto.randomUUID(), collectionId }] }
}
export function removeField(state: Organizer, id: string): Organizer {
  return { ...state, nodes: state.nodes.map(n => { if (!n.values || !(id in n.values)) return n; const values = { ...n.values }; delete values[id]; return { ...n, values } }), fields: state.fields.filter(f => f.id !== id), records: state.records.map(record => { if (record.values[id] === undefined) return record; const values = { ...record.values }; delete values[id]; return { ...record, values, revision: record.revision + 1 } }) }
}
export function editField(state: Organizer, id: string, patch: Omit<Field, 'id' | 'collectionId'>, clearValues = false): Organizer {
  const old = state.fields.find(f => f.id === id)
  if (!old) throw new Error('Field no longer exists.')
  const incompatible = old.type !== patch.type || (patch.type === 'select' && [...state.records, ...state.nodes].some(r => r.values?.[id] !== undefined && !patch.options.includes(String(r.values![id]))))
  if (incompatible && [...state.records, ...state.nodes].some(r => r.values?.[id] !== undefined) && !clearValues) throw new Error('Confirm removing existing values before changing this field type or options.')
  if (patch.type === 'select' && !patch.options.length) throw new Error('Add at least one option.')
  const base = incompatible && clearValues ? removeField(state, id) : state
  return { ...base, fields: incompatible && clearValues ? state.fields.map(f => f.id === id ? { ...old, ...patch, name: validateName(patch.name) } : f) : state.fields.map(f => f.id === id ? { ...f, ...patch, name: validateName(patch.name) } : f) }
}
export function saveRecord(state: Organizer, collectionId: string, values: Record<string, FieldValue>, id?: string, expectedRevision?: number): Organizer {
  if (!state.nodes.some(n => n.id === collectionId && n.kind === 'collection')) throw new Error('Collection not found.')
  const fields = state.fields.filter(f => f.collectionId === collectionId)
  if (!fields.length) throw new Error('Add a field before adding records.')
  const clean = validateFieldValues(fields, values)
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

export function validateSkill(state: Organizer, skill: Skill) {
  validateName(skill.name)
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(skill.command) || typeof skill.instructions !== 'string' || skill.instructions.length > 20000 || typeof skill.description !== 'string' || skill.description.length > 500 || typeof skill.enabled !== 'boolean' || !Number.isInteger(skill.version) || skill.version < 1) throw new Error('Use a unique command with 2–40 lowercase letters, numbers, or hyphens. Instructions support up to 20,000 characters.')
  if (skill.scope && !state.nodes.some(n => n.id === skill.scope && ['user','entity'].includes(n.kind))) throw new Error('Skill scope no longer exists.')
  if (state.skills.some(s => s.id !== skill.id && s.command === skill.command)) throw new Error('A skill already uses this command.')
}
export function saveSkill(state: Organizer, skill: Skill): Organizer {
  validateSkill(state, skill)
  const old = state.skills.find(s => s.id === skill.id)
  if (old && old.version !== skill.version) throw new Error('This skill changed. Reopen it before saving.')
  const next = { ...skill, name: validateName(skill.name), version: (old?.version ?? 0) + 1 }
  return { ...state, skills: old ? state.skills.map(s => s.id === next.id ? next : s) : [...state.skills, next] }
}

export function descendantIds(state: Organizer, id: string): Set<string> {
  const ids = new Set([id])
  for (let pass = 0; pass < state.nodes.length; pass++) for (const node of state.nodes) if (node.parentId && ids.has(node.parentId)) ids.add(node.id)
  return ids
}
export function deleteRecord(state: Organizer, id: string): Organizer {
  if (!state.records.some(r => r.id === id)) throw new Error('Record no longer exists.')
  return { ...state, records: state.records.filter(r => r.id !== id), views: Object.fromEntries(Object.entries(state.views).map(([key, view]) => [key, { ...view, selectedRecords: Object.fromEntries(Object.entries(view.selectedRecords ?? {}).filter(([, value]) => value !== id)) }])) }
}
export function deleteNode(state: Organizer, id: string): Organizer {
  const node = state.nodes.find(n => n.id === id)
  if (!node || ['user','skills'].includes(node.kind)) throw new Error('Your user hub and Skills cannot be deleted.')
  const ids = descendantIds(state, id)
  const keep = <T,>(entries: Record<string, T>) => Object.fromEntries(Object.entries(entries).filter(([key]) => !ids.has(key)))
  return { ...state, nodes: state.nodes.filter(n => !ids.has(n.id)), fields: state.fields.filter(f => !ids.has(f.collectionId)), records: state.records.filter(r => !ids.has(r.collectionId)), items: keep(state.items), skills: state.skills.filter(s => !s.scope || !ids.has(s.scope)), viewId: ids.has(state.viewId) ? state.rootId : state.viewId, views: Object.fromEntries(Object.entries(state.views).filter(([key]) => !ids.has(key)).map(([key, view]) => [key, { ...view, panels: keep(view.panels), subPositions: keep(view.subPositions ?? {}), selectedRecords: keep(view.selectedRecords ?? {}), openPanels: view.openPanels.filter(id => !ids.has(id)), expandedEntities: view.expandedEntities?.filter(id => !ids.has(id)) }])) }
}

export function validateFieldValues(fields: Field[], values: Record<string, FieldValue>) {
  const clean: Record<string, FieldValue> = {}
  if (!fields.length) return clean
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
  return clean
}

export function subsetItemLabel(node: Node) {
  if (node.kind !== 'subset') return 'entity'
  if (node.itemLabel) return node.itemLabel
  const name = node.name.trim().toLowerCase()
  return name.endsWith('ies') ? `${name.slice(0, -3)}y` : name.endsWith('s') && !name.endsWith('ss') ? name.slice(0, -1) : name
}
export function saveEntityValues(state: Organizer, id: string, values: Record<string, FieldValue>): Organizer {
  const node = state.nodes.find(n => n.id === id)
  if (!node || node.kind !== 'entity' || !state.nodes.some(n => n.id === node.parentId && n.kind === 'subset')) throw new Error('Choose an entity inside a Subset.')
  const clean = validateFieldValues(state.fields.filter(f => f.collectionId === node.parentId), values)
  return { ...state, nodes: state.nodes.map(n => n.id === id ? { ...n, values: clean, updatedAt: new Date().toISOString() } : n) }
}
