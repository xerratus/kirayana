type Point = { x: number; y: number }
type Size = { width: number; height: number }
export type PanelConnectorSide = 'right-left' | 'left-right' | 'bottom-top' | 'top-bottom'
export type DetailPanelSide = 'left' | 'right' | 'above' | 'below'
export type CanvasBounds = Point & Size

/** Score nearby opening positions without moving anything already on the canvas. */
export function avoidCanvasCollisions(preferred: CanvasBounds, origin: Point, obstacles: CanvasBounds[] = []): Point {
  const dx = preferred.x + preferred.width / 2 - origin.x
  const dy = preferred.y + preferred.height / 2 - origin.y
  const candidates = [1, 1.2, 1.45].flatMap(distance => [0, -.18, .18, -.36, .36, -.54, .54].map(angle => {
    const x = origin.x + (dx * Math.cos(angle) - dy * Math.sin(angle)) * distance - preferred.width / 2
    const y = origin.y + (dx * Math.sin(angle) + dy * Math.cos(angle)) * distance - preferred.height / 2
    const overlap = obstacles.reduce((sum, box) => sum + Math.max(0, Math.min(x + preferred.width + 12, box.x + box.width) - Math.max(x - 12, box.x)) * Math.max(0, Math.min(y + preferred.height + 12, box.y + box.height) - Math.max(y - 12, box.y)), 0)
    return { x, y, score: overlap * 1000 + Math.abs(angle) * 100 + (distance - 1) * 150 }
  }))
  const best = candidates.reduce((best, candidate) => candidate.score < best.score ? candidate : best)
  return { x: best.x, y: best.y }
}

/** Offset sideways along the expansion direction instead of aligning panel headers. */
export function organicDetailPosition(source: Point, parent: CanvasBounds, child: Size, obstacles: CanvasBounds[] = [], gap = 24): Point {
  const center = { x: parent.x + parent.width / 2, y: parent.y + parent.height / 2 }
  const dx = center.x - source.x
  const dy = center.y - source.y
  const vertical = Math.abs(dx) < Math.abs(dy) * .35
  const sides = vertical ? [-1, 1] : [dx < 0 ? -1 : 1]
  const candidates = sides.map(side => {
    const slope = vertical ? Math.sign(dy) * .45 : Math.max(-.65, Math.min(.65, dy / Math.max(Math.abs(dx), 1)))
    const distance = (parent.width + child.width) / 2 + gap
    const preferred = { x: center.x + side * distance - child.width / 2, y: center.y + slope * distance - child.height / 2, ...child }
    const point = avoidCanvasCollisions(preferred, center, [parent, ...obstacles])
    const overlap = [parent, ...obstacles].reduce((sum, box) => sum + Math.max(0, Math.min(point.x + child.width + 12, box.x + box.width) - Math.max(point.x - 12, box.x)) * Math.max(0, Math.min(point.y + child.height + 12, box.y + box.height) - Math.max(point.y - 12, box.y)), 0)
    return { point, score: overlap * 1000 + Math.hypot(point.x - preferred.x, point.y - preferred.y) }
  })
  return candidates.reduce((best, candidate) => candidate.score < best.score ? candidate : best).point
}

