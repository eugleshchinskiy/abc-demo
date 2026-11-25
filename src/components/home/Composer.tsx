import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowUp, Check, ChevronDown, Image as ImageIcon, Plus, SlidersHorizontal, Sparkles, Video, X, type LucideIcon } from 'lucide-react'
import { ApiError, errorMessage } from '../../api/client'
import { useCreateGeneration } from '../../api/queries'
import type { OutputType } from '../../api/types'
import { cn } from '../../lib/cn'
import { ACCEPT_ATTR, ACCEPTED_LABEL, CREDIT_COST, LIMITS, formatBytes } from '../../lib/limits'
import { useComposer, type Attachment, type ComposerTemplate } from '../../state/composer-context'
import { useUi } from '../../state/ui-context'
import { Popover, Spinner } from '../ui/primitives'

const OUTPUTS: { value: OutputType; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'auto', label: 'Auto', icon: SlidersHorizontal, hint: 'Best format for your prompt' },
  { value: 'image', label: 'Image', icon: ImageIcon, hint: `${CREDIT_COST.image} credit` },
  { value: 'video', label: 'Video', icon: Video, hint: `${CREDIT_COST.video} credits` },
]

function OutputTypeSelect({ value, onChange }: { value: OutputType; onChange: (v: OutputType) => void }) {
  const [open, setOpen] = useState(false)
  const current = OUTPUTS.find((o) => o.value === value)!
  const Icon = current.icon
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Output type: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] pr-2.5 pl-3 text-[13px] text-zinc-200 transition-colors hover:bg-white/[0.08]"
      >
        <Icon className="size-3.5" />
        {current.label}
        <ChevronDown className={cn('size-3.5 text-zinc-400 transition-transform', open && 'rotate-180')} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-64">
        <p className="px-3 pt-1.5 pb-1 text-xs font-medium text-zinc-500">Output</p>
        {OUTPUTS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="menuitemradio"
            aria-checked={o.value === value}
            onClick={() => {
              onChange(o.value)
              setOpen(false)
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.07]"
          >
            <o.icon className="size-4 text-zinc-400" />
            <span className="flex-1">
              <span className="block text-sm text-zinc-100">{o.label}</span>
              <span className="block text-xs text-zinc-500">{o.hint}</span>
            </span>
            {o.value === value && <Check className="size-4 text-white" />}
          </button>
        ))}
      </Popover>
    </div>
  )
}

