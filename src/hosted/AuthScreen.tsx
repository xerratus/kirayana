import { errorMessage } from '../storage/errors'
import { useState, type FormEvent } from 'react'
import { Layers3 } from 'lucide-react'
import { brand } from '../app/brand'
import { supabase, authRedirect } from './client'
export function AuthScreen({recovery=false,onRecovered}:{recovery?:boolean;onRecovered:()=>void}) {
  const [mode,setMode]=useState<'signup'|'signin'|'reset'>('signup'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  async function submit(event:FormEvent) {
    event.preventDefault();if(!supabase)return;setBusy(true);setError('');setNotice('')
    try {
      if(recovery){const {error}=await supabase.auth.updateUser({password});if(error)throw error;onRecovered();return}
      if(mode==='reset'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirect()});if(error)throw error;setNotice('Check your email for a password reset link.');return}
      if(mode==='signin'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
      else {if(!name.trim())throw new Error('Enter your full name.');const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name.trim()},emailRedirectTo:authRedirect()}});if(error)throw error;setNotice('Check your email to confirm your account, then sign in.')}
    }catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}
  }
  return <main className="hosted-auth"><section className="hosted-card"><Layers3 size={36}/><h1>{brand.name}</h1><p>Your spaces, together.</p>{!recovery&&<nav aria-label="Account access"><button onClick={()=>{setMode('signup');setError('');setNotice('')}} aria-pressed={mode==='signup'}>Create account</button><button onClick={()=>{setMode('signin');setError('');setNotice('')}} aria-pressed={mode==='signin'}>Sign in</button></nav>}<h2>{recovery?'Set a new password':mode==='reset'?'Reset password':mode==='signup'?'Create your account':'Welcome back'}</h2><form onSubmit={submit}>{!recovery&&mode==='signup'&&<label>Full name<input autoComplete="name" required maxLength={80} value={name} onChange={event=>setName(event.target.value)}/></label>}{!recovery&&<label>Email<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>}{(recovery||mode!=='reset')&&<label>Password<input type="password" autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={8} value={password} onChange={event=>setPassword(event.target.value)}/></label>}<button className="hosted-primary" disabled={busy}>{busy?'Please wait…':recovery?'Save password':mode==='signup'?'Create account':mode==='reset'?'Send reset link':'Sign in'}</button></form>{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{!recovery&&<div className="hosted-auth-links"><button disabled={busy} onClick={()=>{setMode('reset');setNotice('');setError('')}}>Forgot password?</button><button disabled={busy||!email} onClick={async()=>{setBusy(true);const {error}=await supabase!.auth.resend({type:'signup',email,options:{emailRedirectTo:authRedirect()}});setError(error?.message??'');setNotice(error?'':'Confirmation email sent.');setBusy(false)}}>Resend confirmation</button></div>}</section></main>
}
