import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, Play, RotateCcw, Trash2 } from 'lucide-react'
import { errorMessage } from '../api/client'
import { useDeleteGeneration, useGenerations, useMe } from '../api/queries'
import type { Generation } from '../api/types'
import { Icon } from '../components/ui/Icon'
import { Button, ErrorState, Modal } from '../components/ui/primitives'
import { cn } from '../lib/cn'
import { useComposer } from '../state/composer-context'
import { useUi } from '../state/ui-context'
import { EmptyState } from './PlaceholderPages'

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [active])
  return now
}

function GenerationCard({ g, now, onOpen }: { g: Generation; now: number; onOpen: () => void }) {
  const running = g.status === 'queued' || g.status === 'processing'
  const secondsLeft = Math.max(1, Math.ceil((Date.parse(g.finishesAt) - now) / 1000))
  const aspect = g.output ? `${g.output.width} / ${g.output.height}` : g.outputType === 'video' ? '9 / 16' : '4 / 5'

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-bg" style={{ aspectRatio: aspect }}>
      {g.status === 'done' && g.output ? (
        <button type="button" onClick={onOpen} aria-label="Open result" className="absolute inset-0 focus-visible:outline-none">
          {g.output.type === 'video' ? (
            <video src={g.output.url} poster={g.output.posterUrl} muted loop autoPlay playsInline className="size-full object-cover" />
          ) : (
            <img src={g.output.url} alt={g.prompt} loading="lazy" className="size-full object-cover" />
          )}
        </button>
      ) : running ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 skeleton p-4 text-center">
          <span className="text-2xl font-semibold text-white tabular-nums">{g.status === 'queued' ? '—' : `${g.progress}%`}</span>
          <span className="text-xs text-secondary">{g.status === 'queued' ? 'In queue…' : `About ${secondsLeft}s left`}</span>
          <div className="h-1 w-2/3 overflow-hidden rounded-full bg-container-2">
            <div className="h-full rounded-full bg-purple transition-[width] duration-500" style={{ width: `${g.progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1d1414] p-4 text-center">
          <span className="text-[13px] font-semibold text-danger">Generation failed</span>
          <span className="text-xs text-secondary">{g.error}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-2 bg-tile-caption px-3.5 pt-8 pb-3">
        <p className="line-clamp-2 flex-1 text-xs leading-4 text-white">{g.prompt}</p>
      </div>
      <span className="pointer-events-none absolute top-1.5 left-1.5 flex h-7 items-center gap-1 rounded-3xl bg-[rgb(55_55_55/0.8)] px-2.5 text-[11px] font-semibold text-white backdrop-blur-[10px]">
        {g.outputType === 'video' ? <Play className="size-3 fill-current" /> : null}
        {g.outputType === 'video' ? 'Video' : 'Image'}
      </span>
    </article>
  )
}

function ResultViewer({ g, onClose }: { g: Generation; onClose: () => void }) {
  const navigate = useNavigate()
  const composer = useComposer()
  const { toast, setHomeTab } = useUi()
  const remove = useDeleteGeneration()
  if (!g.output) return null
  return (
    <Modal open onClose={onClose} title={g.outputType === 'video' ? 'Video result' : 'Image result'} className="max-w-[880px]">
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="grid max-h-[65vh] place-items-center overflow-hidden rounded-2xl bg-bg-dark">
          {g.output.type === 'video' ? (
            <video src={g.output.url} poster={g.output.posterUrl} controls autoPlay loop playsInline className="max-h-[65vh] w-full object-contain" />
          ) : (
            <img src={g.output.url} alt={g.prompt} className="max-h-[65vh] w-full object-contain" />
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium text-tertiary">Prompt</p>
            <p className="mt-1 text-[13px] leading-5 text-white">{g.prompt}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-container p-2.5">
              <dt className="text-tertiary">Cost</dt>
              <dd className="mt-0.5 font-semibold text-white">
                {g.cost} credit{g.cost > 1 ? 's' : ''}
              </dd>
            </div>
            <div className="rounded-xl bg-container p-2.5">
              <dt className="text-tertiary">Size</dt>
              <dd className="mt-0.5 font-semibold text-white">
                {g.output.width}×{g.output.height}
              </dd>
            </div>
            <div className="rounded-xl bg-container p-2.5">
              <dt className="text-tertiary">References</dt>
              <dd className="mt-0.5 font-semibold text-white">{g.referenceCount}</dd>
            </div>
            <div className="rounded-xl bg-container p-2.5">
              <dt className="text-tertiary">Created</dt>
              <dd className="mt-0.5 font-semibold text-white">{new Date(g.createdAt).toLocaleTimeString('en-US', { timeStyle: 'short' })}</dd>
            </div>
          </dl>
          {g.templateTitle && <p className="text-xs text-tertiary">Template: {g.templateTitle}</p>}
          <div className="mt-auto flex flex-col gap-2">
            <Button
              onClick={() => {
                composer.setPrompt(g.prompt)
                composer.setOutputType(g.outputType)
                setHomeTab('chat')
                navigate('/')
              }}
            >
              <RotateCcw className="size-4" /> Reuse prompt
            </Button>
            <a
              href={g.output.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-3xl bg-container px-5 text-control text-white hover:bg-container-2"
            >
              <Download className="size-4" /> Open original
            </a>
            <Button
              variant="ghost"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(g.id, {
                  onSuccess: () => {
                    toast({ title: 'Result deleted' })
                    onClose()
                  },
                  onError: (e) => toast({ title: "Couldn't delete", description: errorMessage(e), variant: 'error' }),
                })
              }
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export function ResultsPage() {
  const { setHasNewResults, openDialog } = useUi()
  const { data: me } = useMe()
  const { data, isPending, isError, error, refetch } = useGenerations(!!me)
  const [openId, setOpenId] = useState<string | null>(null)
  const navigate = useNavigate()
  const running = data?.some((g) => g.status === 'queued' || g.status === 'processing') ?? false
  const now = useNow(running)

  useEffect(() => setHasNewResults(false), [setHasNewResults, data])

  if (me === null) {
    return (
      <EmptyState icon="results" title="Results">
        Log in to see your generations.
        <Button className="mt-4" onClick={() => openDialog('sign-in')}>
          Log in
        </Button>
      </EmptyState>
    )
  }
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} className="mx-5 py-16" />
  if (!isPending && !data.length) {
    return (
      <EmptyState icon="results" title="No results yet">
        Your generated images and videos will appear here.
        <Button className="mt-4" onClick={() => navigate('/')}>
          Create something
        </Button>
      </EmptyState>
    )
  }

  const open = data?.find((g) => g.id === openId)
  return (
    <div className="mx-auto max-w-[1680px] px-5">
      <div className="mb-3 flex h-8 items-center justify-between">
        <h1 className="text-section text-title">Results</h1>
        {running && (
          <span className="flex items-center gap-2 text-xs text-secondary">
            <span className="size-2 animate-pulse rounded-full bg-purple" /> Generating…
          </span>
        )}
      </div>
      <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5', isPending && 'opacity-60')}>
        {isPending
          ? Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[4/5] rounded-2xl skeleton" />)
          : data.map((g) => <GenerationCard key={g.id} g={g} now={now} onOpen={() => setOpenId(g.id)} />)}
      </div>
      {open && <ResultViewer g={open} onClose={() => setOpenId(null)} />}
      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-tertiary">
        <Icon name="token" size={16} className="text-purple" /> Failed generations are refunded automatically.
      </p>
    </div>
  )
}
