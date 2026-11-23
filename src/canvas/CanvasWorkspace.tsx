import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { ArrowLeft, ChevronRight, CircleHelp, Copy, CornerDownLeft, Download, Expand, FileText, Focus, Layers3, List, Minus, Palette, Pencil, Plus, Sparkles, StickyNote, UserRound, X } from 'lucide-react'
import { brand } from '../app/brand'
import { addNode, emptyView, moveNode, nodeColor, palette, updateNode, type Node, type Organizer } from '../organizer/model'
import { useConfirmation } from '../ui/confirmationContext'
import { UiButton, UiIconButton } from '../ui/Controls'
import { initialCamera, setZoomAtCenter, zoomCamera, type Point } from './canvasCamera'
import { depthAtScreen } from './canvasDepth'
import { avoidCanvasCollisions, inspectorPlacement, type CanvasBounds } from './canvasInspector'
import { CanvasDetailWindow } from './CanvasDetailWindow'
import { CanvasFloatingFlyoutFrame } from './CanvasFloatingFlyout'
import { drawBackground } from './background'
import { drawOrb, drawProjectCone, orbitPoint } from './drawing'
import { fanSlots, fanGeometry, drawFan, angleDistance } from './fan'
import { CollectionEditor, CollectionList, ItemEditor, RecordSummary, kindLabel, recordTitle } from '../organizer/OrganizerContent'
import { useSceneAnimation } from './useSceneAnimation'

type Change = (update: (state: Organizer) => Organizer) => void
type Menu = { id: string; x: number; y: number } | null
type Editor = { kind: 'create' | 'edit'; nodeKind?: 'entity' | 'collection' | 'subset' | 'item'; id: string; name: string; color: string } | null
const orbScale = (width: number, height: number) => Math.min(1, Math.max(.48, Math.min(width / 900, height / 900)))

