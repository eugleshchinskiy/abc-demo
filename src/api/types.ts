export type OutputType = 'auto' | 'image' | 'video'
export type MediaKind = 'image' | 'video'
export type Plan = 'free' | 'pro'

export interface Media {
  type: MediaKind
  url: string
  /** Still frame for videos / low-res placeholder for images. */
  posterUrl?: string
  width: number
  height: number
}

export interface User {
  id: string
  name: string
  email: string
  plan: Plan
  credits: number
  createdAt: string
}

export interface Idea {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  prompt: string
  outputType: OutputType
}

export interface WishCategory {
  id: string
  label: string
}

/** Smart Search "Content type" options. */
export const CONTENT_TYPES = [
  { id: 'photo', label: 'Photo' },
  { id: 'video', label: 'Video' },
  { id: 'photoshoot', label: 'Photoshoot' },
  { id: 'post', label: 'Post' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'reel', label: 'Reel' },
  { id: 'stories', label: 'Stories' },
  { id: 'movie', label: 'Movie' },
  { id: 'hook', label: 'Hook' },
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]['id']

export interface Wish {
  id: string
  title: string
  categoryId: string
  contentType: ContentType
  media: Media
  prompt: string
  outputType: OutputType
}

export type ToolCategory = 'image' | 'video'
export type ToolIcon = 'image-generate' | 'image-edit' | 'videos' | 'video-extend' | 'motion-swap' | 'lipsync'

export interface Tool {
  id: string
  title: string
  description: string
  icon: ToolIcon
  category: ToolCategory
  popular: boolean
  prompt: string
  outputType: OutputType
}

/** A saved product used by Smart Search to narrow down Wishes. */
export interface ProductProfile {
  id: string
  name: string
  categoryId: string
  imageUrl: string
}

export interface ProductProfileInput {
  name: string
  categoryId: string
  /** Small data-URL thumbnail produced in the browser. */
  imageUrl: string
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  mimeType: string
  kind: MediaKind
}

export interface TemplateRef {
  source: 'idea' | 'wish' | 'tool'
  id: string
}

export interface GenerationRequest {
  prompt: string
  outputType: OutputType
  attachmentIds: string[]
  template?: TemplateRef
}

export type GenerationStatus = 'queued' | 'processing' | 'done' | 'failed'

export interface Generation {
  id: string
  prompt: string
  outputType: Exclude<OutputType, 'auto'>
  status: GenerationStatus
  /** 0–100 while processing. */
  progress: number
  cost: number
  createdAt: string
  /** Estimated or actual completion time. */
  finishesAt: string
  referenceCount: number
  templateTitle?: string
  /** Set once status is `done`. */
  output?: Media
  error?: string
}

export interface GenerationResponse {
  generation: Generation
  credits: number
}

export interface CreditTransaction {
  id: string
  kind: 'welcome' | 'top-up' | 'plan' | 'generation' | 'refund'
  /** Signed: positive adds credits. */
  amount: number
  balance: number
  description: string
  createdAt: string
}

export interface SupportTicketInput {
  topic: 'billing' | 'bug' | 'feature' | 'other'
  email: string
  message: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
