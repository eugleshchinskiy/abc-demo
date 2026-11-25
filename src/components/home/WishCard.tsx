import { memo, useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import type { Wish } from '../../api/types'
import { cn } from '../../lib/cn'
import { useInView } from '../../lib/hooks'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/primitives'

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
    <div ref={ref} className="absolute inset-0 bg-bg">
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
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  )
}

/** Figma "Tile Wishes": preview fills the tile, Save on top, caption at the bottom, Use on hover. */
export const WishCard = memo(function WishCard({ wish, bookmarked, onUse, onToggleBookmark }: Props) {
  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-bg ring-purple/70 has-[button:focus-visible]:ring-2"
      style={{ aspectRatio: `${wish.media.width} / ${wish.media.height}` }}
    >
      <button
        type="button"
        onClick={() => onUse(wish)}
        aria-label={`Use “${wish.title}” template`}
        className="absolute inset-0 focus-visible:outline-none"
      >
        <WishMedia wish={wish} />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-tile-caption px-1.5 py-4">
          <span className="truncate px-2 text-left text-control text-white">{wish.title}</span>
          <span className="-my-2 flex h-8 shrink-0 items-center rounded-3xl bg-white px-3 text-control text-bg-dark opacity-0 transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100">
            Use
          </span>
        </span>
      </button>

      {wish.media.type === 'video' && (
        <span className="pointer-events-none absolute top-1.5 left-1.5 grid size-8 place-items-center rounded-full bg-[rgb(55_55_55/0.8)] text-white backdrop-blur-[10px]" title="Video template">
          <Play className="size-3.5 fill-current" />
        </span>
      )}

      {/* Figma "Save controls" */}
      <div className="absolute top-0 right-0 p-1.5">
        <IconButton
          tone="glass"
          label={bookmarked ? `Remove “${wish.title}” from saved` : `Save “${wish.title}”`}
          aria-pressed={bookmarked}
          onClick={() => onToggleBookmark(wish, !bookmarked)}
        >
          <Icon name={bookmarked ? 'saved-filled' : 'saved'} className={bookmarked ? 'text-purple' : 'text-white'} />
        </IconButton>
      </div>
    </article>
  )
})
