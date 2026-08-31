# The Patron's Archive

A community build-and-strategy hub for **Deadlock**, built on the MERN stack. Players assemble item loadouts in a live calculator, publish them as phased written guides with an optional YouTube walkthrough, vote and argue about them in the comments, and take the longer discussions to a threaded forum. A retrieval-augmented assistant answers build and strategy questions from the site's own content. Admins get a moderation console on top of all of it.

![Home page](docs/images/home.png)

---

## Contents

- [What it does](#what-it-does)
- [Design language](#design-language)
- [Screens](#screens)
- [The Archivist](#the-archivist)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Roles and moderation](#roles-and-moderation)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Notes and known gaps](#notes-and-known-gaps)

---

## What it does

**Builds.** The core object is a *build*: a hero, up to twelve items, a total soul cost, and a three-phase written guide (early / mid / late). Item data — names, costs, tiers, slots and tooltip stats — is pulled live from the community Deadlock Assets API rather than hard-coded, so the shop stays current without a redeploy. A build can also carry a YouTube video with labelled timestamps so readers can jump to the part of the VOD that matters.

**Discovery.** Builds are searchable by title, hero and author, filterable by role and patch, and sortable by newest or top-voted. Votes are stored as arrays of user ids rather than integer counters, so a single account can only ever count once and can change its mind.

**Community.** Every build has a comment thread. Broader discussion lives in a separate forum with five categories, nested replies, upvotes, and pin/lock controls for admins.

**The Archivist.** A chat assistant sits on every page and answers questions about builds, items and strategy. It is retrieval-augmented: the answer is generated only from passages retrieved out of this site's own item catalogue, published builds and forum discussion. Ask it on a build page and it answers about *that* build. It runs on a local model by default — no API key, no cost — and can be pointed at Claude instead. See [The Archivist](#the-archivist) below.

**Moderation.** Text submitted to builds, comments and forum posts is screened by Sightengine before it goes live. Anything that trips the filter comes back to the author, who can revise or post anyway — posting anyway auto-flags the content into the admin queue. Readers can also report content by hand. Admins work a single queue, and removals put strikes on the author's account; three strikes suspends it.

---

## Design language

The UI is styled after Deadlock's own identity — the palette and printed-matter texture of the official *Old Gods, New Blood* page — rather than a generic dark theme, so the game's parchment-toned item icons and painted hero portraits sit in the interface as if they belong to it.

| Token | Value | Role |
|---|---|---|
| Ground | warm charcoal ramp, `#14110d` → `#2c2822` | page, cards, borders |
| Ink | parchment cream `#ece5d6` | text |
| Marigold | `#f7ac2e` | primary actions, brand mark, soul costs |
| Vermillion | `#e25e31` | hand-cut section ribbons, admin accents |
| Teal | `#2dd4bf` | secondary accent — links, forums, the Archivist |
| Slot colors | amber / green / purple | weapon / vitality / spirit, matching the in-game shop |

Type is **Alfa Slab One** for display (a poster-slab stand-in for the game's hand lettering) over **Inter** for UI, both self-hosted through Fontsource so nothing is fetched at runtime.

The composition is poster-built, not card-template: an asymmetric home hero with oversized outlined ghost lettering bleeding off the edges, a tilted vermillion marquee ticker of the roster, layered hero-portrait collages with marigold offset frames, giant unboxed slab statistics, a full-bleed marigold band with outlined numerals (the official page's *Hidden King* move), hand-cut clip-path ribbons for section labels, torn-paper edges between bands, hard offset "screen-print" shadows on cards and buttons, a faint film-grain wash over everything, and a proper poster footer. The system lives in three places — token overrides in [tailwind.config.js](client/tailwind.config.js), component classes in [index.css](client/src/index.css), and the shared [TornEdge](client/src/components/layout/TornEdge.jsx)/[Footer](client/src/components/layout/Footer.jsx) — so it applies across screens without per-page styling.

---

## Screens

### Build calculator

Pick a hero, then click items out of the live shop grid. Items are grouped by tier and priced in souls, the loadout bar tracks the running total, and the finished loadout carries straight into the publish form.

![Build calculator](docs/images/build-calculator.png)

### Browsing builds

![Community builds](docs/images/builds.png)

### A published build

Item order with per-item costs, the three guide phases, and the embedded video guide.

![Build detail](docs/images/build-detail.png)

### Heroes

The full roster, pulled from the assets API and cached server-side for an hour.

![Heroes](docs/images/heroes.png)

### Forums

![Forums](docs/images/forums.png)

![Forum thread](docs/images/forum-thread.png)

### Profile

![Profile](docs/images/profile.png)

### Admin console

<table>
<tr>
<td width="50%"><img src="docs/images/admin-dashboard.png" alt="Admin dashboard"></td>
<td width="50%"><img src="docs/images/admin-reports.png" alt="Content moderation queue"></td>
</tr>
<tr>
<td align="center"><em>Dashboard — totals and a seven-day publishing chart</em></td>
<td align="center"><em>Reports — flagged and user-reported content in one queue</em></td>
</tr>
<tr>
<td width="50%"><img src="docs/images/admin-users.png" alt="User management"></td>
<td width="50%"><img src="docs/images/admin-health.png" alt="API health"></td>
</tr>
<tr>
<td align="center"><em>Users — promote, suspend or delete accounts</em></td>
<td align="center"><em>Health — per-API call and error counts</em></td>
</tr>
</table>

<details>
<summary>Hero &amp; item catalogue (admin)</summary>

![Admin item catalogue](docs/images/admin-items.png)

</details>

---

## The Archivist

![The Archivist](docs/images/chat-archivist.png)

A retrieval-augmented chat assistant, reachable from the bottom-left of every page. It answers questions about builds, items and strategy — *what should I buy next*, *is this item worth the slot*, *when do I rotate* — and it answers them from this site's content rather than from whatever the model happens to remember about Deadlock.

![How the Archivist answers](docs/images/rag-pipeline.svg)

### How it works

**Indexing.** `npm run ingest --prefix server` walks the corpus — the live item catalogue, the hero roster, every published build with its item order and each of its three guide phases, and every forum thread and substantial reply — and writes one prose passage per record. Each passage is embedded and stored in a `chunks` collection alongside its vector, a link back into the site, and a community-score weight.

**Embeddings are local.** `all-MiniLM-L6-v2` runs inside the Node process through `transformers.js`. There is no embedding API key, no per-token cost and no vector database: the model weights (~90 MB) are downloaded once on first use and cached, and after that indexing works offline. At this corpus size — a few hundred passages — retrieval is a brute-force cosine scan in memory and returns in single-digit milliseconds.

**Retrieval.** The question is embedded with the same model, scored against every chunk by cosine similarity, then nudged by `0.08 × community score` so that well-rated builds surface ahead of poorly-rated ones on an otherwise even match. Per-source caps stop the 173 item passages from crowding out guide prose. The top twelve go forward.

**Grounding.** The widget also sends the build or hero of the page in view, and those passages are pinned into the context — which is what lets "what should I buy next?" resolve against the build you are reading. The system prompt holds the model to the retrieved passages: it must not invent an item name, a cost or a hero ability, it must quote soul costs exactly as they appear, and it must say when the context does not cover the question. Catalogue data is treated as authoritative; guides and forum replies are attributed as opinion.

**Answering.** Two interchangeable backends. Retrieval is identical either way; only the final call differs.

| | `CHAT_PROVIDER=local` (default) | `CHAT_PROVIDER=anthropic` |
|---|---|---|
| Model | Whatever your local server has loaded | `claude-opus-5`, adaptive thinking at medium effort |
| Needs | LM Studio, Ollama or llama.cpp on `:1234` | An API key |
| Cost | Nothing | ~1,500 input + ~800 output tokens a question, so roughly **3¢** on Opus |
| Passages sent | 6, trimmed to 700 characters | 12, untrimmed |
| Works offline | Yes | No |

The local path is not just the Anthropic path with a different URL. Small models confabulate confidently when the context is silent — an early test invented a 20-second cooldown for an ability the corpus says nothing about — so it retrieves fewer passages to fit a 4k context, runs at temperature 0.15, and repeats the hard grounding rules immediately *before* the question rather than only in the system prompt, which is where small models actually weight them. With that in place the same question returns "The Archive doesn't cover that".

Either way the reply streams back over server-sent events — sources first, so the panel can show them while the text is still arriving.

### Setting it up

**Free, local, no key.** Start any OpenAI-compatible server — [LM Studio](https://lmstudio.ai)'s server, or `ollama serve` — load a 7–8B instruct model, then:

```bash
npm run ingest --prefix server
```

That is the whole setup. `LOCAL_LLM_URL` defaults to `http://localhost:1234/v1` (LM Studio; use `http://localhost:11434/v1` for Ollama), and leaving `LOCAL_LLM_MODEL` blank makes the server ask which model is loaded.

On model choice: prefer an instruction-tuned model that still refuses. "Abliterated" or "uncensored" variants have had refusal behaviour trained out of them, which is the opposite of what grounded retrieval wants — measured against the same questions, `hermes-3-llama-3.1-8b` declined an out-of-scope question cleanly while an abliterated Qwen 2.5 answered it anyway with padding. An 8B model at Q4 fits in 6 GB of VRAM and answers in one to two seconds once loaded.

**Or use Claude.** Put a key in `server/.env` and the provider switches automatically:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

The index rebuilds from scratch each time. Publishing or editing a build re-indexes that build on its own, in the background, so new guides are answerable immediately; forum content is picked up on the next full ingest. Admins can trigger a rebuild without shell access by calling `POST /api/chat/reindex`.

Both halves degrade honestly. `GET /api/chat/status` reports which provider resolved, which model it found and why it is unusable if it is not — and the widget renders that reason and disables its input rather than failing at send time. An empty index tells you to run the ingest. The endpoint is open to guests but rate limited per IP (15 messages per 10 minutes, 60 for signed-in users) so an unauthenticated endpoint cannot run up a bill.

### Placement

The launcher sits in the **bottom-left** corner. The bottom-right is already occupied by the tawk.to live-support widget embedded in `client/index.html`; if that widget is ever removed, move the Archivist back to the conventional corner in `client/src/components/chat/ChatWidget.jsx`.

---

## Architecture

React never talks to MongoDB or to a third party directly. Every request goes through the Express API, which owns the database connection and holds all outbound API keys, so nothing sensitive is ever shipped to the browser.

![System architecture](docs/images/architecture.svg)

A few things worth calling out:

- **Vite proxies `/api/*`** to `localhost:5000` in development, so the frontend has no base-URL configuration and no CORS handling of its own.
- **Hero and item responses are cached in-process for one hour.** The cache is a module-level variable, which means it is per-process and resets on restart — fine for a single instance, something to revisit if this is ever scaled horizontally.
- **The server boots without a database.** If `MONGO_URI` is missing or unreachable it logs a warning and still listens, so the hero, item, YouTube and patch endpoints keep working. Anything that persists will fail until Mongo is connected.
- **Sightengine fails open.** If the profanity service is unconfigured, unreachable or slower than five seconds, the text is treated as clean and publishing proceeds. The filter is a convenience, not a security control.
- **The only outbound AI call is the answer itself.** Embeddings are computed in-process, so indexing and retrieval need no network and no second API key.

## Data model

![Data model](docs/images/data-model.svg)

A build stores an embedded *snapshot* of its hero and items rather than references to the catalogue. That is deliberate: item costs and hero names change between patches, and a guide written for patch 1.0 should keep showing the numbers its author actually meant.

## Roles and moderation

![Roles and moderation](docs/images/roles-and-moderation.svg)

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Tailwind CSS 3, Vite 5, axios |
| Backend | Node.js (ES modules), Express 4, Mongoose 8 |
| Database | MongoDB |
| Auth | JWT (`jsonwebtoken`), passwords hashed with `bcryptjs` at 10 rounds |
| Assistant | Any local OpenAI-compatible server (LM Studio, Ollama) by default, or `claude-opus-5` via `@anthropic-ai/sdk` — both streamed over SSE |
| Embeddings | `all-MiniLM-L6-v2` run locally through `@huggingface/transformers` (384-d) |
| Retrieval | Vectors in MongoDB, brute-force cosine in process — no vector database |
| External data | Deadlock Assets API, YouTube Data API v3, Sightengine text moderation |
| Tooling | `concurrently`, `nodemon` |

---

## Getting started

### Prerequisites

- Node.js 18 or newer
- A MongoDB connection string — Atlas, or a local `mongod`

### 1. Install

From the repository root:

```bash
npm run install:all
```

This installs the root, `server/` and `client/` dependency trees in one pass.

### 2. Configure

```bash
cp server/.env.example server/.env
```

Then edit `server/.env` and set at minimum `MONGO_URI` and `JWT_SECRET`. See [environment variables](#environment-variables) below.

### 3. Seed (optional)

Creates two demo accounts and a couple of example builds:

```bash
npm run seed --prefix server
```

### 4. Build the assistant's index (optional)

Only needed if you want the Archivist. Downloads the embedding model on first run:

```bash
npm run ingest --prefix server
```

### 5. Run

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Express API | http://localhost:5000 |
| React app (Vite) | http://localhost:3000 |

To run one half on its own, use `npm run dev:server` or `npm run dev:client`. `npm run build` produces the production client bundle, and `npm start` runs the API without nodemon.

---

## Environment variables

All of these live in `server/.env`. The client needs no configuration.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | API port. Defaults to `5000`. |
| `MONGO_URI` | yes* | MongoDB connection string. Without it the server still starts, but nothing persists. |
| `JWT_SECRET` | yes | Signing secret for auth tokens. Use a long random string. |
| `YOUTUBE_API_KEY` | no | YouTube Data API v3 key. Without it, `/api/youtube` returns 500 and builds simply carry no video. |
| `SIGHTENGINE_USER` | no | Sightengine API user. Without it the profanity filter is skipped entirely. |
| `SIGHTENGINE_SECRET` | no | Sightengine API secret. |
| `CHAT_PROVIDER` | no | `local` or `anthropic`. Defaults to `anthropic` when `ANTHROPIC_API_KEY` is set, otherwise `local`. |
| `LOCAL_LLM_URL` | no | OpenAI-compatible endpoint. Defaults to `http://localhost:1234/v1` (LM Studio). Ollama is `http://localhost:11434/v1`. |
| `LOCAL_LLM_MODEL` | no | Model id to use. Blank asks the local server which model is loaded and takes the first non-embedding one. |
| `ANTHROPIC_API_KEY` | no | Switches the assistant to Claude. Billed per token — see the table in [The Archivist](#the-archivist). |
| `CHAT_EFFORT` | no | Claude only. Reasoning effort: `low`, `medium` (default), `high`, `xhigh` or `max`. Lower is faster and cheaper. |

> **Note:** `server/.env.example` in this repository currently contains real API credentials rather than placeholders. Treat those keys as compromised — rotate them at the provider and replace the file's values with placeholders.

---

## Demo accounts

Created by the seed script:

| Role | Email | Password |
|------|-------|----------|
| User | `danish@patron.dev` | `patron123` |
| Admin | `admin@patron.dev` | `admin123` |

These are throwaway local credentials. Do not reuse them anywhere that matters, and do not seed them into a deployed instance.

---

## API reference

All responses are JSON and carry a `success` boolean. Endpoints marked **JWT** require an `Authorization: Bearer <token>` header; those marked **Admin** additionally require `role: 'admin'`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Create an account, returns a token |
| `POST` | `/api/auth/login` | — | Authenticate, returns a token |
| `GET` | `/api/auth/me` | JWT | Current profile |
| `PUT` | `/api/auth/me` | JWT | Update name, avatar or bio |
| `DELETE` | `/api/auth/me` | JWT | Delete own account |
| `GET` | `/api/auth/users/:id` | — | Public profile for another user |

### Builds

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/builds` | — | List. Query: `search`, `hero`, `role`, `patch`, `author`, `sort=top\|newest` |
| `GET` | `/api/builds/:id` | — | Single build |
| `POST` | `/api/builds` | JWT | Publish. Screened by Sightengine; `bypass: true` posts anyway and auto-flags |
| `PUT` | `/api/builds/:id` | JWT | Update — author or admin only |
| `DELETE` | `/api/builds/:id` | JWT | Delete — author or admin only |
| `POST` | `/api/builds/:id/vote` | JWT | Body `{ vote: 'up' \| 'down' \| null }` |
| `POST` | `/api/builds/:id/report` | JWT | Report someone else's build with a reason |

### Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/comments?build=:id` | — | Comments for a build, newest first |
| `POST` | `/api/comments` | JWT | Post a comment; same Sightengine screening as builds |
| `DELETE` | `/api/comments/:id` | JWT | Delete — author or admin only |
| `POST` | `/api/comments/:id/report` | JWT | Report a comment |

### Forums

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/forums/threads` | — | List. Query: `search`, `category`, `sort=hot\|new\|top\|discussed`, `page`, `limit` |
| `POST` | `/api/forums/threads` | JWT | Create a thread |
| `GET` | `/api/forums/threads/:id` | — | Single thread with reply count |
| `DELETE` | `/api/forums/threads/:id` | JWT | Delete — author or admin only |
| `POST` | `/api/forums/threads/:id/upvote` | JWT | Toggle an upvote |
| `GET` | `/api/forums/threads/:id/replies` | — | Replies for a thread |
| `POST` | `/api/forums/threads/:id/replies` | JWT | Reply; pass `parentReply` to nest |
| `DELETE` | `/api/forums/replies/:id` | JWT | Delete — author or admin only |

### Game data and services

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/heroes` | — | Hero roster, proxied and cached for 1 h |
| `GET` | `/api/items` | — | Shop items with cost, tier, slot and tooltip stats, cached for 1 h |
| `GET` | `/api/youtube?videoId=…` | — | Metadata for one video |
| `GET` | `/api/youtube?q=…` | — | Search, up to 6 results |
| `POST` | `/api/sightengine/check` | — | Profanity check for a block of text |
| `GET` | `/api/patch` | — | Current patch notes |
| `GET` | `/api/health` | — | Liveness probe |

### Assistant

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/chat/status` | — | Resolved provider and model, why it is unusable if it is not, and index size by source |
| `POST` | `/api/chat` | optional | Ask a question. Streams `sources`, then `delta` events, then `done`, as SSE. Body: `message`, `history[]`, `page`, `buildId`, `hero` |
| `POST` | `/api/chat/reindex` | Admin | Rebuild the whole knowledge base |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/stats` | Admin | Totals plus a seven-day build chart |
| `GET` | `/api/admin/users` | Admin | All users |
| `PUT` | `/api/admin/users/:id/role` | Admin | Promote or demote |
| `PUT` | `/api/admin/users/:id/suspend` | Admin | Suspend or reinstate |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete an account |
| `GET` | `/api/admin/reports` | Admin | Flagged and reported builds and comments |
| `DELETE` | `/api/admin/reports/builds/:id` | Admin | Remove a build and strike its author |
| `POST` | `/api/admin/reports/builds/:id/dismiss` | Admin | Clear the flag, keep the build |
| `DELETE` | `/api/admin/reports/comments/:id` | Admin | Remove a comment and strike its author |
| `POST` | `/api/admin/reports/comments/:id/dismiss` | Admin | Clear the flag, keep the comment |
| `GET` | `/api/admin/health` | Admin | Per-API usage and error counters |
| `GET` | `/api/admin/patch` | Admin | Read patch notes |
| `PUT` | `/api/admin/patch` | Admin | Update patch notes |

---

## Project structure

```
patronArchive/
├─ client/                     React + Vite + Tailwind frontend
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ builds/            BuildCalculator, BuildsList, BuildView, PublishForm
│  │  │  ├─ chat/              ChatWidget — the Archivist panel, SSE client
│  │  │  └─ layout/            Header
│  │  ├─ lib/
│  │  │  ├─ api.js             axios instance, attaches the bearer token
│  │  │  ├─ auth.jsx           session context
│  │  │  └─ dummyBuilds.js     fallback data when the API is unavailable
│  │  ├─ pages/                one file per route, plus pages/admin/*
│  │  └─ App.jsx               route table
│  └─ vite.config.js           dev server on :3000, proxies /api to :5000
│
├─ server/                     Node + Express + Mongoose backend
│  ├─ middleware/              auth (JWT + admin gate), errorHandler
│  ├─ models/                  User, Build, Comment, Thread, Reply, Hero, Chunk
│  ├─ routes/                  one router per resource, including chat
│  ├─ utils/                   sightengine, apiTracker, patchStore,
│  │                           embeddings (local model), rag (chunking + retrieval)
│  ├─ index.js                 app wiring and startup
│  ├─ seed.js                  demo users and builds
│  └─ ingest.js                builds the assistant's knowledge base
│
├─ docs/images/                screenshots and diagrams used by this README
└─ package.json                root scripts — run both halves with one command
```

---

## Notes and known gaps

Honest state of the codebase, for anyone picking it up:

- **Leaked credentials.** `server/.env.example` holds live-looking YouTube and Sightengine keys. They need rotating and replacing with placeholders.
- **`CREDENTIALS.txt`** sits in the repository root with the demo passwords in plain text. Harmless for a throwaway local seed, but it should not travel to anything deployed.
- **Template leftovers.** `public/` still contains the default Next.js SVGs (`next.svg`, `vercel.svg`, and friends) from an earlier scaffold, and there is a stray zero-byte `[b.id` file in the root. Neither is referenced by the app.
- **In-process caching.** Hero and item caches are module-level variables, so they are per-process and lost on restart. The same is true of the retrieval chunk cache and the assistant's rate limiter — both reset on restart and neither is shared across instances.
- **Retrieval is brute force.** Every question scores against every chunk in memory. That is the right trade at a few hundred passages; past roughly ten thousand it wants a real vector index.
- **Embedding quality is the ceiling.** `all-MiniLM-L6-v2` is small. It handles named things well — heroes, items, build titles — and is weaker on paraphrased intent, so a question like "how do I stop dying to burst damage" retrieves less precisely than a question naming an item. Swapping in a hosted embedding model would be a drop-in change to `server/utils/embeddings.js`.
- **A 7–8B local model is not Claude.** With the hardened prompt it stops fabricating whole mechanics and refuses out-of-scope questions, and it quotes costs correctly. It still occasionally misreads a stat label — one answer rendered "Grants: Out of Combat Regen 4" as "reduces Out-of-Combat Regen by 4" — and it tends toward generic reasoning around a correct recommendation. Set `ANTHROPIC_API_KEY` when accuracy matters more than cost.
- **Hero passages are thin.** The assets API exposes hero names and portraits but not ability descriptions or cooldowns, so the Archivist genuinely cannot answer ability questions and will say so. Adding a hero-ability source would be the single biggest improvement to answer coverage.
- **Forum content is only indexed on a full ingest.** Builds re-index themselves on publish and edit; threads and replies wait for the next `npm run ingest` or an admin reindex.
- **No automated tests.** There is no test runner configured in any of the three packages.
- **Vote counts are recomputed from arrays** on every read. Correct, and fine at this size, but it is a full array scan per build.
