import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { ArrowLeft, ChevronRight, CircleHelp, Copy, CornerDownLeft, Download, Expand, FileText, Focus, Layers3, Minus, Palette, Pencil, Plus, Sparkles, UserRound, X } from 'lucide-react'
import { brand } from '../app/brand'
import { addEntity, emptyView, palette, updateNode, type Node, type Organizer } from '../organizer/model'
import { UiButton, UiIconButton } from '../ui/Controls'
import { initialCamera, setZoomAtCenter, zoomCamera, type Point } from './canvasCamera'
import { depthAtScreen } from './canvasDepth'
import { avoidCanvasCollisions, inspectorPlacement, type CanvasBounds } from './canvasInspector'
import { CanvasDetailWindow } from './CanvasDetailWindow'
import { CanvasFloatingFlyoutFrame } from './CanvasFloatingFlyout'
import { drawBackground } from './background'
import { drawOrb, orbitPoint } from './drawing'
import { useSceneAnimation } from './useSceneAnimation'

type Change = (update: (state: Organizer) => Organizer) => void
type Menu = { id: string; x: number; y: number } | null
type Editor = { kind: 'create' | 'edit'; id: string; name: string; color: string } | null
const orbScale = (width: number, height: number) => Math.min(1, Math.max(.48, Math.min(width / 900, height / 900)))

