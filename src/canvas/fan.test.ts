import { expect, it } from 'vitest'
import { fanGeometry, fanSlots } from './fan'
import { addNode, initialOrganizer } from '../organizer/model'
it('keeps fan angular span fixed while shrinking radially and grows rings after ten entries',()=>{
 let s=initialOrganizer();for(let i=0;i<12;i++)s=addNode(s,s.rootId,'entity',`Entity ${i}`,'#4c9df4',{x:0,y:0})
 const slots=fanSlots(s.nodes.filter(n=>n.kind==='entity'))
 const open=fanGeometry(slots,1,1,1),closed=fanGeometry(slots,1,0,1)
 expect(open.end-open.start).toBe(closed.end-closed.start)
 expect(closed.outer).toBe(105);expect(open.outer).toBe(243)
 expect(slots[10].radius).toBe(194)
 expect(slots[0].angle).toBe(slots[10].angle)
})
it('anchors both funnel start points to the draggable arc at different angles', async()=>{
 const { drawProjectCone } = await import('./drawing')
 for (const angle of [-Math.PI, -.8, .3, Math.PI/2]) {
  const root={x:300,y:300},radius=117, source={x:root.x+Math.cos(angle)*radius,y:root.y+Math.sin(angle)*radius}, target={x:1000,y:700}
  const moves:number[][]=[],arcs:number[][]=[],curves:number[][]=[]
  const ctx={save(){},restore(){},beginPath(){},moveTo(...p:number[]){moves.push(p)},quadraticCurveTo(...p:number[]){curves.push(p)},arc(...p:number[]){arcs.push(p)},closePath(){},fill(){},stroke(){},globalAlpha:1,fillStyle:'',strokeStyle:'',lineWidth:1} as unknown as CanvasRenderingContext2D
  drawProjectCone(ctx,source,target,0,90,'#f2ad58',.2,24,46,3,{center:root,radius,angle})
  expect(Math.hypot(moves[0][0]-root.x,moves[0][1]-root.y)).toBeCloseTo(radius)
  const end = curves.at(-1)!.slice(-2); expect(Math.hypot(end[0]-root.x,end[1]-root.y)).toBeCloseTo(radius)
  expect(arcs[0].slice(0,3)).toEqual([target.x,target.y,90])
 }
})
