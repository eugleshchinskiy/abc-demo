import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { useTools } from '../../api/queries'
import type { Tool, ToolIcon } from '../../api/types'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../ui/Icon'
import { ErrorState, Segment } from '../ui/primitives'
import { useApplyTemplate } from './useApplyTemplate'

const ICONS: Record<ToolIcon, IconName> = {
  'image-generate': 'tool-image-generate',
  'image-edit': 'tool-image-edit',
  videos: 'tool-videos',
  'video-extend': 'tool-video-extend',
  'motion-swap': 'tool-motion-swap',
  lipsync: 'tool-lipsync',
}

const FILTERS = [
  { id: 'popular', label: 'Popular', match: (t: Tool) => t.popular },
  { id: 'image', label: 'Image', match: (t: Tool) => t.category === 'image' },
  { id: 'video', label: 'Video', match: (t: Tool) => t.category === 'video' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

/** Figma "ToolsBar". */
export function ToolsPanel() {
  const { data, isPending, isError, error, refetch } = useTools()
  const apply = useApplyTemplate()
  const [filter, setFilter] = useState<FilterId>('popular')
  const list = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState(false)

  const tools = data?.filter(FILTERS.find((f) => f.id === filter)!.match) ?? []

  // Bottom fade only while there is more to scroll.
  const updateFade = () => {
    const el = list.current
    if (el) setFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }
  useEffect(() => {
    list.current?.scrollTo({ top: 0 })
    updateFade()
  }, [filter, data])

  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} className="w-full max-w-[786px]" />

  return (
    <div className="flex w-full max-w-[786px] flex-col gap-4 overflow-hidden rounded-[20px] bg-bg p-3">
      <div role="tablist" aria-label="Tool categories" className="flex items-center justify-center gap-2">
        {FILTERS.map((f) => (
          <Segment key={f.id} role="tab" aria-selected={filter === f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Segment>
        ))}
      </div>

      <div className="relative">
        <div ref={list} onScroll={updateFade} className="no-scrollbar grid max-h-[216px] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 sm:gap-x-4">
          {isPending
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex h-16 items-center gap-4 p-1">
                  <div className="size-14 rounded-xl skeleton" />
                  <div className="h-3.5 w-28 rounded skeleton" />
                </div>
              ))
            : tools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() =>
                    apply({ ref: { source: 'tool', id: tool.id }, title: tool.title, prompt: tool.prompt, outputType: tool.outputType })
                  }
                  className="group flex h-16 items-center justify-between rounded-xl p-1 text-left transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-control transition-colors group-hover:bg-container-2">
                      <Icon name={ICONS[tool.icon]} size={32} className="text-white" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-card-title text-white">{tool.title}</span>
                      <span className="truncate text-card-body text-secondary">{tool.description}</span>
                    </span>
                  </span>
                  <span className="grid size-[30px] shrink-0 place-items-center text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-white">
                    <Icon name="chevron-right" size={17} />
                  </span>
                </button>
              ))}
        </div>
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-bg transition-opacity',
            fade ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    </div>
  )
}
