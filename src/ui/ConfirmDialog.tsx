import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { UiButton } from './Controls'
import { saveConfirmationPreference, type ConfirmationIntent } from './confirmationPolicy'

export type ConfirmDialogProps = {
  open: boolean
  intent: ConfirmationIntent
  title: string
  description: string
  scope?: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => Promise<void>
  onClose: () => void
  onSuccess?: () => void
}

export function ConfirmDialog({ open, intent, title, description, scope, confirmLabel, cancelLabel = 'Cancel', onConfirm, onClose, onSuccess }: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [skipNextTime, setSkipNextTime] = useState(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) {
      previousFocus.current = document.activeElement as HTMLElement
      element.showModal()
      cancel.current?.focus()
    } else if (!open && element.open) {
      element.close()
      previousFocus.current?.focus()
    }
  }, [open])

  useEffect(() => { if (!open) { setError(''); setSkipNextTime(false) } }, [open, intent.action])

  async function confirm() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      await onConfirm()
      if (skipNextTime) saveConfirmationPreference(intent)
      setSkipNextTime(false)
      onSuccess?.()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action failed. Try again.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return <dialog ref={dialog} className="ui-confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { if (busy.current) event.preventDefault(); else onClose() }} onClose={() => { if (open && !busy.current) onClose(); previousFocus.current?.focus() }}>
    <div className="ui-confirm-body">{intent.kind === 'danger' && <AlertTriangle className="ui-confirm-danger-icon" aria-hidden="true" size={24} />}<h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p>{scope && <p className="ui-confirm-scope">{scope}</p>}{error && <p role="alert" className="ui-field-error">{error}</p>}{intent.kind === 'routine' && intent.allowSkip && <label className="ui-confirm-optout"><input type="checkbox" checked={skipNextTime} disabled={pending} onChange={event => setSkipNextTime(event.target.checked)} />Don't ask again for this action during this session</label>}</div>
    <div className="ui-confirm-actions"><UiButton ref={cancel} type="button" onClick={onClose} disabled={pending}>{cancelLabel}</UiButton><UiButton type="button" variant={intent.kind === 'danger' ? 'danger' : 'primary'} onClick={() => void confirm()} pending={pending}>{confirmLabel}</UiButton></div>
  </dialog>
}

