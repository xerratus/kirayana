import {describe,it,expect} from 'vitest'
import {addNode,initialOrganizer,saveRecord,addField} from '../organizer/model'
import {splitOrganizer,joinOrganizer,canonicalJson} from './wire'
describe('hosted wire format',()=>{
 it('ignores jsonb object key reordering while preserving row order',()=>{expect(canonicalJson({b:2,a:{y:1,x:2}})).toBe(canonicalJson({a:{x:2,y:1},b:2}));expect(canonicalJson([1,2])).not.toBe(canonicalJson([2,1]))})
 it('round trips nested groups, schemas, records, tasks, fan anchors, layouts, and file bytes',()=>{
  let state=initialOrganizer();state=addNode(state,state.rootId,'subset','Servers','#41c7ae',{x:100,y:200});const group=state.nodes.at(-1)!
  state=addNode(state,group.id,'entity','Web','#41c7ae',{x:150,y:250});const space=state.nodes.at(-1)!
  space.fanAnchor={angle:1.2,radius:145,orbRadius:23};space.fanPositioned=true
  state=addNode(state,space.id,'collection','Sites','#41c7ae',{x:200,y:100});const collection=state.nodes.at(-1)!
  state=addField(state,collection.id,{name:'Name',type:'text',required:false,options:[]});state=saveRecord(state,collection.id,{[state.fields[0].id]:'Example'})
  state=addNode(state,space.id,'tasks','Tasks','#41c7ae',{x:50,y:100});state.nodes.at(-1)!.tasks=[{id:crypto.randomUUID(),title:'Ship',completed:true,createdAt:new Date().toISOString()}]
  state.views[state.rootId].expandedEntities=[space.id];state.views[state.rootId].subPositions={[space.id]:{x:200,y:100}}
  const blob=new Blob(['hello']);state.attachments=[{id:crypto.randomUUID(),name:'file.txt',size:5,blob}]
  const files=[{id:state.attachments[0].id,name:'file.txt',size:5,type:'',path:'owner/file/hash'}]
  const {content,layout}=splitOrganizer(state,files)
  expect(joinOrganizer(content,layout,state.revision,state.attachments)).toEqual(state)
  expect(content.nodes[0]).not.toHaveProperty('position');expect(content).not.toHaveProperty('views')
 })
 it('camera, orb moves, and fan changes leave content unchanged',()=>{
  const state=initialOrganizer(),before=splitOrganizer(state,[])
  const next=structuredClone(state);next.revision++;next.nodes[0].position.x+=4;next.nodes[0].updatedAt=new Date(Date.now()+1000).toISOString();next.nodes[0].collapsed=true;next.views[next.rootId].camera.pan.x=40
  const after=splitOrganizer(next,[]);expect(after.content).toEqual(before.content);expect(after.layout).not.toEqual(before.layout)
 })
})