function Tile({
  children,
  onRemove,
  label,
  status,
  error,
  badge,
  caption,
}: {
  children: ReactNode
  onRemove: () => void
  label: string
  status?: Attachment['status']
  error?: string
  badge?: string
  caption?: string
}) {
  return (
    <div
      className={cn(
        'group relative size-16 shrink-0 overflow-hidden rounded-xl border bg-white/5',
        status === 'error' ? 'border-rose-500/70' : badge ? 'border-[#b7a6f7]/60' : 'border-white/10',
      )}
      title={error ?? label}
    >
      {children}
      {badge && (
        <span className="absolute top-1 left-1 rounded-md bg-black/70 px-1 py-px text-[9px] font-semibold tracking-wide text-[#cfc3ff] uppercase backdrop-blur">
          {badge}
        </span>
      )}
      {caption && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-1 pt-3 pb-0.5 text-[9.5px] font-medium text-white">
          {caption}
        </span>
      )}
      {(status === 'checking' || status === 'uploading') && (
        <span className="absolute inset-0 grid place-items-center bg-black/60" aria-label="Uploading">
          <Spinner className="size-5 text-white" />
        </span>
      )}
      {status === 'error' && (
        <span className="absolute inset-0 grid place-items-center bg-rose-950/70 text-[10px] font-semibold text-rose-200">Failed</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/75 text-white opacity-100 transition-opacity hover:bg-black sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function TemplateTile({ template, onRemove }: { template: ComposerTemplate; onRemove: () => void }) {
  const media = template.media
  return (
    <Tile onRemove={onRemove} label={`${template.title} template`} badge="Template" caption={template.title}>
      {media?.type === 'video' ? (
        <video src={media.url} poster={media.posterUrl} muted loop autoPlay playsInline className="size-full object-cover" />
      ) : (
        <img src={media?.url ?? template.thumbnailUrl} alt="" className="size-full object-cover" />
      )}
    </Tile>
  )
}

export function Composer() {
  const c = useComposer()
  const { setUpgradeOpen, setHasNewResults, toast } = useUi()
  const create = useCreateGeneration()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [submitError, setSubmitError] = useState<ApiError | Error | null>(null)

  // Auto-grow the textarea up to a max height.
  useLayoutEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`
  }, [c.prompt])

  // When a template is applied, focus and pre-select its first [placeholder].
  useEffect(() => {
    const el = textarea.current
    if (!c.focusRequest || !el) return
    el.focus({ preventScroll: true })
    const match = /\[[^\]]+\]/.exec(el.value)
    if (match) el.setSelectionRange(match.index, match.index + match[0].length)
    else el.setSelectionRange(el.value.length, el.value.length)
    setSubmitError(null)
  }, [c.focusRequest])

  const trimmed = c.prompt.trim()
  const busy = c.attachments.some((a) => a.status === 'checking' || a.status === 'uploading')
  const failed = c.attachments.filter((a) => a.status === 'error')
  const hasVideo = c.attachments.some((a) => a.kind === 'video')
  const conflict = c.outputType === 'image' && hasVideo ? 'Video references require Video or Auto output.' : null
  const blocker = failed.length ? 'Remove failed attachments to continue.' : conflict
  const canSend = trimmed.length >= LIMITS.promptMinChars && !busy && !blocker && !create.isPending
  const nearLimit = c.prompt.length >= LIMITS.promptMaxChars * 0.8

  function submit() {
    if (create.isPending) return
    if (trimmed.length < LIMITS.promptMinChars) {
      setSubmitError(new Error(`Describe what you want to create (at least ${LIMITS.promptMinChars} characters).`))
      textarea.current?.focus()
      return
    }
    if (busy || blocker) return
    setSubmitError(null)
    create.mutate(
      {
        prompt: trimmed,
        outputType: c.outputType,
        attachmentIds: c.attachments.map((a) => a.remoteId!).filter(Boolean),
        template: c.template?.ref,
      },
      {
        onSuccess: ({ generation, credits }) => {
          c.reset()
          setHasNewResults(true)
          toast({
            title: `${generation.outputType === 'video' ? 'Video' : 'Image'} generation queued`,
            description: `${generation.cost} credit${generation.cost > 1 ? 's' : ''} used · ${credits} left. Track it in Results.`,
            variant: 'success',
          })
        },
        onError: (e) => setSubmitError(e),
      },
    )
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files)
    if (files.length) {
      e.preventDefault()
      c.addFiles(files)
    }
  }

  const isFileDrag = (e: DragEvent) => e.dataTransfer.types.includes('Files')
  const dragHandlers = {
    onDragEnter: (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      dragDepth.current++
      setDragging(true)
    },
    onDragOver: (e: DragEvent) => {
      if (isFileDrag(e)) e.preventDefault()
    },
    onDragLeave: (e: DragEvent) => {
      if (!isFileDrag(e)) return
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    },
    onDrop: (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      c.addFiles(Array.from(e.dataTransfer.files))
    },
  }

  const insufficient = submitError instanceof ApiError && submitError.code === 'insufficient_credits'
  const messages = [
    ...c.notices,
    ...failed.map((a) => `${a.file.name}: ${a.error ?? 'Upload failed.'}`),
    ...(blocker ? [blocker] : []),
    ...(submitError ? [errorMessage(submitError)] : []),
  ]

  return (
    <div className="relative w-full max-w-[680px]">
      {/* Soft glow behind the composer */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-10 -top-6 -bottom-10 -z-10 rounded-[48px] bg-[radial-gradient(60%_60%_at_30%_20%,rgba(140,130,255,0.16),transparent_70%)] blur-2xl" />

      <div className="rounded-[22px] bg-gradient-to-b from-white/25 via-white/10 to-white/[0.06] p-px shadow-[0_20px_60px_-25px_rgba(120,110,255,0.35)]">
        <div className="rounded-[21px] bg-[linear-gradient(100deg,#25253a_0%,#1a1a22_45%,#17171c_100%)]">
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] text-zinc-300 transition-colors hover:text-white"
          >
            <Sparkles className="size-3.5 text-zinc-300" />
            Unlock more features with Pro
          </button>

          <div
            {...dragHandlers}
            className={cn(
              'relative mx-1 mb-1 rounded-[18px] border bg-[#0f0f11] transition-colors',
              dragging ? 'border-[#b7a6f7]/70 bg-[#141220]' : 'border-white/[0.08]',
            )}
          >
            {(c.template || c.attachments.length > 0) && (
              <div className="flex gap-2 overflow-x-auto px-3 pt-3 no-scrollbar" aria-label="Attachments">
                {c.template && <TemplateTile template={c.template} onRemove={c.clearTemplate} />}
                {c.attachments.map((a) => (
                  <Tile
                    key={a.localId}
                    label={`${a.file.name} (${formatBytes(a.file.size)})`}
                    status={a.status}
                    error={a.error}
                    onRemove={() => c.removeAttachment(a.localId)}
                  >
                    {a.kind === 'video' ? (
                      <video src={a.previewUrl} muted playsInline preload="metadata" className="size-full object-cover" />
                    ) : (
                      <img src={a.previewUrl} alt="" className="size-full object-cover" />
                    )}
                  </Tile>
                ))}
              </div>
            )}

            <label htmlFor="composer-prompt" className="sr-only">
              Prompt
            </label>
            <textarea
              id="composer-prompt"
              ref={textarea}
              rows={3}
              value={c.prompt}
              maxLength={LIMITS.promptMaxChars}
              onChange={(e) => {
                c.setPrompt(e.target.value)
                if (submitError) setSubmitError(null)
              }}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={c.template ? 'Describe your changes, then attach your own images…' : 'Create a video ad for a skincare client.'}
              className="block min-h-[84px] w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />

            <div className="flex items-center gap-2 px-3 pb-3">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={c.attachments.length >= LIMITS.maxAttachments}
                aria-label="Add attachments"
                title={`Attach up to ${LIMITS.maxAttachments} files (${ACCEPTED_LABEL})`}
                className="grid size-8 place-items-center rounded-full border border-white/15 text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => {
                  c.addFiles(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
              <div className="h-5 w-px bg-white/10" />
              <OutputTypeSelect value={c.outputType} onChange={c.setOutputType} />

              <div className="ml-auto flex items-center gap-3">
                {nearLimit && (
                  <span
                    className={cn('text-xs tabular-nums', c.prompt.length >= LIMITS.promptMaxChars ? 'text-rose-400' : 'text-zinc-500')}
                    aria-live="polite"
                  >
                    {c.prompt.length}/{LIMITS.promptMaxChars}
                  </span>
                )}
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSend}
                  aria-label="Send"
                  className={cn(
                    'grid size-8 place-items-center rounded-full transition-colors',
                    canSend ? 'bg-white text-black hover:bg-zinc-200' : 'bg-white/10 text-zinc-500',
                  )}
                >
                  {create.isPending ? <Spinner className="size-4" /> : <ArrowUp className="size-4" strokeWidth={2.25} />}
                </button>
              </div>
            </div>

            {dragging && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[18px] bg-[#141220]/90 text-sm text-[#cfc3ff]">
                Drop images or videos to attach
              </div>
            )}
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div role="alert" className="mt-2 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-[13px] text-rose-200">
          <ul className="flex-1 space-y-0.5">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {insufficient && (
            <button type="button" onClick={() => setUpgradeOpen(true)} className="shrink-0 font-semibold text-[#cfc3ff] hover:underline">
              Get credits
            </button>
          )}
          {(c.notices.length > 0 || submitError) && (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                c.setNotices([])
                setSubmitError(null)
              }}
              className="shrink-0 text-rose-300/70 hover:text-rose-100"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
