import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api } from './client'
import type {
  GenerationRequest,
  GenerationResponse,
  Idea,
  Page,
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
  wishes: (category: string, q: string) => ['wishes', category, q] as const,
  bookmarks: ['bookmarks'] as const,
}

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api<User>('/me') })
}

export function useTopUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<User>('/billing/top-up', { method: 'POST' }),
    onSuccess: (user) => qc.setQueryData(queryKeys.me, user),
  })
}

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

export function useWishes(category: string, q: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.wishes(category, q),
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ category, cursor: pageParam, limit: '20' })
      if (q) params.set('q', q)
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

export function uploadFile(file: File, signal?: AbortSignal) {
  const body = new FormData()
  body.append('file', file)
  return api<UploadedFile>('/uploads', { method: 'POST', body, signal })
}

export function useCreateGeneration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: GenerationRequest) =>
      api<GenerationResponse>('/generations', { method: 'POST', body: JSON.stringify(req) }),
    onSuccess: ({ credits }) => {
      qc.setQueryData<User>(queryKeys.me, (u) => (u ? { ...u, credits } : u))
    },
  })
}

export function useResetDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<void>('/dev/reset', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries(),
  })
}
