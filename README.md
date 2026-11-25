# artven — Home (demo)

React 19 + TypeScript + Vite app implementing the artven Home screen, backed by a
mock REST API that runs in the browser via [MSW](https://mswjs.io).

```bash
npm install
npm run dev       # http://localhost:5173
npm run build && npm run preview   # the mock API is enabled in production builds too
```

## Stack

| Concern        | Choice |
| -------------- | ------ |
| Styling        | Tailwind CSS v4, Inter Variable |
| Icons          | lucide-react |
| Data fetching  | TanStack Query (infinite queries, optimistic bookmarks) |
| Routing        | React Router (`/`, `/chat`, `/results`, `/settings`) |
| Mock backend   | MSW service worker (`src/mocks`) |

## Features

- **Sidebar**: Home / Chat / Results / Settings. Search (or `⌘K`) opens a placeholder search dialog.
  Results shows a dot after a new generation is queued.
- **Header**: logo, help popover (shortcuts), credit balance, Upgrade (mock top-up +50 credits), profile menu
  with **Reset demo data**.
- **Chat / Tools tabs**. Tools are prompt templates that switch you back to Chat.
- **Composer**: auto-growing textarea, `Enter` to send / `Shift+Enter` newline, output type (Auto / Image / Video),
  attachments via `+`, drag & drop or paste, upload status per file, credit checks.
- **Ideas for You**: horizontal scroller with refresh (reshuffles from the API). Clicking a card / `+`
  applies its prompt and selects the first `[placeholder]` for quick editing.
- **Wishes**: category tabs (sticky), search within category, shortest-column masonry with tall/short cards,
  infinite scroll, image and video previews (videos play only while on screen), bookmarks.
  Clicking a card applies its prompt **and** its reference media as a "Template" attachment, so users
  can add their own images (e.g. a face) next to it.

## Validation & limits (`src/lib/limits.ts`)

Shared by the UI and the mock server.

| Rule | Value |
| ---- | ----- |
| Prompt length | 3 – 2000 characters (counter appears at 80%) |
| Attachments | max 5 files, max 1 video, no duplicates |
| Image types / size | JPG, PNG, WEBP · ≤ 10 MB · 256 – 8192 px |
| Video types / size | MP4, MOV, WEBM · ≤ 50 MB · ≤ 30 s |
| Type check | MIME **and** extension must agree |
| Output | Image output can't use a video reference |
| Cost | Image 1 credit · Video 4 credits (Auto picks based on prompt / references) |

## Mock API (`src/mocks/handlers.ts`)

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/api/me` | user + credit balance |
| POST | `/api/billing/top-up` | +50 credits |
| GET | `/api/ideas?seed=` | 8 ideas, `seed` reshuffles |
| GET | `/api/tools` | tool templates |
| GET | `/api/wishes/categories` | category tabs |
| GET | `/api/wishes?category=&q=&cursor=&limit=` | cursor-paginated, deterministic feed |
| GET / PUT / DELETE | `/api/bookmarks[/:wishId]` | persisted |
| POST | `/api/uploads` | multipart `file`, re-validated server-side (415 / 413) |
| GET / POST | `/api/generations` | validates prompt / attachments, charges credits, 402 when short |
| POST | `/api/dev/reset` | restores demo state |

State (credits, bookmarks, generations) is persisted in `localStorage`.
Simulate a bad network from the URL (values are remembered):

- `?mockLatency=1500` sets base latency in ms (default 350)
- `?mockFailRate=0.3` makes 30% of requests fail with 503 (shows retry UIs)
- `?mockFailRate=0` turns it off again

To swap in a real backend, drop the `startMockApi()` call in `src/main.tsx`. The client only talks to `/api/*`.

Demo imagery is loaded from Unsplash and sample video CDNs, so it needs an internet connection.
