import { expect, it } from 'vitest'
import { addField, addNode, assertOrganizer, initialOrganizer, saveRecord } from './model'
import { collectionSiblings, duplicateCollection } from './duplicateCollection'
function fixture() {
  let s = initialOrganizer(); s = addNode(s, s.rootId, 'subset', 'Websites', '#ffffff', { x: 0, y: 0 }); const subset = s.nodes.at(-1)!.id
  s = addNode(s, subset, 'entity', 'Reddit', '#ffffff', { x: 100, y: 100 }); const reddit = s.nodes.at(-1)!.id
  s = addNode(s, subset, 'entity', 'Solayana', '#ffffff', { x: 300, y: 100 }); const solayana = s.nodes.at(-1)!.id
  s = addNode(s, reddit, 'collection', 'Links', '#41c7ae', { x: 100, y: 400 }); const list = s.nodes.at(-1)!.id
  s = addField(s, list, { name: 'Name', type: 'text', required: true, options: [] }); s = saveRecord(s, list, { [s.fields[0].id]: 'Example' })
  return { s, list, reddit, solayana }
}
it('copies structure to same-subset siblings with independent field IDs', () => {
  const { s, list, solayana } = fixture(), before = structuredClone(s)
  expect(collectionSiblings(s, list).map(n => n.id)).toEqual([solayana])
  const result = duplicateCollection(s, list, [solayana], false), copy = result.nodes.at(-1)!
  expect(s).toEqual(before); expect(copy).toMatchObject({ name: 'Links', color: '#41c7ae', parentId: solayana }); expect(copy.id).not.toBe(list)
  const field = result.fields.find(f => f.collectionId === copy.id)!
  expect(field.id).not.toBe(s.fields[0].id); expect(field.required).toBe(true); expect(result.records).toEqual(s.records); assertOrganizer(result)
})
it('optionally copies records and remaps their field IDs; existing copies are kept', () => {
  const { s, list, solayana } = fixture(), first = duplicateCollection(s, list, [solayana], true), copy = first.nodes.at(-1)!, field = first.fields.find(f => f.collectionId === copy.id)!, record = first.records.at(-1)!
  expect(record.id).not.toBe(s.records[0].id); expect(record.values).toEqual({ [field.id]: 'Example' }); expect(record.collectionId).toBe(copy.id)
  const second = duplicateCollection(first, list, [solayana], true); expect(second.nodes.at(-1)!.name).toBe('Links (copy)'); expect(second.nodes.some(n => n.id === copy.id)).toBe(true); assertOrganizer(second)
})
it('rejects source, duplicate, empty and unrelated targets', () => {
  const { s, list, reddit, solayana } = fixture()
  for (const targets of [[], [reddit], [solayana, solayana], [s.rootId]]) expect(() => duplicateCollection(s, list, targets, false)).toThrow('same Group')
})
