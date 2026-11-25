import { Eraser, Film, Palette, Scaling, Shirt, Sun, type LucideIcon } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useTools } from '../../api/queries'
import type { ToolIcon } from '../../api/types'
import { ErrorState } from '../ui/primitives'
import { useApplyTemplate } from './useApplyTemplate'

const ICONS: Record<ToolIcon, LucideIcon> = {
  eraser: Eraser,
  scale: Scaling,
  sun: Sun,
  shirt: Shirt,
  film: Film,
  palette: Palette,
}

export function ToolsPanel() {
  const { data, isPending, isError, error, refetch } = useTools()
  const apply = useApplyTemplate()

  if (isError) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} className="w-full max-w-[680px]" />

  return (
    <div className="grid w-full max-w-[680px] grid-cols-2 gap-2.5 sm:grid-cols-3">
      {isPending
        ? Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-white/[0.04]" />)
        : data.map((tool) => {
            const Icon = ICONS[tool.icon]
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() =>
                  apply({ ref: { source: 'tool', id: tool.id }, title: tool.title, prompt: tool.prompt, outputType: tool.outputType })
                }
                className="group flex flex-col items-start gap-2.5 rounded-2xl border border-white/[0.08] bg-[linear-gradient(120deg,#232326,#18181a)] p-3.5 text-left transition-colors hover:border-white/20"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-white/[0.07] text-zinc-200 group-hover:bg-white group-hover:text-black">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{tool.title}</span>
                  <span className="block text-xs text-zinc-500">{tool.description}</span>
                </span>
              </button>
            )
          })}
    </div>
  )
}
