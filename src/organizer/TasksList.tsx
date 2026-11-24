import { useState } from 'react'
import { Check, Trash2, Undo2 } from 'lucide-react'
import { UiToggle } from '../ui/UiToggle'
import { UiIconButton } from '../ui/Controls'
import { useConfirmation } from '../ui/confirmationContext'
import { addTask, deleteTask, toggleTask } from './tasks'
import type { Node, Organizer } from './model'
export function TasksList({node,change}:{node:Node;change:(update:(state:Organizer)=>Organizer)=>void}) {
 const [title,setTitle]=useState(''),[showCompleted,setShowCompleted]=useState(false),[error,setError]=useState('')
 const confirm=useConfirmation(),tasks=node.tasks??[],completed=tasks.filter(task=>task.completed).length
 return <div className="kirayana-tasks">
  <form className="kirayana-task-add" onSubmit={event=>{event.preventDefault();try{const value=title;change(state=>addTask(state,node.id,value));setTitle('');setError('')}catch(error){setError(String(error instanceof Error ? error.message : error))}}}>
   <input className="canvas-detail-search" aria-label="New task" placeholder="Add a task…" maxLength={280} required value={title} onChange={event=>setTitle(event.target.value)}/>
  </form>
  <UiToggle className="kirayana-task-toggle" label={`Show completed (${completed})`} checked={showCompleted} onCheckedChange={setShowCompleted}/>
  {error && <p role="alert">{error}</p>}
  <div role="list" className="canvas-detail-results kirayana-task-rows" aria-label={`${node.name} tasks`}>
   {tasks.filter(task=>showCompleted || !task.completed).map(task=><div role="listitem" tabIndex={0} key={task.id} className={`canvas-detail-row kirayana-task-row${task.completed ? ' is-completed' : ''}`}>
    <div className="canvas-detail-row-content"><strong>{task.title}</strong></div><div className="kirayana-task-actions">
     <UiIconButton label={`${task.completed ? 'Restore' : 'Complete'} ${task.title}`} onClick={()=>change(state=>toggleTask(state,node.id,task.id))}>{task.completed ? <Undo2 size={15}/> : <Check size={15}/>}</UiIconButton>
     <UiIconButton label={`Delete ${task.title}`} variant="danger" onClick={()=>void confirm({intent:{kind:'discard',action:'delete-task',accountId:node.id,version:1},title:'Delete task?',description:task.title,confirmLabel:'Delete task',action:async()=>change(state=>deleteTask(state,node.id,task.id))})}><Trash2 size={15}/></UiIconButton>
    </div>
   </div>)}
  </div>
  {!tasks.some(task=>showCompleted || !task.completed) && <p className="kirayana-tasks-empty">{tasks.length ? 'All tasks completed.' : 'No tasks yet.'}</p>}
 </div>
}
