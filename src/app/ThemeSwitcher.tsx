import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { UiIconButton } from '../ui/Controls'
import { themes, type Theme } from './themes'
import './themes.css'
export function ThemeSwitcher({theme,onChange}:{theme:Theme;onChange:(theme:Theme)=>void}) {
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  if(!open)return
  root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
  const dismiss=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);trigger.current?.focus()}}
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape,true)
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape,true)}
 },[open])
 return <div ref={root} className="kirayana-theme-switcher">
  <UiIconButton ref={trigger} label="Choose theme" title={`Theme: ${theme.name}`} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><Palette size={19}/></UiIconButton>
  {open && <div className="kirayana-theme-menu" role="menu" aria-label="Canvas themes" onKeyDown={event=>{const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();buttons[event.key==='Home' ? 0 : event.key==='End' ? buttons.length-1 : (index+(event.key==='ArrowDown' ? 1 : buttons.length-1))%buttons.length]?.focus()}}}>
   <div className="kirayana-theme-heading">Make yourself at home<span>Same canvas. A different mood.</span></div>
   {themes.map(option=><button className="ui-icon-action kirayana-theme-option" key={option.id} role="menuitemradio" aria-checked={theme.id===option.id} onClick={()=>{onChange(option);setOpen(false);trigger.current?.focus()}}>
    <span className="kirayana-theme-swatch" style={{background:option.canvas.base,borderColor:option.palette.border}} aria-hidden="true"><i style={{background:option.palette.panel,borderColor:option.palette.accent}}/><i style={{background:option.palette.accent}}/></span>
    <span className="kirayana-theme-description"><strong>{option.name}</strong><small>{option.description}</small></span>
    {theme.id===option.id && <Check size={16} aria-hidden="true"/>}
   </button>)}
  </div>}
 </div>
}
