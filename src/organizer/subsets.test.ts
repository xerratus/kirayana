import { expect, it } from 'vitest'
import { initialOrganizer, addNode, addField, saveEntityValues, editField, removeField, assertOrganizer, subsetItemLabel } from './model'
it('shares editable subset fields across spaces with stable field IDs', () => {
  let s = initialOrganizer(); s = addNode(s, s.rootId, 'subset', 'Websites', '#ffffff', { x: 0, y: 0 }); const subset = s.nodes.at(-1)!
  expect(subsetItemLabel(subset)).toBe('website')
  s = addField(s, subset.id, { name: 'URL', type: 'text', required: true, options: [] }); const field = s.fields[0]
  s = addNode(s, subset.id, 'entity', 'Home', '#ffffff', { x: 10, y: 20 }); const entity = s.nodes.at(-1)!.id
  expect(() => saveEntityValues(s, entity, {})).toThrow('URL is required')
  s = saveEntityValues(s, entity, { [field.id]: 'https://example.com' }); assertOrganizer(s)
  s = editField(s, field.id, { ...field, name: 'Web address' })
  expect(s.nodes.find(n => n.id === entity)!.values![field.id]).toBe('https://example.com')
  expect(() => editField(s, field.id, { ...field, type: 'number' })).toThrow('Confirm')
  s = removeField(s, field.id); expect(s.nodes.find(n => n.id === entity)!.values).toEqual({}); assertOrganizer(s)
})
it('places new Group orbs along their arc direction and searches outward around obstacles', () => {
  let s = initialOrganizer(); const parent = s.nodes[0]
  const angle = -Math.PI / 3
  s = addNode(s, parent.id, 'collection', 'Obstacle', '#ffffff', { x: Math.cos(angle) * 280, y: Math.sin(angle) * 280 })
  s = addNode(s, parent.id, 'subset', 'Websites', '#ffffff', { x: -280, y: 280 })
  const group = s.nodes.at(-1)!, direction = Math.atan2(group.position.y - parent.position.y, group.position.x - parent.position.x)
  expect(direction).toBeCloseTo(group.anchorAngle!)
  expect(Math.hypot(group.position.x, group.position.y)).toBeGreaterThan(280)
  for (let i = 0; i < 3; i++) {
    s = addNode(s, parent.id, 'subset', `Group ${i}`, '#ffffff', { x: -280, y: 0 })
    const added = s.nodes.at(-1)!
    expect(Math.atan2(added.position.y - parent.position.y, added.position.x - parent.position.x)).toBeCloseTo(added.anchorAngle!)
  }
})
