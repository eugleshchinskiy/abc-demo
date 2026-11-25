import type { CreditTransaction, Generation, Media, ProductProfile, UploadedFile, User } from '../api/types'
import { SEED_PROFILES } from './data'

/**
 * Tiny persistent "database" for the mock API. Lives in localStorage so
 * credits, bookmarks, generations and profiles survive reloads during a demo.
 */
const STORAGE_KEY = 'artven:mock-db:v2'
const WELCOME_CREDITS = 15

/** Server-side generation record: the public fields plus simulation inputs. */
export interface GenerationRecord {
  id: string
  prompt: string
  outputType: Generation['outputType']
  cost: number
  createdAt: number
  durationMs: number
  willFail: boolean
  refunded: boolean
  output: Media
  referenceCount: number
  templateTitle?: string
}

interface DbState {
  signedIn: boolean
  user: User
  bookmarks: string[]
  generations: GenerationRecord[]
  transactions: CreditTransaction[]
  profiles: ProductProfile[]
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
}

const initialState = (): DbState => {
  const createdAt = new Date().toISOString()
  return {
    signedIn: true,
    user: {
      id: 'usr_demo',
      name: 'Demo User',
      email: 'demo@artven.app',
      plan: 'free',
      credits: WELCOME_CREDITS,
      createdAt,
    },
    bookmarks: [],
    generations: [],
    transactions: [
      {
        id: newId('txn'),
        kind: 'welcome',
        amount: WELCOME_CREDITS,
        balance: WELCOME_CREDITS,
        description: 'Welcome credits',
        createdAt,
      },
    ],
    profiles: SEED_PROFILES,
  }
}

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
  get signedIn() {
    return state.signedIn
  },
  setSignedIn(value: boolean) {
    state.signedIn = value
    persist()
  },

  get user() {
    return state.user
  },
  updateUser(patch: Partial<User>) {
    state.user = { ...state.user, ...patch }
    persist()
    return state.user
  },

  /** Changes the balance and records why. */
  addCredits(amount: number, kind: CreditTransaction['kind'], description: string) {
    const balance = state.user.credits + amount
    state.user = { ...state.user, credits: balance }
    state.transactions = [
      { id: newId('txn'), kind, amount, balance, description, createdAt: new Date().toISOString() },
      ...state.transactions,
    ].slice(0, 300)
    persist()
    return state.user
  },
  get transactions() {
    return state.transactions
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
  addGeneration(g: GenerationRecord) {
    state.generations = [g, ...state.generations].slice(0, 200)
    persist()
  },
  updateGeneration(id: string, patch: Partial<GenerationRecord>) {
    state.generations = state.generations.map((g) => (g.id === id ? { ...g, ...patch } : g))
    persist()
  },
  removeGeneration(id: string) {
    state.generations = state.generations.filter((g) => g.id !== id)
    persist()
  },

  get profiles() {
    return state.profiles
  },
  addProfile(p: ProductProfile) {
    state.profiles = [...state.profiles, p]
    persist()
  },
  removeProfile(id: string) {
    state.profiles = state.profiles.filter((p) => p.id !== id)
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
