# artven — Home (demo)

React 19 + TypeScript + Vite implementation of the artven Home screen from the Figma file
(“Artven Studio — Test File”), backed by a mock REST API that runs in the browser via [MSW](https://mswjs.io).
Everything is interactive — there is no real backend. Краткая инструкция на русском: [README.ru.md](README.ru.md).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build && npm run preview   # the mock API is enabled in production builds too
```

## Try this

1. Click an **Idea** (e.g. *Studio Shoot*) — the prompt lands in the composer with `[placeholders]` selected.
   Press **Tab** to jump between them; sending is blocked until they're filled.
2. Drop images from Finder **anywhere on the page** (or paste / click `+`). Wrong types, huge or tiny files are rejected with a reason.
3. Hit send — credits are charged, a toast says when the result is ready, **Results** gets an unread dot.
   Words in the prompt pick the subject (*ring*, *sneaker*, *sofa*…) and format (*square*, *vertical*, *wide*).
4. Send a third job while two are running → the Free plan limit kicks in. Upgrade in **Subscriptions**.
5. **Wishes → search button** opens Smart Search: pick a product profile (or create one) and content types.
6. Avatar menu: Profile, Subscriptions, Manage Account (validated form), Credits History, Sign Out → Log in.
7. Help menu: Contact Support (validated form), Terms & Policies. `⌘K` searches Wishes.

## Stack

| Concern        | Choice |
| -------------- | ------ |
| Styling        | Tailwind CSS v4 with tokens from the Figma variables (`src/index.css`), Inter Variable |
| Icons          | Exported from Figma (`src/assets/icons`), rendered as CSS masks by `<Icon>` so states are just colors |
| Data fetching  | TanStack Query (infinite queries, optimistic bookmarks, polling while jobs run) |
| Routing        | React Router (`/`, `/chat`, `/results`, `/settings`) |
| Mock backend   | MSW service worker (`src/mocks`), state persisted in `localStorage` |

## Validation & limits (`src/lib/limits.ts`)

Shared by the UI and the mock server, so client and “server” can't drift apart.

| Rule | Value |
| ---- | ----- |
| Prompt | 3 – 2000 chars, no unfilled `[placeholders]`, small moderation list |
| Attachments | max 5 files, max 1 video, no duplicates; MIME **and** extension must agree |
| Images | JPG, PNG, WEBP · ≤ 10 MB · 256 – 8192 px |
| Videos | MP4, MOV, WEBM · ≤ 50 MB · ≤ 30 s |
| Cost | Image 1 credit · Video 4 credits (Auto decides from prompt / references; cost shown before sending) |
| Plans | Free: 2 parallel generations · Pro: 4 parallel, +200 credits |
| Forms | name 2–40 chars, valid email, support message 20–1000 chars, password ≥ 8 |
| Product profiles | up to 6, unique name, photo required |

## Mock API (`src/mocks/handlers.ts`)

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET / PATCH | `/api/me` | 401 when signed out; PATCH validates name/email (422 with field errors) |
| POST | `/api/auth/login`, `/api/auth/demo`, `/api/auth/logout` | mock session |
| POST | `/api/billing/top-up`, `/api/billing/plan` | +50 credits / switch Free ↔ Pro |
| GET | `/api/credits/history` | every charge, refund and top-up with running balance |
| GET | `/api/ideas?seed=` · `/api/tools` · `/api/wishes/categories` | |
| GET | `/api/wishes?category=&q=&types=&cursor=&limit=` | cursor-paginated, deterministic, filterable feed |
| GET / PUT / DELETE | `/api/bookmarks[/:wishId]` | |
| GET / POST / DELETE | `/api/profiles[/:id]` | Smart Search product profiles |
| POST | `/api/uploads` | multipart `file`, re-validated server-side (415 / 413) |
| GET / POST / DELETE | `/api/generations[/:id]` | queued → processing → done/failed; failed jobs refund credits; 402 / 422 / 429 |
| POST | `/api/support` | returns a ticket id |
| POST | `/api/dev/reset` | restores demo state |

### Simulating a bad network

**Settings → Demo controls** (or URL params, remembered in `localStorage`):

- `?mockLatency=1500` — base latency in ms (default 350)
- `?mockFailRate=0.3` — 30% of requests fail with 503 (retry UIs appear)
- `?mockGenFailRate=1` — every generation fails and is refunded (default 10%)

To swap in a real backend, drop the `startMockApi()` call in `src/main.tsx`. The client only talks to `/api/*`.

Wish and result imagery is loaded from Unsplash and sample video CDNs, so the demo needs an internet connection.
