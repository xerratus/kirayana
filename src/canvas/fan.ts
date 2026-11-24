import type { Node } from '../organizer/model'
import type { Point } from './canvasCamera'
export type FanSlot = { project: Node; angle: number; radius: number; outer: number; orbRadius: number; ring: number; start: number; end: number }
export const projectFanStart = -Math.PI / 2
export const projectFanStep = .49
export const projectFanEdgePadding = .1
export const projectFanCollapsedOuter = 105
export const projectFanOrbRadius = 23
export const projectFanMaxSpan = Math.PI * 2
export const projectFanRowGap = 10
export function fanSlots(projects: Node[]): FanSlot[] {
  let ring = 0, column = 0, radius = 124
  return projects.slice(0, 14).map(project => {
    const orbRadius = Math.max(9, projectFanOrbRadius * .88 ** ring)
    const capacity = Math.max(5, Math.floor((projectFanMaxSpan - 2 * projectFanEdgePadding) * radius / (orbRadius * 2 + 6)))
    const step = (projectFanMaxSpan - 2 * projectFanEdgePadding) / capacity
    const angle = projectFanStart + projectFanEdgePadding + (column + .5) * step
    const slot = { project, angle, radius, orbRadius, ring, outer: radius + orbRadius + 26, start: angle - step / 2, end: angle + step / 2 }
    column++
    if (column === capacity) {
      const nextOrbRadius = Math.max(9, projectFanOrbRadius * .88 ** (ring + 1))
      radius += orbRadius + nextOrbRadius + projectFanRowGap
      ring++; column = 0
    }
    return slot
  })
}
export function drawFanLabel(ctx: CanvasRenderingContext2D, center: Point, radius: number, start: number, end: number, color: string, label: string) {
  const letters = label.toUpperCase()
  const fontSize = Math.max(6, Math.min(10, radius * .095, (end - start) * radius / (letters.length * .76)))
  const spacing = fontSize * .74 / radius
  const middle = (start + end) / 2
  const flip = Math.cos(middle + Math.PI / 2) < 0
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `700 ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let index = 0; index < letters.length; index++) {
    const angle = middle + (index - (letters.length - 1) / 2) * spacing * (flip ? -1 : 1)
    const tangent = angle + Math.PI / 2
    ctx.save()
    ctx.translate(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius)
    ctx.rotate(tangent + (flip ? Math.PI : 0))
    ctx.fillText(letters[index], 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

export function fanGeometry(slots: FanSlot[], reveal: number, spread: number, factor: number) {
  const inner = (50 + 40 * reveal) * factor
  const outerRadius = projectFanCollapsedOuter + ((slots.length ? Math.max(...slots.map(slot => slot.outer)) : projectFanCollapsedOuter) - projectFanCollapsedOuter) * spread
  const outer = (50 + (outerRadius - 50) * reveal) * factor
  return { inner, outer, start: projectFanStart, end: Math.min(projectFanStart + projectFanMaxSpan, Math.max(projectFanStart, ...slots.map(slot => slot.end)) + projectFanEdgePadding) }
}
export function drawFan(ctx: CanvasRenderingContext2D, center: Point, slots: FanSlot[], reveal: number, spread: number, factor: number, color: string, label: string, opacity: number, hover = 0, viewport = { width: 0, height: 0 }) {
  if (!slots.length || reveal <= 0 || opacity <= 0) return
  const { inner, outer, start, end } = fanGeometry(slots, reveal, spread, factor)
  const fanPath = new Path2D()
  // Keep the radial edge at 12 o’clock, including when the ring reaches 360°.
  fanPath.moveTo(center.x + Math.cos(start) * inner, center.y + Math.sin(start) * inner)
  fanPath.lineTo(center.x + Math.cos(start) * outer, center.y + Math.sin(start) * outer)
  fanPath.arc(center.x, center.y, outer, start, end)
  fanPath.lineTo(center.x + Math.cos(end) * inner, center.y + Math.sin(end) * inner)
  fanPath.arc(center.x, center.y, inner, end, start, true)
  fanPath.closePath()
  if (hover > 0) {
    const outside = new Path2D(); outside.rect(0, 0, viewport.width, viewport.height); outside.addPath(fanPath)
    ctx.save(); ctx.clip(outside, 'evenodd'); ctx.filter = 'blur(12px)'; ctx.globalAlpha = reveal * hover * .2 * opacity; ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.stroke(fanPath); ctx.restore()
  }
  ctx.save()
  ctx.fillStyle = '#080b12'; ctx.globalAlpha = reveal * .25 * opacity; ctx.fill(fanPath)
  ctx.globalAlpha = reveal * opacity
  ctx.beginPath(); ctx.arc(center.x, center.y, outer - 7.5 * factor, start, end)
  ctx.strokeStyle = color; ctx.lineWidth = Math.min(15 * factor, outer - inner); ctx.stroke()
  ctx.shadowColor = `${color}35`; ctx.shadowBlur = 14; ctx.lineWidth = 1.25; ctx.stroke(fanPath)
  ctx.restore(); ctx.save(); ctx.globalAlpha = reveal * opacity
  drawFanLabel(ctx, center, outer - 7.5 * factor, start, end, '#111827', label)
  ctx.restore()
}
export function angleDistance(a: number, b: number) { return Math.abs(Math.atan2(Math.sin(a-b), Math.cos(a-b))) }

/** Stack the label and pagination below the visible lower edge of a Group. */
export function groupLabelLayout(orbRadius:number,geometry:ReturnType<typeof fanGeometry>,textScale:number,hasFan=true) {
 const reachesBottom=geometry.start<=Math.PI/2 && geometry.end>=Math.PI/2
 const bottom=hasFan ? geometry.outer*(reachesBottom ? 1 : Math.max(Math.sin(geometry.start),Math.sin(geometry.end))) : 0
 const edge=Math.max(orbRadius,bottom), gap=14*textScale
 const titleSize=Math.max(9,15*textScale), subtitleSize=Math.max(8,12*textScale)
 const title=edge+gap+titleSize/2
 const subtitle=title+titleSize/2+8*textScale+subtitleSize/2
 return {title,subtitle,pagination:subtitle+subtitleSize/2+gap}
}
