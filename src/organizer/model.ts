import { initialCamera, type Camera, type Point } from '../canvas/canvasCamera'

export type Node = { id: string; parentId: string | null; kind: 'user' | 'entity' | 'skills'; name: string; color: string; position: Point; collapsed: boolean; createdAt: string; updatedAt: string }
export type View = { camera: Camera; panels: Record<string, Point>; openPanels: string[] }
export type LocalAttachment = { id: string; name: string; size: number; blob: Blob }
export type Organizer = { schemaVersion: 1; revision: number; rootId: string; viewId: string; nodes: Node[]; views: Record<string, View>; attachments: LocalAttachment[] }
export const palette = ['#4c9df4', '#41c7ae', '#f2ad58', '#a68cff', '#5ac3dc', '#cfca6f', '#fa8499']
export const emptyView = (): View => ({ camera: structuredClone(initialCamera), panels: {}, openPanels: [] })
export function initialOrganizer(): Organizer {
  const id = crypto.randomUUID(), time = new Date().toISOString()
  return { schemaVersion: 1, revision: 0, rootId: id, viewId: id, nodes: [
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
  const parent = state.nodes.find(node => node.id === parentId)
  if (!parent || parent.kind === 'skills') throw new Error('Choose an entity or user hub.')
  const node: Node = { id: crypto.randomUUID(), parentId, kind: 'entity', name: validateName(name), color: validateColor(color), position, collapsed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  return { ...state, nodes: [...state.nodes, node] }
}
export function assertOrganizer(value: unknown): asserts value is Organizer {
  const s = value as Organizer
  if (!s || s.schemaVersion !== 1 || !Number.isInteger(s.revision) || !Array.isArray(s.nodes) || !s.views || !Array.isArray(s.attachments)) throw new Error('The saved organizer has an unsupported format. Your data has not been replaced.')
  const root = s.nodes.find(n => n.id === s.rootId)
  if (!root || root.kind !== 'user' || root.parentId !== null || !s.nodes.some(n => n.id === s.viewId) || new Set(s.nodes.map(n => n.id)).size !== s.nodes.length) throw new Error('The saved organizer is invalid. Your data has not been replaced.')
  for (const node of s.nodes) {
    validateName(node.name); validateColor(node.color)
    if (!['user', 'entity', 'skills'].includes(node.kind) || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) throw new Error('Invalid saved entity.')
    const visited = new Set([node.id]); let parent = node.parentId
    while (parent) { if (visited.has(parent)) throw new Error('Circular entity relationship.'); visited.add(parent); const next = s.nodes.find(n => n.id === parent); if (!next) throw new Error('Missing entity parent.'); parent = next.parentId }
  }
  for (const view of Object.values(s.views)) {
    if (!view.camera || !Number.isFinite(view.camera.zoom) || view.camera.zoom < .5 || view.camera.zoom > 2 || !Number.isFinite(view.camera.pan.x) || !Number.isFinite(view.camera.pan.y) || !view.panels || !Array.isArray(view.openPanels)) throw new Error('Invalid saved camera.')
    for (const p of Object.values(view.panels)) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Invalid saved panel.')
  }
}
