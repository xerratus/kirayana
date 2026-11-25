import { initialOrganizer } from '../organizer/model'
import type { OrganizerRepository } from '../storage/repository'

export async function loadOrCreateOrganizer(repository:OrganizerRepository, fullName:string) {
  const saved=await repository.load()
  if(saved)return saved
  const fresh=initialOrganizer()
  fresh.nodes.find(node=>node.id===fresh.rootId)!.name=fullName||'You'
  try { await repository.save(fresh);return fresh }
  catch(error) {
    // Another tab can finish first. Use its canvas instead of replacing it.
    if(error&&typeof error==='object'&&'code' in error&&error.code==='PT409') {
      const existing=await repository.load()
      if(existing)return existing
    }
    throw error
  }
}
