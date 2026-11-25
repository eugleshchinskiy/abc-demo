import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { UiContext, type Toast, type UiContextValue } from './ui-context'

const RESULTS_FLAG = 'artven:has-new-results'

export function UiProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [homeTab, setHomeTab] = useState<'chat' | 'tools'>('chat')
  const [hasNewResults, setHasNewResultsState] = useState(() => localStorage.getItem(RESULTS_FLAG) === '1')
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const setHasNewResults = useCallback((value: boolean) => {
    localStorage.setItem(RESULTS_FLAG, value ? '1' : '0')
    setHasNewResultsState(value)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<UiContextValue['toast']>(
    ({ variant = 'default', ...rest }) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-3), { id, variant, ...rest }])
      window.setTimeout(() => dismissToast(id), variant === 'error' ? 6000 : 4000)
    },
    [dismissToast],
  )

  // ⌘K / Ctrl+K opens the (placeholder) global search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo<UiContextValue>(
    () => ({
      searchOpen,
      setSearchOpen,
      upgradeOpen,
      setUpgradeOpen,
      hasNewResults,
      setHasNewResults,
      homeTab,
      setHomeTab,
      toasts,
      toast,
      dismissToast,
    }),
    [searchOpen, upgradeOpen, hasNewResults, setHasNewResults, homeTab, toasts, toast, dismissToast],
  )

  return <UiContext value={value}>{children}</UiContext>
}
