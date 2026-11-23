export type ConfirmationIntent =
  | { kind: 'routine'; action: string; accountId: string; version: number; allowSkip?: boolean }
  | { kind: 'danger'; action: string; accountId: string; version: number; impact: 'permanent' | 'cascading' | 'bulk' | 'security' | 'ownership' | 'unknown' }
  | { kind: 'discard'; action: string; accountId: string; version: number }

const skipped = new Set<string>()

function key(intent: ConfirmationIntent): string {
  return JSON.stringify([intent.accountId, intent.action, intent.version])
}

export function canSkipConfirmation(intent: ConfirmationIntent): boolean {
  return intent.kind === 'routine' && intent.allowSkip === true && skipped.has(key(intent))
}

export function saveConfirmationPreference(intent: ConfirmationIntent): void {
  if (intent.kind === 'routine' && intent.allowSkip === true) skipped.add(key(intent))
}

export function resetConfirmationPreferences(accountId: string): void {
  for (const value of skipped) if (JSON.parse(value)[0] === accountId) skipped.delete(value)
}

export function hasConfirmationPreferences(accountId: string): boolean {
  return [...skipped].some(value => JSON.parse(value)[0] === accountId)
}

export function confirmationRequired(intent: ConfirmationIntent): boolean {
  return !canSkipConfirmation(intent)
}
