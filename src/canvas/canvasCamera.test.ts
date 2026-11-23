import { describe, expect, it } from 'vitest'
import { initialCamera, setZoomAtCenter, zoomCamera } from './canvasCamera'

describe('Canvas camera', () => {
  it('keeps the pointer anchored while zooming', () => {
    const camera = { zoom: 1, pan: { x: 60, y: -30 } }
    const pointer = { x: 950, y: 350 }
    const center = { x: 720, y: 432 }
    const world = { x: (pointer.x - center.x - camera.pan.x) / camera.zoom, y: (pointer.y - center.y - camera.pan.y) / camera.zoom }
    const next = zoomCamera(camera, pointer, center, -120, 0, 900)
    expect(center.x + next.pan.x + world.x * next.zoom).toBeCloseTo(pointer.x)
    expect(center.y + next.pan.y + world.y * next.zoom).toBeCloseTo(pointer.y)
  })

  it('clamps zoom and restores the starting view', () => {
    expect(zoomCamera(initialCamera, { x: 0, y: 0 }, { x: 0, y: 0 }, -100000, 0, 900).zoom).toBeLessThanOrEqual(2)
    expect(setZoomAtCenter(initialCamera, .1).zoom).toBe(.5)
    expect(setZoomAtCenter(initialCamera, 3).zoom).toBe(2)
    expect(initialCamera).toEqual({ zoom: 1, pan: { x: 0, y: 0 } })
  })
})
