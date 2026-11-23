import type { Node, Organizer } from './model'
export function parentCanvas(state: Organizer, id: string): Node {
  const visited = new Set([id])
  let parentId = state.nodes.find(n => n.id === id)?.parentId
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = state.nodes.find(n => n.id === parentId)
    if (!parent) break
    if (parent.kind === 'entity' || parent.kind === 'user') return parent
    parentId = parent.parentId
  }
  return state.nodes.find(n => n.id === state.rootId)!
}
