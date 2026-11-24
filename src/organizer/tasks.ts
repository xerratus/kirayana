import type { Organizer, Task } from './model'
function changeTasks(state:Organizer,id:string,update:(tasks:Task[])=>Task[]):Organizer {
 const node=state.nodes.find(node=>node.id===id)
 if(node?.kind!=='tasks')throw new Error('Choose a task list.')
 return {...state,nodes:state.nodes.map(node=>node.id===id ? {...node,tasks:update(node.tasks??[]),updatedAt:new Date().toISOString()} : node)}
}
export function addTask(state:Organizer,id:string,title:string) {
 const clean=title.trim()
 if(!clean || clean.length>280)throw new Error('Use a task between 1 and 280 characters.')
 return changeTasks(state,id,tasks=>[...tasks,{id:crypto.randomUUID(),title:clean,completed:false,createdAt:new Date().toISOString()}])
}
export function toggleTask(state:Organizer,id:string,taskId:string) {
 return changeTasks(state,id,tasks=>tasks.map(task=>task.id===taskId ? {...task,completed:!task.completed} : task))
}
export function deleteTask(state:Organizer,id:string,taskId:string) {
 return changeTasks(state,id,tasks=>tasks.filter(task=>task.id!==taskId))
}
