import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Check } from 'lucide-react'
import { errorMessage, fieldErrors } from '../../api/client'
import {
  useBookmarks,
  useCreditHistory,
  useGenerations,
  useLogin,
  useMe,
  useProfiles,
  useSetPlan,
  useSupportTicket,
  useTopUp,
  useUpdateMe,
} from '../../api/queries'
import type { CreditTransaction, Plan, SupportTicketInput, User } from '../../api/types'
import { cn } from '../../lib/cn'
import { CREDIT_COST, LIMITS, PLAN_LIMITS, validateEmail, validateName } from '../../lib/limits'
import { useUi } from '../../state/ui-context'
import { Icon } from '../ui/Icon'
import { Button, Field, Modal, Segment, Spinner, TextArea, TextInput } from '../ui/primitives'

/** Renders whichever dialog the UI state asks for. */
export function Dialogs() {
  const { dialog, closeDialog } = useUi()
  const props = { onClose: closeDialog }
  switch (dialog) {
    case 'search':
      return <SearchDialog {...props} />
    case 'subscription':
      return <SubscriptionDialog {...props} />
    case 'profile':
      return <ProfileDialog {...props} />
    case 'account':
      return <AccountDialog {...props} />
    case 'credits':
      return <CreditsDialog {...props} />
    case 'support':
      return <SupportDialog {...props} />
    case 'terms':
      return <TermsDialog {...props} />
    case 'sign-in':
      return <SignInDialog {...props} />
    default:
      return null
  }
}

type DialogProps = { onClose: () => void }

/* -------------------------------------------------------------------------- */
/* Global search → searches the Wishes feed                                    */
/* -------------------------------------------------------------------------- */

const SEARCH_SUGGESTIONS = ['chrome', 'pastel', 'neon', 'editorial', 'golden', 'minimal']

function SearchDialog({ onClose }: DialogProps) {
  const { wishFilters, setWishFilters } = useUi()
  const navigate = useNavigate()
  const [q, setQ] = useState(wishFilters.q)

  function run(query: string) {
    const value = query.trim().slice(0, 100)
    setWishFilters({ q: value })
    onClose()
    navigate('/')
    // Let Home render, then bring the feed into view.
    window.setTimeout(() => document.getElementById('wishes')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <Modal open onClose={onClose} title="Search">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          run(q)
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex h-11 items-center gap-2.5 rounded-xl bg-container px-3.5 focus-within:ring-1 focus-within:ring-purple/70">
          <Icon name="search" className="text-tertiary" />
          <input
            value={q}
            maxLength={100}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wishes by style, product or format…"
            aria-label="Search wishes"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-tertiary focus:outline-none"
          />
          <kbd className="rounded-md bg-container-2 px-1.5 py-0.5 text-[11px] text-secondary">Enter</kbd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-tertiary">Try</span>
          {SEARCH_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => run(s)}
              className="h-7 rounded-3xl bg-container px-3 text-xs font-semibold text-secondary hover:bg-container-2 hover:text-white"
            >
              {s}
            </button>
          ))}
          {wishFilters.q && (
            <button type="button" onClick={() => run('')} className="ml-auto text-xs font-semibold text-purple hover:underline">
              Clear search
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Subscriptions                                                               */
/* -------------------------------------------------------------------------- */

const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    `${PLAN_LIMITS.free.monthlyCredits} welcome credits`,
    `${PLAN_LIMITS.free.parallelGenerations} generations at a time`,
    `Image ${CREDIT_COST.image} credit · Video ${CREDIT_COST.video} credits`,
  ],
  pro: [
    `+${PLAN_LIMITS.pro.monthlyCredits} credits every month`,
    `${PLAN_LIMITS.pro.parallelGenerations} generations at a time`,
    'Priority queue & 4K exports',
  ],
}

