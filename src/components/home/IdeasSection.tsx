import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import { useIdeas } from '../../api/queries'
import type { Idea } from '../../api/types'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'
import { ErrorState, IconButton } from '../ui/primitives'
import { useApplyTemplate } from './useApplyTemplate'

/** Figma "Ideas for You" card: 320×100, 90px preview, + button top-right. */
function IdeaCard({ idea, onUse }: { idea: Idea; onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      aria-label={`Use “${idea.title}” — ${idea.description}`}
      className="group relative flex h-[100px] w-[320px] shrink-0 snap-start items-center gap-4 rounded-[20px] border border-line bg-idea-card p-1 pr-9 text-left transition-colors hover:border-[#5a5a5a] focus-visible:border-purple focus-visible:outline-none"
    >
      <img
        src={idea.thumbnailUrl}
        alt=""
        loading="lazy"
        className="size-[90px] shrink-0 rounded-2xl bg-container object-cover"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-card-title text-white">{idea.title}</span>
        <span className="truncate text-card-body text-secondary">{idea.description}</span>
      </span>
      <span
        aria-hidden
        className="absolute top-1.5 right-2 grid size-8 place-items-center rounded-full bg-container-2 text-white transition-colors group-hover:bg-white group-hover:text-bg-dark"
      >
        <Icon name="add" />
      </span>
    </button>
  )
}

function IdeaSkeleton() {
  return (
    <div className="flex h-[100px] w-[320px] shrink-0 items-center gap-4 rounded-[20px] border border-container p-1">
      <div className="size-[90px] rounded-2xl skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-24 rounded skeleton" />
        <div className="h-3 w-36 rounded skeleton" />
      </div>
    </div>
  )
}

export function IdeasSection() {
  const [seed, setSeed] = useState(0)
  const { data, isPending, isFetching, isError, error, refetch } = useIdeas(seed)
  const apply = useApplyTemplate()
  const scroller = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(true)

  // The right fade (Figma "Scroll/Right Fade") only shows while there's more to scroll.
  const updateFade = () => {
    const el = scroller.current
    if (el) setMore(el.scrollWidth - el.scrollLeft - el.clientWidth > 4)
  }
  useEffect(updateFade, [data])

  return (
    <section aria-labelledby="ideas-title" className="mt-7 flex flex-col gap-3 px-5">
      <div className="flex h-8 items-center gap-2.5">
        <h2 id="ideas-title" className="flex-1 text-section text-title">
          Ideas for You
        </h2>
        <IconButton
          label="Show other ideas"
          onClick={() => {
            setSeed((s) => s + 1)
            scroller.current?.scrollTo({ left: 0, behavior: 'smooth' })
          }}
          disabled={isFetching}
        >
          <Icon name="repeat" className={cn('text-white', isFetching && 'animate-spin [animation-direction:reverse]')} />
        </IconButton>
      </div>

      {isError && !data ? (
        <ErrorState message={`Couldn't load ideas. ${errorMessage(error)}`} onRetry={() => void refetch()} className="h-[100px]" />
      ) : (
        <div className="relative">
          <div
            ref={scroller}
            onScroll={updateFade}
            className={cn('no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto transition-opacity', isFetching && data && 'opacity-60')}
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
          </div>
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 w-[100px] bg-gradient-to-r from-transparent to-bg-dark transition-opacity',
              more ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
      )}
    </section>
  )
}
