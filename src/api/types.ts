export type OutputType = 'auto' | 'image' | 'video'
export type MediaKind = 'image' | 'video'

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
  plan: 'free' | 'pro'
  credits: number
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

export interface Wish {
  id: string
  title: string
  categoryId: string
  media: Media
  prompt: string
  outputType: OutputType
}

export interface Tool {
  id: string
  title: string
  description: string
  icon: ToolIcon
  prompt: string
  outputType: OutputType
}

export type ToolIcon = 'eraser' | 'scale' | 'sun' | 'shirt' | 'film' | 'palette'

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

export interface Generation {
  id: string
  prompt: string
  outputType: Exclude<OutputType, 'auto'>
  status: 'queued' | 'processing' | 'done' | 'failed'
  cost: number
  createdAt: string
}

export interface GenerationResponse {
  generation: Generation
  credits: number
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}
