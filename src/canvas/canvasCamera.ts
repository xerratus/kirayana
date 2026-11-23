export type Camera = { zoom: number; pan: { x: number; y: number } }
export type Point = { x: number; y: number }

export const initialCamera: Camera = { zoom: 1, pan: { x: 0, y: 0 } }

export function zoomCamera(camera: Camera, pointer: Point, center: Point, deltaY: number, deltaMode: number, pageHeight: number): Camera {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1)
  const step = Math.max(-48, Math.min(48, pixels))
  const zoom = Math.max(.5, Math.min(2, camera.zoom * Math.exp(-step * .0012)))
  const ratio = zoom / camera.zoom
  return { zoom, pan: {
    x: pointer.x - center.x - (pointer.x - center.x - camera.pan.x) * ratio,
    y: pointer.y - center.y - (pointer.y - center.y - camera.pan.y) * ratio,
  } }
}

export function setZoomAtCenter(camera: Camera, zoom: number): Camera {
  const next = Math.max(.5, Math.min(2, zoom))
  const ratio = next / camera.zoom
  return { zoom: next, pan: { x: camera.pan.x * ratio, y: camera.pan.y * ratio } }
}
