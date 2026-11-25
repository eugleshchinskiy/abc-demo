import { delay, http, HttpResponse, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import {
  CONTENT_TYPES,
  type ApiErrorBody,
  type ContentType,
  type Generation,
  type GenerationRequest,
  type OutputType,
  type Page,
  type Plan,
  type ProductProfile,
  type ProductProfileInput,
  type SupportTicketInput,
  type UploadedFile,
  type Wish,
} from '../api/types'
import {
  CREDIT_COST,
  LIMITS,
  PLAN_LIMITS,
  checkFileBasics,
  resolveOutputType,
  validateEmail,
  validateName,
  validatePrompt,
} from '../lib/limits'
import {
  CATEGORIES,
  CATEGORY_SPECS_IDS,
  FEED_LIMITS,
  FOR_YOU_ID,
  IDEAS,
  IDEAS_PER_PAGE,
  TOOLS,
  generateOutput,
  isCategory,
  makeForYouWish,
  makeWish,
  seededShuffle,
  wishById,
} from './data'
import { db, newId, type GenerationRecord } from './db'

/* ------------------------------------------------------------------------ */
/* Simulated network conditions                                              */
/* ------------------------------------------------------------------------ */

/**
 * Tweak from the URL (values are remembered in localStorage):
 *   ?mockFailRate=0.3   → 30% of requests fail with 503
 *   ?mockLatency=2000   → base latency in ms
 *   ?mockGenFailRate=1  → every generation fails (credits get refunded)
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
const GEN_FAIL_RATE = readKnob('mockGenFailRate', 0.1)

async function network() {
  await delay(BASE_LATENCY + Math.random() * BASE_LATENCY)
  if (FAIL_RATE > 0 && Math.random() < FAIL_RATE) {
    throw apiError(503, 'service_unavailable', 'The service is temporarily unavailable. Please retry.')
  }
}

function apiError(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status })
}

const unauthorized = () => apiError(401, 'unauthorized', 'Please log in to continue.')

type Resolver = HttpResponseResolver<PathParams, DefaultBodyType, DefaultBodyType>

/** Wraps a resolver with latency, optional random failures and the auth guard. */
function route(resolver: Resolver, { auth = false } = {}): Resolver {
  return async (info) => {
    try {
      await network()
    } catch (res) {
      return res as Response
    }
    if (auth && !db.signedIn) return unauthorized()
    settleGenerations()
    return resolver(info)
  }
}

async function readJson<T>(request: Request): Promise<Partial<T> | null> {
  const body: unknown = await request.json().catch(() => null)
  return body && typeof body === 'object' ? (body as Partial<T>) : null
}

/* ------------------------------------------------------------------------ */
/* Generations — status is derived from the clock, like a real job queue     */
/* ------------------------------------------------------------------------ */

const QUEUE_MS = 1200

function isRunning(r: GenerationRecord, now = Date.now()) {
  return now - r.createdAt < r.durationMs
}

/** Refunds failed jobs exactly once, so the balance is right on every read. */
function settleGenerations() {
  const now = Date.now()
  for (const r of db.generations) {
    if (r.willFail && !r.refunded && !isRunning(r, now)) {
      db.updateGeneration(r.id, { refunded: true })
      db.addCredits(r.cost, 'refund', `Refund · failed ${r.outputType}`)
    }
  }
}

function toGeneration(r: GenerationRecord, now = Date.now()): Generation {
  const elapsed = now - r.createdAt
  const base = {
    id: r.id,
    prompt: r.prompt,
    outputType: r.outputType,
    cost: r.cost,
    createdAt: new Date(r.createdAt).toISOString(),
    finishesAt: new Date(r.createdAt + r.durationMs).toISOString(),
    referenceCount: r.referenceCount,
    templateTitle: r.templateTitle,
  }
  if (elapsed < QUEUE_MS) return { ...base, status: 'queued', progress: 0 }
  if (elapsed < r.durationMs) {
    const progress = Math.min(99, Math.round(((elapsed - QUEUE_MS) / (r.durationMs - QUEUE_MS)) * 100))
    return { ...base, status: 'processing', progress }
  }
  if (r.willFail) {
    return { ...base, status: 'failed', progress: 100, error: 'The model couldn’t render this one. Your credits were refunded.' }
  }
  return { ...base, status: 'done', progress: 100, output: r.output }
}

/* ------------------------------------------------------------------------ */
/* Wishes feed helpers                                                       */
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

const CONTENT_TYPE_IDS = new Set<string>(CONTENT_TYPES.map((t) => t.id))

/* ------------------------------------------------------------------------ */
/* Routes                                                                    */
/* ------------------------------------------------------------------------ */

export const handlers = [
  /* ---------------------------- Auth & account --------------------------- */

  http.get('/api/me', route(() => HttpResponse.json(db.user), { auth: true })),

  http.patch(
    '/api/me',
    route(
      async ({ request }) => {
        const body = await readJson<{ name: string; email: string }>(request)
        const name = String(body?.name ?? '')
        const email = String(body?.email ?? '')
        const errors: Record<string, string> = {}
        const nameError = validateName(name)
        const emailError = validateEmail(email)
        if (nameError) errors.name = nameError
        if (emailError) errors.email = emailError
        if (Object.keys(errors).length) return apiError(422, 'validation_failed', 'Please fix the highlighted fields.', { fields: errors })
        return HttpResponse.json(db.updateUser({ name: name.trim(), email: email.trim().toLowerCase() }))
      },
      { auth: true },
    ),
  ),

  http.post(
    '/api/auth/login',
    route(async ({ request }) => {
      const body = await readJson<{ email: string; password: string }>(request)
      const email = String(body?.email ?? '')
      const password = String(body?.password ?? '')
      const errors: Record<string, string> = {}
      const emailError = validateEmail(email)
      if (emailError) errors.email = emailError
      if (password.length < LIMITS.passwordMinChars) errors.password = `Password must be at least ${LIMITS.passwordMinChars} characters.`
      if (Object.keys(errors).length) return apiError(422, 'validation_failed', 'Please fix the highlighted fields.', { fields: errors })
      db.setSignedIn(true)
      return HttpResponse.json(db.updateUser({ email: email.trim().toLowerCase() }))
    }),
  ),

  http.post(
    '/api/auth/demo',
    route(() => {
      db.setSignedIn(true)
      return HttpResponse.json(db.user)
    }),
  ),

  http.post(
    '/api/auth/logout',
    route(() => {
      db.setSignedIn(false)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  /* ------------------------------- Billing ------------------------------- */

  http.post(
    '/api/billing/top-up',
    route(() => HttpResponse.json(db.addCredits(50, 'top-up', 'Credit pack · 50 credits')), { auth: true }),
  ),

  http.post(
    '/api/billing/plan',
    route(
      async ({ request }) => {
        const body = await readJson<{ plan: Plan }>(request)
        const plan = body?.plan
        if (plan !== 'free' && plan !== 'pro') return apiError(422, 'invalid_plan', 'Plan must be “free” or “pro”.')
        if (db.user.plan === plan) return apiError(409, 'same_plan', `You're already on the ${plan === 'pro' ? 'Pro' : 'Free'} plan.`)
        db.updateUser({ plan })
        if (plan === 'pro') db.addCredits(PLAN_LIMITS.pro.monthlyCredits, 'plan', 'Pro plan · monthly credits')
        return HttpResponse.json(db.user)
      },
      { auth: true },
    ),
  ),

  http.get(
    '/api/credits/history',
    route(() => HttpResponse.json({ items: db.transactions }), { auth: true }),
  ),

  /* ------------------------------- Content ------------------------------- */

  http.get(
    '/api/ideas',
    route(({ request }) => {
      const seed = Number(new URL(request.url).searchParams.get('seed') ?? 0) || 0
      const items = seed === 0 ? IDEAS.slice(0, IDEAS_PER_PAGE) : seededShuffle(IDEAS, seed).slice(0, IDEAS_PER_PAGE)
      return HttpResponse.json({ items })
    }),
  ),

  http.get('/api/tools', route(() => HttpResponse.json({ items: TOOLS }))),

  http.get('/api/wishes/categories', route(() => HttpResponse.json({ items: CATEGORIES }))),

  http.get(
    '/api/wishes',
    route(({ request }) => {
      const url = new URL(request.url)
      const category = url.searchParams.get('category') ?? FOR_YOU_ID
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      const types = (url.searchParams.get('types') ?? '').split(',').filter(Boolean)
      const { cursor, limit } = parsePaging(url)

      if (!isCategory(category)) {
        return apiError(404, 'unknown_category', `Unknown category “${category}”.`)
      }
      if (q.length > 100) {
        return apiError(400, 'query_too_long', 'Search query must be 100 characters or fewer.')
      }
      const unknownType = types.find((t) => !CONTENT_TYPE_IDS.has(t))
      if (unknownType) return apiError(400, 'unknown_content_type', `Unknown content type “${unknownType}”.`)
      const typeSet = new Set(types as ContentType[])
      const matchesType = (w: Wish) => typeSet.size === 0 || typeSet.has(w.contentType)

      let page: Page<Wish>
      if (q) {
        const terms = q.split(/\s+/)
        const matches = getSearchCorpus().filter((w) => {
          if (category !== FOR_YOU_ID && w.categoryId !== category) return false
          if (!matchesType(w)) return false
          const haystack = `${w.title} ${categoryLabel(w.categoryId)} ${w.contentType} ${w.prompt}`.toLowerCase()
          return terms.every((t) => haystack.includes(t))
        })
        const items = matches.slice(cursor, cursor + limit)
        page = { items, nextCursor: cursor + limit < matches.length ? String(cursor + limit) : null }
      } else {
        // Cursor is an index into the underlying feed, so filtering never skips or repeats items.
        const max = category === FOR_YOU_ID ? FEED_LIMITS.forYouMaxItems : FEED_LIMITS.categoryMaxItems
        const items: Wish[] = []
        let i = cursor
        for (; i < max && items.length < limit; i++) {
          const wish = category === FOR_YOU_ID ? makeForYouWish(i) : makeWish(category, i)
          if (matchesType(wish)) items.push(wish)
        }
        page = { items, nextCursor: i < max ? String(i) : null }
      }
      return HttpResponse.json(page)
    }),
  ),

  /* ------------------------------ Bookmarks ------------------------------ */

  http.get('/api/bookmarks', route(() => HttpResponse.json({ ids: db.signedIn ? db.bookmarks : [] }))),

  http.put(
    '/api/bookmarks/:wishId',
    route(
      ({ params }) => {
        const id = String(params.wishId)
        if (!wishById(id)) return apiError(404, 'not_found', 'Wish not found.')
        db.setBookmark(id, true)
        return HttpResponse.json({ ids: db.bookmarks })
      },
      { auth: true },
    ),
  ),

  http.delete(
    '/api/bookmarks/:wishId',
    route(
      ({ params }) => {
        db.setBookmark(String(params.wishId), false)
        return HttpResponse.json({ ids: db.bookmarks })
      },
      { auth: true },
    ),
  ),

  /* -------------------------- Product profiles --------------------------- */

  http.get('/api/profiles', route(() => HttpResponse.json({ items: db.profiles }))),

  http.post(
    '/api/profiles',
    route(
      async ({ request }) => {
        const body = await readJson<ProductProfileInput>(request)
        const name = String(body?.name ?? '').trim()
        const categoryId = String(body?.categoryId ?? '')
        const imageUrl = String(body?.imageUrl ?? '')
        const errors: Record<string, string> = {}
        const nameError = validateName(name, LIMITS.profileNameMaxChars)
        if (nameError) errors.name = nameError
        else if (db.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) errors.name = 'You already have a profile with this name.'
        if (!isCategory(categoryId) || categoryId === FOR_YOU_ID) errors.categoryId = 'Pick a category.'
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(imageUrl) || imageUrl.length > 300_000) errors.image = 'Add a product photo.'
        if (Object.keys(errors).length) return apiError(422, 'validation_failed', 'Please fix the highlighted fields.', { fields: errors })
        if (db.profiles.length >= LIMITS.maxProfiles) {
          return apiError(409, 'profile_limit', `You can keep up to ${LIMITS.maxProfiles} product profiles. Remove one first.`)
        }
        const profile: ProductProfile = { id: newId('prf'), name, categoryId, imageUrl }
        db.addProfile(profile)
        return HttpResponse.json(profile, { status: 201 })
      },
      { auth: true },
    ),
  ),

  http.delete(
    '/api/profiles/:id',
    route(
      ({ params }) => {
        db.removeProfile(String(params.id))
        return new HttpResponse(null, { status: 204 })
      },
      { auth: true },
    ),
  ),

  /* ------------------------------- Uploads ------------------------------- */

  http.post(
    '/api/uploads',
    route(
      async ({ request }) => {
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
      },
      { auth: true },
    ),
  ),

  /* ----------------------------- Generations ----------------------------- */

  http.get(
    '/api/generations',
    route(() => {
      const now = Date.now()
      return HttpResponse.json({ items: db.generations.map((r) => toGeneration(r, now)) })
    }, { auth: true }),
  ),

  http.post(
    '/api/generations',
    route(
      async ({ request }) => {
        const body = await readJson<GenerationRequest>(request)
        if (!body || typeof body.prompt !== 'string') {
          return apiError(400, 'invalid_body', 'Request body must include a prompt.')
        }
        const prompt = body.prompt.trim()
        const promptError = validatePrompt(prompt)
        if (promptError) return apiError(422, 'invalid_prompt', promptError)
        if (!['auto', 'image', 'video'].includes(body.outputType ?? '')) {
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
        const template = body.template?.source === 'wish' ? wishById(body.template.id) : null
        if (videos > LIMITS.maxVideoAttachments) {
          return apiError(422, 'too_many_videos', `Only ${LIMITS.maxVideoAttachments} video reference is allowed.`)
        }
        if (body.outputType === 'image' && videos > 0) {
          return apiError(422, 'incompatible_attachment', 'Video references require Video or Auto output.')
        }

        const { parallelGenerations } = PLAN_LIMITS[db.user.plan]
        const running = db.generations.filter((g) => isRunning(g)).length
        if (running >= parallelGenerations) {
          return apiError(
            429,
            'too_many_running',
            `The ${db.user.plan === 'pro' ? 'Pro' : 'Free'} plan runs ${parallelGenerations} generations at a time. Wait for one to finish${db.user.plan === 'free' ? ' or upgrade to Pro' : ''}.`,
            { limit: parallelGenerations },
          )
        }

        const outputType = resolveOutputType(prompt, body.outputType as OutputType, videos > 0 || template?.media.type === 'video')
        const cost = CREDIT_COST[outputType]
        if (db.user.credits < cost) {
          return apiError(402, 'insufficient_credits', `This ${outputType} needs ${cost} credit${cost > 1 ? 's' : ''}, you have ${db.user.credits}.`, {
            required: cost,
            available: db.user.credits,
          })
        }

        const id = newId('gen')
        const record: GenerationRecord = {
          id,
          prompt,
          outputType,
          cost,
          createdAt: Date.now(),
          durationMs: (outputType === 'video' ? 14_000 : 7_000) + Math.round(Math.random() * 3000),
          willFail: Math.random() < GEN_FAIL_RATE,
          refunded: false,
          output: generateOutput(prompt, outputType, id, template?.id),
          referenceCount: ids.length + (body.template ? 1 : 0),
          templateTitle: template?.title ?? (body.template ? [...TOOLS, ...IDEAS].find((t) => t.id === body.template!.id)?.title : undefined),
        }
        db.addGeneration(record)
        const user = db.addCredits(-cost, 'generation', `${outputType === 'video' ? 'Video' : 'Image'} · “${prompt.slice(0, 40)}${prompt.length > 40 ? '…' : ''}”`)
        return HttpResponse.json({ generation: toGeneration(record), credits: user.credits }, { status: 201 })
      },
      { auth: true },
    ),
  ),

  http.delete(
    '/api/generations/:id',
    route(
      ({ params }) => {
        const record = db.generations.find((g) => g.id === params.id)
        if (!record) return apiError(404, 'not_found', 'Generation not found.')
        if (isRunning(record)) return apiError(409, 'still_running', 'Wait until the generation finishes.')
        db.removeGeneration(record.id)
        return new HttpResponse(null, { status: 204 })
      },
      { auth: true },
    ),
  ),

  /* ------------------------------- Support ------------------------------- */

  http.post(
    '/api/support',
    route(async ({ request }) => {
      const body = await readJson<SupportTicketInput>(request)
      const message = String(body?.message ?? '').trim()
      const errors: Record<string, string> = {}
      if (!['billing', 'bug', 'feature', 'other'].includes(String(body?.topic))) errors.topic = 'Pick a topic.'
      const emailError = validateEmail(String(body?.email ?? ''))
      if (emailError) errors.email = emailError
      if (message.length < LIMITS.supportMinChars) errors.message = `Tell us a bit more (at least ${LIMITS.supportMinChars} characters).`
      if (message.length > LIMITS.supportMaxChars) errors.message = `Keep it under ${LIMITS.supportMaxChars} characters.`
      if (Object.keys(errors).length) return apiError(422, 'validation_failed', 'Please fix the highlighted fields.', { fields: errors })
      const ticketId = `ART-${Math.floor(1000 + Math.random() * 9000)}`
      return HttpResponse.json({ ticketId }, { status: 201 })
    }),
  ),

  /* --------------------------------- Dev --------------------------------- */

  http.post('/api/dev/reset', () => {
    db.reset()
    return new HttpResponse(null, { status: 204 })
  }),
]
