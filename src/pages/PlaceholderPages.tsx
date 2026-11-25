import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Folder, MessageSquare, Settings, type LucideIcon } from 'lucide-react'
import { api } from '../api/client'
import type { Generation } from '../api/types'
import { useUi } from '../state/ui-context'

function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300">
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="mt-2 text-sm text-zinc-400">{children}</div>
      <Link to="/" className="mt-6 rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">
        Back to Home
      </Link>
    </div>
  )
}

export function ChatPage() {
  return (
    <EmptyState icon={MessageSquare} title="Chat">
      Conversations with the artven assistant will live here.
    </EmptyState>
  )
}

export function ResultsPage() {
  const { setHasNewResults } = useUi()
  const { data } = useQuery({
    queryKey: ['generations'],
    queryFn: () => api<{ items: Generation[] }>('/generations').then((r) => r.items),
  })
  useEffect(() => setHasNewResults(false), [setHasNewResults])
  return (
    <EmptyState icon={Folder} title="Results">
      {data?.length
        ? `${data.length} generation${data.length > 1 ? 's' : ''} queued. The results gallery is coming soon.`
        : 'Your generated images and videos will appear here.'}
    </EmptyState>
  )
}

export function SettingsPage() {
  return (
    <EmptyState icon={Settings} title="Settings">
      Account, billing and brand-kit settings are coming soon.
    </EmptyState>
  )
}

export function NotFoundPage() {
  return (
    <EmptyState icon={Folder} title="Page not found">
      The page you're looking for doesn't exist.
    </EmptyState>
  )
}
