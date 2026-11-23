import { assertOrganizer, migrateOrganizer, type Organizer } from '../organizer/model'
const maxTotal = 25 * 1024 * 1024
export async function encodeBackup(state: Organizer): Promise<string> {
  const attachments = await Promise.all(state.attachments.map(async file => {
    const bytes = new Uint8Array(await file.blob.arrayBuffer()); let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return { id: file.id, name: file.name, size: file.size, type: file.blob.type, data: btoa(binary) }
  }))
  return JSON.stringify({ format: 'kirayana-backup', version: 1, organizer: { ...state, attachments } })
}
export async function decodeBackup(text: string): Promise<Organizer> {
  if (text.length > 40 * 1024 * 1024) throw new Error('Backup exceeds 40 MB.')
  const backup = JSON.parse(text)
  if (backup.format !== 'kirayana-backup' || backup.version !== 1 || !Array.isArray(backup.organizer?.attachments)) throw new Error('Choose a full Kirayana backup.')
  let total = 0
  const attachments = backup.organizer.attachments.map((file: { id: string; name: string; size: number; type: string; data: string }) => {
    if (typeof file.id !== 'string' || typeof file.name !== 'string' || typeof file.data !== 'string' || typeof file.type !== 'string' || !Number.isInteger(file.size) || file.size < 0 || file.size > 10 * 1024 * 1024 || (total += file.size) > maxTotal || file.data.length > Math.ceil(file.size / 3) * 4) throw new Error('Invalid backup attachment or file limit exceeded.')
    const bytes = Uint8Array.from(atob(file.data), c => c.charCodeAt(0))
    if (bytes.length !== file.size) throw new Error('Backup attachment size does not match.')
    return { id: file.id, name: file.name, size: file.size, blob: new Blob([bytes], { type: file.type }) }
  })
  if (new Set(attachments.map((f: { id: string }) => f.id)).size !== attachments.length) throw new Error('Duplicate attachment IDs.')
  const result = migrateOrganizer({ ...backup.organizer, attachments }); assertOrganizer(result); return result
}
