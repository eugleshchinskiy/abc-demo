import { createContext, useContext } from 'react'
import type { ContentType } from '../api/types'

export type ToastVariant = 'default' | 'success' | 'error'

export interface Toast {
  id: number
  title: string
  description?: string
  variant: ToastVariant
  action?: { label: string; onClick: () => void }
}

export type DialogId =
  | 'search'
  | 'subscription'
  | 'profile'
  | 'account'
  | 'credits'
  | 'support'
  | 'terms'
  | 'sign-in'

export type HomeTab = 'chat' | 'tools'

/** What the Wishes feed shows. Set by the tabs, global search and Smart Search. */
export interface WishFilters {
  category: string
  q: string
  types: ContentType[]
  profileId: string | null
}

export const DEFAULT_WISH_FILTERS: WishFilters = { category: 'for-you', q: '', types: [], profileId: null }

export interface UiContextValue {
  dialog: DialogId | null
  openDialog: (id: DialogId) => void
  closeDialog: () => void
  hasNewResults: boolean
  setHasNewResults: (value: boolean) => void
  homeTab: HomeTab
  setHomeTab: (tab: HomeTab) => void
  wishFilters: WishFilters
  setWishFilters: (patch: Partial<WishFilters>) => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id' | 'variant'> & { variant?: ToastVariant }) => void
  dismissToast: (id: number) => void
}

export const UiContext = createContext<UiContextValue | null>(null)

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>')
  return ctx
}
