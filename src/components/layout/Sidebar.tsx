import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import { useUi } from '../../state/ui-context'
import { Icon, type IconName } from '../ui/Icon'

interface NavItem {
  to: string
  label: string
  icon: IconName
  unread?: boolean
}

/** Figma "nav-item": 48px column, 32px rounded icon slot, 9px label. */
function SideLink({ to, label, icon, unread }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className="group flex w-12 flex-col items-center gap-1 py-1 focus-visible:outline-none"
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'grid size-8 place-items-center rounded-[10px] transition-colors group-focus-visible:ring-2 group-focus-visible:ring-purple/60',
              isActive ? 'bg-container-2 text-white' : 'text-tertiary group-hover:bg-container group-hover:text-white',
            )}
          >
            <Icon name={icon} />
          </span>
          <span
            className={cn(
              'flex h-3 items-center gap-1 text-[9px] leading-3 font-medium',
              isActive ? 'text-white' : 'text-tertiary group-hover:text-secondary',
            )}
          >
            {label}
            {unread && <span className="size-1 rounded-full bg-purple" aria-label="new results" />}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { openDialog, hasNewResults } = useUi()
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center gap-4 bg-bg px-2 py-4">
      <div className="flex h-10 w-full items-center justify-center">
        <button
          type="button"
          onClick={() => openDialog('search')}
          aria-label="Search (⌘K)"
          title="Search (⌘K)"
          className="grid size-8 place-items-center rounded-[10px] text-tertiary transition-colors hover:bg-container hover:text-white focus-visible:ring-2 focus-visible:ring-purple/60 focus-visible:outline-none"
        >
          <Icon name="search" />
        </button>
      </div>
      <div className="h-px w-12 bg-container" />
      <nav className="flex w-full flex-col items-center gap-1" aria-label="Main">
        <SideLink to="/" label="Home" icon="home" />
        <SideLink to="/chat" label="Chat" icon="chat" />
        <SideLink to="/results" label="Results" icon="results" unread={hasNewResults} />
      </nav>
      <div className="flex w-full flex-col items-center gap-3">
        <div className="h-px w-12 bg-container" />
        <SideLink to="/settings" label="Settings" icon="settings" />
      </div>
    </aside>
  )
}
