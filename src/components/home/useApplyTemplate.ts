import { useCallback } from 'react'
import { useComposer, type ApplyTemplateInput } from '../../state/composer-context'
import { useUi } from '../../state/ui-context'

/** Applies a template to the composer and brings the composer into view. */
export function useApplyTemplate() {
  const { applyTemplate } = useComposer()
  const { setHomeTab, toast } = useUi()

  return useCallback(
    (input: ApplyTemplateInput) => {
      setHomeTab('chat')
      applyTemplate(input)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      const hasPlaceholders = /\[[^\]]+\]/.test(input.prompt)
      toast({
        title: `“${input.title}” applied`,
        description: hasPlaceholders
          ? 'Fill in the [highlighted] parts and attach your own images.'
          : 'Attach your own images and hit send.',
      })
    },
    [applyTemplate, setHomeTab, toast],
  )
}
