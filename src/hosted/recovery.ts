import { assertOrganizer, type Organizer } from '../organizer/model'
export type Recovery = {id:string;owner:string;updatedAt:string;state:Organizer}
/** Separate from the original browser organizer. Owner + tab scoped; never auto-imported. */
export function createRecoveryStore(owner:string) {
  let tab:string
  try { tab=sessionStorage.getItem('kirayana-recovery-tab')||crypto.randomUUID();sessionStorage.setItem('kirayana-recovery-tab',tab) } catch { tab=crypto.randomUUID() }
  const id=`${owner}:${tab}`
  const connection=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('kirayana-hosted-recovery',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('snapshots',{keyPath:'id'})
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)
  })
  void connection.catch(()=>{})
  let queue=Promise.resolve()
  function write(action:(store:IDBObjectStore)=>void) {
    const next=queue.catch(()=>{}).then(async()=>{const db=await connection;await new Promise<void>((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');action(tx.objectStore('snapshots'));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})})
    queue=next;return next
  }
  return {
    async load():Promise<Recovery[]> {const db=await connection;return new Promise((resolve,reject)=>{const request=db.transaction('snapshots').objectStore('snapshots').getAll();request.onerror=()=>reject(request.error);request.onsuccess=()=>{try{const entries=(request.result as Recovery[]).filter(item=>item.owner===owner);for(const entry of entries)assertOrganizer(entry.state);resolve(entries)}catch(error){reject(error)}}})},
    save(state:Organizer){return write(store=>store.put({id,owner,state,updatedAt:new Date().toISOString()}))},
    clear(entryId=id){if(!entryId.startsWith(`${owner}:`))return Promise.reject(new Error('Invalid recovery owner.'));return write(store=>store.delete(entryId))},
    async close(){await queue.catch(()=>{});(await connection).close()},
  }
}
