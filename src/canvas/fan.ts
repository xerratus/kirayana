import type { Node } from '../organizer/model'
import type { Point } from './canvasCamera'
export type FanSlot = { project: Node; angle: number; radius: number; outer: number; start: number; end: number }
export const projectFanStart = -Math.PI / 2
export const projectFanStep = .49
export const projectFanEdgePadding = .1
export const projectFanCollapsedOuter = 105
export const projectFanOrbRadius = 23
const projectsPerRing = 10
export function fanSlots(projects: Node[]): FanSlot[] {
  return projects.map((project, index) => {
    const ring = Math.floor(index / projectsPerRing)
    const angle = projectFanStart + projectFanEdgePadding + ((index % projectsPerRing) + .5) * projectFanStep
    return { project, angle, radius: 124 + ring * 70, outer: 173 + ring * 70, start: angle - projectFanStep / 2, end: angle + projectFanStep / 2 }
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
  const outerRadius = projectFanCollapsedOuter + (Math.max(...slots.map(slot => slot.outer)) - projectFanCollapsedOuter) * spread
  const outer = (50 + (outerRadius - 50) * reveal) * factor
  return { inner, outer, start: projectFanStart, end: Math.max(...slots.map(slot => slot.end)) + projectFanEdgePadding }
}
export function drawFan(ctx: CanvasRenderingContext2D, center: Point, slots: FanSlot[], reveal: number, spread: number, factor: number, color: string, label: string, opacity: number, hover = 0, viewport = { width: 0, height: 0 }) {
  if (!slots.length || reveal <= 0 || opacity <= 0) return
  const { inner, outer, start, end } = fanGeometry(slots, reveal, spread, factor)
  const fanPath = new Path2D()
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
