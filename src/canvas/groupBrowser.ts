import type { Node } from '../organizer/model'
export const groupPageSize = 14
export type GroupBrowse = { offset: number; query: string; sort: 'created' | 'name' }
export const initialGroupBrowse: GroupBrowse = { offset: 0, query: '', sort: 'created' }
export function browseSpaces(nodes: Node[], browse: GroupBrowse) {
  const query=browse.query.trim().toLocaleLowerCase()
  return nodes.filter(n=>!query || [n.name,...Object.values(n.values ?? {}).map(String)].some(value=>{const text=value.toLocaleLowerCase().replace(/^https?:\/\//,'');return text.split(/\s+/).some((_,index,words)=>words.slice(index).join(' ').startsWith(query))})).sort((a,b)=>browse.sort==='name' ? a.name.localeCompare(b.name,undefined,{numeric:true}) || a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}
export function groupWindow(nodes: Node[], offset: number) {
  const start=Math.max(0,Math.min(Math.max(0,nodes.length-groupPageSize),Math.round(offset)))
  return { nodes:nodes.slice(start,start+groupPageSize), offset:start, end:Math.min(nodes.length,start+groupPageSize), total:nodes.length }
}
export function revealOffset(nodes: Node[], id: string) { return groupWindow(nodes,Math.floor(Math.max(0,nodes.findIndex(n=>n.id===id))/groupPageSize)*groupPageSize).offset }

/** Retain the orb edge past the seam so the divider can mask it progressively. */
export function streamOrb(angle:number,progress:number,direction:number,incoming:boolean) {
 const position=angle+direction*Math.PI*2*(incoming ? progress-1 : progress)
 return {angle:position,visible:position>=-Math.PI/2-.25 && position<=Math.PI*3/2+.25}
}
