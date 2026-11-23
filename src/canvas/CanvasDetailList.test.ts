import { describe, expect, it } from 'vitest'
import { visibleDetailItems, type DetailListItem } from './canvasDetailListFilter'

describe('canvas detail lists', () => {
  const items: DetailListItem[] = Array.from({ length: 8 }, (_, index) => ({ key: String(index), label: `User ${index}`, content: null }))

  it('keeps all entries available for scrolling and search', () => {
    expect(visibleDetailItems(items, '')).toMatchObject({ total: 8, items })
    expect(visibleDetailItems(items, 'USER 7')).toMatchObject({ total: 1, items: [items[7]] })
  })
})
