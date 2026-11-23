import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export function CanvasFloatingFlyoutFrame({ open, color, label, children }: { open: boolean; color: string; label: string; children: ReactNode }) {
  const lastColor = useRef(color)
  const flyout = useRef<HTMLElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  useLayoutEffect(() => { if (open) lastColor.current = color }, [open, color])
  useLayoutEffect(() => {
    if (!open || !flyout.current) return
    const heading = flyout.current.querySelector<HTMLElement>('.canvas-right-flyout-heading')
    const body = flyout.current.querySelector<HTMLElement>('.canvas-right-flyout-body')
    if (!heading || !body) return
    const measure = () => setHeight(Math.min(heading.offsetHeight + body.offsetHeight + 4, Math.max(0, window.innerHeight - 160)))
    const observer = new ResizeObserver(measure)
    observer.observe(heading)
    observer.observe(body)
    window.addEventListener('resize', measure)
    measure()
    return () => { observer.disconnect(); window.removeEventListener('resize', measure) }
  }, [open])
  return <aside ref={flyout} className="canvas-floating-flyout" style={{ '--flyout-orb-color': open ? color : lastColor.current, height: height === null ? undefined : `${height}px` } as CSSProperties} aria-label={label} aria-hidden={!open} inert={!open}>
    {open && children}
  </aside>
}

