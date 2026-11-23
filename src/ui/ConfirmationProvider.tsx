import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { confirmationRequired } from './confirmationPolicy'
import { ConfirmationContext, type ConfirmationRequest } from './confirmationContext'

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null)

  async function confirm(next: ConfirmationRequest) {
    if (!confirmationRequired(next.intent)) {
      await next.action()
      next.onSuccess?.()
      return
    }
    setRequest(current => current || next)
  }

  return <ConfirmationContext.Provider value={confirm}>{children}<ConfirmDialog open={Boolean(request)} intent={request?.intent || { kind: 'discard', action: 'idle', accountId: 'idle', version: 1 }} title={request?.title || ''} description={request?.description || ''} scope={request?.scope} confirmLabel={request?.confirmLabel || 'Confirm'} cancelLabel={request?.cancelLabel} onConfirm={async () => { await request?.action() }} onSuccess={request?.onSuccess} onClose={() => setRequest(null)} /></ConfirmationContext.Provider>
}
