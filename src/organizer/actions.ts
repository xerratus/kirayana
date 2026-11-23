import { avoidCanvasCollisions } from '../canvas/canvasInspector'
import { addNode, updateNode, moveNode, addField, saveRecord, saveSkill, palette, type Organizer, type Field, type FieldValue, type Skill } from './model'
export const actions = [
  { command: 'entity', hint: 'Name', description: 'Create an entity' },
  { command: 'collection', hint: 'Name', description: 'Create a List/detail' },
  { command: 'subset', hint: 'Name', description: 'Create a Subset' },
  { command: 'item', hint: 'Name', description: 'Create an Item' },
  { command: 'rename', hint: 'id New name', description: 'Rename an orb' },
  { command: 'color', hint: 'id #4c9df4', description: 'Change an orb color' },
  { command: 'move', hint: 'id parent-id', description: 'Move an orb' },
  { command: 'expand', hint: 'id', description: 'Expand an orb' },
  { command: 'collapse', hint: 'id', description: 'Collapse an orb' },
  { command: 'field', hint: 'collection-id {"name":"Title","type":"text","required":false,"options":[]}', description: 'Add a collection field' },
  { command: 'record', hint: 'collection-id {"field-id":"value"}', description: 'Add a record' },
  { command: 'note', hint: 'item-id Notes', description: 'Update Item notes' },
  { command: 'skill-enable', hint: 'skill-id', description: 'Enable a skill' },
  { command: 'skill-disable', hint: 'skill-id', description: 'Disable a skill' },
]
export function discoverActions(query: string) {
  const words = query.replace(/^\//, '').toLowerCase().trim().split(/\s+/)
  return actions.filter(a => words.every(word => `${a.command} ${a.description}`.toLowerCase().includes(word)))
}
export function runAction(state: Organizer, input: string, parentId = state.viewId): Organizer {
  const match = /^\/([a-z-]+)\s*(.*)$/s.exec(input.trim())
  if (!match) throw new Error('Use / to browse local actions. AI is not connected yet; attached files have not been analyzed.')
  const [, command, args] = match
  if (['entity','collection','subset','item'].includes(command)) {
    const parent = state.nodes.find(n => n.id === parentId)!
    const count = state.nodes.filter(n => n.parentId === parentId).length, angle = -Math.PI / 2 + count * .9
    const preferred = { x: parent.position.x + Math.cos(angle) * 280 - 65, y: parent.position.y + Math.sin(angle) * 280 - 65, width: 130, height: 130 }
    const point = avoidCanvasCollisions(preferred, parent.position, state.nodes.map(n => ({ x: n.position.x - 65, y: n.position.y - 65, width: 130, height: 130 })))
    return addNode(updateNode(state, parentId, { collapsed: false }), parentId, command as 'entity', args, command === 'collection' ? palette[1] : command === 'subset' ? palette[2] : parent.color, { x: point.x + 65, y: point.y + 65 })
  }
  const [id, ...rest] = args.split(/\s+/), value = rest.join(' '), node = state.nodes.find(n => n.id === id)
  if (command === 'skill-enable' || command === 'skill-disable') {
    const skill = state.skills.find(s => s.id === id); if (!skill) throw new Error('Skill not found.')
    return saveSkill(state, { ...skill, enabled: command === 'skill-enable' })
  }
  if (!node) throw new Error('Orb not found. Use its ID from the action directory.')
  switch (command) {
    case 'rename': return updateNode(state, id, { name: value })
    case 'color': if (node.kind === 'item') throw new Error('Items inherit their parent color.'); return updateNode(state, id, { color: value })
    case 'move': return moveNode(state, id, value)
    case 'expand': case 'collapse': return updateNode(state, id, { collapsed: command === 'collapse' })
    case 'field': return addField(state, id, JSON.parse(value) as Omit<Field, 'id' | 'collectionId'>)
    case 'record': return saveRecord(state, id, JSON.parse(value) as Record<string, FieldValue>)
    case 'note': if (node.kind !== 'item') throw new Error('Choose an Item.'); return { ...state, items: { ...state.items, [id]: value } }
    default: throw new Error('Unknown local action. Use / to browse available actions.')
  }
}
export type ActionPlan = { id: string; revision: number; input: string; result: Organizer }
export function previewAction(state: Organizer, input: string): ActionPlan {
  return { id: crypto.randomUUID(), revision: state.revision, input, result: runAction(state, input) }
}
export function applyPlan(state: Organizer, plan: ActionPlan, used: Set<string>): Organizer {
  if (used.has(plan.id)) throw new Error('This action has already been confirmed.')
  if (state.revision !== plan.revision) throw new Error('Your organizer changed. Preview this action again.')
  used.add(plan.id)
  return plan.result
}
export function skillInScope(state: Organizer, skill: Skill) {
  if (!skill.enabled) return false
  if (!skill.scope) return true
  let node = state.nodes.find(n => n.id === state.viewId)
  while (node) { if (node.id === skill.scope) return true; node = state.nodes.find(n => n.id === node!.parentId) }
  return false
}
