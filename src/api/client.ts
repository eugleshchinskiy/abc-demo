import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const BASE = '/api'

/** Fired when the API answers 401, so the shell can open the sign-in dialog. */
export const UNAUTHORIZED_EVENT = 'artven:unauthorized'

export async function api<T>(path: string, init: RequestInit = {}, { quiet401 = false } = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network_error', 'Network error. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T

  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const e = (body as ApiErrorBody | null)?.error
    if (res.status === 401 && !quiet401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(res.status, e?.code ?? 'http_error', e?.message ?? `Request failed (${res.status}).`, e?.details)
  }
  return body as T
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

/** Per-field messages from a 422 `validation_failed` response. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.details && typeof err.details.fields === 'object' && err.details.fields) {
    return err.details.fields as Record<string, string>
  }
  return {}
}
