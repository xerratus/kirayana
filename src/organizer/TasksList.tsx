import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Check, Trash2, Undo2 } from 'lucide-react'
import { UiToggle } from '../ui/UiToggle'
import { UiIconButton } from '../ui/Controls'
import { useConfirmation } from '../ui/confirmationContext'
import { addTask, deleteTask, toggleTask } from './tasks'
import type { Node, Organizer } from './model'
export function TasksList({node,change}:{node:Node;change:(update:(state:Organizer)=>Organizer)=>void}) {
 const [title,setTitle]=useState(''),[showCompleted,setShowCompleted]=useState(false),[error,setError]=useState('')
 const confirm=useConfirmation(),tasks=node.tasks??[],completed=tasks.filter(task=>task.completed).length
 const [finishing,setFinishing]=useState<Record<string,{height:number;collapsing:boolean}>>({})
 const timers=useRef(new Map<string,number[]>())
 useEffect(()=>()=>{for(const ids of timers.current.values())ids.forEach(clearTimeout);timers.current.clear()},[node.id])
 function clearFinishing(id:string) {
  timers.current.get(id)?.forEach(clearTimeout);timers.current.delete(id)
  setFinishing(current=>{const next={...current};delete next[id];return next})
 }
 function checkTask(id:string,completed:boolean,event:MouseEvent<HTMLButtonElement>) {
  clearFinishing(id)
  if(!completed && !showCompleted) {
   const height=event.currentTarget.closest<HTMLElement>('.kirayana-task-row')!.offsetHeight
   setFinishing(current=>({...current,[id]:{height,collapsing:false}}))
   const hold=window.setTimeout(()=>{
    setFinishing(current=>current[id] ? {...current,[id]:{...current[id],collapsing:true}} : current)
    const collapse=window.setTimeout(()=>clearFinishing(id),300)
    timers.current.set(id,[collapse])
   },1000)
   timers.current.set(id,[hold])
  }
  change(state=>toggleTask(state,node.id,id))
 }
 const visibleTasks=tasks.filter(task=>showCompleted || !task.completed || finishing[task.id])
 return <div className="kirayana-tasks">
  <form className="kirayana-task-add" onSubmit={event=>{event.preventDefault();try{const value=title;change(state=>addTask(state,node.id,value));setTitle('');setError('')}catch(error){setError(String(error instanceof Error ? error.message : error))}}}>
   <input className="canvas-detail-search" aria-label="New task" placeholder="Add a task…" maxLength={280} required value={title} onChange={event=>setTitle(event.target.value)}/>
  </form>
  <UiToggle className="kirayana-task-toggle" label={`Show completed (${completed})`} checked={showCompleted} onCheckedChange={checked=>{setShowCompleted(checked);for(const id of timers.current.keys())clearFinishing(id)}}/>
  {error && <p role="alert">{error}</p>}
  <div role="list" className="canvas-detail-results kirayana-task-rows" aria-label={`${node.name} tasks`}>
   {visibleTasks.map(task=><div role="listitem" tabIndex={0} key={task.id} className={`canvas-detail-row kirayana-task-row${task.completed ? ' is-completed' : ''}${finishing[task.id]?.collapsing ? ' is-collapsing' : ''}`} style={finishing[task.id] ? {height:finishing[task.id].collapsing ? 0 : finishing[task.id].height,boxSizing:'border-box'} : undefined}>
    <div className="canvas-detail-row-content"><strong>{task.title}</strong></div><div className="kirayana-task-actions">
     <UiIconButton label={`${task.completed ? 'Restore' : 'Complete'} ${task.title}`} onClick={event=>checkTask(task.id,task.completed,event)}>{task.completed ? <Undo2 size={15}/> : <Check size={15}/>}</UiIconButton>
     <UiIconButton label={`Delete ${task.title}`} variant="danger" onClick={()=>void confirm({intent:{kind:'discard',action:'delete-task',accountId:node.id,version:1},title:'Delete task?',description:task.title,confirmLabel:'Delete task',action:async()=>change(state=>deleteTask(state,node.id,task.id))})}><Trash2 size={15}/></UiIconButton>
    </div>
   </div>)}
  </div>
  {!visibleTasks.length && <p className="kirayana-tasks-empty">{tasks.length ? 'All tasks completed.' : 'No tasks yet.'}</p>}
 </div>
}
