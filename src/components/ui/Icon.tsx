import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'

import add from '../../assets/icons/add.svg'
import adjustments from '../../assets/icons/adjustments.svg'
import chat from '../../assets/icons/chat.svg'
import chevronDown from '../../assets/icons/chevron-down.svg'
import chevronRight from '../../assets/icons/chevron-right.svg'
import close from '../../assets/icons/close.svg'
import faq from '../../assets/icons/faq.svg'
import home from '../../assets/icons/home.svg'
import credits from '../../assets/icons/menu-credits.svg'
import signOut from '../../assets/icons/menu-signout.svg'
import subscription from '../../assets/icons/menu-subscription.svg'
import support from '../../assets/icons/menu-support.svg'
import terms from '../../assets/icons/menu-terms.svg'
import profile from '../../assets/icons/profile.svg'
import repeat from '../../assets/icons/repeat.svg'
import results from '../../assets/icons/results.svg'
import saved from '../../assets/icons/saved.svg'
import savedFilled from '../../assets/icons/saved-filled.svg'
import search from '../../assets/icons/search.svg'
import send from '../../assets/icons/send.svg'
import settings from '../../assets/icons/settings.svg'
import token from '../../assets/icons/token.svg'
import toolImageEdit from '../../assets/icons/tool-image-edit.svg'
import toolImageGenerate from '../../assets/icons/tool-image-generate.svg'
import toolLipsync from '../../assets/icons/tool-lipsync.svg'
import toolMotionSwap from '../../assets/icons/tool-motion-swap.svg'
import toolVideoExtend from '../../assets/icons/tool-video-extend.svg'
import toolVideos from '../../assets/icons/tool-videos.svg'

/** Icons exported from the Figma "Icons" / "Tools Icons" components. */
const ICONS = {
  add,
  adjustments,
  chat,
  'chevron-down': chevronDown,
  'chevron-right': chevronRight,
  close,
  credits,
  faq,
  home,
  profile,
  repeat,
  results,
  saved,
  'saved-filled': savedFilled,
  search,
  send,
  settings,
  'sign-out': signOut,
  subscription,
  support,
  terms,
  token,
  'tool-image-edit': toolImageEdit,
  'tool-image-generate': toolImageGenerate,
  'tool-lipsync': toolLipsync,
  'tool-motion-swap': toolMotionSwap,
  'tool-video-extend': toolVideoExtend,
  'tool-videos': toolVideos,
} as const

export type IconName = keyof typeof ICONS

/**
 * Renders a Figma icon as a CSS mask filled with `currentColor`, so states
 * (Figma "Selected" on/off, hover, disabled) are just text colors.
 * Size defaults to the Figma 20×20 slot; tool icons use 32.
 */
export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const url = `url("${ICONS[name]}")`
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        width: size,
        height: size,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        ...style,
      }}
    />
  )
}
