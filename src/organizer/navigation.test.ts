import { expect, it } from 'vitest'
import { addNode, initialOrganizer } from './model'
import { parentCanvas } from './navigation'
it('returns the main canvas through a Group parent', () => {
  let s = initialOrganizer(); s = addNode(s, s.rootId, 'subset', 'Websites', '#ffffff', { x: 0, y: 0 }); const group = s.nodes.at(-1)!.id
  s = addNode(s, group, 'entity', 'Reddit', '#ffffff', { x: 100, y: 0 })
  expect(parentCanvas(s, s.nodes.at(-1)!.id).id).toBe(s.rootId)
})
it('returns the nearest space canvas for nested Groups and direct spaces', () => {
  let s = initialOrganizer(); s = addNode(s, s.rootId, 'entity', 'Work', '#ffffff', { x: 0, y: 0 }); const work = s.nodes.at(-1)!.id
  s = addNode(s, work, 'entity', 'Direct', '#ffffff', { x: 100, y: 0 }); expect(parentCanvas(s, s.nodes.at(-1)!.id).id).toBe(work)
  s = addNode(s, work, 'subset', 'Websites', '#ffffff', { x: 100, y: 0 }); const group = s.nodes.at(-1)!.id
  s = addNode(s, group, 'entity', 'Reddit', '#ffffff', { x: 200, y: 0 }); expect(parentCanvas(s, s.nodes.at(-1)!.id).id).toBe(work)
  expect(parentCanvas(s, work).id).toBe(s.rootId)
})
