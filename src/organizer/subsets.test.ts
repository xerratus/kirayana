import { expect, it } from 'vitest'
import { initialOrganizer, addNode, addField, saveEntityValues, editField, removeField, assertOrganizer, subsetItemLabel } from './model'
it('shares editable subset fields across entities with stable field IDs', () => {
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
