import type { MediaKind, OutputType } from '../api/types'

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
} as const

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