function SubscriptionDialog({ onClose }: DialogProps) {
  const { data: me } = useMe()
  const { toast } = useUi()
  const setPlan = useSetPlan()
  const topUp = useTopUp()

  const choose = (plan: Plan) =>
    setPlan.mutate(plan, {
      onSuccess: (u) =>
        toast({
          title: plan === 'pro' ? 'Welcome to Pro ✦' : 'Switched to Free',
          description: plan === 'pro' ? `${PLAN_LIMITS.pro.monthlyCredits} credits added · balance ${u.credits}.` : 'Your credits stay on your balance.',
          variant: 'success',
        }),
      onError: (e) => toast({ title: "Couldn't change plan", description: errorMessage(e), variant: 'error' }),
    })

  return (
    <Modal open onClose={onClose} title="Subscriptions" description="Billing is simulated in this demo — no card needed.">
      <div className="grid gap-3 sm:grid-cols-2">
        {(['free', 'pro'] as const).map((plan) => {
          const current = me?.plan === plan
          return (
            <div
              key={plan}
              className={cn(
                'flex flex-col gap-4 rounded-2xl border p-4',
                plan === 'pro' ? 'border-purple/40 bg-purple-dark' : 'border-white/[0.08] bg-container',
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-card-title text-white">{plan === 'pro' ? 'Pro' : 'Free'}</p>
                  <p className="mt-1 text-[13px] text-secondary">
                    <span className="text-xl font-semibold text-white">{PLAN_LIMITS[plan].price}</span> / month
                  </p>
                </div>
                {current && <span className="rounded-3xl bg-white/10 px-2 py-1 text-[11px] font-semibold text-white">Current</span>}
              </div>
              <ul className="flex flex-1 flex-col gap-2">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-secondary">
                    <Check className={cn('size-3.5 shrink-0', plan === 'pro' ? 'text-purple' : 'text-tertiary')} /> {f}
                  </li>
                ))}
              </ul>
              {!current && (
                <Button
                  variant={plan === 'pro' ? 'purple' : 'secondary'}
                  loading={setPlan.isPending && setPlan.variables === plan}
                  disabled={setPlan.isPending}
                  onClick={() => choose(plan)}
                >
                  {plan === 'pro' ? 'Upgrade to Pro' : 'Switch to Free'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-container p-4">
        <div>
          <p className="text-[13px] font-semibold text-white">Need more credits?</p>
          <p className="text-xs text-tertiary">Balance: {me?.credits ?? 0} credits</p>
        </div>
        <Button
          variant="secondary"
          loading={topUp.isPending}
          onClick={() =>
            topUp.mutate(undefined, {
              onSuccess: (u) => toast({ title: '+50 credits', description: `Your balance is now ${u.credits}.`, variant: 'success' }),
              onError: (e) => toast({ title: 'Top-up failed', description: errorMessage(e), variant: 'error' }),
            })
          }
        >
          <Icon name="token" size={16} className="text-purple" /> Buy 50 credits
        </Button>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Profile (view) & account (edit)                                             */
/* -------------------------------------------------------------------------- */

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-container px-4 py-3">
      <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-xs text-tertiary">{label}</p>
    </div>
  )
}

function ProfileDialog({ onClose }: DialogProps) {
  const { data: me } = useMe()
  const { openDialog } = useUi()
  const { data: generations } = useGenerations(!!me)
  const { data: bookmarks } = useBookmarks()
  const { data: profiles } = useProfiles()
  if (!me) return null
  return (
    <Modal open onClose={onClose} title="Profile">
      <div className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full bg-container-2 text-2xl font-semibold text-white">
          {me.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-white">{me.name}</p>
          <p className="truncate text-[13px] text-tertiary">{me.email}</p>
          <p className="mt-1 text-xs text-secondary">
            <span className={cn('mr-2 rounded-3xl px-2 py-0.5 font-semibold', me.plan === 'pro' ? 'bg-purple text-bg-dark' : 'bg-container-2 text-white')}>
              {me.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
            Member since {new Date(me.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Credits" value={me.credits} />
        <Stat label="Generations" value={generations?.length ?? '—'} />
        <Stat label="Saved wishes" value={bookmarks?.size ?? '—'} />
        <Stat label="Product profiles" value={profiles?.length ?? '—'} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => openDialog('credits')}>
          Credits History
        </Button>
        <Button onClick={() => openDialog('account')}>Manage Account</Button>
      </div>
    </Modal>
  )
}

function AccountDialog({ onClose }: DialogProps) {
  const { data: me } = useMe()
  if (!me) return null
  return <AccountForm me={me} onClose={onClose} />
}

function AccountForm({ me, onClose }: { me: User } & DialogProps) {
  const { toast } = useUi()
  const update = useUpdateMe()
  const [name, setName] = useState(me.name)
  const [email, setEmail] = useState(me.email)
  const [touched, setTouched] = useState(false)
  const server = fieldErrors(update.error)
  const errors = {
    name: touched ? (validateName(name) ?? server.name) : undefined,
    email: touched ? (validateEmail(email) ?? server.email) : undefined,
  }
  const dirty = name.trim() !== me.name || email.trim().toLowerCase() !== me.email

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (validateName(name) || validateEmail(email)) return
    update.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: () => {
          toast({ title: 'Account updated', variant: 'success' })
          onClose()
        },
      },
    )
  }

  return (
    <Modal open onClose={onClose} title="Manage Account">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Display name" error={errors.name} hint={`${name.trim().length}/${LIMITS.nameMaxChars}`}>
          {(id, d) => (
            <TextInput id={id} aria-describedby={d} value={name} maxLength={LIMITS.nameMaxChars + 10} autoComplete="name" onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} error={errors.name} />
          )}
        </Field>
        <Field label="Email" error={errors.email}>
          {(id, d) => (
            <TextInput id={id} aria-describedby={d} type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)} error={errors.email} />
          )}
        </Field>
        {update.isError && !Object.keys(server).length && <p className="text-xs text-danger">{errorMessage(update.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Credits history                                                             */
/* -------------------------------------------------------------------------- */

const TXN_LABEL: Record<CreditTransaction['kind'], string> = {
  welcome: 'Bonus',
  'top-up': 'Top-up',
  plan: 'Subscription',
  generation: 'Generation',
  refund: 'Refund',
}

function CreditsDialog({ onClose }: DialogProps) {
  const { data: me } = useMe()
  const { data, isPending, isError, error, refetch } = useCreditHistory(!!me)
  return (
    <Modal open onClose={onClose} title="Credits History" description={me ? `Current balance: ${me.credits} credits` : undefined}>
      {isPending ? (
        <div className="grid h-40 place-items-center">
          <Spinner className="size-5 text-tertiary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-[13px] text-secondary">
          {errorMessage(error)}
          <Button variant="secondary" className="h-8" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <ul className="-mx-2 flex max-h-[360px] flex-col overflow-y-auto">
          {data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.03]">
              <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', t.amount > 0 ? 'bg-purple-dark text-purple' : 'bg-container text-tertiary')}>
                <Icon name={t.kind === 'generation' ? 'send' : 'token'} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-white">{t.description}</span>
                <span className="block text-[11px] text-tertiary">
                  {TXN_LABEL[t.kind]} · {new Date(t.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </span>
              <span className="text-right tabular-nums">
                <span className={cn('block text-sm font-semibold', t.amount > 0 ? 'text-purple' : 'text-white')}>
                  {t.amount > 0 ? '+' : '−'}
                  {Math.abs(t.amount)}
                </span>
                <span className="block text-[11px] text-tertiary">bal. {t.balance}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Help: support & terms                                                       */
/* -------------------------------------------------------------------------- */

const TOPICS: { id: SupportTicketInput['topic']; label: string }[] = [
  { id: 'bug', label: 'Something broke' },
  { id: 'billing', label: 'Billing' },
  { id: 'feature', label: 'Feature idea' },
  { id: 'other', label: 'Other' },
]

function SupportDialog({ onClose }: DialogProps) {
  const { data: me } = useMe()
  const { toast } = useUi()
  const send = useSupportTicket()
  const [topic, setTopic] = useState<SupportTicketInput['topic']>('bug')
  const [email, setEmail] = useState(me?.email ?? '')
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)
  const server = fieldErrors(send.error)
  const trimmed = message.trim()
  const messageError =
    trimmed.length < LIMITS.supportMinChars
      ? `Tell us a bit more (at least ${LIMITS.supportMinChars} characters).`
      : trimmed.length > LIMITS.supportMaxChars
        ? `Keep it under ${LIMITS.supportMaxChars} characters.`
        : null
  const errors = {
    email: touched ? (validateEmail(email) ?? server.email) : undefined,
    message: touched ? (messageError ?? server.message) : undefined,
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (validateEmail(email) || messageError) return
    send.mutate(
      { topic, email: email.trim(), message: trimmed },
      {
        onSuccess: ({ ticketId }) => {
          toast({ title: `Ticket ${ticketId} created`, description: `We'll reply to ${email.trim()} within 24 hours.`, variant: 'success' })
          onClose()
        },
      },
    )
  }

  return (
    <Modal open onClose={onClose} title="Contact Support" description="Questions, bugs or ideas — a human reads every message.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Topic">
          {TOPICS.map((t) => (
            <Segment key={t.id} role="radio" aria-checked={topic === t.id} selected={topic === t.id} onClick={() => setTopic(t.id)} className={cn('h-9', topic !== t.id && 'bg-container')}>
              {t.label}
            </Segment>
          ))}
        </div>
        <Field label="Email" error={errors.email}>
          {(id, d) => <TextInput id={id} aria-describedby={d} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@company.com" />}
        </Field>
        <Field label="Message" error={errors.message} hint={`${trimmed.length}/${LIMITS.supportMaxChars}`}>
          {(id, d) => (
            <TextArea
              id={id}
              aria-describedby={d}
              value={message}
              maxLength={LIMITS.supportMaxChars}
              onChange={(e) => setMessage(e.target.value)}
              error={errors.message}
              placeholder="What happened, and what did you expect?"
            />
          )}
        </Field>
        {send.isError && !Object.keys(server).length && <p className="text-xs text-danger">{errorMessage(send.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={send.isPending}>
            Send message
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const TERMS: [string, string][] = [
  ['Your content', 'You own the prompts you write, the files you upload and the images and videos you generate. We only process them to provide the service.'],
  ['Fair use', 'Don’t generate content that is illegal, sexual, violent or that imitates real people without consent. Prompts are checked automatically.'],
  ['Credits', 'Credits are charged when a generation starts and refunded automatically if it fails. Unused subscription credits roll over for one month.'],
  ['Privacy', 'Uploads are stored for 30 days to let you re-run generations, then deleted. We never use your files to train models.'],
]

function TermsDialog({ onClose }: DialogProps) {
  return (
    <Modal open onClose={onClose} title="Terms & Policies" description="The short version. This is a demo, so nothing here is legally binding.">
      <div className="flex flex-col gap-4">
        {TERMS.map(([title, body]) => (
          <section key={title}>
            <h3 className="text-card-title text-white">{title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-secondary">{body}</p>
          </section>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={onClose} data-autofocus>
          Got it
        </Button>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/* Sign in                                                                     */
/* -------------------------------------------------------------------------- */

function SignInDialog({ onClose }: DialogProps) {
  const { toast } = useUi()
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const server = fieldErrors(login.error)
  const passwordError = password.length < LIMITS.passwordMinChars ? `Password must be at least ${LIMITS.passwordMinChars} characters.` : null
  const errors = {
    email: touched ? (validateEmail(email) ?? server.email) : undefined,
    password: touched ? (passwordError ?? server.password) : undefined,
  }
  const done = (u: User) => {
    toast({ title: `Welcome back, ${u.name.split(' ')[0]}`, variant: 'success' })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Log in to artven" description="Log in to generate, save wishes and keep your credits." className="max-w-[440px]">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (validateEmail(email) || passwordError) return
          login.mutate({ email: email.trim(), password }, { onSuccess: done })
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Email" error={errors.email}>
          {(id, d) => <TextInput id={id} aria-describedby={d} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@company.com" />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(id, d) => (
            <TextInput id={id} aria-describedby={d} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} placeholder="At least 8 characters" />
          )}
        </Field>
        {login.isError && !Object.keys(server).length && <p className="text-xs text-danger">{errorMessage(login.error)}</p>}
        <Button type="submit" loading={login.isPending && login.variables !== 'demo'} className="w-full">
          Log in
        </Button>
        <div className="flex items-center gap-3 text-[11px] text-tertiary">
          <div className="h-px flex-1 bg-container-2" /> or <div className="h-px flex-1 bg-container-2" />
        </div>
        <Button variant="secondary" className="w-full" loading={login.isPending && login.variables === 'demo'} onClick={() => login.mutate('demo', { onSuccess: done })}>
          Continue as Demo User
        </Button>
      </form>
    </Modal>
  )
}
