import { describe, expect, it } from 'vitest'
import { avoidCanvasCollisions, organicDetailPosition, detailPanelSide, inspectorDistance, inspectorPlacement, outwardDirection, panelConnector, roundedPanelAttachment } from './canvasInspector'

describe('panel connector anchoring', () => {
  const parent = { x: 0, y: 0, width: 320, height: 220 }
  it.each([
    [{ x: 35, y: -260, width: 280, height: 180 }, 'top-bottom'],
    [{ x: 35, y: 260, width: 280, height: 180 }, 'bottom-top'],
    [{ x: -340, y: 25, width: 280, height: 180 }, 'left-right'],
    [{ x: 380, y: 25, width: 280, height: 180 }, 'right-left'],
  ] as const)('uses facing edges for cardinal positions', (child, expected) => {
    const link = panelConnector(parent, child)
    expect(link.side).toBe(expected)
    expect(link.start.x).toBeGreaterThanOrEqual(parent.x)
    expect(link.start.x).toBeLessThanOrEqual(parent.x + parent.width)
    expect(link.start.y).toBeGreaterThanOrEqual(parent.y)
    expect(link.start.y).toBeLessThanOrEqual(parent.y + parent.height)
    expect(link.end.x).toBeGreaterThanOrEqual(child.x)
    expect(link.end.x).toBeLessThanOrEqual(child.x + child.width)
    expect(link.end.y).toBeGreaterThanOrEqual(child.y)
    expect(link.end.y).toBeLessThanOrEqual(child.y + child.height)
  })

  it('routes diagonals without reversing the exit or entry direction', () => {
    for (const child of [{ x: 370, y: -245, width: 280, height: 180 }, { x: -330, y: 270, width: 280, height: 180 }]) {
      const link = panelConnector(parent, child)
      const numbers = link.path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      const control1 = { x: numbers[2], y: numbers[3] }
      const control2 = { x: numbers[4], y: numbers[5] }
      if (link.side === 'right-left') { expect(control1.x).toBeGreaterThan(link.start.x); expect(control2.x).toBeLessThan(link.end.x) }
      else if (link.side === 'left-right') { expect(control1.x).toBeLessThan(link.start.x); expect(control2.x).toBeGreaterThan(link.end.x) }
      else if (link.side === 'bottom-top') { expect(control1.y).toBeGreaterThan(link.start.y); expect(control2.y).toBeLessThan(link.end.y) }
      else { expect(control1.y).toBeLessThan(link.start.y); expect(control2.y).toBeGreaterThan(link.end.y) }
    }
  })

  it('holds the selected side near a switching boundary and updates endpoints during drag', () => {
    let previous = panelConnector(parent, { x: 355, y: -170, width: 280, height: 180 }).side
    const points = []
    for (const y of [-169, -171, -168, -172, -167, -173]) {
      const link = panelConnector(parent, { x: 355, y, width: 280, height: 180 }, previous, 25)
      expect(link.side).toBe(previous)
      points.push(link.end.y)
      previous = link.side
    }
    expect(new Set(points).size).toBeGreaterThan(1)
  })

  it('uses the same local geometry at different zoom and pan transforms', () => {
    const child = { x: 360, y: 90, width: 260, height: 160 }
    const local = panelConnector(parent, child)
    for (const scale of [.65, 1, 1.5]) {
      const pan = { x: 130, y: -70 }
      const translatedStart = { x: pan.x + local.start.x * scale, y: pan.y + local.start.y * scale }
      const translatedEnd = { x: pan.x + local.end.x * scale, y: pan.y + local.end.y * scale }
      expect(translatedStart.x).toBeLessThan(translatedEnd.x)
      expect(local.side).toBe('right-left')
    }
  })
})

