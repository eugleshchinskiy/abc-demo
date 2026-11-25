import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../../api/client'
import { useLogout, useMe } from '../../api/queries'
import { useComposer } from '../../state/composer-context'
import { useUi } from '../../state/ui-context'
import { Icon } from '../ui/Icon'
import { Button, IconButton, Logo, MenuDivider, MenuItem, Popover } from '../ui/primitives'

export function Header() {
  const { data: me, isPending } = useMe()
  const { openDialog, toast } = useUi()
  const composer = useComposer()
  const logout = useLogout()
  const [menu, setMenu] = useState<'help' | 'profile' | null>(null)
  const close = () => setMenu(null)
  const open = (dialog: Parameters<typeof openDialog>[0]) => {
    close()
    openDialog(dialog)
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-bg-dark px-5 pt-4">
      <Link to="/" aria-label="artven home" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-purple/70">
        <Logo />
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Help — Figma "FAQ Pop-up": Support and Policies */}
        <div className="relative max-sm:hidden">
          <IconButton
            icon="faq"
            label="Help"
            size={40}
            tone="purple-dark"
            aria-haspopup="menu"
            aria-expanded={menu === 'help'}
            onClick={() => setMenu(menu === 'help' ? null : 'help')}
          />
          <Popover open={menu === 'help'} onClose={close} align="left" label="Help" className="top-[59px] w-[274px] max-sm:right-0 max-sm:left-auto">
            <MenuItem icon="support" onSelect={() => open('support')}>
              Contact Support
            </MenuItem>
            <MenuItem icon="terms" onSelect={() => open('terms')}>
              Terms &amp; Policies
            </MenuItem>
          </Popover>
        </div>

        <div className="h-4 w-px rounded bg-container-2 max-sm:hidden" />

        {me === null ? (
          <Button onClick={() => openDialog('sign-in')} className="h-10">
            Log in
          </Button>
        ) : (
          <>
            {/* Figma "tokens-chip" */}
            <div className="flex items-center gap-1 rounded-[20px] bg-token-chip p-1">
              <span
                className="flex h-8 items-center gap-1 pr-3 pl-2 text-sm leading-none font-semibold text-white tabular-nums"
                aria-label={`${me?.credits ?? 0} credits`}
                title="Credits balance"
              >
                <Icon name="token" className="text-purple" />
                {isPending ? <span className="h-3 w-5 animate-pulse rounded bg-white/10" /> : (me?.credits ?? '—')}
              </span>
              <button
                type="button"
                onClick={() => openDialog('subscription')}
                className="h-8 w-[86px] rounded-2xl bg-purple text-control text-bg-dark transition-colors hover:bg-[#c7c0fe] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                {me?.plan === 'pro' ? 'Top up' : 'Upgrade'}
              </button>
            </div>

            {/* Avatar — Figma "Avatar Pop-up" (signed-in users only) */}
            <div className="relative">
              <IconButton
                icon="profile"
                label="Account"
                size={40}
                tone="purple-dark"
                aria-haspopup="menu"
                aria-expanded={menu === 'profile'}
                onClick={() => setMenu(menu === 'profile' ? null : 'profile')}
              />
              <Popover open={menu === 'profile'} onClose={close} label="Account" className="top-[66px] w-[304px]">
                <div className="flex h-[65px] shrink-0 items-center gap-3 px-2 pb-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-container-2">
                    <Icon name="profile" className="text-white" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-[5px]">
                    <span className="truncate text-sm leading-[17px] font-semibold text-white">{me?.name}</span>
                    <span className="truncate text-xs leading-[14.5px] text-tertiary">{me?.email}</span>
                  </span>
                </div>
                <MenuItem icon="profile" onSelect={() => open('profile')}>
                  View Profile
                </MenuItem>
                <MenuItem icon="subscription" onSelect={() => open('subscription')} hint={me?.plan === 'pro' ? 'Pro' : 'Free'}>
                  Subscriptions
                </MenuItem>
                <MenuItem icon="settings" onSelect={() => open('account')}>
                  Manage Account
                </MenuItem>
                <MenuItem icon="credits" onSelect={() => open('credits')}>
                  Credits History
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon="sign-out"
                  disabled={logout.isPending}
                  onSelect={() => {
                    close()
                    logout.mutate(undefined, {
                      onSuccess: () => {
                        composer.reset()
                        toast({ title: 'Signed out', description: 'Log in again to generate and save wishes.' })
                      },
                      onError: (e) => toast({ title: "Couldn't sign out", description: errorMessage(e), variant: 'error' }),
                    })
                  }}
                >
                  Sign Out
                </MenuItem>
              </Popover>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
