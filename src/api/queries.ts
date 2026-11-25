import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ApiError, api } from './client'
import type {
  ContentType,
  CreditTransaction,
  Generation,
  GenerationRequest,
  GenerationResponse,
  Idea,
  Page,
  Plan,
  ProductProfile,
  ProductProfileInput,
  SupportTicketInput,
  Tool,
  UploadedFile,
  User,
  Wish,
  WishCategory,
} from './types'

export const queryKeys = {
  me: ['me'] as const,
  ideas: (seed: number) => ['ideas', seed] as const,
  tools: ['tools'] as const,
  categories: ['wish-categories'] as const,
  wishes: (category: string, q: string, types: string) => ['wishes', category, q, types] as const,
  bookmarks: ['bookmarks'] as const,
  generations: ['generations'] as const,
  credits: ['credit-history'] as const,
  profiles: ['profiles'] as const,
}

/* --------------------------------- Account -------------------------------- */

/** Current user, or `null` when signed out (not an error state). */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await api<User>('/me', {}, { quiet401: true })
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
  })
}

function useSetMe() {
  const qc = useQueryClient()
  return (user: User | null) => qc.setQueryData(queryKeys.me, user)
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string } | 'demo') =>
      input === 'demo'
        ? api<User>('/auth/demo', { method: 'POST' })
        : api<User>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.me, user)
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(queryKeys.me, null)
      qc.setQueryData(queryKeys.bookmarks, new Set<string>())
      qc.removeQueries({ queryKey: queryKeys.generations })
      qc.removeQueries({ queryKey: queryKeys.credits })
    },
  })
}

export function useUpdateMe() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: (patch: { name: string; email: string }) => api<User>('/me', { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: setMe,
  })
}

/* --------------------------------- Billing -------------------------------- */

export function useTopUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<User>('/billing/top-up', { method: 'POST' }),
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.me, user)
      void qc.invalidateQueries({ queryKey: queryKeys.credits })
    },
  })
}

export function useSetPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (plan: Plan) => api<User>('/billing/plan', { method: 'POST', body: JSON.stringify({ plan }) }),
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.me, user)
      void qc.invalidateQueries({ queryKey: queryKeys.credits })
    },
  })
}

export function useCreditHistory(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.credits,
    queryFn: () => api<{ items: CreditTransaction[] }>('/credits/history').then((r) => r.items),
    enabled,
    staleTime: 0,
  })
}

/* --------------------------------- Content -------------------------------- */

export function useIdeas(seed: number) {
  return useQuery({
    queryKey: queryKeys.ideas(seed),
    queryFn: () => api<{ items: Idea[] }>(`/ideas?seed=${seed}`).then((r) => r.items),
    placeholderData: keepPreviousData,
  })
}

export function useTools() {
  return useQuery({
    queryKey: queryKeys.tools,
    queryFn: () => api<{ items: Tool[] }>('/tools').then((r) => r.items),
    staleTime: Infinity,
  })
}

export function useWishCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => api<{ items: WishCategory[] }>('/wishes/categories').then((r) => r.items),
    staleTime: Infinity,
  })
}

export function useWishes(category: string, q: string, types: readonly ContentType[]) {
  const typesKey = [...types].sort().join(',')
  return useInfiniteQuery({
    queryKey: queryKeys.wishes(category, q, typesKey),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ category, cursor: pageParam, limit: '20' })
      if (q) params.set('q', q)
      if (typesKey) params.set('types', typesKey)
      return api<Page<Wish>>(`/wishes?${params}`, { signal })
    },
    initialPageParam: '0',
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 5 * 60_000,
  })
}

export function useBookmarks() {
  return useQuery({
    queryKey: queryKeys.bookmarks,
    queryFn: () => api<{ ids: string[] }>('/bookmarks').then((r) => new Set(r.ids)),
    staleTime: Infinity,
  })
}

/** Optimistic bookmark toggle with rollback on failure. */
export function useToggleBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) =>
      api<{ ids: string[] }>(`/bookmarks/${encodeURIComponent(id)}`, { method: on ? 'PUT' : 'DELETE' }),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: queryKeys.bookmarks })
      const previous = qc.getQueryData<Set<string>>(queryKeys.bookmarks)
      const next = new Set(previous)
      if (on) next.add(id)
      else next.delete(id)
      qc.setQueryData(queryKeys.bookmarks, next)
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.bookmarks, ctx.previous)
    },
    onSuccess: (res) => qc.setQueryData(queryKeys.bookmarks, new Set(res.ids)),
  })
}

/* ---------------------------- Product profiles ---------------------------- */

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: () => api<{ items: ProductProfile[] }>('/profiles').then((r) => r.items),
    staleTime: Infinity,
  })
}

export function useCreateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductProfileInput) => api<ProductProfile>('/profiles', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (profile) => qc.setQueryData<ProductProfile[]>(queryKeys.profiles, (list) => [...(list ?? []), profile]),
  })
}

export function useDeleteProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: (_res, id) => qc.setQueryData<ProductProfile[]>(queryKeys.profiles, (list) => list?.filter((p) => p.id !== id)),
  })
}

/* ------------------------------- Generations ------------------------------ */

export function uploadFile(file: File, signal?: AbortSignal) {
  const body = new FormData()
  body.append('file', file)
  return api<UploadedFile>('/uploads', { method: 'POST', body, signal })
}

const isActive = (g: Generation) => g.status === 'queued' || g.status === 'processing'

/** Polls every second while any job is running. */
export function useGenerations(enabled = true) {
  return useQuery({
    queryKey: queryKeys.generations,
    queryFn: () => api<{ items: Generation[] }>('/generations').then((r) => r.items),
    enabled,
    refetchInterval: (query) => (query.state.data?.some(isActive) ? 1000 : false),
  })
}

export function useCreateGeneration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: GenerationRequest) =>
      api<GenerationResponse>('/generations', { method: 'POST', body: JSON.stringify(req) }),
    onSuccess: ({ generation, credits }) => {
      qc.setQueryData<User | null>(queryKeys.me, (u) => (u ? { ...u, credits } : u))
      qc.setQueryData<Generation[]>(queryKeys.generations, (list) => [generation, ...(list ?? [])])
      void qc.invalidateQueries({ queryKey: queryKeys.generations })
      void qc.invalidateQueries({ queryKey: queryKeys.credits })
    },
  })
}

export function useDeleteGeneration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/generations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: (_res, id) => qc.setQueryData<Generation[]>(queryKeys.generations, (list) => list?.filter((g) => g.id !== id)),
  })
}

/* --------------------------------- Support -------------------------------- */

export function useSupportTicket() {
  return useMutation({
    mutationFn: (input: SupportTicketInput) =>
      api<{ ticketId: string }>('/support', { method: 'POST', body: JSON.stringify(input) }),
  })
}

export function useResetDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/dev/reset', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries(),
  })
}
