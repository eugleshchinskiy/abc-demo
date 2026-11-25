import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useBookmarks, useToggleBookmark, useWishCategories, useWishes } from '../../api/queries'
import type { Wish } from '../../api/types'
import { cn } from '../../lib/cn'
import { useDebouncedValue, useElementWidth, useInView } from '../../lib/hooks'
import { useUi } from '../../state/ui-context'
import { ErrorState, Spinner } from '../ui/primitives'
import { useApplyTemplate } from './useApplyTemplate'
import { WishCard } from './WishCard'

const SKELETON_ASPECTS = [1.75, 1.22, 1.5, 1.3, 1.68, 1.2, 1.42, 1.6]

function columnCountFor(width: number) {
  if (width >= 1100) return 5
  if (width >= 840) return 4
  if (width >= 560) return 3
  return 2
}

/**
 * Greedy "shortest column first" masonry. Placement of earlier items never
 * changes when new pages are appended, so infinite scroll doesn't reshuffle.
 */
function distribute(items: Wish[], columns: number): Wish[][] {
  const cols = Array.from({ length: columns }, () => ({ height: 0, items: [] as Wish[] }))
  for (const item of items) {
    let target = cols[0]
    for (const col of cols) if (col.height < target.height - 1e-6) target = col
    target.items.push(item)
    target.height += item.media.height / item.media.width + 0.04
  }
  return cols.map((c) => c.items)
}

function WishGrid({ category, q }: { category: string; q: string }) {
  const container = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const width = useElementWidth(container)
  const columns = columnCountFor(width || 1200)
  const nearBottom = useInView(sentinel, '1200px 0px')

  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useWishes(category, q)
  const { data: bookmarks } = useBookmarks()
  const { mutate: toggleBookmark } = useToggleBookmark()
  const applyTemplate = useApplyTemplate()
  const { toast } = useUi()

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data])
  const grid = useMemo(() => distribute(items, columns), [items, columns])

  useEffect(() => {
    if (nearBottom && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage()
  }, [nearBottom, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const onUse = useCallback(
    (wish: Wish) =>
      applyTemplate({
        ref: { source: 'wish', id: wish.id },
        title: wish.title,
        media: wish.media,
        thumbnailUrl: wish.media.posterUrl,
        prompt: wish.prompt,
        outputType: wish.outputType,
      }),
    [applyTemplate],
  )

  const onToggleBookmark = useCallback(
    (wish: Wish, on: boolean) =>
      toggleBookmark(
        { id: wish.id, on },
        { onError: (e) => toast({ title: "Couldn't update saved items", description: errorMessage(e), variant: 'error' }) },
      ),
    [toggleBookmark, toast],
  )

  let body: ReactNode
  if (isPending) {
    body = (
      <div className="flex gap-3" aria-busy="true" aria-label="Loading wishes">
        {Array.from({ length: columns }, (_, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col gap-3">
            {Array.from({ length: 3 }, (_, r) => (
              <div
                key={r}
                className="animate-pulse rounded-xl bg-white/[0.05]"
                style={{ aspectRatio: `1 / ${SKELETON_ASPECTS[(c * 3 + r) % SKELETON_ASPECTS.length]}` }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  } else if (isError && items.length === 0) {
    body = <ErrorState message={`Couldn't load wishes. ${errorMessage(error)}`} onRetry={() => void refetch()} className="py-16" />
  } else if (items.length === 0) {
    body = (
      <div className="rounded-2xl border border-white/[0.06] py-16 text-center text-sm text-zinc-500">
        {q ? <>No wishes match “{q}”. Try another word or category.</> : 'Nothing here yet.'}
      </div>
    )
  } else {
    body = (
      <div className="flex gap-3">
        {grid.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col gap-3">
            {col.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                bookmarked={bookmarks?.has(wish.id) ?? false}
                onUse={onUse}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={container}>
      {body}
      <div ref={sentinel} aria-hidden className="h-px" />
      <div className="flex h-16 items-center justify-center text-sm text-zinc-500">
        {isFetchingNextPage && <Spinner className="size-5 text-zinc-400" />}
        {isFetchNextPageError && (
          <button type="button" onClick={() => void fetchNextPage()} className="rounded-full border border-white/10 px-4 py-1.5 text-zinc-300 hover:bg-white/10">
            Couldn't load more — retry
          </button>
        )}
        {!isPending && !hasNextPage && items.length > 0 && <span>You've reached the end ✦</span>}
      </div>
    </div>
  )
}

export function WishesSection() {
  const { data: categories } = useWishCategories()
  const [category, setCategory] = useState('for-you')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim(), 300)
  const searchInput = useRef<HTMLInputElement>(null)
  const sectionTop = useRef<HTMLElement>(null)

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  const closeSearch = () => {
    setQuery('')
    setSearchOpen(false)
  }

  const selectCategory = (id: string) => {
    setCategory(id)
    // Keep the tabs in view when switching from deep in the feed.
    const top = sectionTop.current?.getBoundingClientRect().top ?? 0
    if (top < 0) sectionTop.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section ref={sectionTop} aria-labelledby="wishes-title" className="mt-9 scroll-mt-16">
      <h2 id="wishes-title" className="mb-3 text-lg font-semibold text-white">
        Wishes
      </h2>

      <div className="sticky top-16 z-20 -mx-4 mb-4 flex items-center gap-3 bg-black/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div role="tablist" aria-label="Wish categories" className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {(categories ?? [{ id: 'for-you', label: 'For you' }]).map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === category}
              onClick={() => selectCategory(c.id)}
              className={cn(
                'h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                c.id === category ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/[0.08] hover:text-white',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {searchOpen ? (
          <div className="flex h-9 w-56 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 sm:w-64">
            <Search className="size-4 shrink-0 text-zinc-400" />
            <input
              ref={searchInput}
              value={query}
              maxLength={100}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
              placeholder="Search wishes…"
              aria-label="Search wishes"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
            <button type="button" onClick={closeSearch} aria-label="Close search" className="text-zinc-400 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search wishes"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.08] text-zinc-200 transition-colors hover:bg-white/15"
          >
            <Search className="size-4" />
          </button>
        )}
      </div>

      <WishGrid key={`${category}:${debounced}`} category={category} q={debounced} />
    </section>
  )
}
