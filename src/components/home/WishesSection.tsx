import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { errorMessage } from '../../api/client'
import { useBookmarks, useMe, useProfiles, useToggleBookmark, useWishCategories, useWishes } from '../../api/queries'
import { CONTENT_TYPES, type ContentType, type Wish } from '../../api/types'
import { cn } from '../../lib/cn'
import { useElementWidth, useInView } from '../../lib/hooks'
import { DEFAULT_WISH_FILTERS, useUi } from '../../state/ui-context'
import { Icon } from '../ui/Icon'
import { Button, ErrorState, IconButton, Segment, Spinner } from '../ui/primitives'
import { SmartSearchDialog } from './SmartSearchDialog'
import { useApplyTemplate } from './useApplyTemplate'
import { WishCard } from './WishCard'

const SKELETON_HEIGHTS = [406, 280, 406, 320, 406, 320, 280, 406]
const GAP = 8

function columnCountFor(width: number) {
  if (width >= 1500) return 6
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
    target.height += item.media.height / item.media.width + 0.035
  }
  return cols.map((c) => c.items)
}

function WishGrid({ category, q, types, onClearFilters }: { category: string; q: string; types: ContentType[]; onClearFilters?: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const sentinel = useRef<HTMLDivElement>(null)
  const width = useElementWidth(container)
  const columns = columnCountFor(width || 1176)
  const nearBottom = useInView(sentinel, '1200px 0px')

  const { data, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } =
    useWishes(category, q, types)
  const { data: me } = useMe()
  const { data: bookmarks } = useBookmarks()
  const { mutate: toggleBookmark } = useToggleBookmark()
  const applyTemplate = useApplyTemplate()
  const { toast, openDialog } = useUi()

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
    (wish: Wish, on: boolean) => {
      if (me === null) {
        openDialog('sign-in')
        return
      }
      toggleBookmark(
        { id: wish.id, on },
        {
          onSuccess: () => on && toast({ title: 'Saved to your wishes', description: wish.title }),
          onError: (e) => toast({ title: "Couldn't update saved items", description: errorMessage(e), variant: 'error' }),
        },
      )
    },
    [me, openDialog, toggleBookmark, toast],
  )

  let body: ReactNode
  if (isPending) {
    body = (
      <div className="flex" style={{ gap: GAP }} aria-busy="true" aria-label="Loading wishes">
        {Array.from({ length: columns }, (_, c) => (
          <div key={c} className="flex min-w-0 flex-1 flex-col" style={{ gap: GAP }}>
            {Array.from({ length: 3 }, (_, r) => (
              <div key={r} className="rounded-2xl skeleton" style={{ aspectRatio: `228.8 / ${SKELETON_HEIGHTS[(c * 3 + r) % SKELETON_HEIGHTS.length]}` }} />
            ))}
          </div>
        ))}
      </div>
    )
  } else if (isError && items.length === 0) {
    body = <ErrorState message={`Couldn't load wishes. ${errorMessage(error)}`} onRetry={() => void refetch()} className="py-16" />
  } else if (items.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[20px] border border-white/[0.06] py-16 text-center text-[13px] text-tertiary">
        {q || types.length ? 'No wishes match these filters.' : 'Nothing here yet.'}
        {onClearFilters && (
          <Button variant="secondary" className="h-8" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    )
  } else {
    body = (
      <div className="flex" style={{ gap: GAP }}>
        {grid.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col" style={{ gap: GAP }}>
            {col.map((wish) => (
              <WishCard key={wish.id} wish={wish} bookmarked={bookmarks?.has(wish.id) ?? false} onUse={onUse} onToggleBookmark={onToggleBookmark} />
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
      <div className="flex h-16 items-center justify-center text-[13px] text-tertiary">
        {isFetchingNextPage && <Spinner className="size-5 text-tertiary" />}
        {isFetchNextPageError && (
          <Button variant="secondary" className="h-8" onClick={() => void fetchNextPage()}>
            Couldn't load more — retry
          </Button>
        )}
        {!isPending && !hasNextPage && items.length > 0 && <span>You've reached the end ✦</span>}
      </div>
    </div>
  )
}

function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="flex h-7 items-center gap-1 rounded-3xl bg-purple-dark pr-1 pl-3 text-xs font-semibold text-purple">
      {children}
      <button type="button" onClick={onRemove} aria-label="Remove filter" className="grid size-5 place-items-center rounded-full hover:bg-white/10">
        <Icon name="close" size={14} />
      </button>
    </span>
  )
}

export function WishesSection() {
  const { data: categories } = useWishCategories()
  const { data: profiles } = useProfiles()
  const { wishFilters: f, setWishFilters } = useUi()
  const [smartOpen, setSmartOpen] = useState(false)
  const sectionTop = useRef<HTMLElement>(null)
  const tabs = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const profile = profiles?.find((p) => p.id === f.profileId)
  const hasFilters = !!(f.q || f.types.length || profile)

  // Shadow under the sticky header only once it actually sticks.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { rootMargin: '-57px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Keep the selected tab visible (e.g. after Smart Search switched category).
  // Only the tab strip scrolls (horizontally) — never the page.
  useEffect(() => {
    const strip = tabs.current
    const tab = strip?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!strip || !tab) return
    const left = tab.offsetLeft - strip.offsetLeft
    const right = left + tab.offsetWidth
    const visibleRight = strip.scrollLeft + strip.clientWidth - 96 // keep clear of the fade + search button
    if (left < strip.scrollLeft) strip.scrollTo({ left: left - 8, behavior: 'smooth' })
    else if (right > visibleRight) strip.scrollTo({ left: right - strip.clientWidth + 104, behavior: 'smooth' })
  }, [f.category, categories])

  const scrollToFeed = () => {
    const top = sectionTop.current?.getBoundingClientRect().top ?? 0
    if (top < 0) sectionTop.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const selectCategory = (id: string) => {
    // Picking another category drops the product profile that implied one.
    setWishFilters({ category: id, profileId: profile && profile.categoryId !== id ? null : f.profileId })
    scrollToFeed()
  }

  const clearFilters = () => setWishFilters({ ...DEFAULT_WISH_FILTERS, category: f.category })

  return (
    <section id="wishes" ref={sectionTop} aria-labelledby="wishes-title" className="mt-7 scroll-mt-14">
      <div ref={sentinel} aria-hidden />
      {/* Figma "Frame 35": title + segments, sticky under the app header */}
      <div className="sticky top-14 z-20 flex flex-col gap-3 bg-bg-dark px-5">
        <div className="flex h-8 items-center">
          <h2 id="wishes-title" className="flex-1 text-section text-title">
            Wishes
          </h2>
        </div>
        <div className="relative">
          <div ref={tabs} role="tablist" aria-label="Wish categories" className="no-scrollbar flex gap-1 overflow-x-auto pr-24">
            {(categories ?? [{ id: 'for-you', label: 'For you' }]).map((c) => (
              <Segment key={c.id} role="tab" aria-selected={c.id === f.category} selected={c.id === f.category} onClick={() => selectCategory(c.id)}>
                {c.label}
              </Segment>
            ))}
          </div>
          <div aria-hidden className="pointer-events-none absolute top-0 right-8 h-8 w-[60px] bg-gradient-to-r from-transparent to-bg-dark" />
          <div className="absolute top-0 right-0 flex h-8 w-14 justify-end bg-bg-dark pr-1.5">
            <IconButton
              label="Smart Search"
              tone="line"
              aria-haspopup="dialog"
              onClick={() => setSmartOpen(true)}
              className="relative"
            >
              <Icon name="search" className="text-white" />
              {hasFilters && <span className="absolute top-0 right-0 size-2.5 rounded-full border-2 border-bg-dark bg-purple" aria-label="filters active" />}
            </IconButton>
          </div>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {profile && (
              <FilterChip onRemove={() => setWishFilters({ profileId: null, category: 'for-you' })}>
                <img src={profile.imageUrl} alt="" className="-ml-2 size-5 rounded-full object-cover" />
                {profile.name}
              </FilterChip>
            )}
            {f.types.map((t) => (
              <FilterChip key={t} onRemove={() => setWishFilters({ types: f.types.filter((x) => x !== t) })}>
                {CONTENT_TYPES.find((c) => c.id === t)?.label}
              </FilterChip>
            ))}
            {f.q && <FilterChip onRemove={() => setWishFilters({ q: '' })}>“{f.q}”</FilterChip>}
            <button type="button" onClick={clearFilters} className="text-xs font-semibold text-tertiary hover:text-white">
              Clear all
            </button>
          </div>
        )}
        {/* Figma "Wishes/Segments Divider" — fades content scrolling under the header */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 top-full h-2 bg-gradient-to-b from-bg-dark to-transparent transition-opacity',
            stuck ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>

      <div className="mt-3 px-5">
        <WishGrid
          key={`${f.category}:${f.q}:${f.types.join(',')}`}
          category={f.category}
          q={f.q}
          types={f.types}
          onClearFilters={hasFilters ? clearFilters : undefined}
        />
      </div>

      {smartOpen && <SmartSearchDialog onClose={() => setSmartOpen(false)} />}
    </section>
  )
}