export function CanvasWorkspace({ state, change, storageStatus, storageError }: { state: Organizer; change: Change; storageStatus: string; storageError: string }) {
  const confirm = useConfirmation(), flyoutDirty = useRef(false)
  const onFlyoutDirty = useCallback((dirty: boolean) => { flyoutDirty.current = dirty }, [])
  function leaveFlyout(action: () => void) {
    if (!flyoutDirty.current) { action(); return }
    void confirm({ intent: { kind: 'discard', action: 'leave-detail', accountId: state.rootId, version: 1 }, title: 'Discard changes?', description: 'Your unsaved detail changes will be lost.', confirmLabel: 'Discard changes', action: async () => { flyoutDirty.current = false; action() } })
  }
  const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), promptBox = useRef<HTMLDivElement>(null), promptInput = useRef<HTMLTextAreaElement>(null), fileInput = useRef<HTMLInputElement>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [hoveredFan, setHoveredFan] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null), [menu, setMenu] = useState<Menu>(null)
  const [editor, setEditor] = useState<Editor>(null), [formError, setFormError] = useState('')
  const [flyoutId, setFlyoutId] = useState<string | null>(null), [help, setHelp] = useState(false), [account, setAccount] = useState(false)
  const [prompt, setPrompt] = useState(''), [focused, setFocused] = useState(false), [draggingFiles, setDraggingFiles] = useState(false)
  const [reply, setReply] = useState<{ user: string; text: string } | null>(null), [attachmentError, setAttachmentError] = useState('')
  const [panelSizes, setPanelSizes] = useState<Record<string, { width: number; height: number }>>({})
  const [flyoutRecordId, setFlyoutRecordId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const arcDrag = useRef<string | null>(null)
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const click = useRef<{ id: string; timer: number } | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const drag = useRef<{ id: string | null; origin: Point; pan: Point; positions: Record<string, Point>; panels: Record<string, Point>; moved: boolean; together: boolean } | null>(null)
  const pinch = useRef<{ distance: number; center: Point } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const root = state.nodes.find(n => n.id === state.viewId)!
  const view = state.views[root.id] ?? emptyView()
  const selection = view.selectedRecords ?? {}
  const visible = [root, ...state.nodes.filter(n => n.parentId === root.id)]
  for (let i = 0; i < visible.length; i++) {
    const node = visible[i]
    if (node.kind === 'subset') for (const child of state.nodes.filter(n => n.parentId === node.id && view.expandedEntities?.includes(n.id))) { if (!visible.some(v => v.id === child.id)) { visible.push(child); visible.push(...state.nodes.filter(n => n.parentId === child.id)) } }
  }
  const camera = view.camera
  const scale = orbScale(viewport.width, viewport.height) * camera.zoom
  const center = { x: viewport.width / 2, y: viewport.height * .48 }
  const rawPoint = (p: Point) => ({ x: center.x + camera.pan.x + p.x * scale, y: center.y + camera.pan.y + p.y * scale })
  const rawRoot = rawPoint(root.position)
  const targets = Object.fromEntries(visible.flatMap(n => {
    const point = n.id === root.id ? rawRoot : orbitPoint(rawRoot, rawPoint(n.position), 100 * scale * depthAtScreen(rawRoot, viewport), n.collapsed || root.collapsed ? 0 : 1)
    return [[n.id, n.collapsed ? 0 : 1], [`fan:${n.id}`, n.fanOpen === false ? 0 : 1], [`spread:${n.id}`, n.fanCollapsed ? 0 : 1], [`depth:${n.id}`, depthAtScreen(point, viewport)], [`hover:${n.id}`, hovered === n.id ? 1 : 0], [`hover:fan:${n.id}`, hoveredFan === n.id ? 1 : 0]]
  }))
  const { values: animation } = useSceneAnimation(targets, focused)
  const focus = animation.focus ?? 1
  const position = (p: Point) => ({ x: center.x + (camera.pan.x + p.x * scale) * focus, y: center.y + (camera.pan.y + p.y * scale) * focus })
  const world = (p: Point) => ({ x: ((p.x - center.x) / focus - camera.pan.x) / scale, y: ((p.y - center.y) / focus - camera.pan.y) / scale })
  const rootPoint = position(root.position)
  const rootDepth = animation[`depth:${root.id}`] ?? depthAtScreen(rootPoint, viewport)
  const visuals: { node: Node; point: Point; progress: number; depth: number; radius: number }[] = []
  for (const original of visible) {
    const node = { ...original, color: nodeColor(state, original) }
    const isRoot = node.id === root.id
    const parentNode = state.nodes.find(n => n.id === node.parentId)
    const parent = visuals.find(v => v.node.id === node.parentId) ?? visuals[0]
    const hub = parent?.point ?? rootPoint, hubRadius = parent?.radius ?? 100 * scale * focus * rootDepth
    const expandedHub = !isRoot && parentNode?.kind === 'subset'
    const ownProgress = animation[node.id] ?? (node.collapsed ? 0 : 1)
    const parentReveal = parent && parent.node.id !== root.id ? parent.progress : 1
    const progress = isRoot ? 1 : expandedHub ? parentReveal : node.kind === 'item' ? parentReveal : ownProgress * (animation[parent?.node.id ?? root.id] ?? 1) * parentReveal
    let point = isRoot ? rootPoint : expandedHub ? position(node.position) : orbitPoint(hub, position(node.position), hubRadius, progress)
    if (expandedHub && parentNode && parent) {
      const slot = fanSlots(state.nodes.filter(n => n.parentId === parentNode.id).sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))).find(slot => slot.project.id === node.id)
      if (slot) {
        const spread = animation[`spread:${parentNode.id}`] ?? 1, fanReveal = animation[`fan:${parentNode.id}`] ?? 1
        const distance = (50 + (96 + (slot.radius - 96) * spread - 50) * fanReveal) * scale * focus * parent.depth
        const source = { x: parent.point.x + Math.cos(slot.angle) * distance, y: parent.point.y + Math.sin(slot.angle) * distance }, end = position(node.position)
        point = { x: source.x + (end.x-source.x)*parent.progress, y: source.y + (end.y-source.y)*parent.progress }
      }
    }
    if (node.kind === 'item') {
      const angle = node.anchorAngle ?? Math.atan2(node.position.y - (parentNode?.position.y ?? 0), node.position.x - (parentNode?.position.x ?? 0))
      point = { x: hub.x + Math.cos(angle) * hubRadius, y: hub.y + Math.sin(angle) * hubRadius }
    }
    const depth = animation[`depth:${node.id}`] ?? depthAtScreen(point, viewport)
    const fan = node.kind === 'subset' && state.nodes.some(n => n.parentId === node.id) ? animation[`fan:${node.id}`] ?? 1 : 0
    visuals.push({ node, point, progress, depth, radius: (isRoot ? 100 : node.kind === 'item' ? 17 * parentReveal : expandedHub ? 72 * parentReveal : 17 + ((node.kind === 'subset' ? 50 + 40 * fan : 50) - 17) * progress) * scale * focus * depth })
  }
  const fans = visuals.filter(v => v.node.kind === 'subset').map(v => ({ visual: v, slots: fanSlots(state.nodes.filter(n => n.parentId === v.node.id && n.kind === 'entity').sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))), reveal: animation[`fan:${v.node.id}`] ?? 1, spread: animation[`spread:${v.node.id}`] ?? 1, factor: scale * focus * v.depth }))
  const fanOrbs = fans.flatMap(fan => fan.slots.map(slot => {
    const distance = (50 + (96 + (slot.radius - 96) * fan.spread - 50) * fan.reveal) * fan.factor
    const point = { x: fan.visual.point.x + Math.cos(slot.angle) * distance, y: fan.visual.point.y + Math.sin(slot.angle) * distance }
    return { node: slot.project, subsetId: fan.visual.node.id, point, radius: 23 * scale * focus * depthAtScreen(point, viewport) * fan.spread, opacity: fan.reveal * fan.visual.progress, slot }
  }))
  const visualsRef = useRef(visuals); visualsRef.current = visuals
  const latest = useRef({ state, view, root, camera, scale, focus, center, focused }); latest.current = { state, view, root, camera, scale, focus, center, focused }
  const patchView = (fn: (current: typeof view) => typeof view) => change(s => ({ ...s, views: { ...s.views, [s.viewId]: fn(s.views[s.viewId] ?? emptyView()) } }))
  const setSelection = (fn: (selected: Record<string, string>) => Record<string, string>) => patchView(v => ({ ...v, selectedRecords: fn(v.selectedRecords ?? {}) }))
  const setCamera = (fn: (current: typeof camera) => typeof camera) => patchView(v => ({ ...v, camera: fn(v.camera) }))
  const hit = (p: Point) => [...fanOrbs.filter(v => v.radius > 1 && v.opacity > .8), ...[...visualsRef.current].reverse()].find(v => Math.hypot(p.x - v.point.x, p.y - v.point.y) <= v.radius + 7)?.node ?? null
  const obstacles = (exclude?: Element | string): CanvasBounds[] => [
    ...visuals.map(v => ({ x: v.point.x - v.radius, y: v.point.y - v.radius, width: v.radius * 2, height: v.radius * 2 })),
    ...Array.from(document.querySelectorAll<HTMLElement>('.canvas-inspector,.canvas-inspector-sub')).filter(el => el !== exclude && el.dataset.placementKey !== exclude).map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }),
  ]
  function showFlyout(id: string, recordId: string | null = null) { if (id === flyoutId && recordId === flyoutRecordId) return; leaveFlyout(() => { setFlyoutId(id); setFlyoutRecordId(recordId); setHelp(false) }) }
  function closeSubDetail(id: string) { if (flyoutDirty.current && flyoutId === id && flyoutRecordId === selection[id]) { leaveFlyout(() => closeSubDetail(id)); return }; if (flyoutId === id && flyoutRecordId === selection[id]) { setFlyoutId(null); setFlyoutRecordId(null) }; setSelection(s => { const next = { ...s }; delete next[id]; return next }) }
  function closePanel(id: string) { if (flyoutDirty.current && flyoutId === id && (!flyoutRecordId || flyoutRecordId === selection[id])) { leaveFlyout(() => closePanel(id)); return }; patchView(v => ({ ...v, openPanels: v.openPanels.filter(p => p !== id) })); if (flyoutId === id && (!flyoutRecordId || flyoutRecordId === selection[id])) setFlyoutId(null) }
  function openPanel(id: string) {
    const visual = visualsRef.current.find(v => v.node.id === id)
    if (!visual) return
    setActivePanel(id)
    patchView(v => {
      const opening = v.panels[id] ? position(v.panels[id]) : (() => {
        const placement = inspectorPlacement(visual.point, rootPoint, visual.radius, { width: 320 * camera.zoom, height: 220 * camera.zoom }, viewport, undefined, 5 * camera.zoom, camera.zoom, true, obstacles(id))
        return { x: placement.left, y: placement.top }
      })()
      // Placement runs once. Only the camera changes to reveal an offscreen opening.
      const x = Math.max(16, Math.min(opening.x, viewport.width - 320 * camera.zoom - 24))
      const y = Math.max(80, Math.min(opening.y, viewport.height - 220 * camera.zoom - 160))
      return { ...v, openPanels: [...new Set([...v.openPanels, id])], panels: { ...v.panels, [id]: v.panels[id] ?? world(opening) }, camera: { ...v.camera, pan: { x: v.camera.pan.x + (x - opening.x) / focus, y: v.camera.pan.y + (y - opening.y) / focus } } }
    })
  }
  function toggle(id: string) { change(s => updateNode(s, id, { collapsed: !s.nodes.find(n => n.id === id)!.collapsed })); setMenu(null) }
  function enter(node: Node) {
    if (flyoutDirty.current) { leaveFlyout(() => enter(node)); return }
    if (!['user','entity'].includes(node.kind)) { toggle(node.id); return }
    setFlyoutId(null); setMenu(null)
    change(s => ({ ...s, viewId: node.id, views: { ...s.views, [node.id]: s.views[node.id] ?? { ...emptyView(), camera: { zoom: 1, pan: { x: -node.position.x * orbScale(viewport.width, viewport.height), y: -node.position.y * orbScale(viewport.width, viewport.height) } } } } }))
  }
  function choose(node: Node) {
    if (node.kind === 'item') { openPanel(node.id); return }
    const fanChild = state.nodes.find(n => n.id === node.parentId)?.kind === 'subset'
    if (click.current) {
      clearTimeout(click.current.timer)
      if (click.current.id === node.id) { click.current = null; if (node.id === root.id || !['entity','user'].includes(node.kind)) toggle(node.id); else enter(node); return }
    }
    click.current = { id: node.id, timer: window.setTimeout(() => { click.current = null; if (fanChild && !view.expandedEntities?.includes(node.id)) { patchView(v => ({ ...v, expandedEntities: [...(v.expandedEntities ?? []), node.id] })); return }; if (node.id !== root.id && (node.collapsed || root.collapsed)) { change(s => updateNode(updateNode(s, root.id, { collapsed: false }), node.id, { collapsed: false })) } else openPanel(node.id) }, 240) }
  }
  function edit(node: Node) { setFormError(''); setEditor({ kind: 'edit', id: node.id, name: node.name, color: node.color }); setMenu(null) }
  function create(parent: Node, nodeKind: 'entity' | 'collection' | 'subset' | 'item' = 'entity') { setFormError(''); setEditor({ kind: 'create', nodeKind, id: parent.id, name: '', color: nodeKind === 'collection' ? '#41c7ae' : nodeKind === 'subset' ? '#f2ad58' : nodeKind === 'item' ? nodeColor(state, parent) : palette[state.nodes.filter(n => n.kind === 'entity').length % palette.length] }); setMenu(null) }
  function closeEditor() {
    if (!editor) return
    const node = state.nodes.find(n => n.id === editor.id)
    const dirty = editor.kind === 'create' ? Boolean(editor.name.trim()) : editor.name !== node?.name || editor.color !== node?.color
    if (!dirty) { setEditor(null); return }
    void confirm({ intent: { kind: 'discard', action: 'leave-entity-form', accountId: state.rootId, version: 1 }, title: 'Discard changes?', description: 'Unsaved changes in this form will be lost.', confirmLabel: 'Discard changes', action: async () => { setEditor(null) } })
  }
  function saveEditor(event: React.FormEvent) {
    event.preventDefault()
    if (!editor) return
    try {
      if (!editor.name.trim() || editor.name.trim().length > 80) throw new Error('Use a name between 1 and 80 characters.')
      if (editor.kind === 'edit') change(s => updateNode(s, editor.id, { name: editor.name, color: editor.color }))
      else {
        const parent = state.nodes.find(n => n.id === editor.id)!
        const children = state.nodes.filter(n => n.parentId === parent.id)
        const angle = parent.kind === 'subset' ? -Math.PI / 2 + .1 + (children.length + .5) * .49 : -Math.PI / 2 + children.length * .9
        const preferred = { x: parent.position.x + Math.cos(angle) * (parent.kind === 'subset' ? 405 : 280) - 65, y: parent.position.y + Math.sin(angle) * (parent.kind === 'subset' ? 405 : 280) - 65, width: 130, height: 130 }
        const existing = state.nodes.map(n => ({ x: n.position.x - 65, y: n.position.y - 65, width: 130, height: 130 }))
        const p = avoidCanvasCollisions(preferred, parent.position, existing)
        change(s => addNode(updateNode(s, parent.id, { collapsed: false }), parent.id, editor.nodeKind ?? 'entity', editor.name, editor.color, { x: p.x + 65, y: p.y + 65 }))
      }
      setEditor(null)
    } catch (error) { setFormError(error instanceof Error ? error.message : String(error)) }
  }

  useLayoutEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new ResizeObserver(() => setViewport({ width: element.clientWidth, height: element.clientHeight }))
    observer.observe(element); return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (editor && !dialog.current?.open) dialog.current?.showModal()
    if (!editor && dialog.current?.open) dialog.current.close()
  }, [editor])
  useEffect(() => {
    const dismiss = (event: globalThis.PointerEvent) => { const target = event.target as HTMLElement; if (!target.closest('.canvas-orb-menu')) setMenu(null); if (!target.closest('.account-menu')) setAccount(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(null); setAccount(false); leaveFlyout(() => { setHelp(false); setFlyoutId(null) }); setFocused(false); promptInput.current?.blur() } }
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); if (click.current) clearTimeout(click.current.timer) }
  }, [])
  useEffect(() => {
    const element = stage.current
    if (!element) return
    let wheelGesture: 'detail' | 'canvas' | null = null, wheelGestureUntil = 0
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('.canvas-prompt,.canvas-response,.canvas-header,.canvas-camera-controls,.canvas-floating-flyout')) return
      const list = (event.target as HTMLElement).closest<HTMLElement>('.canvas-detail-results')
      if (event.timeStamp >= wheelGestureUntil || event.ctrlKey || event.metaKey) wheelGesture = null
      if (!wheelGesture) wheelGesture = !event.ctrlKey && !event.metaKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX) && list && list.scrollHeight > list.clientHeight + 1 ? 'detail' : 'canvas'
      wheelGestureUntil = event.timeStamp + 220
      if (wheelGesture === 'detail') {
        if (!list || (event.deltaY > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 1) || (event.deltaY < 0 && list.scrollTop <= 1)) event.preventDefault()
        return
      }
      event.preventDefault()
      const l = latest.current
      if (l.focused) return
      change(s => {
        const v = s.views[s.viewId] ?? emptyView()
        const camera = event.ctrlKey || event.metaKey ? zoomCamera(v.camera, { x: l.center.x + (event.clientX - l.center.x) / l.focus, y: l.center.y + (event.clientY - l.center.y) / l.focus }, l.center, event.deltaY, event.deltaMode, viewport.height) : { ...v.camera, pan: { x: v.camera.pan.x - event.deltaX / l.focus, y: v.camera.pan.y - event.deltaY / l.focus } }
        return { ...s, views: { ...s.views, [s.viewId]: { ...v, camera } } }
      })
    }
    element.addEventListener('wheel', wheel, { passive: false }); return () => element.removeEventListener('wheel', wheel)
  }, [change, viewport.height])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (flyoutDirty.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn)
  }, [])
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext('2d')
    if (!element || !ctx) return
    const { width, height } = viewport, ratio = Math.min(window.devicePixelRatio || 1, 2)
    element.width = Math.round(width * ratio); element.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    drawBackground(ctx, width, height, true)
    const background = getComputedStyle(element).getPropertyValue('--panel').trim()
    for (const v of visuals.slice(1)) {
      if (v.node.kind === 'item') continue
      const parent = visuals.find(p => p.node.id === v.node.parentId) ?? visuals[0]
      if (v.node.kind === 'subset') {
        const arcRadius = parent.radius + 17 * scale * focus * parent.depth, angle = v.node.anchorAngle ?? -Math.PI / 3
        const source = { x: parent.point.x + Math.cos(angle) * arcRadius, y: parent.point.y + Math.sin(angle) * arcRadius }
        drawProjectCone(ctx, source, v.point, 0, v.radius, v.node.color, v.progress * .2, 24, Math.min(46, v.radius * .9), 3, { center: parent.point, radius: arcRadius, angle })
        ctx.save(); ctx.globalAlpha = v.progress; ctx.beginPath(); ctx.arc(parent.point.x, parent.point.y, arcRadius, angle - Math.PI / 9, angle + Math.PI / 9); ctx.strokeStyle = v.node.color; ctx.lineWidth = Math.max(5, 9 * scale * focus * parent.depth); ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
        continue
      }
      if (parent.node.kind === 'subset') {
        const source = fanOrbs.find(o => o.node.id === v.node.id)
        if (source) drawProjectCone(ctx, source.point, v.point, Math.max(2, source.radius), v.radius, v.node.color, parent.progress * .2)
        continue
      }
      const angle = Math.atan2(v.point.y - parent.point.y, v.point.x - parent.point.x)
      const start = { x: parent.point.x + Math.cos(angle) * parent.radius, y: parent.point.y + Math.sin(angle) * parent.radius }
      const end = { x: v.point.x - Math.cos(angle) * v.radius, y: v.point.y - Math.sin(angle) * v.radius }
      ctx.globalAlpha = v.progress
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.strokeStyle = `${v.node.color}5e`; ctx.lineWidth = 1.15; ctx.stroke()
      for (const point of [start, end]) { ctx.beginPath(); ctx.arc(point.x, point.y, 1.8, 0, Math.PI * 2); ctx.fillStyle = `${v.node.color}bb`; ctx.fill() }
    }
    ctx.globalAlpha = 1
    for (const fan of fans) drawFan(ctx, fan.visual.point, fan.slots, fan.reveal, fan.spread, fan.factor, fan.visual.node.color, fan.visual.node.name, fan.visual.progress, animation[`hover:fan:${fan.visual.node.id}`] ?? 0, viewport)
    ctx.globalAlpha = 1
    for (const v of visuals) {
      if (v.radius <= 1) continue
      drawOrb(ctx, 'organization', v.point.x, v.point.y, v.radius, v.node.color, background, Math.max(animation[`hover:${v.node.id}`] ?? 0, activePanel === v.node.id ? .45 : 0))
      if (v.node.kind === 'item') continue
      const main = v.node.id === root.id, depth = v.depth
      ctx.globalAlpha = main ? 1 : v.progress
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#edf5ff'; ctx.font = `${main ? 700 : 650} ${Math.max(9, (main ? 17 : 15) * camera.zoom * depth)}px sans-serif`
      ctx.fillText(v.node.name, v.point.x, v.point.y + v.radius + 28 * camera.zoom * depth)
      ctx.fillStyle = '#9bb0cb'; ctx.font = `${Math.max(8, (main ? 10.5 : 12) * camera.zoom * depth)}px sans-serif`
      ctx.fillText(main ? (root.kind === 'user' ? 'Your organizer' : 'Entity') : v.node.kind === 'skills' ? 'Personalize your experience' : kindLabel(v.node), v.point.x, v.point.y + v.radius + (main ? 50 : 49) * camera.zoom * depth)
      ctx.globalAlpha = 1
    }
    for (const orb of fanOrbs) {
      if (orb.radius <= 0) continue
      const spread = animation[`spread:${orb.subsetId}`] ?? 1
      ctx.save(); ctx.globalAlpha = orb.opacity; ctx.translate(orb.point.x, orb.point.y); ctx.scale(spread, spread)
      drawOrb(ctx, 'projects', 0, 0, orb.radius / spread, orb.node.color, background, hovered === orb.node.id ? 1 : 0)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = orb.node.color
      ctx.font = `700 ${Math.max(8, 13 * scale * depthAtScreen(orb.point, viewport))}px sans-serif`
      const words = orb.node.name.trim().split(/\s+/), initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0,2)).toUpperCase()
      ctx.fillText(initials, 0, 0); ctx.restore()
    }
  })

  function arcAt(point: Point) {
    return fans.find(fan => {
      const parent = visuals.find(v => v.node.id === fan.visual.node.parentId) ?? visuals[0]
      const radius = parent.radius + 17 * scale * focus * parent.depth
      return Math.abs(Math.hypot(point.x-parent.point.x, point.y-parent.point.y)-radius) < 12 && angleDistance(Math.atan2(point.y-parent.point.y,point.x-parent.point.x), fan.visual.node.anchorAngle ?? -Math.PI/3) < Math.PI/9 + .08
    })
  }
  function fanAt(point: Point) {
    return fans.find(fan => {
      if (!fan.slots.length || fan.visual.progress < .8) return false
      const geometry = fanGeometry(fan.slots, fan.reveal, fan.spread, fan.factor), dx=point.x-fan.visual.point.x, dy=point.y-fan.visual.point.y
      let angle = Math.atan2(dy,dx); while (angle < geometry.start) angle += Math.PI*2
      return angle <= geometry.end && Math.abs(Math.hypot(dx,dy)-geometry.outer+7.5*fan.factor) < 14*fan.factor
    })
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || focused) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; if (drag.current) drag.current.moved = true; return
    }
    const arc = arcAt({ x: event.clientX, y: event.clientY })
    if (arc) { arcDrag.current = arc.visual.node.id; return }
    const fan = fanAt({ x: event.clientX, y: event.clientY })
    if (fan && !hit({ x: event.clientX, y: event.clientY })) { change(s => ({ ...s, nodes: s.nodes.map(n => n.id === fan.visual.node.id ? { ...n, fanCollapsed: !n.fanCollapsed } : n) })); return }
    const node = hit({ x: event.clientX, y: event.clientY })
    drag.current = { id: node?.id ?? null, origin: { x: event.clientX, y: event.clientY }, pan: camera.pan, positions: Object.fromEntries(state.nodes.map(n => [n.id, n.position])), panels: { ...view.panels }, moved: false, together: event.ctrlKey || event.metaKey }
    event.preventDefault()
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const p = { x: event.clientX, y: event.clientY }
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, p)
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()], distance = Math.hypot(a.x - b.x, a.y - b.y), middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, prev = pinch.current
      setCamera(c => { const zoom = Math.max(.5, Math.min(2, c.zoom * distance / Math.max(prev.distance, 1))), ratio = zoom / c.zoom; return { zoom, pan: { x: middle.x - center.x - (prev.center.x - center.x - c.pan.x) * ratio, y: middle.y - center.y - (prev.center.y - center.y - c.pan.y) * ratio } } })
      pinch.current = { distance, center: middle }; return
    }
    if (arcDrag.current) {
      const id = arcDrag.current, node = state.nodes.find(n => n.id === id)!, parent = visuals.find(v => v.node.id === node.parentId) ?? visuals[0]
      const angle = Math.atan2(p.y-parent.point.y,p.x-parent.point.x)
      change(s => ({ ...s, nodes: s.nodes.map(n => n.id === id ? { ...n, anchorAngle: angle } : n) })); return
    }
    const d = drag.current
    if (!d) { const node = hit(p); setHovered(node?.id ?? null); setHoveredFan(node ? null : fanAt(p)?.visual.node.id ?? null); return }
    const dx = (p.x - d.origin.x) / focus, dy = (p.y - d.origin.y) / focus
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    if (!d.id) { setCamera(c => ({ ...c, pan: { x: d.pan.x + dx, y: d.pan.y + dy } })); return }
    const item = state.nodes.find(n => n.id === d.id)
    if (item?.kind === 'item') {
      const parent = visuals.find(v => v.node.id === item.parentId) ?? visuals[0], angle = Math.atan2(p.y-parent.point.y,p.x-parent.point.x)
      change(s => ({ ...s, nodes: s.nodes.map(n => n.id === item.id ? { ...n, anchorAngle: angle } : n) })); return
    }
    if (item && item.id !== root.id && !d.together && (item.collapsed || root.collapsed) && state.nodes.find(n => n.id === item.parentId)?.kind !== 'subset') {
      const parentNode = state.nodes.find(n => n.id === item.parentId) ?? root, parent = visuals.find(v => v.node.id === parentNode.id) ?? visuals[0]
      const angle = Math.atan2(p.y-parent.point.y,p.x-parent.point.x), start = d.positions[item.id], radius = Math.hypot(start.x-parentNode.position.x,start.y-parentNode.position.y) || 240
      change(s => updateNode(s,item.id,{position:{x:parentNode.position.x+Math.cos(angle)*radius,y:parentNode.position.y+Math.sin(angle)*radius}})); return
    }
    const ids = new Set([d.id])
    if (d.together) { for (let pass = 0; pass < state.nodes.length; pass++) for (const n of state.nodes) if (n.parentId && ids.has(n.parentId)) ids.add(n.id) }
    change(s => ({ ...s, nodes: s.nodes.map(n => ids.has(n.id) ? { ...n, position: { x: d.positions[n.id].x + dx / scale, y: d.positions[n.id].y + dy / scale } } : n), views: d.together ? { ...s.views, [s.viewId]: { ...s.views[s.viewId], panels: Object.fromEntries(Object.entries(s.views[s.viewId].panels).map(([id, point]) => [id, ids.has(id) && d.panels[id] ? { x: d.panels[id].x + dx / scale, y: d.panels[id].y + dy / scale } : point])) } } : s.views }))
  }
  function pointerUp(event: PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId)
    if (arcDrag.current) { arcDrag.current = null; return }
    if (pinch.current) { if (pointers.current.size === 0) { pinch.current = null; drag.current = null }; return }
    const d = drag.current; drag.current = null
    if (d && !d.moved && d.id) { const node = state.nodes.find(n => n.id === d.id); if (node) choose(node) }
  }
  function addFiles(files: FileList | File[]) {
    setAttachmentError('')
    const list = Array.from(files)
    if (list.some(file => file.size > 10 * 1024 * 1024) || state.attachments.reduce((sum, f) => sum + f.size, 0) + list.reduce((sum, f) => sum + f.size, 0) > 25 * 1024 * 1024) { setAttachmentError('Use files under 10 MB, up to 25 MB total.'); return }
    change(s => ({ ...s, attachments: [...s.attachments, ...list.map(file => ({ id: crypto.randomUUID(), name: file.name, size: file.size, blob: file }))] })); setFocused(true)
  }
  function ask() {
    if (!prompt.trim() && !state.attachments.length) return
    setReply({ user: prompt.trim() || 'Attached files', text: 'AI is not connected yet. Your files stay in this browser and have not been analyzed. You can organize your canvas using the right-click menu.' }); setPrompt(''); setFocused(true); promptInput.current?.focus()
  }
  function exportBackup() {
    const content = JSON.stringify({ ...state, attachments: state.attachments.map(({ id, name, size }) => ({ id, name, size })) }, null, 2)
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = 'kirayana-layout-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const flyout = state.nodes.find(n => n.id === flyoutId)
  return <main className={`canvas-workspace${flyout || help ? ' right-flyout-open' : ''}`} onPointerDownCapture={event => { const target = event.target as HTMLElement; if (target.closest('.canvas-prompt,.canvas-response')) return; setFocused(false); promptInput.current?.blur() }}>
    <CanvasFloatingFlyoutFrame open={Boolean(flyout || help)} color={flyout ? nodeColor(state, flyout) : root.color} label={help ? 'Help' : `${flyout?.name ?? ''} full view`}>
      <header className="canvas-right-flyout-heading"><div><small>{help ? brand.name : flyout ? kindLabel(flyout) : 'Details'}</small><h2>{help ? 'Your canvas' : state.records.some(r => r.id === flyoutRecordId) ? recordTitle(state, state.records.find(r => r.id === flyoutRecordId)!) : flyout?.name}</h2></div><UiIconButton label="Close side panel" onClick={() => leaveFlyout(() => { setFlyoutId(null); setHelp(false) })}><X size={18} /></UiIconButton></header>
      <div className="canvas-right-flyout-body">{help ? <><p>Right-click your hub or the canvas to add an entity, List/detail, Subset, or Item. Click an expanded orb for details; click a small orb to expand it.</p><p>Double-click the main hub to collapse its children. Double-click an entity to enter its canvas. Right-click for rename, color, move, and expand/collapse controls. Use Fields on a list to define its records. Items inherit their entity’s color.</p><p>Click a Subset fan entity to expand it; double-click to enter it. Click the fan arc to shrink or expand the fan. Drag the rounded arc beside its parent to move the connector anchor. Drag empty space or use two fingers to pan. Pinch or hold Command/Control while scrolling to zoom. Hold Command/Control while dragging an orb to move its children too.</p><p>Your organizer and attached files are saved only in this browser. Clearing site data removes them. AI is not connected yet.</p></> : flyout?.kind === 'collection' ? <CollectionEditor key={`${flyout.id}:${flyoutRecordId ?? 'schema'}`} state={state} node={flyout} change={change} onDirty={onFlyoutDirty} recordId={flyoutRecordId} onRecordSaved={id => { setFlyoutRecordId(id); setSelection(v => ({ ...v, [flyout.id]: id })) }} /> : flyout?.kind === 'item' ? <ItemEditor key={flyout.id} state={state} node={flyout} change={change} onDirty={onFlyoutDirty} /> : <><p>{flyout?.kind === 'skills' ? 'Personal skills are not available yet.' : 'Customize this entity from its context menu.'}</p>{flyout && <UiButton onClick={() => edit(flyout)}><Pencil size={15} />Edit {flyout.kind === 'user' ? 'profile' : 'entity'}</UiButton>}</>}</div>
    </CanvasFloatingFlyoutFrame>
    <div className={`canvas-stage${focused ? ' is-prompt-active' : ''}`} ref={stage}>
      <div className="canvas-scene"><canvas ref={canvas} tabIndex={-1} aria-label="Organizer canvas. Drag to pan; pinch to zoom. Right-click for actions. Use the Explore canvas navigation for keyboard access." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { pointers.current.clear(); drag.current = null; pinch.current = null; arcDrag.current = null }} onPointerLeave={() => { setHovered(null); setHoveredFan(null) }} onContextMenu={event => { event.preventDefault(); if (click.current) { clearTimeout(click.current.timer); click.current = null }; const node = hit({ x: event.clientX, y: event.clientY }); setMenu({ id: node?.id ?? root.id, x: Math.max(8, Math.min(event.clientX, viewport.width - 206)), y: Math.max(8, Math.min(event.clientY, viewport.height - 370)) }) }} style={{ cursor: hovered || hoveredFan ? 'pointer' : undefined }} />
        <div className="canvas-symbols">{visuals.filter(v => v.radius > 1).map(v => { const Icon = v.node.kind === 'user' ? UserRound : v.node.kind === 'skills' ? Sparkles : v.node.kind === 'collection' ? List : v.node.kind === 'item' ? StickyNote : Layers3; return <span key={v.node.id} data-orb={v.node.id} className={`canvas-orb-symbol${hovered === v.node.id ? ' is-hovered' : ''}`} style={{ left: v.point.x, top: v.point.y, color: v.node.color }}><span className="canvas-orb-symbol-icon"><Icon size={Math.max(9, v.radius * .6)} strokeWidth={1.7} /></span></span> })}{fanOrbs.map(v => <span key={`fan:${v.node.id}`} data-fan-orb={v.node.id} className="canvas-orb-symbol" aria-hidden="true" style={{ left: v.point.x, top: v.point.y, width: v.radius * 2, height: v.radius * 2 }} />)}</div>
      </div>
      <header className="canvas-header"><a href="/" className="canvas-brand" onClick={event => { event.preventDefault(); enter(state.nodes.find(n => n.id === state.rootId)!) }}><Layers3 size={23} /><span>{brand.name}</span></a><div className="account-menu"><UiIconButton label="Your account" onClick={() => setAccount(value => !value)} aria-expanded={account}><UserRound size={19} /></UiIconButton>{account && <div className="account-menu-popover"><div className="account-menu-identity"><span><strong>{state.nodes.find(n => n.id === state.rootId)!.name}</strong><small>{storageStatus}</small></span></div><button onClick={() => { edit(state.nodes.find(n => n.id === state.rootId)!); setAccount(false) }}><Pencil size={15} />Edit profile</button><button onClick={exportBackup}><Download size={15} />Export layout backup</button><p className="kirayana-storage-note">Local browser storage. Layout backup excludes file content.</p></div>}</div><UiIconButton label="Help" onClick={() => leaveFlyout(() => { setHelp(true); setFlyoutId(null) })}><CircleHelp size={19} /></UiIconButton></header>
      {root.id !== state.rootId && <button className="canvas-canvas-back" onClick={() => enter(state.nodes.find(n => n.id === root.parentId) ?? state.nodes.find(n => n.id === state.rootId)!)}><ArrowLeft size={17} /><span>Back</span><span className="canvas-canvas-back-project">/ {root.name}</span></button>}
      {storageError && <div className="canvas-status canvas-error" role="alert">{storageError} <UiButton onClick={exportBackup}>Export layout backup</UiButton></div>}
      <nav className="canvas-orb-nav" aria-label="Explore canvas">{visible.map(node => <span key={node.id}><button onClick={() => { if (node.collapsed && node.id !== root.id) toggle(node.id); else openPanel(node.id) }}>{node.name} details</button><button onClick={() => toggle(node.id)}>{node.collapsed ? 'Expand' : 'Collapse'} {node.name}</button><button onClick={() => edit(node)}>Edit {node.name}</button>{['user','entity','subset'].includes(node.kind) && <button onClick={() => create(node)}>Add entity to {node.name}</button>}{['user','entity'].includes(node.kind) && <><button onClick={() => create(node,'collection')}>Add List/detail to {node.name}</button><button onClick={() => create(node,'subset')}>Add Subset to {node.name}</button><button onClick={() => create(node,'item')}>Add Item to {node.name}</button></>}{node.kind === 'subset' && <button onClick={() => change(s => ({ ...s, nodes: s.nodes.map(n => n.id === node.id ? { ...n, fanCollapsed: !n.fanCollapsed } : n) }))}>{node.fanCollapsed ? 'Expand' : 'Collapse'} {node.name} fan</button>}</span>)}{fanOrbs.map(v => <span key={`fan:${v.node.id}`}><button onClick={() => choose(v.node)}>Open {v.node.name} entity</button><button onClick={() => enter(v.node)}>Enter {v.node.name} canvas</button></span>)}</nav>
      {menu && (() => { const node = state.nodes.find(n => n.id === menu.id)!; return <div className="canvas-orb-menu" role="menu" style={{ left: menu.x, top: menu.y, maxHeight: viewport.height - menu.y - 8 }} onKeyDown={event => { const buttons = Array.from(event.currentTarget.querySelectorAll('button')); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus() } }}><button role="menuitem" onClick={() => { openPanel(node.id); setMenu(null) }}><ChevronRight size={15} />Open details</button>{['user','entity','subset'].includes(node.kind) && <button role="menuitem" onClick={() => create(node)}><Plus size={15} />Add entity</button>}{['user','entity'].includes(node.kind) && <><button role="menuitem" onClick={() => create(node, 'collection')}><List size={15} />Add List/detail</button><button role="menuitem" onClick={() => create(node, 'subset')}><Layers3 size={15} />Add Subset</button><button role="menuitem" onClick={() => create(node, 'item')}><StickyNote size={15} />Add Item</button></>}<button role="menuitem" onClick={() => edit(node)}><Pencil size={15} />Rename</button>{node.kind !== 'item' && <button role="menuitem" onClick={() => edit(node)}><Palette size={15} />Change color</button>}<button role="menuitem" onClick={() => toggle(node.id)}><Expand size={15} />{node.collapsed ? 'Expand' : 'Collapse'}</button>{!['user','skills'].includes(node.kind) && <button role="menuitem" onClick={() => { setMoveTarget(node.id); setMenu(null) }}><ChevronRight size={15} />Move to…</button>}{node.kind === 'subset' && <button role="menuitem" onClick={() => { change(s => ({ ...s, nodes: s.nodes.map(n => n.id === node.id ? { ...n, fanCollapsed: !n.fanCollapsed } : n) })); setMenu(null) }}><Expand size={15} />{node.fanCollapsed ? 'Expand fan' : 'Collapse fan'}</button>}{node.kind === 'entity' && <button role="menuitem" onClick={() => enter(node)}><Layers3 size={15} />Enter canvas</button>}</div> })()}
      <div className="canvas-camera-controls" role="group" aria-label="Canvas zoom"><UiIconButton label="Zoom out" disabled={focused} onClick={() => setCamera(c => setZoomAtCenter(c, c.zoom - .15))}><Minus size={17} /></UiIconButton><span aria-live="polite">{Math.round(camera.zoom * 100)}%</span><UiIconButton label="Zoom in" disabled={focused} onClick={() => setCamera(c => setZoomAtCenter(c, c.zoom + .15))}><Plus size={17} /></UiIconButton><UiIconButton label="Reset canvas view" disabled={focused} onClick={() => setCamera(() => ({ ...initialCamera, pan: { x: -root.position.x * orbScale(viewport.width, viewport.height), y: -root.position.y * orbScale(viewport.width, viewport.height) } }))}><Focus size={17} /></UiIconButton></div>
      {view.openPanels.map(id => {
        const visual = visuals.find(v => v.node.id === id), saved = view.panels[id]
        if (!visual || !saved || (visual.node.id !== root.id && visual.progress < .9)) return null
        const p = position(saved), baseScale = camera.zoom * focus, size = panelSizes[id] ?? { width: 320, height: 260 }, panelScale = baseScale * depthAtScreen({ x: p.x + size.width * baseScale / 2, y: p.y + size.height * baseScale / 2 }, viewport)
        const layout = inspectorPlacement(visual.point, rootPoint, visual.radius, { width: size.width * panelScale, height: size.height * panelScale }, viewport, p, 5 * panelScale, panelScale, true)
        return <CanvasDetailWindow key={id} title={visual.node.name} subtitle={kindLabel(visual.node)} color={visual.node.color} active={activePanel === id} position={p} cone={layout.cone} scale={panelScale} baseScale={baseScale} viewport={viewport} canvasViewKey={root.id} source={visual.point} placementKey={id} panelKind={visual.node.kind === 'collection' || visual.node.kind === 'subset' ? 'list' : 'detail'} subPosition={view.subPositions?.[id]} subDetail={visual.node.kind === 'collection' && selection[id] && state.records.some(r => r.id === selection[id]) ? { title: recordTitle(state, state.records.find(r => r.id === selection[id])!), subtitle: visual.node.name, content: <RecordSummary state={state} record={state.records.find(r => r.id === selection[id])!} />, onClose: () => closeSubDetail(id), onOpen: () => showFlyout(id, selection[id]) } : undefined} getObstacles={obstacles} onClose={() => closePanel(id)} onOpen={() => showFlyout(id)} onEditItem={recordId => showFlyout(id, recordId)} onActivate={() => setActivePanel(id)} onMove={point => patchView(v => ({ ...v, panels: { ...v.panels, [id]: world(point) } }))} onMoveSub={point => patchView(v => ({ ...v, subPositions: { ...v.subPositions, [id]: point } }))} onMeasure={size => setPanelSizes(s => s[id]?.width === size.width && s[id]?.height === size.height ? s : { ...s, [id]: size })}>
          {visual.node.kind === 'collection' ? <CollectionList state={state} node={visual.node} selectedId={selection[id]} onSelect={recordId => { setSelection(v => ({ ...v, [id]: recordId })); patchView(v => { const positions = { ...v.subPositions }; delete positions[id]; return { ...v, subPositions: positions } }) }} onNew={() => showFlyout(id, 'new')} onFields={() => showFlyout(id)} />
            : visual.node.kind === 'item' ? <><p className="kirayana-item-preview">{state.items[id] || 'No notes yet.'}</p><UiButton onClick={() => showFlyout(id)}>Edit item</UiButton></>
            : <><p>{visual.node.kind === 'skills' ? 'Personal skills are not available yet.' : `${state.nodes.filter(n => n.parentId === id && n.kind === 'entity').length} entities`}</p>{['user','entity','subset'].includes(visual.node.kind) && <UiButton onClick={() => create(visual.node)}><Plus size={15} />Add entity</UiButton>}{visual.node.kind === 'subset' && state.nodes.filter(n => n.parentId === id).map(node => <UiButton key={node.id} onClick={() => enter(node)}>{node.name}<ChevronRight size={14} /></UiButton>)}<UiButton onClick={() => edit(visual.node)}><Pencil size={15} />Edit</UiButton></>}
        </CanvasDetailWindow>
      })}
      {reply && <section className="canvas-response" aria-label="Prompt response"><div className="canvas-response-close"><UiIconButton label="Copy response" onClick={() => void navigator.clipboard.writeText(reply.text)}><Copy size={16} /></UiIconButton><UiIconButton label="Close response" onPointerDown={e => e.preventDefault()} onClick={() => setReply(null)}><X size={18} /></UiIconButton></div><div className="canvas-response-body"><div className="canvas-response-turn"><small>Me</small><p>{reply.user}</p></div><div className="canvas-response-turn"><small>{brand.name}</small><p>{reply.text}</p></div></div></section>}
      <div ref={promptBox} className={`canvas-prompt${focused ? ' is-active' : ''}${draggingFiles ? ' is-dragging-files' : ''}`} role="group" aria-label={`Ask ${brand.name}`} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!(event.relatedTarget as HTMLElement)?.closest('.canvas-prompt,.canvas-response')) setFocused(false) }} onDragOver={e => { e.preventDefault(); setDraggingFiles(true) }} onDragLeave={() => setDraggingFiles(false)} onDrop={e => { e.preventDefault(); setDraggingFiles(false); addFiles(e.dataTransfer.files) }}>
        <input type="file" className="sr-only" ref={fileInput} aria-label="Attach files to prompt" multiple accept=".pdf,.txt,.md,.docx" onChange={event => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; promptInput.current?.focus() }} />
        {focused && state.attachments.length > 0 && <div className="canvas-prompt-files" aria-label="Attached files">{state.attachments.map(file => <span className="canvas-prompt-file" key={file.id}><FileText size={14} /><span>{file.name}</span><UiIconButton label={`Remove ${file.name}`} onClick={() => change(s => ({ ...s, attachments: s.attachments.filter(f => f.id !== file.id) }))}><X size={14} /></UiIconButton></span>)}</div>}
        {attachmentError && <p role="alert" className="canvas-prompt-file-error">{attachmentError}</p>}
        <label className="sr-only" htmlFor="canvas-prompt-text">Ask {brand.name}</label><textarea id="canvas-prompt-text" ref={promptInput} rows={1} value={prompt} placeholder={brand.prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask() } }} />
        <div className="canvas-prompt-actions"><UiIconButton label="Attach files" onClick={() => fileInput.current?.click()}><Plus size={18} /></UiIconButton><span className="canvas-prompt-actions-spacer" /><UiIconButton label="Send prompt" variant="primary" onClick={ask}><CornerDownLeft size={18} /></UiIconButton></div>
      </div>
    </div>
    <dialog ref={dialog} className="ui-form-dialog" aria-labelledby="entity-dialog-title" onCancel={event => { event.preventDefault(); closeEditor() }}><header className="ui-form-dialog-header"><div><h2 id="entity-dialog-title">{editor?.kind === 'create' ? `Add ${editor.nodeKind === 'collection' ? 'List/detail' : editor.nodeKind === 'subset' ? 'Subset' : editor.nodeKind === 'item' ? 'Item' : 'entity'}` : 'Edit details'}</h2></div><UiIconButton label="Close dialog" onClick={closeEditor}><X size={18} /></UiIconButton></header><div className="ui-form-dialog-body"><form onSubmit={saveEditor}><label className="ui-field">Name<input autoFocus required maxLength={80} value={editor?.name ?? ''} onChange={event => setEditor(e => e && ({ ...e, name: event.target.value }))} /></label>{(editor?.nodeKind !== 'item' && state.nodes.find(n => n.id === editor?.id)?.kind !== 'item') && <><label className="ui-field">Color<input type="color" value={editor?.color ?? palette[0]} onChange={event => setEditor(e => e && ({ ...e, color: event.target.value }))} /></label><div className="kirayana-palette">{palette.map(color => <button type="button" key={color} aria-label={`Use ${color}`} aria-pressed={editor?.color === color} style={{ '--swatch': color } as CSSProperties} onClick={() => setEditor(e => e && ({ ...e, color }))} />)}</div></>}{formError && <p role="alert">{formError}</p>}<div className="ui-form-footer"><UiButton onClick={closeEditor}>Cancel</UiButton><UiButton type="submit" variant="primary">{editor?.kind === 'create' ? `Create ${editor.nodeKind === 'collection' ? 'List/detail' : editor.nodeKind === 'subset' ? 'Subset' : editor.nodeKind === 'item' ? 'Item' : 'entity'}` : 'Save changes'}</UiButton></div></form></div></dialog>
    {moveTarget && <MoveDialog node={state.nodes.find(n => n.id === moveTarget)!} state={state} onClose={() => setMoveTarget(null)} onMove={parentId => { moveNode(state, moveTarget, parentId); change(s => moveNode(s, moveTarget, parentId)); setMoveTarget(null) }} />}
    <span className="sr-only" role="status">{storageStatus}</span>
  </main>
}

