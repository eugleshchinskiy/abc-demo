import { useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, CircleQuestionMark, Keyboard, LogOut, MessageCircle, RotateCcw, Sparkles, User } from 'lucide-react'
import { useMe, useResetDemo } from '../../api/queries'
import { useUi } from '../../state/ui-context'
import { useComposer } from '../../state/composer-context'
import { Logo, MenuItem, Popover } from '../ui/primitives'

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-[11px] text-zinc-400">{children}</kbd>
}

export function Header() {
  const { data: me, isPending } = useMe()
  const { setUpgradeOpen, toast } = useUi()
  const composer = useComposer()
  const reset = useResetDemo()
  const [menu, setMenu] = useState<'help' | 'profile' | null>(null)
  const close = () => setMenu(null)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-black/80 px-4 backdrop-blur-xl sm:px-6">
      <Link to="/" aria-label="artven home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-white/40">
        <Logo />
      </Link>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="relative hidden sm:block">
          <button
            type="button"
            aria-label="Help"
            aria-expanded={menu === 'help'}
            onClick={() => setMenu(menu === 'help' ? null : 'help')}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 transition-colors hover:bg-white/10"
          >
            <CircleQuestionMark className="size-[18px]" strokeWidth={1.75} />
          </button>
          <Popover open={menu === 'help'} onClose={close} className="w-72">
            <p className="px-3 pt-2 pb-1 text-xs font-medium text-zinc-500">Shortcuts</p>
            <div className="space-y-2 px-3 py-2 text-sm text-zinc-300">
              <div className="flex justify-between"><span>Send prompt</span><Kbd>Enter</Kbd></div>
              <div className="flex justify-between"><span>New line</span><Kbd>Shift + Enter</Kbd></div>
              <div className="flex justify-between"><span>Search</span><Kbd>⌘ K</Kbd></div>
            </div>
            <div className="my-1 h-px bg-white/[0.06]" />
            <MenuItem icon={<BookOpen />} onSelect={() => { close(); toast({ title: 'Help center', description: 'Docs are not part of this demo.' }) }}>
              Help center
            </MenuItem>
            <MenuItem icon={<MessageCircle />} onSelect={() => { close(); toast({ title: 'Support', description: 'Chat support is not part of this demo.' }) }}>
              Contact support
            </MenuItem>
            <MenuItem icon={<Keyboard />} disabled>Keyboard settings</MenuItem>
          </Popover>
        </div>

        <div className="mx-0.5 hidden h-6 w-px bg-white/10 sm:block" />

        <div className="flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5 pl-3">
          <span className="flex min-w-9 items-center gap-1.5 text-sm font-medium text-white tabular-nums" aria-label={`${me?.credits ?? 0} credits`}>
            <Sparkles className="size-3.5 text-zinc-300" strokeWidth={2} />
            {isPending ? <span className="h-3 w-5 animate-pulse rounded bg-white/10" /> : me?.credits ?? '—'}
          </span>
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="ml-1 h-full rounded-full bg-[#b7a6f7] px-4 text-[13px] font-semibold text-[#1b1238] transition-colors hover:bg-[#c8bbfa]"
          >
            Upgrade
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Profile"
            aria-expanded={menu === 'profile'}
            onClick={() => setMenu(menu === 'profile' ? null : 'profile')}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-200 transition-colors hover:bg-white/10"
          >
            <User className="size-[18px]" strokeWidth={1.75} />
          </button>
          <Popover open={menu === 'profile'} onClose={close} className="w-64">
            <div className="px-3 pt-2 pb-2.5">
              <p className="text-sm font-medium text-white">{me?.name ?? 'Guest'}</p>
              <p className="text-xs text-zinc-500">{me?.email}</p>
              <span className="mt-2 inline-flex rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-300 uppercase">
                {me?.plan ?? 'free'} plan
              </span>
            </div>
            <div className="my-1 h-px bg-white/[0.06]" />
            <MenuItem
              icon={<RotateCcw />}
              disabled={reset.isPending}
              onSelect={() => {
                close()
                reset.mutate(undefined, {
                  onSuccess: () => {
                    composer.reset()
                    toast({ title: 'Demo data reset', description: 'Credits, bookmarks and results restored.', variant: 'success' })
                  },
                })
              }}
            >
              Reset demo data
            </MenuItem>
            <MenuItem icon={<LogOut />} onSelect={() => { close(); toast({ title: 'Signed out (not really)', description: 'Auth is mocked in this demo.' }) }}>
              Sign out
            </MenuItem>
          </Popover>
        </div>
      </div>
    </header>
  )
}
