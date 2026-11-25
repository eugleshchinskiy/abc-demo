import { Composer } from '../components/home/Composer'
import { IdeasSection } from '../components/home/IdeasSection'
import { ToolsPanel } from '../components/home/ToolsPanel'
import { WishesSection } from '../components/home/WishesSection'
import { cn } from '../lib/cn'
import { useUi } from '../state/ui-context'

const TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'tools', label: 'Tools' },
] as const

export function HomePage() {
  const { homeTab, setHomeTab } = useUi()
  return (
    <div className="mx-auto max-w-[1440px]">
      <section className="flex flex-col items-center pt-4 pb-10">
        <h1 className="text-center text-[28px] font-medium tracking-[-0.02em] text-white sm:text-[32px]">What will you create next?</h1>
        <div role="tablist" aria-label="Mode" className="mt-4 mb-5 flex rounded-full border border-white/10 bg-[#1c1c1e] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={homeTab === t.id}
              onClick={() => setHomeTab(t.id)}
              className={cn(
                'h-8 min-w-[88px] rounded-full px-5 text-sm font-medium transition-colors',
                homeTab === t.id ? 'bg-white text-black shadow' : 'text-zinc-300 hover:text-white',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {homeTab === 'chat' ? <Composer /> : <ToolsPanel />}
      </section>
      <IdeasSection />
      <WishesSection />
    </div>
  )
}
