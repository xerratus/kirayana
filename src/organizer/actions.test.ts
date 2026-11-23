import { describe, it, expect } from 'vitest'
import { initialOrganizer, addNode, migrateOrganizer, saveSkill } from './model'
import { runAction, previewAction, applyPlan, skillInScope } from './actions'
import { encodeBackup, decodeBackup } from '../storage/backup'
describe('local actions and skills', () => {
  it('uses the same validation as manual domain operations', () => {
    const s = initialOrganizer(), command = runAction(s, '/collection Contacts')
    expect(command.nodes.at(-1)).toMatchObject({ name: 'Contacts', parentId: s.rootId, kind: 'collection' })
    expect(() => runAction(s, '/entity ')).toThrow('name')
    expect(() => addNode(s, s.rootId, 'entity', '', '#ffffff', { x: 0, y: 0 })).toThrow('name')
    expect(() => runAction(s, `/move ${s.rootId} ${s.rootId}`)).toThrow('destination')
  })
  it('previews without mutations and rejects stale and repeated confirmations', () => {
    const s = initialOrganizer(), plan = previewAction(s, '/entity Work'), used = new Set<string>()
    expect(s.nodes).toHaveLength(2)
    expect(() => applyPlan({ ...s, revision: 1 }, plan, used)).toThrow('changed')
    expect(applyPlan(s, plan, used).nodes).toHaveLength(3)
    expect(() => applyPlan(s, plan, used)).toThrow('already')
  })
  it('saves, scopes and versions skills', () => {
    const s = initialOrganizer(), skill = { id: 'skill', name: 'Weekly plan', command: 'weekly', description: '', instructions: '/entity Week', enabled: true, version: 1, scope: null }
    const saved = saveSkill(s, skill)
    expect(skillInScope(saved, saved.skills[0])).toBe(true)
    const edited = saveSkill(saved, { ...saved.skills[0], enabled: false })
    expect(skillInScope(edited, edited.skills[0])).toBe(false)
    expect(() => saveSkill(edited, saved.skills[0])).toThrow('changed')
    expect(() => saveSkill(saved, { ...skill, id: 'other' })).toThrow('already')
  })
  it('migrates older snapshots without changing IDs or content', () => {
    const s = initialOrganizer(), { skills: _, ...old } = s
    expect(migrateOrganizer({ ...old, schemaVersion: 2 })).toEqual(s)
  })
})
describe('full backup', () => {
  it('round trips content, layout, skills, and file bytes', async () => {
    let s = runAction(initialOrganizer(), '/subset Projects')
    s = addNode(s, s.nodes.at(-1)!.id, 'entity', 'Nested', '#ffffff', { x: 12, y: 25 })
    s.attachments = [{ id: 'file', name: 'notes.txt', size: 3, blob: new Blob(['abc'], { type: 'text/plain' }) }]
    const result = await decodeBackup(await encodeBackup(s))
    expect({ ...result, attachments: [] }).toEqual({ ...s, attachments: [] })
    expect(await result.attachments[0].blob.text()).toBe('abc')
  })
  it('rejects bad relationships, oversized files, and incomplete backups', async () => {
    const s = initialOrganizer(), backup = JSON.parse(await encodeBackup(s))
    backup.organizer.nodes[1].parentId = 'missing'
    await expect(decodeBackup(JSON.stringify(backup))).rejects.toThrow('Missing')
    backup.organizer.attachments = [{ id: 'f', name: 'x', size: 99999999, type: '', data: '' }]
    await expect(decodeBackup(JSON.stringify(backup))).rejects.toThrow('attachment')
    await expect(decodeBackup(JSON.stringify(s))).rejects.toThrow('full Kirayana')
  })
})
