import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Layers3, Search } from 'lucide-react'
import { UiButton, UiIconButton } from '../ui/Controls'
import type { Node } from '../organizer/model'
import { browseSpaces, groupPageSize, groupWindow, type GroupBrowse } from './groupBrowser'
export function GroupDirectory({ group, spaces, browse, onBrowse, onReveal, onOpen }: { group:Node; spaces:Node[]; browse:GroupBrowse; onBrowse:(next:Partial<GroupBrowse>)=>void; onReveal:(node:Node,byName?:boolean)=>void; onOpen:(node:Node)=>void }) {
 const input=useRef<HTMLInputElement>(null)
 useEffect(()=>{input.current?.focus({preventScroll:true})},[group.id])
 const nodes=browseSpaces(spaces,browse), window=groupWindow(nodes,browse.offset)
 const letters=[...new Set(nodes.map(n=>n.name.charAt(0).toUpperCase()))].sort()
 return <div className="kirayana-group-directory">
  <label className="ui-field">Search Spaces<input ref={input} type="search" value={browse.query} placeholder="Name or field value…" onChange={e=>onBrowse({query:e.target.value,offset:0})} onKeyDown={e=>{if(e.key==='Enter' && nodes[0]){e.preventDefault();onReveal(nodes[0])}}} /></label>
  <label className="ui-field">Sort<select value={browse.sort} onChange={e=>onBrowse({sort:e.target.value as GroupBrowse['sort'],offset:0})}><option value="created">Creation order</option><option value="name">Name</option></select></label>
  <p role="status">{nodes.length} of {spaces.length} Spaces · {nodes.length ? `${window.offset+1}–${window.end} in the fan` : 'No matches'}</p>
  <div className="kirayana-group-jumps" aria-label="Jump to letter">{letters.map(letter=><UiButton key={letter} size="compact" onClick={()=>{const node=[...nodes].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).find(n=>n.name.charAt(0).toUpperCase()===letter);if(node){onReveal(node,true)}}}>{letter}</UiButton>)}</div>
  <div className="kirayana-group-pages"><UiIconButton label="Previous Spaces" disabled={window.offset===0} onClick={()=>onBrowse({offset:window.offset-groupPageSize})}><ChevronLeft size={16}/></UiIconButton><span>{nodes.length ? `${window.offset+1}–${window.end}` : '0'} / {nodes.length}</span><UiIconButton label="Next Spaces" disabled={window.end===nodes.length} onClick={()=>onBrowse({offset:window.offset+groupPageSize})}><ChevronRight size={16}/></UiIconButton></div>
  <div className="kirayana-group-results">{nodes.map(node=><div className="kirayana-group-result" key={node.id}><button className="ui-icon-action kirayana-group-reveal" onClick={()=>onReveal(node)} aria-label={`Reveal ${node.name}`}><Search size={14}/><span><strong>{node.name}</strong><small>{Object.values(node.values??{}).map(String).filter(value=>value!==node.name).slice(0,2).join(' · ')}</small></span></button><UiIconButton label={`Open ${node.name} canvas`} onClick={()=>onOpen(node)}><Layers3 size={16}/></UiIconButton></div>)}</div>
 </div>
}
