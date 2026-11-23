import { expect, it } from 'vitest'
import { addField, addNode, assertOrganizer, initialOrganizer } from './model'
import { seedServersFan } from './developmentFixtures'
it('adds 25 demo Spaces to existing Servers once, preserving existing data', () => {
  let state = initialOrganizer(); expect(seedServersFan(state)).toBe(state)
  state = addNode(state, state.rootId, 'subset', 'Servers', '#f2ad58', { x: 0, y: 0 }); const group = state.nodes.at(-1)!.id
  state = addField(state, group, { name: 'URL', type: 'text', required: true, options: [] })
  state = addNode(state, group, 'entity', 'Existing server', '#ffffff', { x: 100, y: 100 })
  const next = seedServersFan(state)
  expect(next.nodes.filter(n => n.parentId === group)).toHaveLength(26)
  expect(next.nodes.find(n => n.name === 'Existing server')).toEqual(state.nodes.at(-1))
  expect(seedServersFan(next)).toBe(next); expect(next.views).toEqual(state.views); assertOrganizer(next)
})
