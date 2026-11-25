import { errorMessage } from '../storage/errors'
import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { UiIconButton } from '../ui/Controls'
import { useConfirmation } from '../ui/confirmationContext'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'
import { AuthScreen } from './AuthScreen'
import { CanvasWorkspace } from '../canvas/CanvasWorkspace'
import { CanvasLeftFloatingFlyoutFrame } from '../canvas/CanvasLeftFloatingFlyout'
import { ConfirmationProvider } from '../ui/ConfirmationProvider'
import { initialOrganizer, type Organizer } from '../organizer/model'
import { createLocalRepository } from '../storage/indexedDb'
import { createHostedRepository } from './repository'
import { createRecoveryStore, type Recovery } from './recovery'
import { encodeBackup } from '../storage/backup'
import { SaveQueue } from '../storage/saveQueue'
import { resetConfirmationPreferences } from '../ui/confirmationPolicy'
import './hosted.css'

export function HostedApp(){
  const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[recovery,setRecovery]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    if(!supabase)return
    let active=true,eventSeen=false
    const {data}=supabase.auth.onAuthStateChange((event,next)=>{eventSeen=true;if(active){setSession(next);setReady(true);if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT')setRecovery(false)}})
    void supabase.auth.getSession().then(({data,error})=>{if(active&&!eventSeen){setError(error?.message??'');setSession(data.session);setReady(true)}})
    return()=>{active=false;data.subscription.unsubscribe()}
  },[])
  if(!supabase)return <main className="hosted-auth"><section className="hosted-card"><h1>Connect Kirayana</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before building.</p></section></main>
  if(!ready)return <main className="hosted-auth" role="status">Loading your account…</main>
  if(error)return <main className="hosted-auth" role="alert">{error}<button onClick={()=>location.reload()}>Retry</button></main>
  if(recovery||!session)return <AuthScreen recovery={recovery} onRecovered={()=>setRecovery(false)}/>
  return <ConfirmationProvider key={session.user.id}><HostedWorkspace session={session}/></ConfirmationProvider>
}

function HostedWorkspace({session}:{session:Session}){
  const owner=session.user.id,confirm=useConfirmation()
  const [recoveries,setRecoveries]=useState<Recovery[]>([])
  const recoveryStore=useRef<ReturnType<typeof createRecoveryStore>|null>(null)
  const [state,setState]=useState<Organizer|null>(null),[local,setLocal]=useState<Organizer|null>(null),[empty,setEmpty]=useState(false)
  const [status,setStatus]=useState('Loading your spaces…'),[error,setError]=useState(''),[busy,setBusy]=useState(false)
  const [profile,setProfile]=useState(false),[fullName,setFullName]=useState(''),[draftName,setDraftName]=useState(''),[draftColor,setDraftColor]=useState('#4c9df4'),[profileError,setProfileError]=useState('')
  const repository=useRef<ReturnType<typeof createHostedRepository>|null>(null),queue=useRef<SaveQueue|null>(null)
  const hub=state?.nodes.find(node=>node.id===state.rootId)
  const initialSave=useRef<{source:Organizer;choice:string}|null>(null)
  const latest=useRef<Organizer|null>(null),dirty=useRef(false)
  useEffect(()=>{
    let active=true
    const repo=createHostedRepository(supabase!,owner);repository.current=repo
    const recovery=createRecoveryStore(owner);recoveryStore.current=recovery
    const saves=new SaveQueue(repo,(pending,message)=>{if(active){dirty.current=pending;if(!pending)void recovery.clear().catch(()=>{});setStatus(pending?message?'Unsaved changes':'Saving…':'Saved to your account');setError(message)}});queue.current=saves
    void (async()=>{
      const {data,error}=await supabase!.from('profiles').select('full_name').eq('id',owner).maybeSingle();if(error)throw error
      const name=data?.full_name||session.user.user_metadata.full_name||session.user.email?.split('@')[0]||'You'
      if(!data){const {error}=await supabase!.from('profiles').upsert({id:owner,full_name:name},{onConflict:'id',ignoreDuplicates:true});if(error)throw error}
      if(active)setFullName(name)
      const saved=await repo.load();if(!active)return
      try{const entries=await recovery.load();if(active)setRecoveries(entries)}catch(cause){if(active)setError(`Browser recovery unavailable: ${errorMessage(cause)}`)}
      if(!active)return
      if(saved){resetConfirmationPreferences(saved.rootId);latest.current=saved;setState(saved);setStatus('Saved to your account')}
      else {
        setEmpty(true);setStatus('Choose how to start')
        const browser=createLocalRepository()
        try{const existing=await browser.load();if(active)setLocal(existing)}catch{ /* A broken browser snapshot must not prevent starting a hosted workspace. */ }finally{browser.close()}
      }
    })().catch(cause=>{if(active){setError(errorMessage(cause));setStatus('Could not load your account')}})
    return()=>{active=false;saves.close();void recovery.close().catch(()=>{});resetConfirmationPreferences(owner);if(latest.current)resetConfirmationPreferences(latest.current.rootId)}
  // Each user gets a fresh repository, canvas, drafts, and confirmation state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[owner])
  const change=useCallback((update:(current:Organizer)=>Organizer)=>{
    const current=latest.current;if(!current)return
    const next={...update(current),revision:current.revision+1};latest.current=next;setState(next);void recoveryStore.current?.save(next).catch(cause=>setError(`Browser recovery unavailable: ${errorMessage(cause)}`));queue.current?.enqueue(next)
  },[])
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty.current)event.preventDefault()};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
  function closeProfile(){
    if(draftName===fullName&&draftColor===hub?.color){setProfile(false);return}
    void confirm({intent:{kind:'discard',action:'leave-profile',accountId:owner,version:1},title:'Discard profile changes?',description:'Your unsaved name change will be lost.',confirmLabel:'Discard changes',action:async()=>setProfile(false)})
  }
  useEffect(()=>{if(!profile)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')closeProfile()};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[profile,draftName,fullName,draftColor,hub?.color])
  async function signOut(){setBusy(true);try{if(dirty.current&&latest.current)queue.current?.enqueue(latest.current);await queue.current?.flush();const {error}=await supabase!.auth.signOut();if(error)throw error}catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}}
  async function start(source:Organizer,choice:string){if(initialSave.current?.choice!==choice)initialSave.current={source,choice};source=initialSave.current.source;setBusy(true);setError('');try{await repository.current!.save(source);latest.current=source;setState(source);setEmpty(false);setStatus('Saved to your account')}catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}}
  if(recoveries.length)return <main className="hosted-auth"><section className="hosted-card"><h1>Recover unsaved work</h1><p>This account has browser changes from an interrupted session. Choose a copy to restore, or keep the cloud version.</p>{recoveries.map(entry=><section key={entry.id}><p>{new Date(entry.updatedAt).toLocaleString()} · {entry.state.nodes.length} orbs</p><button disabled={busy} onClick={async()=>{setBusy(true);try{const content=await encodeBackup(entry.state);const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='kirayana-recovery.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}}}>Export backup</button><button disabled={busy} onClick={()=>void confirm({intent:{kind:'danger',action:`restore-recovery-${entry.id}`,accountId:owner,version:state?.revision??0,impact:'cascading'},title:'Restore this recovery copy?',description:'This replaces your current cloud organizer with the selected browser copy. Export a backup first to keep both versions.',confirmLabel:'Restore copy',action:async()=>{setBusy(true);try{const restored={...entry.state,revision:(state?.revision??entry.state.revision)+1};await repository.current!.save(restored);await recoveryStore.current!.clear(entry.id);latest.current=restored;setState(restored);setEmpty(false);setRecoveries(current=>current.filter(item=>item.id!==entry.id));setStatus('Saved to your account')}catch(cause){setError(errorMessage(cause))}finally{setBusy(false)}}})}>Restore this copy</button><button disabled={busy} onClick={()=>void confirm({intent:{kind:'danger',action:`discard-recovery-${entry.id}`,accountId:owner,version:1,impact:'cascading'},title:'Discard this recovery copy?',description:'This removes the unsaved browser copy. Your cloud organizer stays intact.',confirmLabel:'Discard copy',action:async()=>{await recoveryStore.current!.clear(entry.id);setRecoveries(current=>current.filter(item=>item.id!==entry.id))}})}>Discard this copy</button></section>)}{error&&<p role="alert">{error}</p>}</section></main>
  if(!state)return <main className="hosted-auth"><section className="hosted-card"><h1>{empty?'Your new canvas':'Kirayana'}</h1><p>{status}</p>{empty&&<><p>Start fresh or copy this browser’s organizer to your account. The browser copy stays intact.</p>{local&&<button disabled={busy} onClick={()=>void start(local,'local')}>Import browser data ({local.nodes.length} orbs, {local.records.length} records, {local.attachments.length} files)</button>}<button disabled={busy} onClick={()=>{const blank=initialOrganizer();blank.nodes[0].name=fullName||'You';void start(blank,'blank')}}>Start a blank canvas</button></>}{error&&<p role="alert">{error}</p>}{!empty&&error&&<button onClick={()=>location.reload()}>Retry</button>}<button disabled={busy} onClick={()=>void signOut()}>Sign out</button></section></main>
  return <CanvasWorkspace state={state} change={change} storageStatus={status} storageError={error} onRetry={()=>queue.current?.retry()} hostedAccount={{fullName:fullName||'You',email:session.user.email??'',onDismissProfile:closeProfile,onProfile:()=>{setDraftName(fullName);setDraftColor(hub!.color);setProfileError('');setProfile(true)},onSignOut:()=>{if(!busy)void signOut()}}} accountPanel={<CanvasLeftFloatingFlyoutFrame open={profile} color={hub!.color} label="Your account"><header className="canvas-right-flyout-heading"><div><small>Profile</small><h2>Your account</h2></div><UiIconButton label="Close profile" onClick={closeProfile}><X size={18}/></UiIconButton></header><section className="canvas-right-flyout-body hosted-profile"><p>{session.user.email}</p><form onSubmit={async event=>{event.preventDefault();setBusy(true);setProfileError('');const {error}=await supabase!.from('profiles').update({full_name:draftName.trim()}).eq('id',owner);setBusy(false);if(error)setProfileError(error.message);else {setFullName(draftName.trim());if(hub!.color!==draftColor||hub!.name!==draftName.trim())change(current=>({...current,nodes:current.nodes.map(node=>node.id===current.rootId?{...node,name:draftName.trim(),color:draftColor,updatedAt:new Date().toISOString()}:node)}));setProfile(false)}}}><label>Full name<input required disabled={busy} maxLength={80} value={draftName} onChange={event=>setDraftName(event.target.value)}/></label><label>Hub color<input type="color" disabled={busy} value={draftColor} onChange={event=>setDraftColor(event.target.value)}/></label><button disabled={busy}>Save profile</button></form>{profileError&&<p role="alert">{profileError}</p>}</section></CanvasLeftFloatingFlyoutFrame>}/>
}
