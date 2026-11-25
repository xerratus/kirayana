import { assertOrganizer, type Organizer } from '../organizer/model'
const layoutKeys = ['updatedAt', 'position', 'collapsed', 'anchorAngle', 'fanOpen', 'fanCollapsed', 'fanPositioned', 'fanAnchor'] as const
export type RemoteFile = { id:string; name:string; size:number; type:string; path:string }
export type Content = Omit<Organizer, 'views'|'viewId'|'revision'|'nodes'|'attachments'> & { nodes: Record<string, unknown>[]; attachments:RemoteFile[] }
export type Layout = { viewId:string; views:Organizer['views']; nodes:Record<string, Record<string, unknown>> }
export function splitOrganizer(state:Organizer, files:RemoteFile[]):{content:Content;layout:Layout} {
  assertOrganizer(state)
  const { views, viewId, revision: _revision, nodes, attachments: _attachments, ...rest } = state
  const positions:Layout['nodes'] = {}
  const contentNodes = nodes.map(node => {
    const copy:Record<string,unknown> = {...node}; const position:Record<string,unknown> = {}
    for(const key of layoutKeys) { if(copy[key] !== undefined) position[key]=copy[key]; delete copy[key] }
    positions[node.id]=position; return copy
  })
  return {content:{...rest,nodes:contentNodes,attachments:files},layout:{viewId,views,nodes:positions}}
}
export function joinOrganizer(content:Content, layout:Layout, revision:number, attachments:Organizer['attachments']):Organizer {
  const result = {...content, revision, viewId:layout.viewId, views:layout.views, nodes:content.nodes.map(node=>({...node,...layout.nodes[node.id as string]})),attachments}
  assertOrganizer(result); return result
}
export async function digest(data:BufferSource):Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)), byte=>byte.toString(16).padStart(2,'0')).join('')
}
/** Postgres jsonb reorders object keys. Compare values, not transport key order. */
export function canonicalJson(value:unknown):string {
  return JSON.stringify(value,(_key,item)=>item && typeof item==='object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])) : item)
}