function MoveDialog({ node, state, onClose, onMove }: { node: Node; state: Organizer; onClose: () => void; onMove: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null), [destination, setDestination] = useState(node.parentId ?? state.rootId), [error, setError] = useState('')
  useEffect(() => { dialog.current?.showModal() }, [])
  const destinations = state.nodes.filter(n => { try { moveNode(state, node.id, n.id); return true } catch { return false } })
  return <dialog ref={dialog} className="ui-form-dialog" aria-labelledby="move-dialog-title" onCancel={event => { event.preventDefault(); onClose() }}><header className="ui-form-dialog-header"><h2 id="move-dialog-title">Move {node.name}</h2><UiIconButton label="Close move dialog" onClick={onClose}><X size={18} /></UiIconButton></header><div className="ui-form-dialog-body"><form onSubmit={event => { event.preventDefault(); try { onMove(destination) } catch (error) { setError(String(error)) } }}><label className="ui-field">Destination<select value={destination} onChange={event => setDestination(event.target.value)}>{destinations.map(n => <option key={n.id} value={n.id}>{n.name} · {kindLabel(n)}</option>)}</select></label>{error && <p role="alert">{error}</p>}<div className="ui-form-footer"><UiButton onClick={onClose}>Cancel</UiButton><UiButton type="submit" variant="primary">Move</UiButton></div></form></div></dialog>
}
