import { createContext, useContext } from 'react'
import type { ConfirmDialogProps } from './ConfirmDialog'

export type ConfirmationRequest = Pick<ConfirmDialogProps, 'intent' | 'title' | 'description' | 'scope' | 'confirmLabel' | 'cancelLabel'> & { action: () => Promise<void>; onSuccess?: () => void }
export type Confirm = (request: ConfirmationRequest) => Promise<void>
export const ConfirmationContext = createContext<Confirm | null>(null)

export function useConfirmation(): Confirm {
  const confirm = useContext(ConfirmationContext)
  if (!confirm) throw new Error('ConfirmationProvider is missing.')
  return confirm
}
