import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { errorMessage } from '../api/client'
import { uploadFile } from '../api/queries'
import type { OutputType } from '../api/types'
import { LIMITS, checkFileBasics, checkFileContent } from '../lib/limits'
import {
  ComposerContext,
  type ApplyTemplateInput,
  type Attachment,
  type ComposerContextValue,
  type ComposerTemplate,
} from './composer-context'

const fingerprint = (f: File) => `${f.name}:${f.size}:${f.lastModified}`

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [prompt, setPromptState] = useState('')
  const [outputType, setOutputType] = useState<OutputType>('auto')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [template, setTemplate] = useState<ComposerTemplate | null>(null)
  const [notices, setNotices] = useState<string[]>([])
  const [focusRequest, setFocusRequest] = useState(0)

  // Mirrors of state for use inside async callbacks.
  const attachmentsRef = useRef(attachments)
  useLayoutEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])
  const controllers = useRef(new Map<string, AbortController>())

  const patch = useCallback((localId: string, update: Partial<Attachment>) => {
    setAttachments((list) => list.map((a) => (a.localId === localId ? { ...a, ...update } : a)))
  }, [])

  const setPrompt = useCallback((value: string) => {
    // Hard cap — the textarea also has maxLength, this guards pastes via API.
    setPromptState(value.slice(0, LIMITS.promptMaxChars))
  }, [])

  const processAttachment = useCallback(
    async (att: Attachment) => {
      const controller = new AbortController()
      controllers.current.set(att.localId, controller)
      try {
        const contentError = await checkFileContent(att.file, att.kind, att.previewUrl)
        if (controller.signal.aborted) return
        if (contentError) {
          patch(att.localId, { status: 'error', error: contentError })
          return
        }
        patch(att.localId, { status: 'uploading' })
        const uploaded = await uploadFile(att.file, controller.signal)
        patch(att.localId, { status: 'ready', remoteId: uploaded.id })
      } catch (err) {
        if (controller.signal.aborted) return
        patch(att.localId, { status: 'error', error: errorMessage(err) })
      } finally {
        controllers.current.delete(att.localId)
      }
    },
    [patch],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const current = attachmentsRef.current
      const errors: string[] = []
      const accepted: Attachment[] = []
      const seen = new Set(current.map((a) => fingerprint(a.file)))
      let count = current.length
      let videos = current.filter((a) => a.kind === 'video').length

      for (const file of files) {
        const basics = checkFileBasics(file)
        if (!basics.ok) {
          errors.push(`${file.name}: ${basics.error}`)
          continue
        }
        if (seen.has(fingerprint(file))) {
          errors.push(`${file.name}: already attached.`)
          continue
        }
        if (count >= LIMITS.maxAttachments) {
          errors.push(`${file.name}: you can attach up to ${LIMITS.maxAttachments} files.`)
          continue
        }
        if (basics.kind === 'video' && videos >= LIMITS.maxVideoAttachments) {
          errors.push(`${file.name}: only ${LIMITS.maxVideoAttachments} video reference is allowed.`)
          continue
        }
        seen.add(fingerprint(file))
        count++
        if (basics.kind === 'video') videos++
        accepted.push({
          localId: crypto.randomUUID(),
          file,
          kind: basics.kind,
          previewUrl: URL.createObjectURL(file),
          status: 'checking',
        })
      }

      setNotices(errors)
      if (accepted.length) {
        setAttachments((list) => [...list, ...accepted])
        accepted.forEach((a) => void processAttachment(a))
      }
    },
    [processAttachment],
  )

  const removeAttachment = useCallback((localId: string) => {
    controllers.current.get(localId)?.abort()
    setAttachments((list) => {
      const target = list.find((a) => a.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return list.filter((a) => a.localId !== localId)
    })
  }, [])

  const applyTemplate = useCallback(({ prompt: p, outputType: o, ...tpl }: ApplyTemplateInput) => {
    setPromptState(p.slice(0, LIMITS.promptMaxChars))
    setOutputType(o)
    setTemplate(tpl)
    setNotices([])
    setFocusRequest((n) => n + 1)
  }, [])

  const clearTemplate = useCallback(() => setTemplate(null), [])

  const reset = useCallback(() => {
    controllers.current.forEach((c) => c.abort())
    controllers.current.clear()
    attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl))
    setAttachments([])
    setPromptState('')
    setTemplate(null)
    setNotices([])
  }, [])

  // Revoke object URLs on unmount.
  useEffect(
    () => () => {
      attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl))
    },
    [],
  )

  const value = useMemo<ComposerContextValue>(
    () => ({
      prompt,
      outputType,
      attachments,
      template,
      notices,
      focusRequest,
      setPrompt,
      setOutputType,
      addFiles,
      removeAttachment,
      applyTemplate,
      clearTemplate,
      setNotices,
      reset,
    }),
    [prompt, outputType, attachments, template, notices, focusRequest, setPrompt, addFiles, removeAttachment, applyTemplate, clearTemplate, reset],
  )

  return <ComposerContext value={value}>{children}</ComposerContext>
}
