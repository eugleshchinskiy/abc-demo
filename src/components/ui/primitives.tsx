import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react'
import logoMark from '../../assets/icons/logo-mark.svg'
import logoWordmark from '../../assets/icons/logo-wordmark.svg'
import { cn } from '../../lib/cn'
import { useDismiss } from '../../lib/hooks'
import { useUi } from '../../state/ui-context'
import { Icon, type IconName } from './Icon'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn('animate-spin', className)} />
}

/** Figma "brand": 30×30 mark + 66×16 wordmark, 4px apart. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1 select-none', className)}>
      <span className="relative size-[30px] shrink-0">
        <img src={logoMark} alt="" width={21.44} height={20} className="absolute top-[16.67%] left-[14.27%] h-5 w-[21.44px]" />
      </span>
      <img src={logoWordmark} alt="artven" width={66} height={16} className="h-4 w-[66px] max-sm:hidden" />
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

type IconButtonTone = 'container' | 'container-2' | 'purple-dark' | 'line' | 'glass'

const TONES: Record<IconButtonTone, string> = {
  container: 'bg-container hover:bg-container-2',
  'container-2': 'bg-container-2 hover:bg-line',
  'purple-dark': 'bg-purple-dark hover:bg-[#35334a]',
  line: 'bg-line hover:bg-[#525252]',
  glass: 'bg-[rgb(55_55_55/0.8)] backdrop-blur-[10px] hover:bg-[rgb(70_70_70/0.9)]',
}

/** Round icon button — the Figma "attach" / "Save" / "avatar" circles. */
export function IconButton({
  icon,
  label,
  size = 32,
  tone = 'container',
  iconClassName = 'text-white',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName
  label: string
  size?: 32 | 40
  tone?: IconButtonTone
  iconClassName?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        size === 32 ? 'size-8' : 'size-10',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon ? <Icon name={icon} className={iconClassName} /> : children}
    </button>
  )
}

/** Pill button. `primary` is the white Figma "Find Templates" button. */
export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'purple' | 'ghost'; loading?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-3xl px-5 text-control whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-white text-bg-dark hover:bg-[#e6e6e6]',
        variant === 'purple' && 'bg-purple text-bg-dark hover:bg-[#c7c0fe]',
        variant === 'secondary' && 'bg-container text-white hover:bg-container-2',
        variant === 'ghost' && 'text-secondary hover:bg-container hover:text-white',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

/** Figma "Segment": 32px pill; selected = white fill. */
export function Segment({
  selected,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-8 shrink-0 items-center justify-center rounded-3xl px-3 text-control whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none',
        selected ? 'bg-white text-bg-dark' : 'text-secondary hover:bg-container hover:text-white',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Popover & menu (Figma "Popups": Profile Menu, Help Menu)                    */
/* -------------------------------------------------------------------------- */

/** Anchored dropdown surface. Parent must be `relative`. */
export function Popover({
  open,
  onClose,
  children,
  className,
  align = 'right',
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, onClose)

  // Move focus into the menu so arrow keys / Tab work right away.
  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus({ preventScroll: true })
  }, [open])

  if (!open) return null
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])]
        const i = items.indexOf(document.activeElement as HTMLElement)
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      }}
      className={cn(
        'absolute z-50 flex flex-col rounded-[20px] border border-white/[0.08] bg-container p-3 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.7)] animate-in',
        align === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  hint,
  onSelect,
  disabled,
}: {
  icon?: IconName
  children: ReactNode
  hint?: ReactNode
  onSelect?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="flex h-10 w-full shrink-0 items-center gap-3 rounded-[10px] px-3 text-left text-[13px] leading-none font-[450] text-white transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {icon && <Icon name={icon} className="text-white" />}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-tertiary">{hint}</span>}
    </button>
  )
}

export function MenuDivider() {
  return (
    <div className="flex h-5 shrink-0 items-center px-2">
      <div className="h-px w-full bg-container-2" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal (Figma "Smart Search" window)                                         */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDismiss(panel, open, onClose)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus the first field, or the panel itself.
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select')
    ;(first ?? panel.current)?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] animate-fade">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          // Keep Tab inside the dialog.
          if (e.key !== 'Tab' || !panel.current) return
          const focusable = [...panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, a[href]')]
          if (!focusable.length) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }}
        className={cn(
          'relative flex max-h-[calc(100dvh-32px)] w-full max-w-[600px] flex-col gap-5 overflow-y-auto rounded-[20px] border border-white/[0.08] bg-bg p-5 shadow-[0_40px_100px_-20px_rgb(0_0_0/0.9)] animate-in focus:outline-none',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-section text-title">
            {title}
          </h2>
          <IconButton icon="close" label="Close" tone="container" iconClassName="text-tertiary" onClick={onClose} />
        </div>
        {description && <div className="-mt-1 text-[13px] leading-5 text-tertiary">{description}</div>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/* -------------------------------------------------------------------------- */
/* Form fields                                                                 */
/* -------------------------------------------------------------------------- */

const FIELD =
  'w-full rounded-xl border bg-container px-3.5 text-[13px] text-white placeholder:text-tertiary transition-colors focus:outline-none'

function fieldBorder(error?: string) {
  return error ? 'border-danger/70 focus:border-danger' : 'border-transparent focus:border-purple/70'
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-secondary">
          {label}
        </label>
        {hint && <span className="text-[11px] text-tertiary tabular-nums">{hint}</span>}
      </div>
      {children(id, error ? msgId : undefined)}
      {error && (
        <p id={msgId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextInput({ error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input aria-invalid={!!error} className={cn(FIELD, 'h-10', fieldBorder(error), className)} {...rest} />
}

export function TextArea({ error, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea aria-invalid={!!error} className={cn(FIELD, 'min-h-28 resize-none py-2.5 leading-5', fieldBorder(error), className)} {...rest} />
}

/* -------------------------------------------------------------------------- */
/* Feedback                                                                    */
/* -------------------------------------------------------------------------- */

export function Toaster() {
  const { toasts, dismissToast } = useUi()
  return createPortal(
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-[20px] border border-white/[0.08] bg-container p-3.5 pr-2 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.8)] animate-in"
        >
          {t.variant === 'success' && <CircleCheck className="mt-px size-[18px] shrink-0 text-purple" />}
          {t.variant === 'error' && <CircleX className="mt-px size-[18px] shrink-0 text-danger" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{t.title}</p>
            {t.description && <p className="mt-0.5 text-[13px] leading-snug text-secondary">{t.description}</p>}
          </div>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.onClick()
                dismissToast(t.id)
              }}
              className="h-8 shrink-0 self-center rounded-3xl bg-white px-3 text-control text-bg-dark hover:bg-[#e6e6e6]"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="grid size-6 shrink-0 place-items-center rounded-full text-tertiary hover:bg-white/10 hover:text-white"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-[20px] border border-white/[0.08] bg-bg p-6 text-center', className)}>
      <p className="text-[13px] text-secondary">{message}</p>
      <Button onClick={onRetry} className="h-8 px-4">
        Try again
      </Button>
    </div>
  )
}
