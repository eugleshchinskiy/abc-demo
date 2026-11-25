import { Check, Search, Sparkles } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { useTopUp } from '../../api/queries'
import { useUi } from '../../state/ui-context'
import { Modal, Spinner } from '../ui/primitives'

/** Global search — UI only for now, as requested. */
export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useUi()
  return (
    <Modal open={searchOpen} onClose={() => setSearchOpen(false)} label="Search" className="max-w-xl">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4 pr-14">
        <Search className="size-5 text-zinc-500" />
        <input
          autoFocus
          placeholder="Search projects, results and templates…"
          className="flex-1 bg-transparent text-[15px] text-white placeholder:text-zinc-500 focus:outline-none"
          aria-describedby="search-hint"
        />
      </div>
      <p id="search-hint" className="px-5 py-8 text-center text-sm text-zinc-500">
        Global search is coming soon.
        <br />
        Use the search in <span className="text-zinc-300">Wishes</span> to find templates.
      </p>
    </Modal>
  )
}

const PRO_FEATURES = ['4K exports & upscaling', 'Video generation up to 30 s', 'Brand kits & consistent models', 'Priority queue']

export function UpgradeDialog() {
  const { upgradeOpen, setUpgradeOpen, toast } = useUi()
  const topUp = useTopUp()
  return (
    <Modal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} label="Upgrade to Pro">
      <div className="p-6">
        <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#b7a6f7] to-[#6d8dfa] text-[#1b1238]">
          <Sparkles className="size-5" />
        </div>
        <h2 className="text-xl font-semibold text-white">Unlock more with Pro</h2>
        <p className="mt-1 text-sm text-zinc-400">Billing is mocked in this demo — top up free credits instead.</p>
        <ul className="mt-5 space-y-2.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-200">
              <Check className="size-4 text-[#b7a6f7]" /> {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={topUp.isPending}
          onClick={() =>
            topUp.mutate(undefined, {
              onSuccess: (u) => {
                setUpgradeOpen(false)
                toast({ title: '+50 demo credits', description: `Your balance is now ${u.credits}.`, variant: 'success' })
              },
              onError: (e) => toast({ title: 'Top-up failed', description: errorMessage(e), variant: 'error' }),
            })
          }
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#b7a6f7] text-sm font-semibold text-[#1b1238] transition-colors hover:bg-[#c8bbfa] disabled:opacity-60"
        >
          {topUp.isPending && <Spinner className="size-4" />}
          Add 50 demo credits
        </button>
      </div>
    </Modal>
  )
}
