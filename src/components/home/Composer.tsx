import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Check, Image as ImageIcon, Play, Sparkles, Video, type LucideIcon } from 'lucide-react'
import { ApiError, errorMessage } from '../../api/client'
import { useCreateGeneration, useMe } from '../../api/queries'
import type { OutputType } from '../../api/types'
import { cn } from '../../lib/cn'
import { ACCEPT_ATTR, ACCEPTED_LABEL, CREDIT_COST, LIMITS, findPlaceholders, formatBytes, resolveOutputType, validatePrompt } from '../../lib/limits'
import { useComposer, type Attachment, type ComposerTemplate } from '../../state/composer-context'
import { useUi } from '../../state/ui-context'
import { Icon } from '../ui/Icon'
import { IconButton, Popover, Spinner } from '../ui/primitives'

const OUTPUTS: { value: OutputType; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'auto', label: 'Auto', icon: Sparkles, hint: 'Picks image or video from your prompt' },
  { value: 'image', label: 'Image', icon: ImageIcon, hint: `${CREDIT_COST.image} credit` },
  { value: 'video', label: 'Video', icon: Video, hint: `${CREDIT_COST.video} credits` },
]

/** Figma "mode-select". */
function OutputTypeSelect({ value, onChange }: { value: OutputType; onChange: (v: OutputType) => void }) {
  const [open, setOpen] = useState(false)
  const current = OUTPUTS.find((o) => o.value === value)!
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Output type: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-[7px] rounded-3xl bg-container px-3 text-xs leading-[11px] font-medium text-white transition-colors hover:bg-container-2 focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none"
      >
        <Icon name="adjustments" />
        {current.label}
        <Icon name="chevron-down" size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} align="left" label="Output type" className="top-[calc(100%+8px)] w-64 p-2">
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
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
          >
            <o.icon className="size-4 text-secondary" />
            <span className="flex-1">
              <span className="block text-[13px] text-white">{o.label}</span>
              <span className="block text-[11px] text-tertiary">{o.hint}</span>
            </span>
            {o.value === value && <Check className="size-4 text-purple" />}
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
        'group relative size-16 shrink-0 overflow-hidden rounded-xl bg-container ring-1',
        status === 'error' ? 'ring-danger/80' : badge ? 'ring-purple/70' : 'ring-white/[0.08]',
      )}
      title={error ?? label}
    >
      {children}
      {badge && (
        <span className="absolute top-1 left-1 rounded-md bg-black/70 px-1 py-px text-[9px] font-semibold tracking-wide text-purple uppercase backdrop-blur">
          {badge}
        </span>
      )}
      {caption && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-1 pt-3 pb-0.5 text-[9.5px] font-semibold text-white">
          {caption}
        </span>
      )}
      {(status === 'checking' || status === 'uploading') && (
        <span className="absolute inset-0 grid place-items-center bg-black/60" aria-label={status === 'checking' ? 'Checking file' : 'Uploading'}>
          <Spinner className="size-5 text-white" />
        </span>
      )}
      {status === 'error' && (
        <span className="absolute inset-0 grid place-items-center bg-[#3a1212]/80 text-[10px] font-semibold text-danger">Failed</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/75 text-white transition-opacity hover:bg-black sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        <Icon name="close" size={14} />
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
      ) : media || template.thumbnailUrl ? (
        <img src={media?.url ?? template.thumbnailUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center bg-control">
          <Icon name="adjustments" className="text-white" />
        </span>
      )}
    </Tile>
  )
}

/** Selects the next “[placeholder]” after the caret (wraps around). */
function selectNextPlaceholder(el: HTMLTextAreaElement, from = el.selectionEnd): boolean {
  const re = /\[[^\]\n]{1,60}\]/g
  const matches = [...el.value.matchAll(re)]
  if (!matches.length) return false
  const next = matches.find((m) => m.index! >= from) ?? matches[0]
  el.focus({ preventScroll: true })
  el.setSelectionRange(next.index!, next.index! + next[0].length)
  return true
}

