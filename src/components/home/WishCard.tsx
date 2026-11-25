import { memo, useEffect, useRef, useState } from 'react'
import { Bookmark, Play } from 'lucide-react'
import type { Wish } from '../../api/types'
import { cn } from '../../lib/cn'
import { useInView } from '../../lib/hooks'

interface Props {
  wish: Wish
  bookmarked: boolean
  onUse: (wish: Wish) => void
  onToggleBookmark: (wish: Wish, on: boolean) => void
}

function WishMedia({ wish }: { wish: Wish }) {
  const { media } = wish
  const ref = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const visible = useInView(ref, '100px')
  const [loaded, setLoaded] = useState(false)

  // Play videos only while on screen to keep the feed light.
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (visible) v.play().catch(() => {})
    else v.pause()
  }, [visible])

  return (
    <div ref={ref} className="absolute inset-0">
      {media.posterUrl && (
        <img src={media.posterUrl} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover blur-xl" />
      )}
      {media.type === 'video' ? (
        <video
          ref={video}
          src={media.url}
          poster={media.posterUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
        />
      ) : (
        <img
          src={media.url}
          alt={wish.title}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'absolute inset-0 size-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03]',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  )
}

export const WishCard = memo(function WishCard({ wish, bookmarked, onUse, onToggleBookmark }: Props) {
  return (
    <article
      className="group relative overflow-hidden rounded-xl bg-zinc-900 ring-white/40 has-[button:focus-visible]:ring-2"
      style={{ aspectRatio: `${wish.media.width} / ${wish.media.height}` }}
    >
      <button
        type="button"
        onClick={() => onUse(wish)}
        aria-label={`Use “${wish.title}” template`}
        className="absolute inset-0 focus-visible:outline-none"
      >
        <WishMedia wish={wish} />
        <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <span className="absolute right-12 bottom-2.5 left-3 truncate text-left text-[13px] font-semibold text-white">{wish.title}</span>
        <span className="absolute right-2.5 bottom-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black opacity-0 transition-opacity group-hover:opacity-100">
          Use
        </span>
      </button>

      {wish.media.type === 'video' && (
        <span className="pointer-events-none absolute top-2.5 left-2.5 grid size-6 place-items-center rounded-md bg-black/50 text-white backdrop-blur">
          <Play className="size-3 fill-current" />
        </span>
      )}

      <button
        type="button"
        onClick={() => onToggleBookmark(wish, !bookmarked)}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? `Remove “${wish.title}” from saved` : `Save “${wish.title}”`}
        className={cn(
          'absolute top-2 right-2 grid size-7 place-items-center rounded-lg border backdrop-blur-md transition-colors',
          bookmarked
            ? 'border-white bg-white text-black'
            : 'border-white/15 bg-black/45 text-white hover:bg-black/70',
        )}
      >
        <Bookmark className={cn('size-3.5', bookmarked && 'fill-current')} />
      </button>
    </article>
  )
})
