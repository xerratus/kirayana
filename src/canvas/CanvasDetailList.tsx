import { useState } from 'react'
import { visibleDetailItems, type DetailListItem } from './canvasDetailListFilter'

export function CanvasDetailList({ items, label, empty, onOpen, onSelect, selectedId }: { items: DetailListItem[]; label: string; empty: string; onOpen?: (id: string) => void; onSelect?: (id: string) => void; selectedId?: string }) {
  const [query, setQuery] = useState('')
  const [localSelection, setLocalSelection] = useState<string | null>(null)
  const result = visibleDetailItems(items, query)
  return <>
    <input className="canvas-detail-search" type="search" aria-label={`Search ${label}`} placeholder={`Search ${label}…`} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="canvas-detail-results" role={result.total > 5 ? 'region' : undefined} aria-label={result.total > 5 ? `${label} results` : undefined} tabIndex={result.total > 5 ? 0 : undefined}>{result.items.map(item => {
      const select = () => { setLocalSelection(item.key); if (onSelect) onSelect(item.key); else onOpen?.(item.key) }
      return <div key={item.key} className="canvas-detail-row" role="button" tabIndex={0} data-item-id={item.key} data-selected={(onSelect ? selectedId : localSelection) === item.key || undefined} onClick={select} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() } }}><div className="canvas-detail-row-content">{item.content}</div></div>
    })}</div>
    {!result.total && <p>{query ? `No ${label} match your search.` : empty}</p>}
  </>
}
