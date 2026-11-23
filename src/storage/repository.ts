import type { Organizer } from '../organizer/model'
export interface OrganizerRepository {
  load(): Promise<Organizer | null>
  save(state: Organizer): Promise<void>
  close(): void
}
