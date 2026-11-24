import { expect, it } from 'vitest'
import { fanGeometry, groupLabelLayout, fanSlots } from './fan'
import { addNode, initialOrganizer } from '../organizer/model'
it('caps the fan at 360 degrees, keeps one row',()=>{
 let s=initialOrganizer();for(let i=0;i<40;i++)s=addNode(s,s.rootId,'entity',`Space ${i}`,'#4c9df4',{x:0,y:0})
 const slots=fanSlots(s.nodes.filter(n=>n.kind==='entity'))
 const open=fanGeometry(slots,1,1,1),closed=fanGeometry(slots,1,0,1)
 expect(open.end-open.start).toBeCloseTo(Math.PI*2)
 expect(open.end-open.start).toBe(closed.end-closed.start)
 expect(closed.outer).toBe(105)
 const rows = [...new Map(slots.map(slot => [slot.ring, slot])).values()]
 expect(rows).toHaveLength(1)
 for(const slot of slots) expect(slot.end).toBeLessThanOrEqual(-Math.PI/2+Math.PI*2)
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
   const a=slots[i],b=slots[j],distance=Math.hypot(Math.cos(a.angle)*a.radius-Math.cos(b.angle)*b.radius,Math.sin(a.angle)*a.radius-Math.sin(b.angle)*b.radius)
   expect(distance).toBeGreaterThan(a.orbRadius+b.orbRadius+4)
 }
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

it('fills a full clockwise circle and limits the visible row',()=>{
 let s=initialOrganizer();for(let i=0;i<15;i++)s=addNode(s,s.rootId,'entity',`Space ${i}`,'#4c9df4',{x:0,y:0})
 const slots=fanSlots(s.nodes.filter(n=>n.kind==='entity'))
 expect(slots.slice(0,14).every(slot=>slot.ring===0)).toBe(true)
 expect(slots).toHaveLength(14)
 const geometry=fanGeometry(slots,1,1,1)
 expect(geometry.start).toBeCloseTo(-Math.PI/2)
 expect(geometry.end).toBeCloseTo(Math.PI*3/2)
})

it('caps even 500 Spaces at one row with clearance across the 12 o’clock seam',()=>{
 const template=initialOrganizer().nodes[0]
 const nodes=Array.from({length:500},(_,i)=>({...template,id:`space-${i}`,kind:'entity' as const,name:`Space ${i}`}))
 const slots=fanSlots(nodes)
 expect(slots).toHaveLength(14)
 expect(slots.every(slot=>slot.ring===0)).toBe(true)
 const geometry=fanGeometry(slots,1,1,1)
 expect(geometry.start).toBeCloseTo(-Math.PI/2)
 expect(geometry.end-geometry.start).toBeCloseTo(Math.PI*2)
 for(let i=0;i<14;i++)for(let j=i+1;j<14;j++){
  const a=slots[i],b=slots[j]
  expect(Math.hypot(Math.cos(a.angle)*a.radius-Math.cos(b.angle)*b.radius,Math.sin(a.angle)*a.radius-Math.sin(b.angle)*b.radius)).toBeGreaterThan(a.orbRadius+b.orbRadius+4)
 }
 expect(Number.isFinite(fanGeometry([],1,1,1).outer)).toBe(true)
})

it('stacks Group labels and pagination below the fan with consistent gaps',()=>{
 const template=initialOrganizer().nodes[0],nodes=Array.from({length:14},(_,i)=>({...template,id:`s${i}`}))
 const slots=fanSlots(nodes)
 const closed=groupLabelLayout(90,fanGeometry(slots,1,0,1),1)
 const open=groupLabelLayout(90,fanGeometry(slots,1,1,1),1)
 expect(open.title).toBeGreaterThan(closed.title)
 expect(open.title-7.5-fanGeometry(slots,1,1,1).outer).toBe(14)
 expect(open.pagination-open.subtitle-6).toBe(14)
 const small=groupLabelLayout(90,fanGeometry(slots.slice(0,1),1,1,1),1)
 expect(small.title).toBe(90+14+7.5)
})
