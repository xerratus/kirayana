import { describe, expect, it } from 'vitest'
import { initialOrganizer, addNode, addField, saveRecord, deleteNode, deleteRecord, assertOrganizer, emptyView } from './model'
describe('organizer deletion', () => {
  it('removes a nested branch and its content and layout, keeping unrelated content', () => {
    let s = initialOrganizer()
    s = addNode(s, s.rootId, 'entity', 'Work', '#ffffff', { x: 10, y: 20 }); const entity = s.nodes.at(-1)!.id
    s = addNode(s, entity, 'collection', 'Contacts', '#ffffff', { x: 20, y: 30 }); const collection = s.nodes.at(-1)!.id
    s = addField(s, collection, { name: 'Name', type: 'text', required: false, options: [] })
    s = saveRecord(s, collection, { [s.fields[0].id]: 'Jane' })
    s = addNode(s, entity, 'item', 'Notes', '#ffffff', { x: 20, y: 30 }); const item = s.nodes.at(-1)!.id
    s.items[item] = 'Note'; s.viewId = entity; s.views[entity] = emptyView()
    s.views[s.rootId] = { ...emptyView(), panels: { [collection]: { x: 1, y: 2 } }, openPanels: [collection], selectedRecords: { [collection]: s.records[0].id } }
    const result = deleteNode(s, entity)
    expect(result.nodes).toHaveLength(2); expect(result.records).toEqual([]); expect(result.fields).toEqual([]); expect(result.items).toEqual({}); expect(result.viewId).toBe(s.rootId)
    expect(result.views[entity]).toBeUndefined(); expect(result.views[s.rootId].openPanels).toEqual([]); expect(result.views[s.rootId].panels).toEqual({}); assertOrganizer(result)
  })
  it('removes only the record and its selected detail', () => {
    let s = initialOrganizer(); s = addNode(s, s.rootId, 'collection', 'People', '#ffffff', { x: 1, y: 2 }); const id = s.nodes.at(-1)!.id
    s = addField(s, id, { name: 'Name', type: 'text', required: false, options: [] }); s = saveRecord(s, id, { [s.fields[0].id]: 'Jane' }); s = saveRecord(s, id, { [s.fields[0].id]: 'John' })
    s.views[s.rootId].selectedRecords = { [id]: s.records[0].id }
    const result = deleteRecord(s, s.records[0].id)
    expect(result.records).toHaveLength(1); expect(result.records[0]).toEqual(s.records[1]); expect(result.fields).toEqual(s.fields); expect(result.views[s.rootId].selectedRecords).toEqual({}); assertOrganizer(result)
  })
  it('protects the user hub and Skills', () => { const s = initialOrganizer(); for (const n of s.nodes) expect(() => deleteNode(s, n.id)).toThrow('cannot be deleted') })
})
