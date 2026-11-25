import type { Generation, UploadedFile, User } from '../api/types'

/**
 * Tiny persistent "database" for the mock API. Lives in localStorage so
 * bookmarks, credits and generations survive reloads during a demo.
 */
const STORAGE_KEY = 'artven:mock-db:v1'

interface DbState {
  user: User
  bookmarks: string[]
  generations: Generation[]
}

const initialState = (): DbState => ({
  user: {
    id: 'usr_demo',
    name: 'Demo User',
    email: 'demo@artven.app',
    plan: 'free',
    credits: 15,
  },
  bookmarks: [],
  generations: [],
})

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState(), ...(JSON.parse(raw) as Partial<DbState>) }
  } catch {
    /* corrupted storage — start fresh */
  }
  return initialState()
}

let state = load()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full / disabled — keep in-memory state */
  }
}

/** Uploads are kept in memory only (files are not persisted). */
const uploads = new Map<string, UploadedFile>()

export const db = {
  get user() {
    return state.user
  },
  updateUser(patch: Partial<User>) {
    state.user = { ...state.user, ...patch }
    persist()
    return state.user
  },

  get bookmarks() {
    return state.bookmarks
  },
  setBookmark(id: string, on: boolean) {
    const set = new Set(state.bookmarks)
    if (on) set.add(id)
    else set.delete(id)
    state.bookmarks = [...set]
    persist()
  },

  get generations() {
    return state.generations
  },
  addGeneration(g: Generation) {
    state.generations = [g, ...state.generations].slice(0, 200)
    persist()
  },

  addUpload(file: UploadedFile) {
    uploads.set(file.id, file)
  },
  getUpload(id: string) {
    return uploads.get(id)
  },

  reset() {
    state = initialState()
    uploads.clear()
    persist()
  },
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
}
