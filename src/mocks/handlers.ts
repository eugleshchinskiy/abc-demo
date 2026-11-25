import { delay, http, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type {
  ApiErrorBody,
  Generation,
  GenerationRequest,
  OutputType,
  Page,
  UploadedFile,
  Wish,
} from '../api/types'
import { CREDIT_COST, LIMITS, checkFileBasics } from '../lib/limits'
import {
  CATEGORIES,
  CATEGORY_SPECS_IDS,
  FEED_LIMITS,
  FOR_YOU_ID,
  IDEAS,
  IDEAS_PER_PAGE,
  TOOLS,
  isCategory,
  makeForYouWish,
  makeWish,
  seededShuffle,
  wishById,
} from './data'
import { db, newId } from './db'

/* ------------------------------------------------------------------------ */
/* Simulated network conditions                                              */
/* ------------------------------------------------------------------------ */

/**
 * Tweak from the devtools console or the URL:
 *   ?mockFailRate=0.3   → 30% of requests fail with 503
 *   ?mockLatency=2000   → base latency in ms
 */
function readKnob(name: string, fallback: number): number {
  const fromUrl = new URLSearchParams(location.search).get(name)
  if (fromUrl !== null) localStorage.setItem(`artven:${name}`, fromUrl)
  const raw = fromUrl ?? localStorage.getItem(`artven:${name}`)
  const n = raw === null ? NaN : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

const FAIL_RATE = readKnob('mockFailRate', 0)
const BASE_LATENCY = readKnob('mockLatency', 350)

async function network() {
  await delay(BASE_LATENCY + Math.random() * BASE_LATENCY)
  if (FAIL_RATE > 0 && Math.random() < FAIL_RATE) {
    throw apiError(503, 'service_unavailable', 'The service is temporarily unavailable. Please retry.')
  }
}

function apiError(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status })
}

type Resolver = HttpResponseResolver<PathParams, DefaultBodyType, DefaultBodyType>

/** Wraps a resolver with latency + optional random failures. */
function withNetwork(resolver: Resolver): Resolver {
  return async (info) => {
    try {
      await network()
    } catch (res) {
      return res as Response
    }
    return resolver(info)
  }
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

function parsePaging(url: URL) {
  const cursor = Math.max(0, Number.parseInt(url.searchParams.get('cursor') ?? '0', 10) || 0)
  const rawLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), FEED_LIMITS.maxPageSize)
    : FEED_LIMITS.pageSize
  return { cursor, limit }
}

let searchCorpus: Wish[] | null = null
function getSearchCorpus(): Wish[] {
  searchCorpus ??= CATEGORY_SPECS_IDS.flatMap((cat) =>
    Array.from({ length: FEED_LIMITS.searchCorpusPerCategory }, (_, i) => makeWish(cat, i)),
  )
  return searchCorpus
}

function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}

function resolveOutputType(req: GenerationRequest, hasVideoInput: boolean): Exclude<OutputType, 'auto'> {
  if (req.outputType !== 'auto') return req.outputType
  if (hasVideoInput || /\b(video|animate|animation|clip|reel|motion)\b/i.test(req.prompt)) return 'video'
  return 'image'
}

/* ------------------------------------------------------------------------ */
/* Routes                                                                    */
/* ------------------------------------------------------------------------ */

