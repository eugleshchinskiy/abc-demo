import { NavLink } from 'react-router'
import { Folder, LayoutGrid, MessageSquare, Search, Settings, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useUi } from '../../state/ui-context'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: boolean
}

function SideLink({ to, label, icon: Icon, badge }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="group flex w-full flex-col items-center gap-1 py-1.5 text-[10.5px] font-medium focus-visible:outline-none"
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'grid size-9 place-items-center rounded-xl transition-colors group-focus-visible:ring-2 group-focus-visible:ring-white/40',
              isActive ? 'bg-white/[0.12] text-white' : 'text-zinc-400 group-hover:bg-white/[0.06] group-hover:text-zinc-200',
            )}
          >
            <Icon className="size-[18px]" strokeWidth={1.75} />
          </span>
          <span className={cn('flex items-center gap-1', isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300')}>
            {label}
            {badge && <span className="size-1.5 rounded-full bg-violet-400" aria-label="new" />}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { setSearchOpen, hasNewResults } = useUi()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[68px] flex-col items-center border-r border-white/[0.06] bg-[#141414] py-3">
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search (⌘K)"
        title="Search (⌘K)"
        className="grid size-9 place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Search className="size-[18px]" strokeWidth={1.75} />
      </button>
      <div className="my-3 h-px w-8 bg-white/[0.08]" />
      <nav className="flex w-full flex-col items-center gap-1.5" aria-label="Main">
        <SideLink to="/" label="Home" icon={LayoutGrid} />
        <SideLink to="/chat" label="Chat" icon={MessageSquare} />
        <SideLink to="/results" label="Results" icon={Folder} badge={hasNewResults} />
      </nav>
      <div className="my-3 h-px w-8 bg-white/[0.08]" />
      <SideLink to="/settings" label="Settings" icon={Settings} />
    </aside>
  )
}
