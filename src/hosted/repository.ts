import type { SupabaseClient } from '@supabase/supabase-js'
import type { Organizer } from '../organizer/model'
import type { OrganizerRepository } from '../storage/repository'
import { canonicalJson, digest, joinOrganizer, splitOrganizer, type Content, type Layout, type RemoteFile } from './wire'

/** One repository per authenticated session. CAS prevents lost edits across tabs/devices. */
export function createHostedRepository(client:SupabaseClient, owner:string):OrganizerRepository {
  let closed=false, version=0, previousContent='', previousLayout=''
  let files:RemoteFile[]=[]
  const hashes=new WeakMap<Blob,string>()
  let pending:{fingerprint:string;id:string}|null=null
  const active=()=>{if(closed)throw new Error('This account session has ended.')}
  async function identity() { active(); const {data,error}=await client.auth.getSession(); if(error||data.session?.user.id!==owner)throw new Error('Sign in again before saving.'); active() }
  return {
    async load() {
      await identity()
      const {data,error}=await client.from('organizers').select('content,layout,version,client_revision').eq('owner_id',owner).maybeSingle()
      if(error)throw error; active(); if(!data)return null
      const content=data.content as Content, layout=data.layout as Layout
      const attachments=await Promise.all(content.attachments.map(async file=>{
        if(!file.path.startsWith(`${owner}/`))throw new Error('Invalid attachment owner.')
        const {data:blob,error}=await client.storage.from('attachments').download(file.path)
        if(error)throw error; active()
        if(blob.size!==file.size)throw new Error('Attachment size does not match.')
        hashes.set(blob,file.path.split('/').at(-1)!);return {id:file.id,name:file.name,size:file.size,blob}
      }))
      const state=joinOrganizer(content,layout,data.client_revision,attachments)
      version=data.version; files=content.attachments; previousContent=canonicalJson(content); previousLayout=canonicalJson(layout)
      return state
    },
    async save(state:Organizer) {
      await identity()
      const total=state.attachments.reduce((sum,file)=>sum+file.size,0)
      if(total>25*1024*1024)throw new Error('Attachments exceed 25 MB.')
      const nextFiles:RemoteFile[]=[]
      for(const file of state.attachments) {
        if(file.blob.size!==file.size||file.size>10*1024*1024)throw new Error('Invalid attachment size.')
        let hash=hashes.get(file.blob);if(!hash){hash=await digest(await file.blob.arrayBuffer());hashes.set(file.blob,hash)}active()
        const path=`${owner}/${file.id}/${hash}`
        if(!files.some(saved=>saved.path===path)) {
          const {error}=await client.storage.from('attachments').upload(path,file.blob,{upsert:false,contentType:file.blob.type||'application/octet-stream'})
          // An immutable object from a previous interrupted save is safe to reuse.
          if(error) { const {data,error:readError}=await client.storage.from('attachments').download(path); if(readError||!data||await digest(await data.arrayBuffer())!==hash)throw error }
          active()
        }
        nextFiles.push({id:file.id,name:file.name,size:file.size,type:file.blob.type,path})
      }
      const {content,layout}=splitOrganizer(state,nextFiles), contentText=canonicalJson(content), layoutText=canonicalJson(layout)
      if(contentText===previousContent&&layoutText===previousLayout)return
      const fingerprint=await digest(new TextEncoder().encode(canonicalJson({content,layout,revision:state.revision})))
      if(!pending||pending.fingerprint!==fingerprint)pending={fingerprint,id:crypto.randomUUID()}
      active()
      const {data,error}=await client.rpc('save_organizer',{p_owner:owner,p_expected_version:version,p_operation:pending.id,p_content:contentText===previousContent?null:content,p_layout:layoutText===previousLayout?null:layout,p_revision:state.revision})
      if(error)throw error; active()
      const removed=files.filter(file=>!nextFiles.some(next=>next.path===file.path)).map(file=>file.path)
      version=data; previousContent=contentText; previousLayout=layoutText; files=nextFiles; pending=null
      // Cleanup follows the reference commit. RLS protects files re-referenced by another tab.
      if(removed.length)await client.storage.from('attachments').remove(removed).catch(()=>{})
    },
    close(){closed=true},
  }
}
