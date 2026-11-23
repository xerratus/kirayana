import { useEffect, useRef, useState } from 'react'
/** Solayana's 440ms smoothstep orb collapse and 320ms focus easing. */
export function useSceneAnimation(targets: Record<string, number>, focused: boolean) {
  const values = useRef<Record<string, number>>({ ...targets, focus: focused ? .94 : 1 })
  const [frame, setFrame] = useState(0)
  const key = JSON.stringify(targets)
  useEffect(() => {
    const next: Record<string, number> = { ...JSON.parse(key), focus: focused ? .94 : 1 }
    const from = { ...values.current }
    for (const id in next) if (from[id] === undefined) from[id] = next[id]
    const start = performance.now()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const animate = (now: number) => {
      let moving = false
      for (const id in next) {
        const gradual = id.startsWith('depth:') || id.startsWith('hover:')
        const duration = id === 'focus' ? 320 : gradual ? (id.startsWith('depth:') ? 130 : 90) * 6 : 440
        const t = reduced ? 1 : Math.min(1, (now - start) / duration)
        const eased = t === 1 ? 1 : gradual ? 1 - Math.exp(-t * 6) : id === 'focus' ? 1 - Math.pow(1 - t, 3) : t * t * (3 - 2 * t)
        values.current[id] = from[id] + (next[id] - from[id]) * eased
        if (t < 1 && from[id] !== next[id]) moving = true
      }
      setFrame(n => n + 1)
      if (moving) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [key, focused])
  return { values: values.current, frame }
}
