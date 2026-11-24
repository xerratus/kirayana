import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import './UiToggle.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'onChange' | 'checked' | 'children'> & {
 label:ReactNode
 checked:boolean
 onCheckedChange:(checked:boolean)=>void
}
/** Native keyboard and form behavior with the shared pill switch appearance. */
export function UiToggle({label,checked,onCheckedChange,id,className='',disabled,...props}:Props) {
 const generatedId=useId(),controlId=id??generatedId
 return <label className={`ui-toggle${disabled ? ' is-disabled' : ''} ${className}`.trim()} htmlFor={controlId}>
  <input {...props} id={controlId} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={event=>onCheckedChange(event.target.checked)}/>
  <span className="ui-toggle-track" aria-hidden="true"><span className="ui-toggle-thumb"/></span>
  <span className="ui-toggle-label">{label}</span>
 </label>
}
