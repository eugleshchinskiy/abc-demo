import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, CircleX, LoaderCircle, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useDismiss } from '../../lib/hooks'
import { useUi } from '../../state/ui-context'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden className={cn('animate-spin', className)} />
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-1.5 select-none', className)}>
      <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5dcff" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <path d="M24 10.5a9 9 0 1 0-1.9 12.2" fill="none" stroke="url(#logo-g)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M9.4 19a5 5 0 1 1 8.3-5.5" fill="none" stroke="#e0f2fe" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span className="text-[22px] font-semibold tracking-[-0.04em] text-white">artven</span>
    </span>
  )
}

/** Anchored dropdown surface. Parent must be `relative`. */
export function Popover({
  open,
  onClose,
  children,
  className,
  align = 'right',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, open, onClose)
  if (!open) return null
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        'absolute top-[calc(100%+8px)] z-50 min-w-56 rounded-2xl border border-white/10 bg-[#161618]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl animate-in',
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
  active,
  disabled,
}: {
  icon?: ReactNode
  children: ReactNode
  hint?: ReactNode
  onSelect?: () => void
  active?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-zinc-200 transition-colors',
        'hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent',
        active && 'bg-white/[0.07]',
      )}
    >
      {icon && <span className="text-zinc-400 [&>svg]:size-4">{icon}</span>}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  children,
  className,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  label: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  useDismiss(panel, open, onClose)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm animate-fade">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          'relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#121214] shadow-2xl shadow-black animate-in',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Toaster() {
  const { toasts, dismissToast } = useUi()
  return createPortal(
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-[#1a1a1d]/95 p-3.5 pr-2 shadow-2xl shadow-black/60 backdrop-blur-xl animate-in"
        >
          {t.variant === 'success' && <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-emerald-400" />}
          {t.variant === 'error' && <CircleX className="mt-0.5 size-[18px] shrink-0 text-rose-400" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">{t.title}</p>
            {t.description && <p className="mt-0.5 text-[13px] text-zinc-400">{t.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="grid size-6 place-items-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center', className)}>
      <p className="text-sm text-zinc-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-zinc-200"
      >
        Try again
      </button>
    </div>
  )
}