const isFileDrag = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')

export function Composer() {
  const c = useComposer()
  const { data: me } = useMe()
  const { openDialog, toast } = useUi()
  const create = useCreateGeneration()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [submitError, setSubmitError] = useState<Error | null>(null)
  const { addFiles } = c

  // Auto-grow the textarea (Figma body is 74px) up to a max height.
  useLayoutEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 74), 260)}px`
  }, [c.prompt])

  // When a template is applied, focus and pre-select its first [placeholder].
  useEffect(() => {
    const el = textarea.current
    if (!c.focusRequest || !el) return
    if (!selectNextPlaceholder(el, 0)) {
      el.focus({ preventScroll: true })
      el.setSelectionRange(el.value.length, el.value.length)
    }
    setSubmitError(null)
  }, [c.focusRequest])

  // Files can be dropped anywhere on the page, not only on the composer.
  useEffect(() => {
    let depth = 0
    const onEnter = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      depth++
      setDragging(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => {
      if (isFileDrag(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      addFiles(Array.from(e.dataTransfer!.files))
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [addFiles])

  const trimmed = c.prompt.trim()
  const busy = c.attachments.some((a) => a.status === 'checking' || a.status === 'uploading')
  const failed = c.attachments.filter((a) => a.status === 'error')
  const hasVideo = c.attachments.some((a) => a.kind === 'video') || c.template?.media?.type === 'video'
  const placeholders = findPlaceholders(c.prompt)
  const conflict = c.outputType === 'image' && c.attachments.some((a) => a.kind === 'video') ? 'Video references require Video or Auto output.' : null
  const blocker = failed.length ? 'Remove failed attachments to continue.' : conflict
  const canSend = trimmed.length >= LIMITS.promptMinChars && !busy && !blocker && !create.isPending
  const nearLimit = c.prompt.length >= LIMITS.promptMaxChars * 0.8
  const resolved = resolveOutputType(trimmed, c.outputType, hasVideo)
  const cost = CREDIT_COST[resolved]

  function submit() {
    if (create.isPending) return
    if (me === null) {
      openDialog('sign-in')
      return
    }
    const promptError = validatePrompt(trimmed)
    if (promptError) {
      setSubmitError(new Error(promptError))
      if (!textarea.current || !selectNextPlaceholder(textarea.current, 0)) textarea.current?.focus()
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
          toast({
            title: `${generation.outputType === 'video' ? 'Video' : 'Image'} is generating`,
            description: `${generation.cost} credit${generation.cost > 1 ? 's' : ''} used · ${credits} left. We'll let you know when it's ready.`,
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
    } else if (e.key === 'Tab' && !e.shiftKey && placeholders.length) {
      // Tab hops between template placeholders, like snippets in an editor.
      e.preventDefault()
      selectNextPlaceholder(e.currentTarget)
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files)
    if (files.length) {
      e.preventDefault()
      c.addFiles(files)
    }
  }

  function openFilePicker() {
    if (me === null) openDialog('sign-in')
    else fileInput.current?.click()
  }

  const errorCode = submitError instanceof ApiError ? submitError.code : null
  const messages = [
    ...c.notices,
    ...failed.map((a) => `${a.file.name}: ${a.error ?? 'Upload failed.'}`),
    ...(blocker ? [blocker] : []),
    ...(submitError ? [errorMessage(submitError)] : []),
  ]

  return (
    <div className="relative w-full max-w-[786px]">
      {/* Figma "create": gradient frame around the form */}
      <div className={cn('rounded-3xl bg-chat-bar px-1 pb-1 transition-shadow', dragging && 'shadow-[0_0_0_2px_var(--color-purple)]')}>
        {me?.plan === 'pro' ? (
          <p className="flex items-center gap-1 px-3 pt-3 pb-2 text-xs leading-none font-medium text-white/80">
            <Icon name="token" className="text-purple" />
            Pro · {CREDIT_COST.video} credits per video, 4 generations at a time
          </p>
        ) : (
          <button
            type="button"
            onClick={() => openDialog('subscription')}
            className="flex items-center gap-1 px-3 pt-3 pb-2 text-xs leading-none font-medium text-white/80 transition-colors hover:text-white"
          >
            <Icon name="token" className="text-purple" />
            Unlock more features with Pro
          </button>
        )}

        {/* Figma "creative-form" */}
        <div className="relative flex min-h-[136px] flex-col gap-2 rounded-[20px] bg-bg p-3">
          {(c.template || c.attachments.length > 0) && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pt-1 pb-1" aria-label="Attachments">
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
                    <>
                      <video src={a.previewUrl} muted playsInline preload="metadata" className="size-full object-cover" />
                      <Play className="absolute bottom-1 left-1 size-3 fill-white text-white" />
                    </>
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
            className="block min-h-[74px] w-full resize-none bg-transparent px-1 text-[13px] leading-5 text-white placeholder:text-secondary focus:outline-none"
          />

          {/* Figma "composer-controls" */}
          <div className="flex items-center gap-2">
            <IconButton
              icon="add"
              label={`Attach images or videos (up to ${LIMITS.maxAttachments}: ${ACCEPTED_LABEL})`}
              onClick={openFilePicker}
              disabled={c.attachments.length >= LIMITS.maxAttachments}
            />
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
            <div className="h-4 w-px rounded bg-container-2" />
            <OutputTypeSelect value={c.outputType} onChange={c.setOutputType} />

            <div className="ml-auto flex items-center gap-3">
              {nearLimit && (
                <span className={cn('text-xs tabular-nums', c.prompt.length >= LIMITS.promptMaxChars ? 'text-danger' : 'text-tertiary')} aria-live="polite">
                  {c.prompt.length}/{LIMITS.promptMaxChars}
                </span>
              )}
              {trimmed.length > 0 && (
                <span className="hidden items-center gap-1 text-xs text-tertiary sm:flex" title={`${resolved === 'video' ? 'Video' : 'Image'} output`}>
                  <Icon name="token" size={16} className="text-purple" />
                  {cost}
                </span>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                aria-label={`Generate (${cost} credit${cost > 1 ? 's' : ''})`}
                className={cn(
                  'grid size-8 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-purple/70 focus-visible:outline-none',
                  canSend ? 'bg-white text-bg-dark hover:bg-[#e6e6e6]' : 'bg-container text-secondary',
                )}
              >
                {create.isPending ? <Spinner className="size-4" /> : <Icon name="send" />}
              </button>
            </div>
          </div>

          {dragging && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[20px] bg-bg/90 text-[13px] font-semibold text-purple">
              Drop images or videos to attach
            </div>
          )}
        </div>
      </div>

      {placeholders.length > 0 && !submitError && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-xs text-tertiary">
          <span>Fill in</span>
          {placeholders.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                const el = textarea.current
                if (el) selectNextPlaceholder(el, el.value.indexOf(p))
              }}
              className="rounded-3xl bg-purple-dark px-2 py-0.5 font-medium text-purple hover:bg-[#35334a]"
            >
              {p}
            </button>
          ))}
          <span className="hidden sm:inline">
            · <kbd className="font-sans">Tab</kbd> jumps to the next one
          </span>
        </div>
      )}

      {messages.length > 0 && (
        <div role="alert" className="mt-2 flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger/[0.06] px-3 py-2 text-[13px] text-[#ffc4c4]">
          <ul className="flex-1 space-y-0.5">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {(errorCode === 'insufficient_credits' || errorCode === 'too_many_running') && (
            <button type="button" onClick={() => openDialog('subscription')} className="shrink-0 font-semibold text-purple hover:underline">
              {errorCode === 'insufficient_credits' ? 'Get credits' : 'Upgrade'}
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
              className="shrink-0 text-danger/70 hover:text-white"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
