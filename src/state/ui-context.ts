import { createContext, useContext } from 'react'

export type ToastVariant = 'default' | 'success' | 'error'

export interface Toast {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

export interface UiContextValue {
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  upgradeOpen: boolean
  setUpgradeOpen: (open: boolean) => void
  hasNewResults: boolean
  setHasNewResults: (value: boolean) => void
  homeTab: 'chat' | 'tools'
  setHomeTab: (tab: 'chat' | 'tools') => void
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
