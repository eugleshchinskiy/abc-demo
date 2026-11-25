import type { MediaKind, OutputType, Plan } from '../api/types'

/**
 * Shared between the client (instant feedback) and the mock API
 * (server-side re-validation), so the rules can never drift apart.
 */
export const LIMITS = {
  promptMinChars: 3,
  promptMaxChars: 2000,
  maxAttachments: 5,
  maxVideoAttachments: 1,
  imageMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  imageMinDimension: 256,
  imageMaxDimension: 8192,
  videoMaxDurationSec: 30,
  nameMinChars: 2,
  nameMaxChars: 40,
  profileNameMaxChars: 20,
  maxProfiles: 6,
  supportMinChars: 20,
  supportMaxChars: 1000,
  passwordMinChars: 8,
} as const

/** What each plan unlocks. Enforced by the mock API. */
export const PLAN_LIMITS: Record<Plan, { parallelGenerations: number; monthlyCredits: number; price: string }> = {
  free: { parallelGenerations: 2, monthlyCredits: 15, price: '$0' },
  pro: { parallelGenerations: 4, monthlyCredits: 200, price: '$19' },
}

export const ACCEPTED_TYPES: Record<string, { kind: MediaKind; extensions: string[] }> = {
  'image/jpeg': { kind: 'image', extensions: ['jpg', 'jpeg'] },
  'image/png': { kind: 'image', extensions: ['png'] },
  'image/webp': { kind: 'image', extensions: ['webp'] },
  'video/mp4': { kind: 'video', extensions: ['mp4'] },
  'video/quicktime': { kind: 'video', extensions: ['mov'] },
  'video/webm': { kind: 'video', extensions: ['webm'] },
}

export const ACCEPT_ATTR = [
  ...Object.keys(ACCEPTED_TYPES),
  ...Object.values(ACCEPTED_TYPES).flatMap((t) => t.extensions.map((e) => `.${e}`)),
].join(',')

export const ACCEPTED_LABEL = 'JPG, PNG, WEBP, MP4, MOV or WEBM'

export const CREDIT_COST: Record<Exclude<OutputType, 'auto'>, number> = {
  image: 1,
  video: 4,
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/**
 * Synchronous checks that only need the File metadata: type, extension, size.
 * Returns the detected media kind or an error message.
 */
export function checkFileBasics(
  file: Pick<File, 'name' | 'type' | 'size'>,
): { ok: true; kind: MediaKind } | { ok: false; error: string } {
  const ext = extensionOf(file.name)
  // Some OSes report an empty MIME type; fall back to the extension.
  const mime =
    file.type ||
    Object.entries(ACCEPTED_TYPES).find(([, t]) => t.extensions.includes(ext))?.[0] ||
    ''
  const spec = ACCEPTED_TYPES[mime]
  if (!spec) {
    return { ok: false, error: `Unsupported file type. Use ${ACCEPTED_LABEL}.` }
  }
  if (ext && !spec.extensions.includes(ext)) {
    return { ok: false, error: `File extension “.${ext}” doesn't match its content type.` }
  }
  if (file.size === 0) {
    return { ok: false, error: 'File is empty.' }
  }
  const max = spec.kind === 'image' ? LIMITS.imageMaxBytes : LIMITS.videoMaxBytes
  if (file.size > max) {
    return {
      ok: false,
      error: `${spec.kind === 'image' ? 'Images' : 'Videos'} must be ${formatBytes(max)} or smaller (this one is ${formatBytes(file.size)}).`,
    }
  }
  return { ok: true, kind: spec.kind }
}

/** Decodes the file in the browser to check pixel dimensions / duration. */
export async function checkFileContent(file: File, kind: MediaKind, url: string): Promise<string | null> {
  try {
    if (kind === 'image') {
      const img = new Image()
      img.src = url
      await img.decode()
      const { naturalWidth: w, naturalHeight: h } = img
      if (Math.min(w, h) < LIMITS.imageMinDimension) {
        return `Image is too small (${w}×${h}). Minimum is ${LIMITS.imageMinDimension}px on the shortest side.`
      }
      if (Math.max(w, h) > LIMITS.imageMaxDimension) {
        return `Image is too large (${w}×${h}). Maximum is ${LIMITS.imageMaxDimension}px on the longest side.`
      }
      return null
    }
    const duration = await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => resolve(video.duration)
      video.onerror = () => reject(new Error('decode'))
      video.src = url
    })
    if (Number.isFinite(duration) && duration > LIMITS.videoMaxDurationSec) {
      return `Video is ${Math.round(duration)}s long. Maximum is ${LIMITS.videoMaxDurationSec}s.`
    }
    return null
  } catch {
    // .mov files often can't be decoded by Chrome/Firefox; let the server decide.
    if (file.type === 'video/quicktime') return null
    return `Couldn't read ${kind === 'image' ? 'image' : 'video'}. The file may be corrupted.`
  }
}

/* ------------------------------------------------------------------------ */
/* Prompt & form validation (shared by UI and mock API)                      */
/* ------------------------------------------------------------------------ */

const PLACEHOLDER_RE = /\[[^\]\n]{1,60}\]/g

/** Template placeholders like “[your product]” the user hasn't replaced yet. */
export function findPlaceholders(prompt: string): string[] {
  return [...new Set(prompt.match(PLACEHOLDER_RE) ?? [])]
}

/** Tiny demo moderation list — real moderation would be server-side ML. */
const BLOCKED_TERMS = ['nsfw', 'nude', 'naked', 'gore', 'porn', 'deepfake']

export function findBlockedTerm(prompt: string): string | null {
  const lower = prompt.toLowerCase()
  return BLOCKED_TERMS.find((t) => new RegExp(`\\b${t}\\b`).test(lower)) ?? null
}

/** Returns a user-facing error for the prompt, or null when it can be sent. */
export function validatePrompt(prompt: string): string | null {
  const trimmed = prompt.trim()
  if (trimmed.length < LIMITS.promptMinChars) {
    return `Describe what you want to create (at least ${LIMITS.promptMinChars} characters).`
  }
  if (trimmed.length > LIMITS.promptMaxChars) return `Prompt must be at most ${LIMITS.promptMaxChars} characters.`
  const placeholders = findPlaceholders(trimmed)
  if (placeholders.length) {
    const list = placeholders.slice(0, 2).join(', ')
    return `Replace ${list}${placeholders.length > 2 ? ` and ${placeholders.length - 2} more` : ''} with your own details.`
  }
  const blocked = findBlockedTerm(trimmed)
  if (blocked) return `“${blocked}” isn't allowed by the content policy. Please rephrase.`
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(email: string): string | null {
  const v = email.trim()
  if (!v) return 'Email is required.'
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Enter a valid email address.'
  return null
}

export function validateName(name: string, max: number = LIMITS.nameMaxChars): string | null {
  const v = name.trim()
  if (v.length < LIMITS.nameMinChars) return `Use at least ${LIMITS.nameMinChars} characters.`
  if (v.length > max) return `Use at most ${max} characters.`
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'’&-]*$/u.test(v)) return 'Use letters, numbers, spaces and . \' - & only.'
  return null
}

/** What “Auto” resolves to — shared so the composer can show the exact cost. */
export function resolveOutputType(prompt: string, outputType: OutputType, hasVideoReference: boolean): Exclude<OutputType, 'auto'> {
  if (outputType !== 'auto') return outputType
  if (hasVideoReference || /\b(video|animate|animation|clip|reel|motion|lipsync)\b/i.test(prompt)) return 'video'
  return 'image'
}
