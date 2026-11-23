import { describe, expect, it } from 'vitest'
import { addField, addNode, assertOrganizer, editField, initialOrganizer, migrateOrganizer, moveNode, nodeColor, removeField, saveRecord, updateNode, type FieldType } from './model'
function fixture() {
  let state = initialOrganizer()
  state = addNode(state, state.rootId, 'collection', 'People', '#41c7ae', { x: 300, y: 0 })
  const id = state.nodes.at(-1)!.id
  state = addField(state, id, { name: 'Name', type: 'text', required: true, options: [] })
  return { state, id, field: state.fields[0].id }
}
describe('collections and schema evolution', () => {
  it('preserves values on rename, and requires explicit confirmation for incompatible changes', () => {
    const f = fixture(); let s = saveRecord(f.state, f.id, { [f.field]: 'Jane' })
    s = editField(s, f.field, { name: 'Full name', type: 'text', required: true, options: [] })
    expect(s.records[0].values[f.field]).toBe('Jane')
    expect(() => editField(s, f.field, { name: 'Number', type: 'number', required: false, options: [] })).toThrow('Confirm')
    s = editField(s, f.field, { name: 'Number', type: 'number', required: false, options: [] }, true)
    expect(s.records[0].values[f.field]).toBeUndefined()
    expect(s.fields[0].type).toBe('number')
    assertOrganizer(s)
  })
  it('validates required, number, checkbox, date, and select values; discards unknown fields', () => {
    const f = fixture()
    expect(() => saveRecord(f.state, f.id, {})).toThrow('required')
    let s = f.state
    for (const type of ['number','checkbox','date','select'] as FieldType[]) s=addField(s,f.id,{name:type,type,required:false,options:type==='select'?['One','Two']:[]})
    const [name,number,checkbox,date,select] = s.fields
    for (const [field,value] of [[number,'bad'],[checkbox,'false'],[date,'2026-99-99'],[select,'Three']] as const) expect(()=>saveRecord(s,f.id,{[name.id]:'Jane',[field.id]:value})).toThrow()
    s=saveRecord(s,f.id,{[name.id]:'Jane',[number.id]:3.5,[checkbox.id]:false,[date.id]:'2026-11-23',[select.id]:'One',unknown:'ignored'})
    expect(s.records[0].values.unknown).toBeUndefined()
    expect(s.records[0].values[checkbox.id]).toBe(false)
  })
  it('rejects stale record updates and preserves unrelated records when deleting fields', () => {
    const f = fixture();let s=saveRecord(f.state,f.id,{[f.field]:'First'});const record=s.records[0]
    s=saveRecord(s,f.id,{[f.field]:'Second'},record.id,record.revision)
    expect(()=>saveRecord(s,f.id,{[f.field]:'Overwrite'},record.id,record.revision)).toThrow('changed')
    s=removeField(s,f.field);expect(s.fields).toHaveLength(0);expect(s.records[0].values).toEqual({})
  })
  it('requires confirmation before removing select options used by records',()=>{
    const f=fixture();let s=addField(f.state,f.id,{name:'Status',type:'select',options:['Open','Closed'],required:false});const field=s.fields[1]
    s=saveRecord(s,f.id,{[f.field]:'Jane',[field.id]:'Open'})
    expect(()=>editField(s,field.id,{...field,options:['Closed']})).toThrow('Confirm')
  })
})
describe('nested ownership and local migration',()=>{
  it('rejects cycles and invalid branch parents while allowing nested space subsets',()=>{
    let s=initialOrganizer();s=addNode(s,s.rootId,'subset','Projects','#f2ad58',{x:200,y:0});const subset=s.nodes.at(-1)!.id
    s=addNode(s,subset,'entity','One','#41c7ae',{x:400,y:0});const entity=s.nodes.at(-1)!.id
    s=addNode(s,entity,'subset','Nested','#a68cff',{x:600,y:0});const nested=s.nodes.at(-1)!.id
    expect(()=>moveNode(s,subset,nested)).toThrow();expect(()=>moveNode(s,entity,nested)).toThrow('itself')
    expect(()=>addNode(s,subset,'collection','Invalid','#ffffff',{x:0,y:0})).toThrow()
    assertOrganizer(s)
  })
  it('resolves item colors from their parent after recoloring and moves',()=>{
    let s=initialOrganizer();s=addNode(s,s.rootId,'item','Note','#ff0000',{x:0,y:0});const item=s.nodes.at(-1)!
    s=updateNode(s,s.rootId,{color:'#41c7ae'});expect(nodeColor(s,item)).toBe('#41c7ae')
  })
  it('migrates Phase 1 snapshots without changing identifiers or layout',()=>{
    const s=initialOrganizer();const old={...s,schemaVersion:1,fields:undefined,records:undefined,items:undefined}
    const upgraded=migrateOrganizer(old);expect(upgraded.schemaVersion).toBe(3);expect(upgraded.rootId).toBe(s.rootId);expect(upgraded.nodes).toEqual(s.nodes);expect(upgraded.views).toEqual(s.views);expect(upgraded.fields).toEqual([])
  })
})
