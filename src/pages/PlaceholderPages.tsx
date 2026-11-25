import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useResetDemo } from '../api/queries'
import { Icon, type IconName } from '../components/ui/Icon'
import { Button } from '../components/ui/primitives'
import { useComposer } from '../state/composer-context'
import { useUi } from '../state/ui-context'

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-bg text-white">
        <Icon name={icon} size={24} />
      </span>
      <h1 className="text-section text-title">{title}</h1>
      <div className="mt-2 flex flex-col items-center text-[13px] text-secondary">{children}</div>
    </div>
  )
}

export function ChatPage() {
  return (
    <EmptyState icon="chat" title="Chat">
      Conversations with the artven assistant will live here.
      <Link to="/" className="mt-4 inline-flex h-10 items-center rounded-3xl bg-white px-5 text-control text-bg-dark hover:bg-[#e6e6e6]">
        Back to Home
      </Link>
    </EmptyState>
  )
}

/** Knobs read by the mock API on load (see src/mocks/handlers.ts). */
const KNOBS = [
  { key: 'mockLatency', label: 'Base latency, ms', options: ['150', '350', '1500'], fallback: '350' },
  { key: 'mockFailRate', label: 'Random request failures', options: ['0', '0.2', '0.5'], fallback: '0' },
  { key: 'mockGenFailRate', label: 'Failed generations', options: ['0', '0.1', '1'], fallback: '0.1' },
]

export function SettingsPage() {
  const reset = useResetDemo()
  const composer = useComposer()
  const { toast } = useUi()
  const [values, setValues] = useState(() => Object.fromEntries(KNOBS.map((k) => [k.key, localStorage.getItem(`artven:${k.key}`) ?? k.fallback])))

  return (
    <div className="mx-auto flex max-w-[600px] flex-col gap-5 px-5 pt-6">
      <div>
        <h1 className="text-section text-title">Settings</h1>
        <p className="mt-1 text-[13px] text-secondary">Account, billing and brand-kit settings are coming soon.</p>
      </div>

      <section className="flex flex-col gap-4 rounded-[20px] border border-white/[0.08] bg-bg p-5">
        <div>
          <h2 className="text-card-title text-white">Demo controls</h2>
          <p className="mt-1 text-xs text-tertiary">The backend is a mock running in your browser. Simulate a slow or flaky network here.</p>
        </div>
        {KNOBS.map((k) => (
          <div key={k.key} className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-white">{k.label}</span>
            <div className="flex gap-1 rounded-[20px] bg-container p-1">
              {k.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => {
                    localStorage.setItem(`artven:${k.key}`, o)
                    setValues((v) => ({ ...v, [k.key]: o }))
                  }}
                  className={values[k.key] === o ? 'h-7 rounded-2xl bg-white px-3 text-control text-bg-dark' : 'h-7 rounded-2xl px-3 text-control text-secondary hover:text-white'}
                >
                  {k.key === 'mockLatency' ? o : `${Math.round(Number(o) * 100)}%`}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="secondary" onClick={() => location.reload()}>
            Reload to apply
          </Button>
          <Button
            loading={reset.isPending}
            onClick={() =>
              reset.mutate(undefined, {
                onSuccess: () => {
                  composer.reset()
                  toast({ title: 'Demo data reset', description: 'Credits, bookmarks, profiles and results restored.', variant: 'success' })
                },
              })
            }
          >
            Reset demo data
          </Button>
        </div>
      </section>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <EmptyState icon="search" title="Page not found">
      The page you're looking for doesn't exist.
      <Link to="/" className="mt-4 inline-flex h-10 items-center rounded-3xl bg-white px-5 text-control text-bg-dark hover:bg-[#e6e6e6]">
        Back to Home
      </Link>
    </EmptyState>
  )
}
