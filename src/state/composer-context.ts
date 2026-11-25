import { createContext, useContext } from 'react'
import type { Media, MediaKind, OutputType, TemplateRef } from '../api/types'

export interface Attachment {
  localId: string
  file: File
  previewUrl: string
  kind: MediaKind
  status: 'checking' | 'uploading' | 'ready' | 'error'
  remoteId?: string
  error?: string
}

/** A template (idea / wish / tool) the current prompt was bootstrapped from. */
export interface ComposerTemplate {
  ref: TemplateRef
  title: string
  thumbnailUrl?: string
  /** Reference media that ships with the template (wishes). */
  media?: Media
}

export interface ApplyTemplateInput extends ComposerTemplate {
  prompt: string
  outputType: OutputType
}

export interface ComposerContextValue {
  prompt: string
  outputType: OutputType
  attachments: Attachment[]
  template: ComposerTemplate | null
  notices: string[]
  /** Increments whenever something outside asks the composer to take focus. */
  focusRequest: number
  setPrompt: (value: string) => void
  setOutputType: (value: OutputType) => void
  addFiles: (files: File[]) => void
  removeAttachment: (localId: string) => void
  applyTemplate: (input: ApplyTemplateInput) => void
  clearTemplate: () => void
  setNotices: (notices: string[]) => void
  reset: () => void
}

export const ComposerContext = createContext<ComposerContextValue | null>(null)

export function useComposer(): ComposerContextValue {
  const ctx = useContext(ComposerContext)
  if (!ctx) throw new Error('useComposer must be used inside <ComposerProvider>')
  return ctx
}