describe('canvas inspector placement', () => {
  it('points away from the organization and keeps the panel inside the viewport', () => {
    const direction = outwardDirection({ x: 480, y: 350 }, { x: 250, y: 350 })
    expect(direction).toEqual({ x: 1, y: 0 })
    const distance = inspectorDistance(direction, { width: 320, height: 260 }, 50)
    const source = { x: 600 - distance, y: 350 }
    const placement = inspectorPlacement(source, { x: source.x - 230, y: 350 }, 50, { width: 320, height: 260 }, { width: 1200, height: 800 })
    expect(placement.left + 160).toBeCloseTo(600)
    expect(placement.top).toBeGreaterThanOrEqual(80)
    expect(placement.cone).toContain(' Q ')
  })

  it('moves the panel to an available side at the edge', () => {
    const placement = inspectorPlacement({ x: 700, y: 320 }, { x: 400, y: 320 }, 50, { width: 320, height: 260 }, { width: 760, height: 600 })
    expect(placement.left).toBeGreaterThanOrEqual(16)
    expect(placement.left + 320).toBeLessThanOrEqual(744)
    expect(placement.top).toBeGreaterThanOrEqual(72)
    expect(placement.top + 260).toBeLessThanOrEqual(488)
  })

  it('keeps both cone edges ordered when the panel is left of the orb', () => {
    const placement = inspectorPlacement({ x: 500, y: 300 }, { x: 650, y: 300 }, 50, { width: 320, height: 220 }, { width: 900, height: 700 }, { x: 80, y: 210 })
    const numbers = placement.cone.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    const startA = numbers[1], endA = numbers[5], endB = numbers[7], startB = numbers[11]
    expect((startA - startB) * (endA - endB)).toBeGreaterThan(0)
  })

  it('keeps a dragged panel at its canvas position beyond the viewport', () => {
    const placement = inspectorPlacement({ x: 500, y: 300 }, { x: 400, y: 300 }, 50, { width: 320, height: 220 }, { width: 900, height: 700 }, { x: -100, y: 900 })
    expect(placement.left).toBe(-100)
    expect(placement.top).toBe(900)
  })

  it('moves the attachment smoothly around a rounded corner', () => {
    const panel = { x: 100, y: 100, width: 320, height: 220 }
    const side = roundedPanelAttachment({ x: 70, y: 119 }, panel)
    const corner = roundedPanelAttachment({ x: 70, y: 117 }, panel)
    expect(side.point).toEqual({ x: 100, y: 119 })
    expect(corner.point.x).toBeGreaterThan(100)
    expect(corner.point.y).toBeLessThan(118)
    expect(Math.hypot(corner.point.x - side.point.x, corner.point.y - side.point.y)).toBeLessThan(2)
    expect(corner.tangent.x).not.toBe(0)
  })

  it('lands both cone edges on the rounded border', () => {
    const panel = { x: 100, y: 100, width: 320, height: 220 }
    const placement = inspectorPlacement({ x: 65, y: 70 }, { x: 400, y: 400 }, 10, panel, { width: 900, height: 700 }, panel)
    const numbers = placement.cone.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    for (const point of [{ x: numbers[4], y: numbers[5] }, { x: numbers[6], y: numbers[7] }]) {
      const border = roundedPanelAttachment(point, panel).point
      expect(Math.hypot(point.x - border.x, point.y - border.y)).toBeLessThan(.01)
    }
  })

  it('narrows the usage connector at the icon', () => {
    const placement = inspectorPlacement({ x: 200, y: 300 }, { x: 100, y: 300 }, 18, { width: 320, height: 220 }, { width: 900, height: 700 }, undefined, 1.5)
    const numbers = placement.cone.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(Math.hypot(numbers[0] - numbers[10], numbers[1] - numbers[11])).toBeCloseTo(3)
  })
})


describe('detail expansion direction', () => {
  const parent = { x: 600, y: 400, width: 320, height: 240 }
  const child = { width: 320, height: 180 }
  const viewport = { width: 1600, height: 1100 }

  it.each([
    [{ x: 1080, y: 520 }, 'left'],
    [{ x: 440, y: 520 }, 'right'],
    [{ x: 760, y: 800 }, 'above'],
    [{ x: 760, y: 240 }, 'below'],
  ] as const)('continues away from the initial orb at %j', (source, expected) => {
    expect(detailPanelSide(source, parent, child, viewport)).toBe(expected)
  })

  it('uses a fitting side when the outward side reaches the viewport edge', () => {
    expect(detailPanelSide({ x: 500, y: 520 }, { ...parent, x: 100 }, child, viewport)).toBe('below')
  })

  it('stacks vertically on a narrow canvas', () => {
    expect(detailPanelSide({ x: 100, y: 140 }, { x: 30, y: 250, width: 320, height: 240 }, child, { width: 380, height: 900 })).toBe('below')
  })

  it('keeps the outward side under zoom and pan when space remains', () => {
    for (const scale of [.7, 1, 1.2]) {
      const point = (x: number, y: number) => ({ x: 40 + x * scale, y: 30 + y * scale })
      expect(detailPanelSide(point(1080, 520), { ...point(parent.x, parent.y), width: parent.width * scale, height: parent.height * scale }, { width: child.width * scale, height: child.height * scale }, viewport, 14 * scale)).toBe('left')
    }
  })
})