/** Continue from the source orb through its panel, falling back to a side that fits. */
export function detailPanelSide(source: Point, parent: Point & Size, child: Size, viewport: Size, gap = 14): DetailPanelSide {
  const dx = parent.x + parent.width / 2 - source.x
  const dy = parent.y + parent.height / 2 - source.y
  const horizontal: DetailPanelSide = dx < 0 ? 'left' : 'right'
  const vertical: DetailPanelSide = dy < 0 ? 'above' : 'below'
  const preferred = Math.abs(dx) / parent.width >= Math.abs(dy) / parent.height ? horizontal : vertical
  const candidates: DetailPanelSide[] = [preferred, horizontal, vertical, 'right', 'left', 'below', 'above']
  const fits = (side: DetailPanelSide) => {
    const x = side === 'left' ? parent.x - gap - child.width : side === 'right' ? parent.x + parent.width + gap : parent.x
    const y = side === 'above' ? parent.y - gap - child.height : side === 'below' ? parent.y + parent.height + gap : parent.y
    return x >= 16 && y >= 16 && x + child.width <= viewport.width - 16 && y + child.height <= viewport.height - 16
  }
  return candidates.find(fits) ?? (viewport.width < parent.width + gap + child.width + 32 ? vertical : preferred)
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/** Select facing panel edges using bounds, with hysteresis for diagonal drags. */
export function panelConnector(parent: Point & Size, child: Point & Size, previous?: PanelConnectorSide, switchMargin = 18) {
  const parentCenter = { x: parent.x + parent.width / 2, y: parent.y + parent.height / 2 }
  const childCenter = { x: child.x + child.width / 2, y: child.y + child.height / 2 }
  const horizontal: PanelConnectorSide = childCenter.x >= parentCenter.x ? 'right-left' : 'left-right'
  const vertical: PanelConnectorSide = childCenter.y >= parentCenter.y ? 'bottom-top' : 'top-bottom'
  const inset = (size: number) => Math.min(18, size / 4)
  const candidate = (side: PanelConnectorSide) => {
    const horizontalSide = side === 'right-left' || side === 'left-right'
    const parentInset = inset(horizontalSide ? parent.height : parent.width)
    const childInset = inset(horizontalSide ? child.height : child.width)
    const start = horizontalSide
      ? { x: side === 'right-left' ? parent.x + parent.width : parent.x, y: clamp(childCenter.y, parent.y + parentInset, parent.y + parent.height - parentInset) }
      : { x: clamp(childCenter.x, parent.x + parentInset, parent.x + parent.width - parentInset), y: side === 'bottom-top' ? parent.y + parent.height : parent.y }
    const end = horizontalSide
      ? { x: side === 'right-left' ? child.x : child.x + child.width, y: clamp(parentCenter.y, child.y + childInset, child.y + child.height - childInset) }
      : { x: clamp(parentCenter.x, child.x + childInset, child.x + child.width - childInset), y: side === 'bottom-top' ? child.y : child.y + child.height }
    const gap = side === 'right-left' ? child.x - (parent.x + parent.width)
      : side === 'left-right' ? parent.x - (child.x + child.width)
        : side === 'bottom-top' ? child.y - (parent.y + parent.height) : parent.y - (child.y + child.height)
    const distance = Math.hypot(end.x - start.x, end.y - start.y)
    return { side, start, end, gap, score: distance + (gap < 0 ? Math.abs(gap) * 2 : 0) }
  }
  const horizontalCandidate = candidate(horizontal)
  const verticalCandidate = candidate(vertical)
  let best = horizontalCandidate.score <= verticalCandidate.score ? horizontalCandidate : verticalCandidate
  if (previous && previous !== best.side) {
    const held = candidate(previous)
    if (held.score <= best.score + switchMargin) best = held
  }
  const { side, start, end } = best
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const bend = Math.min(72, distance / 3, Math.max(10, best.gap / 2))
  const parentNormal = side === 'right-left' ? { x: 1, y: 0 } : side === 'left-right' ? { x: -1, y: 0 } : side === 'bottom-top' ? { x: 0, y: 1 } : { x: 0, y: -1 }
  const childNormal = { x: -parentNormal.x, y: -parentNormal.y }
  const control1 = { x: start.x + parentNormal.x * bend, y: start.y + parentNormal.y * bend }
  const control2 = { x: end.x + childNormal.x * bend, y: end.y + childNormal.y * bend }
  return { side, start, end, path: `M ${start.x} ${start.y} C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}` }
}

export function roundedPanelAttachment(source: Point, panel: Point & Size) {
  const corner = Math.min(18 * panel.width / 320, panel.width / 2, panel.height / 2)
  const inner = {
    x: clamp(source.x, panel.x + corner, panel.x + panel.width - corner),
    y: clamp(source.y, panel.y + corner, panel.y + panel.height - corner),
  }
  let normal = { x: source.x - inner.x, y: source.y - inner.y }
  const length = Math.hypot(normal.x, normal.y)
  if (length > 0) normal = { x: normal.x / length, y: normal.y / length }
  else {
    const sides = [
      { distance: source.x - panel.x, normal: { x: -1, y: 0 } },
      { distance: panel.x + panel.width - source.x, normal: { x: 1, y: 0 } },
      { distance: source.y - panel.y, normal: { x: 0, y: -1 } },
      { distance: panel.y + panel.height - source.y, normal: { x: 0, y: 1 } },
    ]
    normal = sides.reduce((closest, side) => side.distance < closest.distance ? side : closest).normal
    if (normal.x) inner.x = normal.x < 0 ? panel.x + corner : panel.x + panel.width - corner
    else inner.y = normal.y < 0 ? panel.y + corner : panel.y + panel.height - corner
  }
  return { point: { x: inner.x + normal.x * corner, y: inner.y + normal.y * corner }, tangent: { x: -normal.y, y: normal.x } }
}

export function outwardDirection(source: Point, center: Point): Point {
  const dx = source.x - center.x, dy = source.y - center.y
  const length = Math.hypot(dx, dy)
  return length > 1 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 }
}

