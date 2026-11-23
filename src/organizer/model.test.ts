import { describe, expect, it } from 'vitest'
import { addEntity, assertOrganizer, initialOrganizer, updateNode } from './model'

describe('local organizer invariants', () => {
  it('starts with only a user and collapsed Skills, with independent new profiles', () => {
    const state = initialOrganizer()
    assertOrganizer(state)
    expect(state.nodes.map(n => n.kind)).toEqual(['user', 'skills'])
    expect(state.nodes[1].collapsed).toBe(true)
    expect(initialOrganizer().rootId).not.toBe(state.rootId)
  })
  it('keeps parent links and identity when renaming or recoloring an entity', () => {
    const state = initialOrganizer()
    const added = addEntity(state, state.rootId, ' Work ', '#f2ad58', { x: 220, y: 0 })
    const id = added.nodes[2].id
    const edited = updateNode(added, id, { name: 'Projects', color: '#41c7ae' })
    expect(edited.nodes[2]).toMatchObject({ id, parentId: state.rootId, name: 'Projects', color: '#41c7ae' })
    expect(added.nodes[2].name).toBe('Work')
    assertOrganizer(edited)
  })
  it('rejects invalid colors, empty names, and non-finite positions', () => {
    const state = initialOrganizer()
    expect(() => updateNode(state, state.rootId, { name: ' ' })).toThrow()
    expect(() => updateNode(state, state.rootId, { color: 'red' })).toThrow()
    expect(() => updateNode(state, state.rootId, { position: { x: Infinity, y: 0 } })).toThrow()
    expect(() => addEntity(state, state.nodes[1].id, 'No', '#ffffff', { x: 0, y: 0 })).toThrow()
  })
  it('does not accept corrupted relationships or cameras as saved data', () => {
    const state = initialOrganizer()
    const cyclic = structuredClone(state); cyclic.nodes[1].parentId = cyclic.nodes[1].id
    expect(() => assertOrganizer(cyclic)).toThrow('Circular')
    const missing = structuredClone(state); missing.nodes[1].parentId = 'missing'
    expect(() => assertOrganizer(missing)).toThrow('Missing')
    const camera = structuredClone(state); camera.views[state.rootId].camera.zoom = NaN
    expect(() => assertOrganizer(camera)).toThrow('camera')
    expect(() => assertOrganizer({ ...state, schemaVersion: 99 })).toThrow('unsupported')
  })
})
