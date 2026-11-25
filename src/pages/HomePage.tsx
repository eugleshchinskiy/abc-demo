import { Composer } from '../components/home/Composer'
import { IdeasSection } from '../components/home/IdeasSection'
import { ToolsPanel } from '../components/home/ToolsPanel'
import { WishesSection } from '../components/home/WishesSection'
import { cn } from '../lib/cn'
import { useUi, type HomeTab } from '../state/ui-context'

const TABS: { id: HomeTab; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'tools', label: 'Tools' },
]

/** Figma "Switch": 86×32 segments on a purple-dark track. */
function ModeSwitch() {
  const { homeTab, setHomeTab } = useUi()
  return (
    <div role="tablist" aria-label="Mode" className="flex items-center gap-1 rounded-[20px] bg-purple-dark p-1">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={homeTab === t.id}
          aria-controls="home-panel"
          onClick={() => setHomeTab(t.id)}
          className={cn(
            'h-8 w-[86px] rounded-2xl text-control transition-colors focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none',
            homeTab === t.id ? 'bg-white text-bg-dark' : 'text-white hover:bg-white/[0.06]',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function HomePage() {
  const { homeTab } = useUi()
  return (
    <div className="mx-auto max-w-[1680px]">
      <section className="flex flex-col items-center gap-3 px-5">
        <h1 className="text-center text-hero text-white">What will you create next?</h1>
        <ModeSwitch />
        <div id="home-panel" role="tabpanel" aria-labelledby={`tab-${homeTab}`} className="flex w-full justify-center">
          {homeTab === 'chat' ? <Composer /> : <ToolsPanel />}
        </div>
      </section>
      <IdeasSection />
      <WishesSection />
    </div>
  )
}
