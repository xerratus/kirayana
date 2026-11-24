import { expect,it } from 'vitest'
import { initialOrganizer, type Node } from '../organizer/model'
import { browseSpaces, streamOrb, groupWindow, initialGroupBrowse, revealOffset } from './groupBrowser'
const nodes:Node[]=Array.from({length:500},(_,i)=>({...initialOrganizer().nodes[0],id:`s${i}`,name:`Space ${String(i+1).padStart(3,'0')}`,kind:'entity',createdAt:new Date(i*1000).toISOString(),values:{url:`https://server-${i+1}.example`}}))
it('keeps windows bounded and reaches every one of 500 Spaces',()=>{
 const seen=new Set<string>()
 for(let offset=0;offset<500;offset+=14){const window=groupWindow(nodes,offset);expect(window.nodes.length).toBeLessThanOrEqual(14);window.nodes.forEach(n=>seen.add(n.id))}
 expect(seen.size).toBe(500)
 expect(groupWindow(nodes,999).end).toBe(500)
 expect(groupWindow(nodes,-100).offset).toBe(0)
 expect(groupWindow([],90)).toEqual({nodes:[],offset:0,end:0,total:0})
})
it('searches names and custom fields, sorts naturally, and reveals the final Space',()=>{
 expect(browseSpaces(nodes,{...initialGroupBrowse,query:'space 451'}).map(n=>n.id)).toEqual(['s450'])
 expect(browseSpaces(nodes,{...initialGroupBrowse,query:'server-451.example'})).toHaveLength(1)
 const sorted=browseSpaces([nodes[9],nodes[1]],{...initialGroupBrowse,sort:'name'})
 expect(sorted[0].id).toBe('s1')
 const offset=revealOffset(nodes,'s499')
 expect(groupWindow(nodes,offset).nodes.some(n=>n.id==='s499')).toBe(true)
 expect(nodes[0].id).toBe('s0')
})

it('streams through the seam without wrapping exiting orbs around',()=>{
 const angle=0
 expect(streamOrb(angle,0,-1,false)).toEqual({angle:0,visible:true})
 expect(streamOrb(angle,.5,-1,false).visible).toBe(false)
 expect(streamOrb(angle,0,-1,true).visible).toBe(false)
 expect(streamOrb(angle,1,-1,true)).toEqual({angle:0,visible:true})
 expect(streamOrb(angle,.9,1,false).visible).toBe(false)
 expect(streamOrb(angle,1,1,true).visible).toBe(true)
})

it('keeps orb edges alive while passing under either side of the divider',()=>{
 expect(streamOrb(-Math.PI/2-.1,1,-1,true).visible).toBe(true)
 expect(streamOrb(Math.PI*3/2+.1,1,-1,true).visible).toBe(true)
 expect(streamOrb(-Math.PI/2-.3,1,-1,true).visible).toBe(false)
 expect(streamOrb(Math.PI*3/2+.3,1,-1,true).visible).toBe(false)
})
