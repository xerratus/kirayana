import { expect, it } from 'vitest'
import { defaultArcSpacing as gap, pushArcAngles } from './arcSpacing'
const tau = Math.PI * 2
function separated(result: Map<string, number>) {
  const angles = [...result.values()].map(a => (a + tau) % tau).sort((a, b) => a - b)
  for (let i = 0; i < angles.length; i++) expect((angles[(i + 1) % angles.length] - angles[i] + tau) % tau).toBeGreaterThanOrEqual(gap - 1e-9)
}
it('pushes a chain clockwise without moving orb positions', () => {
  const result = pushArcAngles([{ id: 'a', angle: 0 }, { id: 'b', angle: 1 }, { id: 'c', angle: 2 }], 'a', .8)
  expect(result.get('a')).toBeCloseTo(.8); expect(result.get('b')).toBeCloseTo(.8 + gap); expect(result.get('c')).toBeCloseTo(.8 + gap * 2); separated(result)
})
it('pushes counterclockwise across the angle seam', () => {
  const result = pushArcAngles([{ id: 'a', angle: -3 }, { id: 'b', angle: 2.2 }, { id: 'c', angle: 1.2 }], 'a', 2.8)
  expect(result.get('a')).toBeCloseTo(2.8); expect(result.get('b')).toBeLessThan(2.2); separated(result)
})
it('keeps untouched neighbors fixed and resolves existing overlap', () => {
  expect(pushArcAngles([{ id: 'a', angle: 0 }, { id: 'b', angle: 2 }], 'a', .1).get('b')).toBeCloseTo(2)
  separated(pushArcAngles([{ id: 'a', angle: 0 }, { id: 'b', angle: .1 }, { id: 'c', angle: .2 }], 'a', .01))
})
