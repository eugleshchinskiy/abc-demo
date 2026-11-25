import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useIdeas } from '../../api/queries'
import type { Idea } from '../../api/types'
import { cn } from '../../lib/cn'
import { ErrorState } from '../ui/primitives'
import { useApplyTemplate } from './useApplyTemplate'

function IdeaCard({ idea, onUse }: { idea: Idea; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      aria-label={`Use “${idea.title}” — ${idea.description}`}
      className="group relative flex w-[300px] shrink-0 snap-start items-center gap-4 rounded-2xl border border-white/[0.08] bg-[linear-gradient(120deg,#2a2a2d_0%,#1c1c1e_60%)] p-2 pr-12 text-left transition-colors hover:border-white/20 focus-visible:border-white/40 focus-visible:outline-none sm:w-[340px]"
    >
      <img
        src={idea.thumbnailUrl}
        alt=""
        loading="lazy"
        className="size-[84px] shrink-0 rounded-xl bg-zinc-800 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-white">{idea.title}</span>
        <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-400">{idea.description}</span>
      </span>
      <span
        aria-hidden
        className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-200 transition-colors group-hover:bg-white group-hover:text-black"
      >
        <Plus className="size-4" />
      </span>
    </button>
  )
}

function IdeaSkeleton() {
  return (
    <div className="flex w-[300px] shrink-0 items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2 sm:w-[340px]">
      <div className="size-[84px] animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3 w-36 animate-pulse rounded bg-white/[0.05]" />
      </div>
    </div>
  )
}

export function IdeasSection() {
  const [seed, setSeed] = useState(0)
  const { data, isPending, isFetching, isError, error, refetch } = useIdeas(seed)
  const apply = useApplyTemplate()
  const scroller = useRef<HTMLDivElement>(null)

  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 360, behavior: 'smooth' })

  return (
    <section aria-labelledby="ideas-title" className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="ideas-title" className="text-lg font-semibold text-white">
          Ideas for You
        </h2>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Scroll ideas left" className="hidden size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white md:grid">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Scroll ideas right" className="hidden size-8 place-items-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white md:grid">
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSeed((s) => s + 1)
              scroller.current?.scrollTo({ left: 0, behavior: 'smooth' })
            }}
            disabled={isFetching}
            aria-label="Refresh ideas"
            title="Show other ideas"
            className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 transition-colors hover:bg-white/10"
          >
            <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isError && !data ? (
        <ErrorState message={`Couldn't load ideas. ${errorMessage(error)}`} onRetry={() => void refetch()} className="h-[102px]" />
      ) : (
        <div
          ref={scroller}
          className={cn(
            'no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 transition-opacity [mask-image:linear-gradient(to_right,black_calc(100%-64px),transparent)]',
            isFetching && data && 'opacity-60',
          )}
        >
          {isPending
            ? Array.from({ length: 5 }, (_, i) => <IdeaSkeleton key={i} />)
            : data?.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onUse={() =>
                    apply({
                      ref: { source: 'idea', id: idea.id },
                      title: idea.title,
                      thumbnailUrl: idea.thumbnailUrl,
                      prompt: idea.prompt,
                      outputType: idea.outputType,
                    })
                  }
                />
              ))}
          <div aria-hidden className="w-12 shrink-0" />
        </div>
      )}
    </section>
  )
}
