import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { ChevronRight, Copy, Pencil, Plus, Trash2, X } from 'lucide-react'
import { UiIconButton } from '../ui/Controls'
import { organicDetailPosition, detailPanelSide, type CanvasBounds, panelConnector, type DetailPanelSide, type PanelConnectorSide } from './canvasInspector'
import { depthAtScreen } from './canvasDepth'

type Point = { x: number; y: number }
type Size = { width: number; height: number }

function useAnimatedDepth(target: number) {
  const value = useRef(target)
  const [, render] = useState(0)
  useEffect(() => {
    let frame = 0
    let previous = performance.now()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = (time: number) => {
      const delta = Math.min(64, time - previous)
      previous = time
      value.current = reducedMotion || Math.abs(value.current - target) < .001 ? target : value.current + (target - value.current) * (1 - Math.exp(-delta / 130))
      render(count => count + 1)
      if (value.current !== target) frame = requestAnimationFrame(animate)
    }
    if (value.current !== target) frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value.current
}

export function CanvasDetailWindow({ title, subtitle, color, active, restored = false, position, cone, scale, baseScale, viewport, canvasViewKey, children, subDetail, source, subSide, subPosition, getObstacles, placementKey, panelKind = 'list', onAdd, onEdit, onDuplicate, duplicateLabel, onOpen, onEditItem, onDelete, onDeleteItem, onClose, onActivate, onMove, onMoveSub, onMeasure }: {
  title: string
  subtitle: string
  color: string
  active: boolean
  restored?: boolean
  position: Point
  cone: string
  scale: number
  baseScale: number
  viewport: Size
  canvasViewKey: string
  children: ReactNode
  subDetail?: { title: string; subtitle: string; content: ReactNode; onClose: () => void; onOpen?: () => void; onDelete?: () => void }
  getObstacles?: (exclude?: Element | string) => CanvasBounds[]
  placementKey?: string
  source?: Point
  subSide?: DetailPanelSide
  subPosition?: Point
  panelKind?: 'list' | 'detail'
  onClose: () => void
  duplicateLabel?: string
  onDuplicate?: () => void
  onAdd?: () => void
  onEdit?: () => void
  onOpen?: () => void
  onDelete?: () => void
  onDeleteItem?: (id: string) => void
  onEditItem?: (id: string) => void
  onActivate: () => void
  onMove: (point: Point) => void
  onMoveSub: (point: Point) => void
  onMeasure: (size: Size) => void
}) {
  const windowRef = useRef<HTMLElement>(null)
  const subRef = useRef<HTMLElement>(null)
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number; subLeft: number; subTop: number; moveTogether: boolean } | null>(null)
  const subDrag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null)
  const connectorSide = useRef<PanelConnectorSide | undefined>(undefined)
  const [parentSize, setParentSize] = useState<Size>({ width: 320, height: 260 })
  const [subSize, setSubSize] = useState<Size>({ width: 320, height: 180 })
  const [openingSubPosition, setOpeningSubPosition] = useState<Point | null>(null)
  const [menu, setMenu] = useState<{ kind: 'list' | 'item' | 'detail'; x: number; y: number; row?: HTMLElement; inSub: boolean } | null>(null)
  const hasSubDetail = Boolean(subDetail)
  const measure = useRef(onMeasure)
  measure.current = onMeasure

  useEffect(() => { setMenu(null) }, [canvasViewKey])

  useEffect(() => {
    if (!menu) return
    const dismiss = (event: globalThis.PointerEvent) => {
      if (!(event.target as HTMLElement).closest('.canvas-inspector-context-menu')) setMenu(null)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null) }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('pointerdown', dismiss); window.removeEventListener('keydown', escape) }
  }, [menu])

  function contextMenu(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    const target = event.target as HTMLElement
    const detail = target.closest<HTMLElement>('.canvas-inspector-sub')
    const row = detail ? null : target.closest<HTMLElement>('.canvas-detail-row')
    const owner = detail || windowRef.current
    if (!owner) return
    const bounds = owner.getBoundingClientRect()
    const localScale = detail ? baseScale * subDepth : scale
    const menuWidth = 190 * localScale
    const menuHeight = (detail && subDetail?.onOpen ? 86 : 48) * localScale
    setMenu({ kind: detail || (panelKind === 'detail' && !row) ? 'detail' : row ? 'item' : 'list', row: row || undefined, inSub: Boolean(detail),
      x: Math.max(0, Math.min((event.clientX - bounds.left) / localScale, (window.innerWidth - bounds.left - menuWidth) / localScale)),
      y: Math.max(0, Math.min((event.clientY - bounds.top) / localScale, (window.innerHeight - bounds.top - menuHeight) / localScale)) })
  }

  function menuAction(action: () => void) {
    setMenu(null)
    action()
  }

  useLayoutEffect(() => {
    const element = windowRef.current
    if (!element) return
    const update = () => {
      const size = { width: element.offsetWidth, height: element.offsetHeight }
      setParentSize(previous => previous.width === size.width && previous.height === size.height ? previous : size)
      measure.current(size)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const element = subRef.current
    if (!element) return
    const update = () => {
      const size = { width: element.offsetWidth, height: element.offsetHeight }
      setSubSize(previous => previous.width === size.width && previous.height === size.height ? previous : size)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasSubDetail])

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: position.x, top: position.y, subLeft, subTop, moveTogether: event.ctrlKey || event.metaKey }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    if (active?.pointerId !== event.pointerId) return
    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    onMove({ x: active.left + dx, y: active.top + dy })
    if (hasSubDetail && !active.moveTogether) onMoveSub({ x: active.subLeft - dx / scale, y: active.subTop - dy / scale })
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  const side = subSide ?? (source ? detailPanelSide(source, { ...position, width: parentSize.width * scale, height: parentSize.height * scale }, { width: subSize.width * scale, height: subSize.height * scale }, viewport, 14 * scale) : 'right')
  const subLeft = subPosition?.x ?? openingSubPosition?.x ?? (side === 'right' ? parentSize.width + 14 : side === 'left' ? -subSize.width - 14 : 0)
  const subTop = subPosition?.y ?? openingSubPosition?.y ?? (side === 'below' ? parentSize.height + 14 : side === 'above' ? -subSize.height - 14 : 0)
  useLayoutEffect(() => {
    if (!hasSubDetail) {
      setOpeningSubPosition(null)
      return
    }
    if (openingSubPosition) return
    const parent = windowRef.current
    const child = subRef.current
    if (!parent || !child) return
    const parentBounds = { ...position, width: parent.offsetWidth * scale, height: parent.offsetHeight * scale }
    const childSize = { width: child.offsetWidth * scale, height: child.offsetHeight * scale }
    if (source && !subSide) {
      const initial = organicDetailPosition(source, parentBounds, childSize, getObstacles?.(child) || [], 24 * scale)
      setOpeningSubPosition({ x: (initial.x - position.x) / scale, y: (initial.y - position.y) / scale })
    } else {
      setOpeningSubPosition({ x: subLeft, y: subTop })
    }
  }, [hasSubDetail, openingSubPosition, position, scale, source, subSide, getObstacles, subLeft, subTop])

  const subDepth = useAnimatedDepth(subDetail ? depthAtScreen({ x: position.x + (subLeft + subSize.width / 2) * scale, y: position.y + (subTop + subSize.height / 2) * scale }, viewport) : 1)
  const subScaleRatio = baseScale * subDepth / scale
  const connector = subDetail ? panelConnector({ x: 0, y: 0, ...parentSize }, { x: subLeft, y: subTop, width: subSize.width * subScaleRatio, height: subSize.height * subScaleRatio }, connectorSide.current) : null
  connectorSide.current = connector?.side

  function subPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button, a')) return
    subDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: subLeft, top: subTop }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  function subPointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = subDrag.current
    if (active?.pointerId !== event.pointerId) return
    onMoveSub({ x: active.left + (event.clientX - active.x) / scale, y: active.top + (event.clientY - active.y) / scale })
  }

  function subPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (subDrag.current?.pointerId === event.pointerId) subDrag.current = null
  }

  return <>
    {cone && <svg className={`canvas-inspector-cone${restored ? ' is-restored' : ''}`} aria-hidden="true" style={{ color }}><path d={cone} /></svg>}
    {connector && <svg className={`canvas-inspector-cone canvas-inspector-sub-line${restored ? ' is-restored' : ''}`} aria-hidden="true" style={{ color }}><g transform={`translate(${position.x} ${position.y}) scale(${scale})`}><path d={connector.path} /></g></svg>}
    <aside ref={windowRef} data-placement-key={placementKey} className={`canvas-inspector${active ? ' is-active' : ''}${restored ? ' is-restored' : ''}`} style={{ left: position.x, top: position.y, transform: `scale(${scale})`, '--orb-color': color } as CSSProperties} aria-label={`${title} details`} onContextMenu={contextMenu} onPointerDownCapture={event => { if (!(event.target as HTMLElement).closest('.canvas-flyout-open')) onActivate() }} onDoubleClick={event => { if (onOpen && !(event.target as HTMLElement).closest('.canvas-inspector-sub, button, a, input, textarea, select')) onOpen() }}>
      <div className="canvas-inspector-head" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <div><h2>{title}</h2><p>{subtitle}</p></div><div className="canvas-inspector-sub-actions">{onEdit && <UiIconButton label={`Edit ${title} fields`} onClick={onEdit}><Pencil size={18} /></UiIconButton>}{onAdd && <UiIconButton label={`Add record to ${title}`} onClick={onAdd}><Plus size={18} /></UiIconButton>}{onOpen && !onAdd && <UiIconButton label={`Open ${title} in side panel`} variant="secondary" className="canvas-flyout-open" onClick={onOpen}><ChevronRight size={18} /></UiIconButton>}{onDelete && <UiIconButton label={`Delete ${title}`} variant="danger" onClick={onDelete}><Trash2 size={18} /></UiIconButton>}<UiIconButton label={`Close ${title} details`} variant="secondary" onClick={onClose}><X size={18} /></UiIconButton></div>
      </div>
      <div className="canvas-inspector-list">{children}</div>
      {menu && !menu.inSub && <div className="canvas-orb-menu canvas-inspector-context-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
        {menu.kind === 'item' ? <button type="button" role="menuitem" onClick={() => menuAction(() => { const id = menu.row?.dataset.itemId; if (id) onEditItem?.(id) })}><Pencil size={15} />Edit</button> : <button type="button" role="menuitem" onClick={() => menuAction(onClose)}><X size={15} />Close</button>}
        {menu.kind === 'detail' && onOpen && <button type="button" role="menuitem" onClick={() => menuAction(onOpen)}><Pencil size={15} />Edit</button>}
        {menu.kind !== 'item' && onDuplicate && <button type="button" role="menuitem" onClick={() => menuAction(onDuplicate)}><Copy size={15} />{duplicateLabel ?? 'Duplicate to all spaces'}</button>}
        {menu.kind === 'item' && onDeleteItem && <><div role="separator" className="kirayana-menu-separator" /><button className="kirayana-menu-delete" type="button" role="menuitem" onClick={() => menuAction(() => { const id = menu.row?.dataset.itemId; if (id) onDeleteItem(id) })}><Trash2 size={15} />Delete record</button></>}
        {menu.kind !== 'item' && onDelete && <><div role="separator" className="kirayana-menu-separator" /><button className="kirayana-menu-delete" type="button" role="menuitem" onClick={() => menuAction(onDelete)}><Trash2 size={15} />Delete</button></>}
      </div>}
      {subDetail && <section ref={subRef} className={`canvas-inspector-sub${restored ? ' is-restored' : ''}`} style={{ left: subLeft, top: subTop, transform: `scale(${subScaleRatio})`, transformOrigin: 'top left' }} aria-label={`${subDetail.title} details`} onDoubleClick={event => { event.stopPropagation(); if (subDetail.onOpen && !(event.target as HTMLElement).closest('button, a, input, textarea, select')) subDetail.onOpen() }}>
        <div className="canvas-inspector-sub-head" onPointerDown={subPointerDown} onPointerMove={subPointerMove} onPointerUp={subPointerUp} onPointerCancel={subPointerUp}><div><h3>{subDetail.title}</h3><p>{subDetail.subtitle}</p></div><div className="canvas-inspector-sub-actions">{subDetail.onOpen && <UiIconButton label={`Open ${subDetail.title} in side panel`} variant="secondary" className="canvas-flyout-open" onPointerDown={event => { if (event.button === 0) subDetail.onOpen?.() }} onClick={subDetail.onOpen}><ChevronRight size={18} /></UiIconButton>}{subDetail.onDelete && <UiIconButton label={`Delete ${subDetail.title}`} variant="danger" onClick={subDetail.onDelete}><Trash2 size={18} /></UiIconButton>}<UiIconButton label={`Close ${subDetail.title} details`} variant="secondary" onClick={subDetail.onClose}><X size={18} /></UiIconButton></div></div>
        <div className="canvas-inspector-sub-content">{subDetail.content}</div>
        {menu?.inSub && <div className="canvas-orb-menu canvas-inspector-context-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
          <button type="button" role="menuitem" onClick={() => menuAction(subDetail.onClose)}><X size={15} />Close</button>
          {subDetail.onOpen && <button type="button" role="menuitem" onClick={() => menuAction(subDetail.onOpen!)}><Pencil size={15} />Edit</button>}
          {subDetail.onDelete && <><div role="separator" className="kirayana-menu-separator" /><button className="kirayana-menu-delete" type="button" role="menuitem" onClick={() => menuAction(subDetail.onDelete!)}><Trash2 size={15} />Delete record</button></>}
        </div>}
      </section>}
    </aside>
  </>
}
