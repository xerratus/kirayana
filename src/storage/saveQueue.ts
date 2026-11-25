import { errorMessage } from './errors'
import type { Organizer } from '../organizer/model'
import type { OrganizerRepository } from './repository'
/** Coalesce edits, serialize writes, and retain the failed snapshot for exact retries. */
export class SaveQueue {
  private latest:Organizer|null=null
  private failed:Organizer|null=null
  private failure=''
  private running:Promise<void>|null=null
  private closed=false
  private timer:ReturnType<typeof setTimeout>|undefined
  constructor(private repository:OrganizerRepository,private status:(pending:boolean,error:string)=>void){}
  enqueue(state:Organizer){if(this.closed)return;this.latest=state;this.status(true,this.failed?this.failure:'');clearTimeout(this.timer);if(!this.failed&&!this.running)this.timer=setTimeout(()=>void this.run(),250)}
  private run():Promise<void>{
    if(this.running)return this.running
    this.running=(async()=>{
      while(!this.closed&&(this.failed||this.latest)){
        const snapshot=this.failed??this.latest!; if(this.latest===snapshot)this.latest=null
        try { await this.repository.save(snapshot); this.failed=null;this.failure='' }
        catch(error){this.failed=snapshot;this.failure=errorMessage(error);if(!this.closed)this.status(true,this.failure);return}
      }
      if(!this.closed)this.status(false,'')
    })().finally(()=>{this.running=null})
    return this.running
  }
  async flush(){clearTimeout(this.timer);await this.run();if(this.failed)throw new Error('Changes have not been saved. Retry or export a backup before signing out.')}
  retry(){clearTimeout(this.timer);void this.run()}
  close(){this.closed=true;clearTimeout(this.timer);this.repository.close()}
}
