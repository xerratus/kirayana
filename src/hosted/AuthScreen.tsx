import { errorMessage } from '../storage/errors'
import { useState, type FormEvent } from 'react'
import { Lens, Circle, CircleCheck, Eye, EyeOff } from 'lucide-react'
import { brand } from '../app/brand'
import { supabase, authRedirect } from './client'
export function AuthScreen({recovery=false,onRecovered}:{recovery?:boolean;onRecovered:()=>void}) {
  const [mode,setMode]=useState<'signup'|'signin'|'reset'>('signup'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const activeTab=mode==='reset'?'signin':mode
  const creating=!recovery&&mode==='signup'
  const rules=[
    {label:'Uppercase letter',passed:/[A-Z]/.test(password)},
    {label:'Lowercase letter',passed:/[a-z]/.test(password)},
    {label:'Number',passed:/[0-9]/.test(password)},
    {label:'Special character (e.g. !?<>@#$%)',passed:/[^a-zA-Z0-9\s]/.test(password)},
    {label:'8 characters or more',passed:password.length>=8}
  ]
  function selectMode(next:'signup'|'signin'|'reset') {setMode(next);setError('');setNotice('');setShowPassword(false)}
  async function resend() {
    if(busy||!supabase)return
    if(!email.trim()){setError('Enter your email address first.');document.getElementById('hosted-email')?.focus();return}
    setBusy(true);setError('');setNotice('')
    try{const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:authRedirect()}});if(error)throw error;setNotice('Confirmation email sent.')}
    catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}
  }
  async function submit(event:FormEvent) {
    event.preventDefault();if(!supabase)return;setBusy(true);setError('');setNotice('')
    try {
      if(recovery){const {error}=await supabase.auth.updateUser({password});if(error)throw error;onRecovered();return}
      if(mode==='reset'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirect()});if(error)throw error;setNotice('Check your email for a password reset link.');return}
      if(mode==='signin'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
      else {if(!rules.every(rule=>rule.passed))throw new Error('Your password must meet all five requirements.');if(!name.trim())throw new Error('Enter your full name.');const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name.trim()},emailRedirectTo:authRedirect()}});if(error)throw error;setNotice('Check your email to confirm your account, then sign in.')}
    }catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}
  }
  return <main className="hosted-auth"><section className="hosted-card">
    <div className="hosted-brand"><Lens size={32} strokeWidth={1.8}/><h1>{brand.name}</h1></div>
    <p>Organize your life</p>
    {!recovery&&<div className="hosted-auth-tabs" role="tablist" aria-label="Account access" onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
      event.preventDefault()
      const next=event.key==='Home'?'signup':event.key==='End'?'signin':activeTab==='signup'?'signin':'signup'
      selectMode(next);event.currentTarget.querySelector<HTMLButtonElement>(`#hosted-tab-${next}`)?.focus()
    }}>
      {(['signup','signin'] as const).map(tab=><button key={tab} type="button" role="tab" id={`hosted-tab-${tab}`} aria-selected={activeTab===tab} aria-controls="hosted-auth-panel" tabIndex={activeTab===tab?0:-1} disabled={busy} onClick={()=>selectMode(tab)}>{tab==='signup'?'Create account':'Sign in'}</button>)}
    </div>}
    <div id="hosted-auth-panel" className="hosted-auth-panel" role={!recovery&&mode!=='reset'?'tabpanel':undefined} aria-labelledby={!recovery&&mode!=='reset'?`hosted-tab-${mode}`:undefined}>
      <h2>{recovery?'Set a new password':mode==='reset'?'Reset password':creating?'Create your account':'Welcome back'}</h2>
      <form onSubmit={submit}>
        {creating&&<label>Full name<input autoComplete="name" required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label>}
        {!recovery&&<label htmlFor="hosted-email">Email<input id="hosted-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>}
        {(recovery||mode!=='reset')&&<div className="hosted-password-field">
          <label htmlFor="hosted-password">Password</label>
          <div className="hosted-password-input"><input id="hosted-password" type={showPassword?'text':'password'} autoComplete={mode==='signin'&&!recovery?'current-password':'new-password'} required minLength={creating||recovery?8:undefined} aria-describedby={creating?'hosted-password-rules':undefined} value={password} onChange={event=>setPassword(event.target.value)}/><button type="button" className="hosted-password-toggle" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
          {creating&&<ul id="hosted-password-rules" className="hosted-password-rules" aria-label="Password requirements">{rules.map(rule=><li key={rule.label} className={rule.passed?'is-passed':''} aria-label={`${rule.label}: ${rule.passed?'met':'not met'}`}>{rule.passed?<CircleCheck size={14} aria-hidden="true"/>:<Circle size={14} aria-hidden="true"/>}<span>{rule.label}</span></li>)}</ul>}
        </div>}
        <button className="hosted-primary" disabled={busy}>{busy?'Please wait…':recovery?'Save password':creating?'Create account':mode==='reset'?'Send reset link':'Sign in'}</button>
      </form>
    </div>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {!recovery&&<div className="hosted-auth-links"><a href="#reset-password" aria-disabled={busy} onClick={event=>{event.preventDefault();if(!busy)selectMode('reset')}}>Forgot password?</a><a href="#resend-confirmation" aria-disabled={busy} onClick={event=>{event.preventDefault();void resend()}}>Resend confirmation</a></div>}
  </section></main>
}
