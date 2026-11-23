type Point = { x: number; y: number }
type Size = { width: number; height: number }

const centerScale = 1.08
const edgeScale = .85

export function depthAtScreen(point: Point, viewport: Size) {
  if (!viewport.width || !viewport.height) return 1
  const range = Math.hypot(viewport.width / 2, viewport.height / 2)
  const distance = Math.hypot(point.x - viewport.width / 2, point.y - viewport.height / 2)
  const t = Math.min(1, distance / range)
  return centerScale - (centerScale - edgeScale) * t * t * (3 - 2 * t)
}