export function CanvasWorkspace({ state, change, storageStatus, storageError }: { state: Organizer; change: Change; storageStatus: string; storageError: string }) {
  const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), promptBox = useRef<HTMLDivElement>(null), promptInput = useRef<HTMLTextAreaElement>(null), fileInput = useRef<HTMLInputElement>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [hovered, setHovered] = useState<string | null>(null), [menu, setMenu] = useState<Menu>(null)
  const [editor, setEditor] = useState<Editor>(null), [formError, setFormError] = useState('')
  const [flyoutId, setFlyoutId] = useState<string | null>(null), [help, setHelp] = useState(false), [account, setAccount] = useState(false)
  const [prompt, setPrompt] = useState(''), [focused, setFocused] = useState(false), [draggingFiles, setDraggingFiles] = useState(false)
  const [reply, setReply] = useState<{ user: string; text: string } | null>(null), [attachmentError, setAttachmentError] = useState('')
  const [panelSizes, setPanelSizes] = useState<Record<string, { width: number; height: number }>>({})
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const click = useRef<{ id: string; timer: number } | null>(null)
  const pointers = useRef(new Map<number, Point>())
  const drag = useRef<{ id: string | null; origin: Point; pan: Point; positions: Record<string, Point>; moved: boolean; together: boolean } | null>(null)
  const pinch = useRef<{ distance: number; center: Point } | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const root = state.nodes.find(n => n.id === state.viewId)!
  const visible = [root, ...state.nodes.filter(n => n.parentId === root.id)]
  const view = state.views[root.id] ?? emptyView()
  const camera = view.camera
  const scale = orbScale(viewport.width, viewport.height) * camera.zoom
  const center = { x: viewport.width / 2, y: viewport.height * .48 }
  const rawPoint = (p: Point) => ({ x: center.x + camera.pan.x + p.x * scale, y: center.y + camera.pan.y + p.y * scale })
  const rawRoot = rawPoint(root.position)
  const targets = Object.fromEntries(visible.flatMap(n => {
    const point = n.id === root.id ? rawRoot : orbitPoint(rawRoot, rawPoint(n.position), 100 * scale * depthAtScreen(rawRoot, viewport), n.collapsed || root.collapsed ? 0 : 1)
    return [[n.id, n.collapsed ? 0 : 1], [`depth:${n.id}`, depthAtScreen(point, viewport)], [`hover:${n.id}`, hovered === n.id ? 1 : 0]]
  }))
  const { values: animation } = useSceneAnimation(targets, focused)
  const focus = animation.focus ?? 1
  const position = (p: Point) => ({ x: center.x + (camera.pan.x + p.x * scale) * focus, y: center.y + (camera.pan.y + p.y * scale) * focus })
  const world = (p: Point) => ({ x: ((p.x - center.x) / focus - camera.pan.x) / scale, y: ((p.y - center.y) / focus - camera.pan.y) / scale })
  const rootPoint = position(root.position)
  const rootDepth = animation[`depth:${root.id}`] ?? depthAtScreen(rootPoint, viewport)
  const visuals = visible.map(node => {
    const isRoot = node.id === root.id
    const progress = isRoot ? 1 : (animation[node.id] ?? (node.collapsed ? 0 : 1)) * (animation[root.id] ?? (root.collapsed ? 0 : 1))
    const point = isRoot ? rootPoint : orbitPoint(rootPoint, position(node.position), 100 * scale * focus * rootDepth, progress)
    const depth = animation[`depth:${node.id}`] ?? depthAtScreen(point, viewport)
    return { node, point, progress, depth, radius: (isRoot ? 100 : 17 + 33 * progress) * scale * focus * depth }
  })
  const visualsRef = useRef(visuals); visualsRef.current = visuals
  const latest = useRef({ state, view, root, camera, scale, focus, center, focused }); latest.current = { state, view, root, camera, scale, focus, center, focused }
  const patchView = (fn: (current: typeof view) => typeof view) => change(s => ({ ...s, views: { ...s.views, [s.viewId]: fn(s.views[s.viewId] ?? emptyView()) } }))
  const setCamera = (fn: (current: typeof camera) => typeof camera) => patchView(v => ({ ...v, camera: fn(v.camera) }))
  const hit = (p: Point) => [...visualsRef.current].reverse().find(v => Math.hypot(p.x - v.point.x, p.y - v.point.y) <= v.radius + 7)?.node ?? null
  const obstacles = (exclude?: Element | string): CanvasBounds[] => [
    ...visuals.map(v => ({ x: v.point.x - v.radius, y: v.point.y - v.radius, width: v.radius * 2, height: v.radius * 2 })),
    ...Array.from(document.querySelectorAll<HTMLElement>('.canvas-inspector')).filter(el => el !== exclude && el.dataset.placementKey !== exclude).map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }),
  ]
  function closePanel(id: string) { patchView(v => ({ ...v, openPanels: v.openPanels.filter(p => p !== id) })); if (flyoutId === id) setFlyoutId(null) }
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
    if (node.kind === 'skills') { toggle(node.id); return }
    setFlyoutId(null); setMenu(null)
    change(s => ({ ...s, viewId: node.id, views: { ...s.views, [node.id]: s.views[node.id] ?? { ...emptyView(), camera: { zoom: 1, pan: { x: -node.position.x * orbScale(viewport.width, viewport.height), y: -node.position.y * orbScale(viewport.width, viewport.height) } } } } }))
  }
  function choose(node: Node) {
    if (click.current) {
      clearTimeout(click.current.timer)
      if (click.current.id === node.id) { click.current = null; if (node.id === root.id) toggle(node.id); else enter(node); return }
    }
    click.current = { id: node.id, timer: window.setTimeout(() => { click.current = null; if (node.id !== root.id && (node.collapsed || root.collapsed)) { change(s => updateNode(updateNode(s, root.id, { collapsed: false }), node.id, { collapsed: false })) } else openPanel(node.id) }, 240) }
  }
  function edit(node: Node) { setFormError(''); setEditor({ kind: 'edit', id: node.id, name: node.name, color: node.color }); setMenu(null) }
  function create(parent: Node) { setFormError(''); setEditor({ kind: 'create', id: parent.id, name: '', color: palette[state.nodes.filter(n => n.kind === 'entity').length % palette.length] }); setMenu(null) }
  function saveEditor(event: React.FormEvent) {
    event.preventDefault()
    if (!editor) return
    try {
      if (!editor.name.trim() || editor.name.trim().length > 80) throw new Error('Use a name between 1 and 80 characters.')
      if (editor.kind === 'edit') change(s => updateNode(s, editor.id, { name: editor.name, color: editor.color }))
      else {
        const parent = state.nodes.find(n => n.id === editor.id)!
        const children = state.nodes.filter(n => n.parentId === parent.id)
        const angle = -Math.PI / 2 + children.length * .9
        const preferred = { x: parent.position.x + Math.cos(angle) * 280 - 65, y: parent.position.y + Math.sin(angle) * 280 - 65, width: 130, height: 130 }
        const existing = state.nodes.map(n => ({ x: n.position.x - 65, y: n.position.y - 65, width: 130, height: 130 }))
        const p = avoidCanvasCollisions(preferred, parent.position, existing)
        change(s => addEntity(updateNode(s, parent.id, { collapsed: false }), parent.id, editor.name, editor.color, { x: p.x + 65, y: p.y + 65 }))
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
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(null); setAccount(false); setHelp(false); setFlyoutId(null); setFocused(false); promptInput.current?.blur() } }
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); if (click.current) clearTimeout(click.current.timer) }
  }, [])
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('.canvas-prompt,.canvas-response,.canvas-header,.canvas-camera-controls,.canvas-floating-flyout,.canvas-inspector')) return
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
    const element = canvas.current, ctx = element?.getContext('2d')
    if (!element || !ctx) return
    const { width, height } = viewport, ratio = Math.min(window.devicePixelRatio || 1, 2)
    element.width = Math.round(width * ratio); element.height = Math.round(height * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    drawBackground(ctx, width, height, true)
    const background = getComputedStyle(element).getPropertyValue('--panel').trim()
    for (const v of visuals.slice(1)) {
      const angle = Math.atan2(v.point.y - rootPoint.y, v.point.x - rootPoint.x)
      const start = { x: rootPoint.x + Math.cos(angle) * visuals[0].radius, y: rootPoint.y + Math.sin(angle) * visuals[0].radius }
      const end = { x: v.point.x - Math.cos(angle) * v.radius, y: v.point.y - Math.sin(angle) * v.radius }
      ctx.globalAlpha = v.progress
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.strokeStyle = `${v.node.color}5e`; ctx.lineWidth = 1.15; ctx.stroke()
      for (const point of [start, end]) { ctx.beginPath(); ctx.arc(point.x, point.y, 1.8, 0, Math.PI * 2); ctx.fillStyle = `${v.node.color}bb`; ctx.fill() }
    }
    ctx.globalAlpha = 1
    for (const v of visuals) {
      drawOrb(ctx, 'organization', v.point.x, v.point.y, v.radius, v.node.color, background, Math.max(animation[`hover:${v.node.id}`] ?? 0, activePanel === v.node.id ? .45 : 0))
      const main = v.node.id === root.id, depth = v.depth
      ctx.globalAlpha = main ? 1 : v.progress
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#edf5ff'; ctx.font = `${main ? 700 : 650} ${Math.max(9, (main ? 17 : 15) * camera.zoom * depth)}px sans-serif`
      ctx.fillText(v.node.name, v.point.x, v.point.y + v.radius + 28 * camera.zoom * depth)
      ctx.fillStyle = '#9bb0cb'; ctx.font = `${Math.max(8, (main ? 10.5 : 12) * camera.zoom * depth)}px sans-serif`
      ctx.fillText(main ? (root.kind === 'user' ? 'Your organizer' : 'Entity') : v.node.kind === 'skills' ? 'Personalize your experience' : 'Entity', v.point.x, v.point.y + v.radius + (main ? 50 : 49) * camera.zoom * depth)
      ctx.globalAlpha = 1
    }
  })

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || focused) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; if (drag.current) drag.current.moved = true; return
    }
    const node = hit({ x: event.clientX, y: event.clientY })
    drag.current = { id: node?.id ?? null, origin: { x: event.clientX, y: event.clientY }, pan: camera.pan, positions: Object.fromEntries(state.nodes.map(n => [n.id, n.position])), moved: false, together: event.ctrlKey || event.metaKey }
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
    const d = drag.current
    if (!d) { setHovered(hit(p)?.id ?? null); return }
    const dx = (p.x - d.origin.x) / focus, dy = (p.y - d.origin.y) / focus
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    if (!d.id) { setCamera(c => ({ ...c, pan: { x: d.pan.x + dx, y: d.pan.y + dy } })); return }
    const ids = new Set([d.id])
    if (d.together) { for (let pass = 0; pass < state.nodes.length; pass++) for (const n of state.nodes) if (n.parentId && ids.has(n.parentId)) ids.add(n.id) }
    change(s => ({ ...s, nodes: s.nodes.map(n => ids.has(n.id) ? { ...n, position: { x: d.positions[n.id].x + dx / scale, y: d.positions[n.id].y + dy / scale } } : n) }))
  }
  function pointerUp(event: PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId)
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
    <CanvasFloatingFlyoutFrame open={Boolean(flyout || help)} color={flyout?.color ?? root.color} label={help ? 'Help' : `${flyout?.name ?? ''} full view`}>
      <header className="canvas-right-flyout-heading"><div><small>{help ? brand.name : flyout?.kind === 'user' ? 'Your profile' : 'Entity'}</small><h2>{help ? 'Your canvas' : flyout?.name}</h2></div><UiIconButton label="Close side panel" onClick={() => { setFlyoutId(null); setHelp(false) }}><X size={18} /></UiIconButton></header>
      <div className="canvas-right-flyout-body">{help ? <><p>Right-click your hub or the canvas to add an entity. Click an expanded orb for details; click a small orb to expand it.</p><p>Double-click the main hub to collapse its children. Double-click an entity to enter its canvas. Right-click for rename, color, and expand/collapse controls.</p><p>Drag empty space or use two fingers to pan. Pinch or hold Command/Control while scrolling to zoom. Hold Command/Control while dragging an orb to move its children too.</p><p>Your organizer and attached files are saved only in this browser. Clearing site data removes them. AI is not connected yet.</p></> : <><p>{flyout?.kind === 'skills' ? 'Your personal skills will live here. Skill editing arrives in Phase 3.' : 'Customize your name and color from this entity’s context menu.'}</p>{flyout && <UiButton onClick={() => edit(flyout)}><Pencil size={15} />Edit {flyout.kind === 'user' ? 'profile' : 'entity'}</UiButton>}</>}</div>
    </CanvasFloatingFlyoutFrame>
    <div className={`canvas-stage${focused ? ' is-prompt-active' : ''}`} ref={stage}>
      <div className="canvas-scene"><canvas ref={canvas} tabIndex={-1} aria-label="Organizer canvas. Drag to pan; pinch to zoom. Right-click for actions. Use the Explore canvas navigation for keyboard access." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { pointers.current.clear(); drag.current = null; pinch.current = null }} onPointerLeave={() => setHovered(null)} onContextMenu={event => { event.preventDefault(); if (click.current) { clearTimeout(click.current.timer); click.current = null }; const node = hit({ x: event.clientX, y: event.clientY }); setMenu({ id: node?.id ?? root.id, x: Math.max(8, Math.min(event.clientX, viewport.width - 206)), y: Math.max(8, Math.min(event.clientY, viewport.height - 270)) }) }} style={{ cursor: hovered ? 'pointer' : undefined }} />
        <div className="canvas-symbols">{visuals.map(v => { const Icon = v.node.kind === 'user' ? UserRound : v.node.kind === 'skills' ? Sparkles : Layers3; return <span key={v.node.id} data-orb={v.node.id} className={`canvas-orb-symbol${hovered === v.node.id ? ' is-hovered' : ''}`} style={{ left: v.point.x, top: v.point.y, color: v.node.color }}><span className="canvas-orb-symbol-icon"><Icon size={Math.max(9, v.radius * .6)} strokeWidth={1.7} /></span></span> })}</div>
      </div>
      <header className="canvas-header"><a href="/" className="canvas-brand" onClick={event => { event.preventDefault(); enter(state.nodes.find(n => n.id === state.rootId)!) }}><Layers3 size={23} /><span>{brand.name}</span></a><div className="account-menu"><UiIconButton label="Your account" onClick={() => setAccount(value => !value)} aria-expanded={account}><UserRound size={19} /></UiIconButton>{account && <div className="account-menu-popover"><div className="account-menu-identity"><span><strong>{state.nodes.find(n => n.id === state.rootId)!.name}</strong><small>{storageStatus}</small></span></div><button onClick={() => { edit(state.nodes.find(n => n.id === state.rootId)!); setAccount(false) }}><Pencil size={15} />Edit profile</button><button onClick={exportBackup}><Download size={15} />Export layout backup</button><p className="kirayana-storage-note">Local browser storage. Layout backup excludes file content.</p></div>}</div><UiIconButton label="Help" onClick={() => { setHelp(true); setFlyoutId(null) }}><CircleHelp size={19} /></UiIconButton></header>
      {root.id !== state.rootId && <button className="canvas-canvas-back" onClick={() => enter(state.nodes.find(n => n.id === root.parentId) ?? state.nodes.find(n => n.id === state.rootId)!)}><ArrowLeft size={17} /><span>Back</span><span className="canvas-canvas-back-project">/ {root.name}</span></button>}
      {storageError && <div className="canvas-status canvas-error" role="alert">{storageError} <UiButton onClick={exportBackup}>Export layout backup</UiButton></div>}
      <nav className="canvas-orb-nav" aria-label="Explore canvas">{visible.map(node => <span key={node.id}><button onClick={() => { if (node.collapsed && node.id !== root.id) toggle(node.id); else openPanel(node.id) }}>{node.name} details</button><button onClick={() => toggle(node.id)}>{node.collapsed ? 'Expand' : 'Collapse'} {node.name}</button><button onClick={() => edit(node)}>Edit {node.name}</button>{node.kind !== 'skills' && <button onClick={() => create(node)}>Add entity to {node.name}</button>}</span>)}</nav>
      {menu && (() => { const node = state.nodes.find(n => n.id === menu.id)!; return <div className="canvas-orb-menu" role="menu" style={{ left: menu.x, top: menu.y }} onKeyDown={event => { const buttons = Array.from(event.currentTarget.querySelectorAll('button')); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus() } }}><button role="menuitem" onClick={() => { openPanel(node.id); setMenu(null) }}><ChevronRight size={15} />Open details</button>{node.kind !== 'skills' && <button role="menuitem" onClick={() => create(node)}><Plus size={15} />Add entity</button>}<button role="menuitem" onClick={() => edit(node)}><Pencil size={15} />Rename</button><button role="menuitem" onClick={() => edit(node)}><Palette size={15} />Change color</button><button role="menuitem" onClick={() => toggle(node.id)}><Expand size={15} />{node.collapsed ? 'Expand' : 'Collapse'}</button>{node.kind === 'entity' && <button role="menuitem" onClick={() => enter(node)}><Layers3 size={15} />Enter canvas</button>}</div> })()}
      <div className="canvas-camera-controls" role="group" aria-label="Canvas zoom"><UiIconButton label="Zoom out" disabled={focused} onClick={() => setCamera(c => setZoomAtCenter(c, c.zoom - .15))}><Minus size={17} /></UiIconButton><span aria-live="polite">{Math.round(camera.zoom * 100)}%</span><UiIconButton label="Zoom in" disabled={focused} onClick={() => setCamera(c => setZoomAtCenter(c, c.zoom + .15))}><Plus size={17} /></UiIconButton><UiIconButton label="Reset canvas view" disabled={focused} onClick={() => setCamera(() => ({ ...initialCamera, pan: { x: -root.position.x * orbScale(viewport.width, viewport.height), y: -root.position.y * orbScale(viewport.width, viewport.height) } }))}><Focus size={17} /></UiIconButton></div>
      {view.openPanels.map(id => {
        const visual = visuals.find(v => v.node.id === id), saved = view.panels[id]
        if (!visual || !saved || (visual.node.id !== root.id && visual.progress < .9)) return null
        const p = position(saved), baseScale = camera.zoom * focus, panelScale = baseScale * depthAtScreen(p, viewport), size = panelSizes[id] ?? { width: 320, height: 180 }
        const layout = inspectorPlacement(visual.point, rootPoint, visual.radius, { width: size.width * panelScale, height: size.height * panelScale }, viewport, p, 5 * panelScale, panelScale, true)
        return <CanvasDetailWindow key={id} title={visual.node.name} subtitle={visual.node.kind === 'user' ? 'Your organizer' : visual.node.kind === 'skills' ? 'Personal skills' : 'Entity'} color={visual.node.color} active={activePanel === id} position={p} cone={layout.cone} scale={panelScale} baseScale={baseScale} viewport={viewport} canvasViewKey={root.id} source={visual.point} placementKey={id} panelKind="detail" getObstacles={obstacles} onClose={() => closePanel(id)} onOpen={() => { setFlyoutId(id); setHelp(false) }} onActivate={() => setActivePanel(id)} onMove={point => patchView(v => ({ ...v, panels: { ...v.panels, [id]: world(point) } }))} onMoveSub={() => {}} onMeasure={size => setPanelSizes(s => s[id]?.width === size.width && s[id]?.height === size.height ? s : { ...s, [id]: size })}><p>{visual.node.kind === 'skills' ? 'No skills yet. Skill editing arrives in Phase 3.' : `${state.nodes.filter(n => n.parentId === id && n.kind === 'entity').length} entities`}</p>{visual.node.kind !== 'skills' && <UiButton onClick={() => create(visual.node)}><Plus size={15} />Add entity</UiButton>}<UiButton onClick={() => edit(visual.node)}><Pencil size={15} />Edit</UiButton></CanvasDetailWindow>
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
    <dialog ref={dialog} className="ui-form-dialog" aria-labelledby="entity-dialog-title" onCancel={event => { event.preventDefault(); setEditor(null) }}><header className="ui-form-dialog-header"><div><h2 id="entity-dialog-title">{editor?.kind === 'create' ? 'Add entity' : 'Edit details'}</h2></div><UiIconButton label="Close dialog" onClick={() => setEditor(null)}><X size={18} /></UiIconButton></header><div className="ui-form-dialog-body"><form onSubmit={saveEditor}><label className="ui-field">Name<input autoFocus required maxLength={80} value={editor?.name ?? ''} onChange={event => setEditor(e => e && ({ ...e, name: event.target.value }))} /></label><label className="ui-field">Color<input type="color" value={editor?.color ?? palette[0]} onChange={event => setEditor(e => e && ({ ...e, color: event.target.value }))} /></label><div className="kirayana-palette">{palette.map(color => <button type="button" key={color} aria-label={`Use ${color}`} aria-pressed={editor?.color === color} style={{ '--swatch': color } as CSSProperties} onClick={() => setEditor(e => e && ({ ...e, color }))} />)}</div>{formError && <p role="alert">{formError}</p>}<div className="ui-form-footer"><UiButton onClick={() => setEditor(null)}>Cancel</UiButton><UiButton type="submit" variant="primary">{editor?.kind === 'create' ? 'Create entity' : 'Save changes'}</UiButton></div></form></div></dialog>
    <span className="sr-only" role="status">{storageStatus}</span>
  </main>
}
