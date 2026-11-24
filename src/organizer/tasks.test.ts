import { expect,it } from 'vitest'
import { addNode, assertOrganizer, deleteNode, initialOrganizer } from './model'
import { addTask, deleteTask, toggleTask } from './tasks'
import { decodeBackup, encodeBackup } from '../storage/backup'
const setup=()=>{const state=initialOrganizer();return addNode(state,state.rootId,'tasks','Tasks','#41c7ae',{x:200,y:100})}
it('adds, completes, restores, and deletes tasks without changing other lists',()=>{
 let state=setup();const id=state.nodes.at(-1)!.id
 state=addTask(state,id,' First task ');state=addTask(state,id,'Second task')
 const first=state.nodes.at(-1)!.tasks![0]
 expect(first.title).toBe('First task')
 state=toggleTask(state,id,first.id);expect(state.nodes.at(-1)!.tasks![0].completed).toBe(true)
 state=toggleTask(state,id,first.id);expect(state.nodes.at(-1)!.tasks![0].completed).toBe(false)
 state=deleteTask(state,id,first.id);expect(state.nodes.at(-1)!.tasks!.map(task=>task.title)).toEqual(['Second task'])
 assertOrganizer(state)
 expect(deleteNode(state,id).nodes.some(node=>node.id===id)).toBe(false)
})
it('preserves task completion in full backups and rejects malformed task data',async()=>{
 let state=setup();const id=state.nodes.at(-1)!.id
 state=addTask(state,id,'Remember');state=toggleTask(state,id,state.nodes.at(-1)!.tasks![0].id)
 const restored=await decodeBackup(await encodeBackup(state))
 expect(restored.nodes.at(-1)!.tasks).toEqual(state.nodes.at(-1)!.tasks)
 const invalid=structuredClone(state);invalid.nodes.at(-1)!.tasks![0].title=''
 expect(()=>assertOrganizer(invalid)).toThrow('Invalid saved tasks.')
 expect(()=>addTask(state,id,' ')).toThrow('Use a task')
 expect(()=>addTask(state,state.rootId,'No')).toThrow('Choose a task list.')
})
