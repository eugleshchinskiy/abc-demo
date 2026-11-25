import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys, useGenerations, useMe } from '../../api/queries'
import type { GenerationStatus } from '../../api/types'
import { useUi } from '../../state/ui-context'

/**
 * Watches running generations app-wide: toasts when one finishes or fails,
 * marks Results as unread and refreshes the balance after refunds.
 */
export function useGenerationWatcher() {
  const { data: me } = useMe()
  const { data: generations } = useGenerations(!!me)
  const { toast, setHasNewResults } = useUi()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const previous = useRef(new Map<string, GenerationStatus>())

  useEffect(() => {
    if (!generations) return
    const prev = previous.current
    for (const g of generations) {
      const before = prev.get(g.id)
      const finished = g.status === 'done' || g.status === 'failed'
      if (before && before !== g.status && finished) {
        if (pathname !== '/results') setHasNewResults(true)
        if (g.status === 'done') {
          toast({
            title: `Your ${g.outputType} is ready`,
            description: g.prompt.length > 70 ? `${g.prompt.slice(0, 70)}…` : g.prompt,
            variant: 'success',
            action: pathname === '/results' ? undefined : { label: 'View', onClick: () => navigate('/results') },
          })
        } else {
          toast({ title: 'Generation failed', description: `${g.cost} credit${g.cost > 1 ? 's' : ''} refunded. Try again or tweak the prompt.`, variant: 'error' })
          void qc.invalidateQueries({ queryKey: queryKeys.me })
          void qc.invalidateQueries({ queryKey: queryKeys.credits })
        }
      }
    }
    previous.current = new Map(generations.map((g) => [g.id, g.status]))
  }, [generations, pathname, toast, setHasNewResults, navigate, qc])
}
