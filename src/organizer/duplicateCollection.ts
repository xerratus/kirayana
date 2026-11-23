import { avoidCanvasCollisions } from '../canvas/canvasInspector'
import { type Node, type Organizer } from './model'
export function collectionSiblings(state: Organizer, collectionId: string): Node[] {
  const list = state.nodes.find(n => n.id === collectionId && n.kind === 'collection')
  const owner = state.nodes.find(n => n.id === list?.parentId && n.kind === 'entity')
  const subset = state.nodes.find(n => n.id === owner?.parentId && n.kind === 'subset')
  return subset ? state.nodes.filter(n => n.kind === 'entity' && n.parentId === subset.id && n.id !== owner!.id) : []
}
export function duplicateCollectionLabel(state: Organizer, collectionId: string): string {
  const list = state.nodes.find(n => n.id === collectionId)
  const owner = state.nodes.find(n => n.id === list?.parentId)
  const subset = state.nodes.find(n => n.id === owner?.parentId && n.kind === 'subset')
  return `Duplicate to all ${subset?.name ?? 'entities'}`
}
/** Independent copies. Existing lists, values, and layouts are never overwritten. */
export function duplicateCollection(state: Organizer, id: string, targetIds: string[], includeRecords: boolean): Organizer {
  const source = state.nodes.find(n => n.id === id && n.kind === 'collection')
  const allowed = new Set(collectionSiblings(state, id).map(n => n.id))
  if (!source || !targetIds.length || new Set(targetIds).size !== targetIds.length || targetIds.some(id => !allowed.has(id))) throw new Error('Select other entities in the same Subset.')
  const owner = state.nodes.find(n => n.id === source.parentId)!
  const sourceFields = state.fields.filter(f => f.collectionId === id), sourceRecords = state.records.filter(r => r.collectionId === id)
  let result = state
  for (const targetId of targetIds) {
    const target = state.nodes.find(n => n.id === targetId)!, copyId = crypto.randomUUID(), now = new Date().toISOString()
    const usedNames = new Set(result.nodes.filter(n => n.parentId === targetId).map(n => n.name.toLowerCase()))
    let name = source.name, count = 1
    while (usedNames.has(name.toLowerCase())) { const suffix = count === 1 ? ' (copy)' : ` (copy ${count})`; name = source.name.slice(0, 80 - suffix.length) + suffix; count++ }
    const preferred = { x: target.position.x + source.position.x - owner.position.x - 65, y: target.position.y + source.position.y - owner.position.y - 65, width: 130, height: 130 }
    const point = avoidCanvasCollisions(preferred, target.position, result.nodes.map(n => ({ x: n.position.x - 65, y: n.position.y - 65, width: 130, height: 130 })))
    const node: Node = { ...source, id: copyId, parentId: targetId, name, position: { x: point.x + 65, y: point.y + 65 }, collapsed: false, createdAt: now, updatedAt: now }
    const fieldIds = new Map(sourceFields.map(f => [f.id, crypto.randomUUID()]))
    const fields = sourceFields.map(f => ({ ...f, id: fieldIds.get(f.id)!, collectionId: copyId, options: [...f.options] }))
    const records = includeRecords ? sourceRecords.map(r => ({ ...r, id: crypto.randomUUID(), collectionId: copyId, values: Object.fromEntries(Object.entries(r.values).map(([key, value]) => [fieldIds.get(key)!, value])), revision: 1, createdAt: now, updatedAt: now })) : []
    result = { ...result, nodes: [...result.nodes, node], fields: [...result.fields, ...fields], records: [...result.records, ...records] }
  }
  return result
}
