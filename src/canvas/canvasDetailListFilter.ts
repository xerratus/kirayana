import type { ReactNode } from 'react'

export type DetailListItem = { key: string; label: string; searchText?: string; content: ReactNode }

export function visibleDetailItems(items: DetailListItem[], query: string) {
  const needle = query.trim().toLocaleLowerCase()
  const matches = needle ? items.filter(item => (item.searchText || item.label).toLocaleLowerCase().includes(needle)) : items
  return { items: matches, total: matches.length }
}
