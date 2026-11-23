import type { Point } from './canvasCamera'
type OrbId = 'organization' | 'users' | 'projects' | 'intelligence' | 'providers' | 'models' | 'instructions' | 'skills' | 'agents'
const shapeSides = Object.fromEntries(['organization','users','projects','intelligence','providers','models','instructions','skills','agents'].map(id => [id, 0])) as Record<OrbId, number>
const shapeRotation = { ...shapeSides, organization: -Math.PI / 8 }
function shapeVertices(id: OrbId, radius: number) {
  const sides = shapeSides[id]
  return Array.from({ length: sides }, (_, index) => {
    const angle = shapeRotation[id] + index * Math.PI * 2 / sides
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}

function orbPath(id: OrbId, x: number, y: number, radius: number) {
  const path = new Path2D()
  const sides = shapeSides[id]
  if (!sides) { path.arc(x, y, radius, 0, Math.PI * 2); return path }
  const vertices = shapeVertices(id, radius).map(point => ({ x: x + point.x, y: y + point.y }))
  const rounding = id === 'agents' ? .14 : .1
  vertices.forEach((vertex, index) => {
    const before = vertices[(index + sides - 1) % sides]
    const after = vertices[(index + 1) % sides]
    const start = { x: vertex.x + (before.x - vertex.x) * rounding, y: vertex.y + (before.y - vertex.y) * rounding }
    const end = { x: vertex.x + (after.x - vertex.x) * rounding, y: vertex.y + (after.y - vertex.y) * rounding }
    if (index === 0) path.moveTo(start.x, start.y)
    else path.lineTo(start.x, start.y)
    path.quadraticCurveTo(vertex.x, vertex.y, end.x, end.y)
  })
  path.closePath()
  return path
}

export function orbBoundaryRadius(id: OrbId, angle: number, radius: number) {
  const sides = shapeSides[id]
  if (!sides) return radius
  const vertices = shapeVertices(id, radius)
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  let distance = radius
  for (let index = 0; index < sides; index++) {
    const start = vertices[index]
    const end = vertices[(index + 1) % sides]
    const edge = { x: end.x - start.x, y: end.y - start.y }
    const cross = direction.x * edge.y - direction.y * edge.x
    if (Math.abs(cross) < .0001) continue
    const along = (start.x * edge.y - start.y * edge.x) / cross
    const within = (start.x * direction.y - start.y * direction.x) / cross
    if (along > 0 && within >= 0 && within <= 1) distance = Math.min(distance, along)
  }
  return distance
}

export function drawOrb(ctx: CanvasRenderingContext2D, id: OrbId, x: number, y: number, radius: number, color: string, background: string, hover: number) {
  const alpha = (from: number, to: number) => Math.round(from + (to - from) * hover).toString(16).padStart(2, '0')
  ctx.save()
  ctx.shadowColor = `${color}${alpha(0x35, 0x66)}`
  ctx.shadowBlur = 14 + 12 * hover
  ctx.fillStyle = background; ctx.fill(orbPath(id, x, y, radius))
  ctx.shadowBlur = 0
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = `${color}${alpha(0x9c, 0xe0)}`; ctx.lineWidth = 1.35 + .65 * hover; ctx.stroke(orbPath(id, x, y, radius - 1))
  ctx.strokeStyle = `${color}${alpha(0x1f, 0x48)}`; ctx.lineWidth = 1; ctx.stroke(orbPath(id, x, y, radius + 3))
  ctx.restore()
}

export function orbitPoint(root: Point, end: Point, anchorRadius: number, progress: number): Point {
  const angle = Math.atan2(end.y - root.y, end.x - root.x)
  return { x: root.x + Math.cos(angle) * anchorRadius + (end.x - root.x - Math.cos(angle) * anchorRadius) * progress, y: root.y + Math.sin(angle) * anchorRadius + (end.y - root.y - Math.sin(angle) * anchorRadius) * progress }
}

export function drawProjectCone(ctx: CanvasRenderingContext2D, source: Point, target: Point, sourceRadius: number, targetRadius: number, color: string, opacity: number, near = 5, far = Math.min(23, targetRadius * .45), waist?: number, sourceArc?: { center: Point; radius: number; angle: number }) {
  const length = Math.hypot(target.x - source.x, target.y - source.y)
  if (length <= sourceRadius + targetRadius + 8) return
  const unit = { x: (target.x - source.x) / length, y: (target.y - source.y) / length }
  const normal = { x: -unit.y, y: unit.x }
  const start = { x: source.x + unit.x * sourceRadius, y: source.y + unit.y * sourceRadius }
  const arcHalfAngle = sourceArc ? Math.asin(Math.min(near / sourceArc.radius, .99)) : 0
  const arcPoints = sourceArc ? [-1, 1].map(side => ({ x: sourceArc.center.x + Math.cos(sourceArc.angle + side * arcHalfAngle) * sourceArc.radius, y: sourceArc.center.y + Math.sin(sourceArc.angle + side * arcHalfAngle) * sourceArc.radius })) : null
  const [startUpper, startLower] = arcPoints
    ? (arcPoints[0].x - arcPoints[1].x) * normal.x + (arcPoints[0].y - arcPoints[1].y) * normal.y >= 0 ? arcPoints : [arcPoints[1], arcPoints[0]]
    : [{ x: start.x + normal.x * near, y: start.y + normal.y * near }, { x: start.x - normal.x * near, y: start.y - normal.y * near }]
  const halfAngle = Math.asin(far / targetRadius)
  const rim = { x: target.x - unit.x * Math.cos(halfAngle) * targetRadius, y: target.y - unit.y * Math.cos(halfAngle) * targetRadius }
  const middle = { x: (start.x + rim.x) / 2, y: (start.y + rim.y) / 2 }
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(startUpper.x, startUpper.y)
  if (waist === undefined) ctx.quadraticCurveTo(middle.x + normal.x * near, middle.y + normal.y * near, rim.x + normal.x * far, rim.y + normal.y * far)
  else {
    ctx.quadraticCurveTo(start.x + (middle.x - start.x) * .15 + normal.x * waist, start.y + (middle.y - start.y) * .15 + normal.y * waist, middle.x + normal.x * waist, middle.y + normal.y * waist)
    ctx.quadraticCurveTo((middle.x + rim.x) / 2 + normal.x * waist, (middle.y + rim.y) / 2 + normal.y * waist, rim.x + normal.x * far, rim.y + normal.y * far)
  }
  ctx.arc(target.x, target.y, targetRadius, Math.atan2(-unit.y, -unit.x) - halfAngle, Math.atan2(-unit.y, -unit.x) + halfAngle)
  if (waist === undefined) ctx.quadraticCurveTo(middle.x - normal.x * near, middle.y - normal.y * near, start.x - normal.x * near, start.y - normal.y * near)
  else {
    ctx.quadraticCurveTo((middle.x + rim.x) / 2 - normal.x * waist, (middle.y + rim.y) / 2 - normal.y * waist, middle.x - normal.x * waist, middle.y - normal.y * waist)
    ctx.quadraticCurveTo(start.x + (middle.x - start.x) * .15 - normal.x * waist, start.y + (middle.y - start.y) * .15 - normal.y * waist, startLower.x, startLower.y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = Math.min(1, opacity * 1.5)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}
