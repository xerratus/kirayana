import type { CSSProperties } from 'react'
export type TypeaheadOption = { id: string; label: string; detail: string; token: string }

export function PromptTypeahead({ options, activeIndex, onSelect, onActive, style, className = '' }: { options: TypeaheadOption[]; activeIndex: number; onSelect: (option: TypeaheadOption) => void; onActive: (index: number) => void; style?: CSSProperties; className?: string }) {
  return <div className={`prompt-typeahead ${className}`} role="listbox" aria-label="Prompt suggestions" style={style}>
    {options.map((option, index) => <button key={option.id} type="button" role="option" aria-selected={index === activeIndex} onPointerDown={event => event.preventDefault()} onClick={() => onSelect(option)} onPointerEnter={() => onActive(index)}><strong>{option.label}</strong><small>{option.detail}</small></button>)}
  </div>
}
