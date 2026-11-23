import { useId, type ComponentPropsWithRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { Link } from 'react-router-dom'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonProps = ComponentPropsWithRef<'button'> & { variant?: ButtonVariant; size?: 'compact' | 'comfortable'; pending?: boolean }

export function UiButton({ variant = 'secondary', size = 'comfortable', pending = false, disabled, children, className = '', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()}>{children}</button>
}

type IconVariant = 'primary' | 'secondary' | 'danger'
type IconProps = { label: string; title?: string; variant?: IconVariant; children: ReactNode; className?: string }

function iconClass(variant: IconVariant, className = '') {
  return `ui-icon-action ui-icon-action-${variant} ${className}`.trim()
}

export function UiIconButton({ label, title = label, variant = 'secondary', children, className, type = 'button', ...props }: Omit<ComponentPropsWithRef<'button'>, 'children'> & IconProps) {
  return <button {...props} type={type} className={iconClass(variant, className)} aria-label={label} title={title}>{children}</button>
}

export function UiIconLink({ label, title = label, variant = 'secondary', children, className, to, href }: IconProps & { to?: string; href?: string }) {
  const shared = { className: iconClass(variant, className), 'aria-label': label, title, children }
  return to ? <Link {...shared} to={to} /> : <a {...shared} href={href} />
}

export function UiField({ label, help, error, id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'aria-describedby'> & { label: string; help?: string; error?: string }) {
  const generatedId = useId()
  const fieldId = id || generatedId
  return <div className="ui-field"><label htmlFor={fieldId}>{label}</label><input {...props} id={fieldId} aria-invalid={Boolean(error) || undefined} aria-describedby={[help && `${fieldId}-help`, error && `${fieldId}-error`].filter(Boolean).join(' ') || undefined} />{help && <small id={`${fieldId}-help`}>{help}</small>}{error && <small id={`${fieldId}-error`} className="ui-field-error" role="alert">{error}</small>}</div>
}

export function PageHeading({ title, description, eyebrow, actions }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode }) {
  return <header className="ui-page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="ui-page-actions">{actions}</div>}</header>
}

export function SectionHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="ui-section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions && <div className="ui-page-actions">{actions}</div>}</header>
}

export function Feedback({ kind, children, onDismiss }: { kind: 'success' | 'warning' | 'error'; children: ReactNode; onDismiss: () => void }) {
  const Icon = kind === 'success' ? CheckCircle2 : kind === 'warning' ? Info : AlertCircle
  return <div className={`ui-feedback ui-feedback-${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Icon size={18} aria-hidden="true" /><span>{children}</span><UiIconButton variant="secondary" label={`Dismiss ${kind} message`} onClick={onDismiss}><X size={16} /></UiIconButton></div>
}

export function FormFooter({ onCancel, primaryLabel, pending = false, disabled = false, deleteAction }: { onCancel?: () => void; primaryLabel: string; pending?: boolean; disabled?: boolean; deleteAction?: ReactNode }) {
  return <div className="ui-form-footer">{onCancel ? <UiButton type="button" onClick={onCancel}>Cancel</UiButton> : <span />}<div className="ui-form-footer-primary">{deleteAction}<UiButton type="submit" variant="primary" pending={pending} disabled={disabled}>{primaryLabel}</UiButton></div></div>
}