export const handlers = [
  http.get(
    '/api/me',
    withNetwork(() => HttpResponse.json(db.user)),
  ),

  http.post(
    '/api/billing/top-up',
    withNetwork(() => HttpResponse.json(db.updateUser({ credits: db.user.credits + 50 }))),
  ),

  http.get(
    '/api/ideas',
    withNetwork(({ request }) => {
      const seed = Number(new URL(request.url).searchParams.get('seed') ?? 0) || 0
      const items = seed === 0 ? IDEAS.slice(0, IDEAS_PER_PAGE) : seededShuffle(IDEAS, seed).slice(0, IDEAS_PER_PAGE)
      return HttpResponse.json({ items })
    }),
  ),

  http.get(
    '/api/tools',
    withNetwork(() => HttpResponse.json({ items: TOOLS })),
  ),

  http.get(
    '/api/wishes/categories',
    withNetwork(() => HttpResponse.json({ items: CATEGORIES })),
  ),

  http.get(
    '/api/wishes',
    withNetwork(({ request }) => {
      const url = new URL(request.url)
      const category = url.searchParams.get('category') ?? FOR_YOU_ID
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      const { cursor, limit } = parsePaging(url)

      if (!isCategory(category)) {
        return apiError(404, 'unknown_category', `Unknown category “${category}”.`)
      }
      if (q.length > 100) {
        return apiError(400, 'query_too_long', 'Search query must be 100 characters or fewer.')
      }

      let page: Page<Wish>
      if (q) {
        const terms = q.split(/\s+/)
        const matches = getSearchCorpus().filter((w) => {
          if (category !== FOR_YOU_ID && w.categoryId !== category) return false
          const haystack = `${w.title} ${categoryLabel(w.categoryId)} ${w.prompt}`.toLowerCase()
          return terms.every((t) => haystack.includes(t))
        })
        const items = matches.slice(cursor, cursor + limit)
        page = { items, nextCursor: cursor + limit < matches.length ? String(cursor + limit) : null }
      } else {
        const max = category === FOR_YOU_ID ? FEED_LIMITS.forYouMaxItems : FEED_LIMITS.categoryMaxItems
        const end = Math.min(cursor + limit, max)
        const items: Wish[] = []
        for (let i = cursor; i < end; i++) {
          items.push(category === FOR_YOU_ID ? makeForYouWish(i) : makeWish(category, i))
        }
        page = { items, nextCursor: end < max ? String(end) : null }
      }
      return HttpResponse.json(page)
    }),
  ),

  http.get(
    '/api/bookmarks',
    withNetwork(() => HttpResponse.json({ ids: db.bookmarks })),
  ),

  http.put(
    '/api/bookmarks/:wishId',
    withNetwork(({ params }) => {
      const id = String(params.wishId)
      if (!wishById(id)) return apiError(404, 'not_found', 'Wish not found.')
      db.setBookmark(id, true)
      return HttpResponse.json({ ids: db.bookmarks })
    }),
  ),

  http.delete(
    '/api/bookmarks/:wishId',
    withNetwork(({ params }) => {
      db.setBookmark(String(params.wishId), false)
      return HttpResponse.json({ ids: db.bookmarks })
    }),
  ),

  http.post(
    '/api/uploads',
    withNetwork(async ({ request }) => {
      const form = await request.formData().catch(() => null)
      const file = form?.get('file')
      if (!(file instanceof File)) {
        return apiError(400, 'missing_file', 'Expected a multipart “file” field.')
      }
      const check = checkFileBasics(file)
      if (!check.ok) {
        return apiError(check.error.startsWith('Unsupported') ? 415 : 413, 'invalid_file', check.error)
      }
      // Simulate transfer time proportional to size (~20 MB/s).
      await delay(Math.min(2500, file.size / 20_000))
      const uploaded: UploadedFile = {
        id: newId('upl'),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        kind: check.kind,
      }
      db.addUpload(uploaded)
      return HttpResponse.json(uploaded, { status: 201 })
    }),
  ),

  http.get(
    '/api/generations',
    withNetwork(() => HttpResponse.json({ items: db.generations })),
  ),

  http.post(
    '/api/generations',
    withNetwork(async ({ request }) => {
      const body = (await request.json().catch(() => null)) as GenerationRequest | null
      if (!body || typeof body.prompt !== 'string') {
        return apiError(400, 'invalid_body', 'Request body must include a prompt.')
      }
      const prompt = body.prompt.trim()
      if (prompt.length < LIMITS.promptMinChars) {
        return apiError(422, 'prompt_too_short', `Prompt must be at least ${LIMITS.promptMinChars} characters.`)
      }
      if (prompt.length > LIMITS.promptMaxChars) {
        return apiError(422, 'prompt_too_long', `Prompt must be at most ${LIMITS.promptMaxChars} characters.`)
      }
      if (!['auto', 'image', 'video'].includes(body.outputType)) {
        return apiError(422, 'invalid_output_type', 'Output type must be auto, image or video.')
      }
      const ids = Array.isArray(body.attachmentIds) ? body.attachmentIds : []
      if (ids.length > LIMITS.maxAttachments) {
        return apiError(422, 'too_many_attachments', `At most ${LIMITS.maxAttachments} attachments are allowed.`)
      }
      const files = ids.map((id) => db.getUpload(id))
      if (files.some((f) => !f)) {
        return apiError(422, 'unknown_attachment', 'One or more attachments expired. Please re-attach them.')
      }
      const videos = files.filter((f) => f!.kind === 'video').length
      const templateIsVideo = body.template?.source === 'wish' && wishById(body.template.id)?.media.type === 'video'
      if (videos > LIMITS.maxVideoAttachments) {
        return apiError(422, 'too_many_videos', `Only ${LIMITS.maxVideoAttachments} video reference is allowed.`)
      }
      if (body.outputType === 'image' && videos > 0) {
        return apiError(422, 'incompatible_attachment', 'Video references require Video or Auto output.')
      }

      const outputType = resolveOutputType(body, videos > 0 || !!templateIsVideo)
      const cost = CREDIT_COST[outputType]
      if (db.user.credits < cost) {
        return apiError(402, 'insufficient_credits', `This ${outputType} needs ${cost} credits, you have ${db.user.credits}.`, {
          required: cost,
          available: db.user.credits,
        })
      }

      const generation: Generation = {
        id: newId('gen'),
        prompt,
        outputType,
        status: 'queued',
        cost,
        createdAt: new Date().toISOString(),
      }
      db.addGeneration(generation)
      const user = db.updateUser({ credits: db.user.credits - cost })
      return HttpResponse.json({ generation, credits: user.credits }, { status: 201 })
    }),
  ),

  http.post('/api/dev/reset', () => {
    db.reset()
    return new HttpResponse(null, { status: 204 })
  }),
]
