const turn = Math.PI * 2
const wrap = (angle: number) => ((angle % turn) + turn) % turn
const signed = (angle: number) => wrap(angle + Math.PI) - Math.PI
export const arcSpan = Math.PI * 2 / 9
export const defaultArcSpacing = arcSpan + .14

/** Keep circular order. The moving arc pushes the next arc, cascading around the hub. */
export function pushArcAngles(anchors: { id: string; angle: number }[], id: string, target: number, spacing = defaultArcSpacing): Map<string, number> {
  const active = anchors.find(a => a.id === id)
  if (!active || !Number.isFinite(target)) return new Map(anchors.map(a => [a.id, a.angle]))
  // A full ring cannot accept a drag without overlapping; keep its last valid layout.
  if (anchors.length * spacing > turn) return new Map(anchors.map(a => [a.id, a.angle]))
  const delta = signed(target - active.angle), direction = delta < 0 ? -1 : 1, distance = Math.abs(delta)
  const others = anchors.filter(a => a.id !== id).map(a => ({ ...a, offset: wrap(direction * (a.angle - active.angle)) })).sort((a, b) => a.offset - b.offset)
  let previous = distance
  const offsets = others.map(a => { previous = Math.max(a.offset, previous + spacing); return previous })
  // Reconcile pre-existing overlap behind the moving arc without moving its anchor.
  let limit = distance + turn - spacing
  for (let i = offsets.length - 1; i >= 0; i--) { offsets[i] = Math.min(offsets[i], limit); limit = offsets[i] - spacing }
  const result = new Map([[id, signed(target)]])
  others.forEach((a, i) => result.set(a.id, signed(active.angle + direction * offsets[i])))
  return result
}
