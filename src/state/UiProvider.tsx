import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { UNAUTHORIZED_EVENT } from '../api/client'
import { DEFAULT_WISH_FILTERS, UiContext, type DialogId, type HomeTab, type Toast, type UiContextValue, type WishFilters } from './ui-context'

const RESULTS_FLAG = 'artven:has-new-results'

export function UiProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogId | null>(null)
  const [homeTab, setHomeTab] = useState<HomeTab>('chat')
  const [hasNewResults, setHasNewResultsState] = useState(() => localStorage.getItem(RESULTS_FLAG) === '1')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [wishFilters, setWishFiltersState] = useState<WishFilters>(DEFAULT_WISH_FILTERS)
  const setWishFilters = useCallback((patch: Partial<WishFilters>) => setWishFiltersState((f) => ({ ...f, ...patch })), [])
  const nextId = useRef(1)

  const openDialog = useCallback((id: DialogId) => setDialog(id), [])
  const closeDialog = useCallback(() => setDialog(null), [])

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
      window.setTimeout(() => dismissToast(id), variant === 'error' || rest.action ? 6000 : 4000)
    },
    [dismissToast],
  )

  useEffect(() => {
    // ⌘K / Ctrl+K opens the global search.
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setDialog('search')
      }
    }
    // Any 401 from the API asks the user to sign in.
    const onUnauthorized = () => setDialog('sign-in')
    window.addEventListener('keydown', onKey)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }
  }, [])

  const value = useMemo<UiContextValue>(
    () => ({
      dialog,
      openDialog,
      closeDialog,
      hasNewResults,
      setHasNewResults,
      homeTab,
      setHomeTab,
      wishFilters,
      setWishFilters,
      toasts,
      toast,
      dismissToast,
    }),
    [dialog, openDialog, closeDialog, hasNewResults, setHasNewResults, homeTab, wishFilters, setWishFilters, toasts, toast, dismissToast],
  )

  return <UiContext value={value}>{children}</UiContext>
}
