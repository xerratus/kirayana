import type { Node } from '../organizer/model'
export const groupPageSize = 37
export type GroupBrowse = { offset: number; query: string; sort: 'created' | 'name' }
export const initialGroupBrowse: GroupBrowse = { offset: 0, query: '', sort: 'created' }
export function browseSpaces(nodes: Node[], browse: GroupBrowse) {
  const query=browse.query.trim().toLocaleLowerCase()
  return nodes.filter(n=>!query || [n.name,...Object.values(n.values ?? {}).map(String)].join(' ').toLocaleLowerCase().includes(query)).sort((a,b)=>browse.sort==='name' ? a.name.localeCompare(b.name,undefined,{numeric:true}) || a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}
export function groupWindow(nodes: Node[], offset: number) {
  const start=Math.max(0,Math.min(Math.max(0,nodes.length-groupPageSize),Math.round(offset)))
  return { nodes:nodes.slice(start,start+groupPageSize), offset:start, end:Math.min(nodes.length,start+groupPageSize), total:nodes.length }
}
export function revealOffset(nodes: Node[], id: string) { return groupWindow(nodes,Math.floor(Math.max(0,nodes.findIndex(n=>n.id===id))/groupPageSize)*groupPageSize).offset }
export function rotateGroupWindow(offset:number,total:number,angle:number) {
  const step=Math.PI*2/23,steps=Math.round(-angle/step),positions=Math.max(1,total-groupPageSize+1)
  return {offset:((offset+steps)%positions+positions)%positions,rotation:angle+steps*step}
}