describe('outward canvas list and detail placement', () => {
  it.each([
    [{ x: 60, y: 300 }, { x: 360, y: 300 }, 'left'],
    [{ x: 700, y: 300 }, { x: 400, y: 300 }, 'right'],
    [{ x: 380, y: 90 }, { x: 380, y: 300 }, 'above'],
    [{ x: 380, y: 500 }, { x: 380, y: 300 }, 'below'],
  ] as const)('continues %s away from the hub even at a viewport edge', (source, center, side) => {
    const placement = inspectorPlacement(source, center, 50, { width: 320, height: 220 }, { width: 760, height: 600 }, undefined, 5, 1, true)
    if (side === 'left') expect(placement.left + 320).toBeLessThan(source.x - 50)
    if (side === 'right') expect(placement.left).toBeGreaterThan(source.x + 50)
    if (side === 'above') expect(placement.top + 220).toBeLessThan(source.y - 50)
    if (side === 'below') expect(placement.top).toBeGreaterThan(source.y + 50)
  })

  it('preserves a manually positioned list while using outward placement', () => {
    const placement = inspectorPlacement({ x: 60, y: 300 }, { x: 360, y: 300 }, 50, { width: 320, height: 220 }, { width: 760, height: 600 }, { x: 200, y: 180 }, 5, 1, true)
    expect(placement.left).toBe(200)
    expect(placement.top).toBe(180)
  })
})


describe('organic canvas opening positions', () => {
  const parent = { x: 600, y: 400, width: 320, height: 240 }
  const child = { width: 320, height: 180 }

  it('opens a 10 o’clock detail to the left with an upward offset', () => {
    const point = organicDetailPosition({ x: 1000, y: 800 }, parent, child)
    expect(point.x + child.width).toBeLessThan(parent.x)
    expect(point.y).toBeLessThan(parent.y)
    expect(point.y).not.toBe(parent.y)
  })

  it.each([200, 850])('chooses the less crowded side of a vertical branch from y=%s', y => {
    const source = { x: 760, y }
    const leftObstacle = { x: 180, y: 0, width: 400, height: 1100 }
    const rightObstacle = { x: 940, y: 0, width: 600, height: 1100 }
    const right = organicDetailPosition(source, parent, child, [leftObstacle])
    const left = organicDetailPosition(source, parent, child, [rightObstacle])
    expect(right.x).toBeGreaterThan(parent.x + parent.width)
    expect(left.x + child.width).toBeLessThan(parent.x)
  })

  it('moves a new panel around an existing panel without changing the obstacle', () => {
    const obstacle = { x: 950, y: 350, width: 340, height: 260 }
    const original = { ...obstacle }
    const point = avoidCanvasCollisions({ x: 950, y: 380, width: 320, height: 180 }, { x: 760, y: 520 }, [obstacle])
    const width = Math.max(0, Math.min(point.x + 320, obstacle.x + obstacle.width) - Math.max(point.x, obstacle.x))
    const height = Math.max(0, Math.min(point.y + 180, obstacle.y + obstacle.height) - Math.max(point.y, obstacle.y))
    expect(width * height).toBe(0)
    expect(obstacle).toEqual(original)
  })

  it('keeps an unobstructed orb at its intended opening position', () => {
    expect(avoidCanvasCollisions({ x: 200, y: 200, width: 100, height: 100 }, { x: 0, y: 0 })).toEqual({ x: 200, y: 200 })
  })
})