export function inspectorDistance(direction: Point, panel: Size, radius: number): number {
  return radius + 28 + Math.abs(direction.x) * panel.width / 2 + Math.abs(direction.y) * panel.height / 2
}

export function inspectorPlacement(source: Point, center: Point, radius: number, panel: Size, viewport: Size, preferred?: Point, neckHalfWidth = 5, coneScale = 1, expandOutward = false, obstacles: CanvasBounds[] = []) {
  const outward = outwardDirection(source, center)
  const directions = [outward, { x: -outward.y, y: outward.x }, { x: outward.y, y: -outward.x }, { x: -outward.x, y: -outward.y }]
  const safe = { left: 16, right: viewport.width - 16, top: viewport.height < 600 ? 72 : 80, bottom: viewport.height - (viewport.height < 600 ? 112 : 150) }
  const width = Math.min(panel.width, safe.right - safe.left)
  const height = Math.min(panel.height, safe.bottom - safe.top)
  const candidates = directions.map((direction, index) => {
    const distance = inspectorDistance(direction, { width, height }, radius)
    const rawLeft = source.x + direction.x * distance - width / 2
    const rawTop = source.y + direction.y * distance - height / 2
    const left = expandOutward ? rawLeft : clamp(rawLeft, safe.left, Math.max(safe.left, safe.right - width))
    const top = expandOutward ? rawTop : clamp(rawTop, safe.top, Math.max(safe.top, safe.bottom - height))
    const nearest = { x: clamp(source.x, left, left + width), y: clamp(source.y, top, top + height) }
    const overlap = Math.max(0, radius + 18 - Math.hypot(nearest.x - source.x, nearest.y - source.y))
    const score = overlap * 100 + Math.hypot(left - rawLeft, top - rawTop) * 2 + index * 90
    return { left, top, width, height, score }
  })
  const opening = expandOutward && !preferred ? avoidCanvasCollisions({ x: candidates[0].left, y: candidates[0].top, width, height }, source, obstacles) : null
  const best = preferred ? {
    left: preferred.x,
    top: preferred.y,
    width, height,
  } : opening ? { left: opening.x, top: opening.y, width, height } : candidates.reduce((result, candidate) => candidate.score < result.score ? candidate : result)
  const panelBounds = { x: best.left, y: best.top, width: best.width, height: best.height }
  const attachment = roundedPanelAttachment(source, panelBounds)
  const end = attachment.point
  const length = Math.hypot(end.x - source.x, end.y - source.y) || 1
  const unit = { x: (end.x - source.x) / length, y: (end.y - source.y) / length }
  const normal = { x: -unit.y, y: unit.x }
  const tangent = normal.x * attachment.tangent.x + normal.y * attachment.tangent.y >= 0 ? attachment.tangent : { x: -attachment.tangent.x, y: -attachment.tangent.y }
  const start = { x: source.x + unit.x * radius, y: source.y + unit.y * radius }
  const near = neckHalfWidth, far = 23 * coneScale
  const startA = { x: start.x + normal.x * near, y: start.y + normal.y * near }
  const startB = { x: start.x - normal.x * near, y: start.y - normal.y * near }
  const endA = roundedPanelAttachment({ x: end.x + tangent.x * far, y: end.y + tangent.y * far }, panelBounds).point
  const endB = roundedPanelAttachment({ x: end.x - tangent.x * far, y: end.y - tangent.y * far }, panelBounds).point
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  const cone = `M ${startA.x} ${startA.y} Q ${middle.x + normal.x * near} ${middle.y + normal.y * near} ${endA.x} ${endA.y} L ${endB.x} ${endB.y} Q ${middle.x - normal.x * near} ${middle.y - normal.y * near} ${startB.x} ${startB.y} Z`
  return { left: best.left, top: best.top, source, cone: length <= radius + 4 ? '' : cone }
}
