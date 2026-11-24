import { addNode, palette, saveEntityValues, type FieldValue, type Organizer } from './model'
const fixture = 'servers-fan-25-v1'
/** Explicitly requested local demo data. Existing Servers content is preserved. */
export function seedServersFan(state: Organizer): Organizer {
  if (state.completedFixtures?.includes(fixture)) return state
  const group = state.nodes.find(n => n.kind === 'subset' && n.name.trim().toLowerCase() === 'servers')
  if (!group) return state
  let next = state
  const fields = state.fields.filter(f => f.collectionId === group.id)
  const existing = new Set(state.nodes.filter(n => n.parentId === group.id).map(n => n.name.toLowerCase()))
  let number = 1
  for (let i = 0; i < 25; i++) {
    while (existing.has(`server ${String(number).padStart(2, '0')}`)) number++
    const name = `Server ${String(number).padStart(2, '0')}`
    next = addNode(next, group.id, 'entity', name, palette[i % palette.length], { x: group.position.x + 400 + (i % 5) * 180, y: group.position.y + Math.floor(i / 5) * 180 })
    const node = next.nodes.at(-1)!, values: Record<string, FieldValue> = {}
    for (const field of fields) {
      if (!field.required) continue
      values[field.id] = field.type === 'number' ? number : field.type === 'checkbox' ? true : field.type === 'date' ? new Date().toISOString().slice(0, 10) : field.type === 'select' ? field.options[0] : /url|address|host/i.test(field.name) ? `https://server-${number}.example` : name
    }
    next = saveEntityValues(next, node.id, values)
    existing.add(name.toLowerCase()); number++
  }
  return { ...next, revision: state.revision + 1, completedFixtures: [...state.completedFixtures ?? [], fixture] }
}

/** User-requested large Group; seeded once in development without replacing existing content. */
export function seedLargeGroup(state: Organizer): Organizer {
  const marker='large-group-451-v1'
  if(state.completedFixtures?.includes(marker))return state
  let next=addNode(state,state.rootId,'subset','451 Spaces','#5ac3dc',{x:420,y:200})
  const group=next.nodes.at(-1)!
  next={...next,nodes:next.nodes.map(n=>n.id===group.id ? {...n,itemLabel:'Space'} : n)}
  const start=Date.now()
  for(let i=1;i<=451;i++){
    next=addNode(next,group.id,'entity',`Space ${String(i).padStart(3,'0')}`,palette[(i-1)%palette.length],{x:group.position.x+300,y:group.position.y})
    const node=next.nodes.at(-1)!
    next={...next,nodes:next.nodes.map(n=>n.id===node.id ? {...n,createdAt:new Date(start+i).toISOString()} : n)}
  }
  return {...next,completedFixtures:[...next.completedFixtures??[],marker]}
}
