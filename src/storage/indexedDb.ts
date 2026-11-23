import { assertOrganizer, migrateOrganizer } from '../organizer/model'
import type { OrganizerRepository } from './repository'

/** IndexedDB snapshot commits are atomic, including local attachment Blobs. */
export function createLocalRepository(): OrganizerRepository {
  let revision: number | null = null
  let connection: IDBDatabase | undefined
  let queue = Promise.resolve()
  const db = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('kirayana-organizer', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('organizer')
    request.onblocked = () => reject(new Error('Close other Kirayana tabs to finish updating browser storage.'))
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { connection = request.result; connection.onversionchange = () => connection?.close(); resolve(connection) }
  })
  return {
    async load() {
      const connection = await db
      return new Promise((resolve, reject) => {
        const transaction = connection.transaction('organizer', 'readonly')
        const request = transaction.objectStore('organizer').get('current')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          try { const state = request.result ? migrateOrganizer(request.result) : null; if (state) revision = state.revision; resolve(state) }
          catch (error) { reject(error) }
        }
      })
    },
    save(state) {
      const next = queue.catch(() => {}).then(async () => {
        assertOrganizer(state)
        const connection = await db
        return new Promise<void>((resolve, reject) => {
          const transaction = connection.transaction('organizer', 'readwrite')
          const store = transaction.objectStore('organizer')
          const request = store.get('current')
          let conflict = false
          request.onsuccess = () => {
            if ((request.result?.revision ?? null) !== revision) { conflict = true; transaction.abort(); return }
            store.put(state, 'current')
          }
          transaction.oncomplete = () => { revision = state.revision; resolve() }
          transaction.onerror = () => reject(transaction.error ?? new Error('Could not save to browser storage.'))
          transaction.onabort = () => reject(new Error(conflict ? 'This organizer changed in another tab. Export your unsaved work before refreshing.' : 'Browser storage could not save these changes. Your work is still open; export a backup.'))
        })
      })
      queue = next
      return next
    },
    close() { connection?.close() },
  }
}
