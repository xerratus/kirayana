import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Layers3 } from 'lucide-react'
import { UiButton, UiIconButton } from '../ui/Controls'
import type { Node } from '../organizer/model'
import { browseSpaces, groupPageSize, groupWindow, type GroupBrowse } from './groupBrowser'
export function GroupDirectory({ group, spaces, browse, onBrowse, onReveal, onOpen, onToggle, expandedSpaces }: { group:Node; spaces:Node[]; browse:GroupBrowse; onBrowse:(next:Partial<GroupBrowse>)=>void; onReveal:(node:Node,byName?:boolean)=>void; onOpen:(node:Node)=>void; onToggle:(node:Node)=>void; expandedSpaces:readonly string[] }) {
 const input=useRef<HTMLInputElement>(null), results=useRef<HTMLDivElement>(null)
 const [scrollTop,setScrollTop]=useState(0), [listHeight,setListHeight]=useState(480)
 const rowHeight=56, overscan=4
 useLayoutEffect(()=>{
  const element=results.current
  if(!element)return
  const observer=new ResizeObserver(()=>setListHeight(element.clientHeight))
  observer.observe(element)
  return ()=>observer.disconnect()
 },[])
 useLayoutEffect(()=>{
  if(results.current)results.current.scrollTop=0
  setScrollTop(0)
 },[group.id,browse.query,browse.sort,spaces.length])
 useEffect(()=>{input.current?.focus({preventScroll:true})},[group.id])
 const nodes=browseSpaces(spaces,browse), window=groupWindow(nodes,browse.offset)
 const start=Math.max(0,Math.min(Math.floor(scrollTop/rowHeight)-overscan,Math.max(0,nodes.length-1)))
 const end=Math.min(nodes.length,Math.ceil((scrollTop+listHeight)/rowHeight)+overscan)
 const letters=[...new Set(nodes.map(n=>n.name.charAt(0).toUpperCase()))].sort()
 return <div className="kirayana-group-directory">
  <label className="ui-field">Search Spaces<input ref={input} type="search" value={browse.query} placeholder="Name or field value…" onChange={e=>onBrowse({query:e.target.value,offset:0})} onKeyDown={e=>{if(e.key==='Enter' && nodes[0]){e.preventDefault();onReveal(nodes[0])}}} /></label>
  <label className="ui-field">Sort<select value={browse.sort} onChange={e=>onBrowse({sort:e.target.value as GroupBrowse['sort'],offset:0})}><option value="created">Creation order</option><option value="name">Name</option></select></label>
  <p role="status">{nodes.length} of {spaces.length} Spaces · {nodes.length ? `${window.offset+1}–${window.end} in the fan` : 'No matches'}</p>
  <div className="kirayana-group-jumps" aria-label="Jump to letter">{letters.map(letter=><UiButton key={letter} size="compact" onClick={()=>{const node=[...nodes].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).find(n=>n.name.charAt(0).toUpperCase()===letter);if(node){onReveal(node,true)}}}>{letter}</UiButton>)}</div>
  <div className="kirayana-group-pages"><UiIconButton label="Previous Spaces" disabled={window.offset===0} onClick={()=>onBrowse({offset:window.offset-groupPageSize})}><ChevronLeft size={16}/></UiIconButton><span>{nodes.length ? `${window.offset+1}–${window.end}` : '0'} / {nodes.length}</span><UiIconButton label="Next Spaces" disabled={window.end===nodes.length} onClick={()=>onBrowse({offset:window.offset+groupPageSize})}><ChevronRight size={16}/></UiIconButton></div>
  <div ref={results} className="kirayana-group-results" role="list" aria-label="Matching Spaces" tabIndex={0} style={{height:`min(${nodes.length*rowHeight}px, 48vh)`}} onScroll={event=>setScrollTop(event.currentTarget.scrollTop)}><div style={{height:nodes.length*rowHeight,position:'relative'}}>{nodes.slice(start,end).map((node,index)=><div className="kirayana-group-result" role="listitem" aria-posinset={start+index+1} aria-setsize={nodes.length} key={node.id} style={{position:'absolute',top:(start+index)*rowHeight,left:0,right:0,height:rowHeight,boxSizing:'border-box'}}><button className="ui-icon-action kirayana-group-reveal" onClick={()=>onToggle(node)} aria-expanded={expandedSpaces.includes(node.id)} aria-label={`Toggle ${node.name} space`}><span><strong>{node.name}</strong><small>{Object.values(node.values??{}).map(String).filter(value=>value!==node.name).slice(0,2).join(' · ')}</small></span></button><UiIconButton label={`Open ${node.name} canvas`} onClick={()=>onOpen(node)}><Layers3 size={16}/></UiIconButton></div>)}</div></div>
 </div>
}
