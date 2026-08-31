# The Patron's Archive

A community build-and-strategy hub for **Deadlock**, built on the MERN stack. Players assemble item loadouts in a live calculator, publish them as phased written guides with an optional YouTube walkthrough, vote and argue about them in the comments, and take the longer discussions to a threaded forum. Admins get a moderation console on top of all of it.

![Home page](docs/images/home.png)

---

## Contents

- [What it does](#what-it-does)
- [Screens](#screens)
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

**Moderation.** Text submitted to builds, comments and forum posts is screened by Sightengine before it goes live. Anything that trips the filter comes back to the author, who can revise or post anyway — posting anyway auto-flags the content into the admin queue. Readers can also report content by hand. Admins work a single queue, and removals put strikes on the author's account; three strikes suspends it.

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

## Architecture

React never talks to MongoDB or to a third party directly. Every request goes through the Express API, which owns the database connection and holds all outbound API keys, so nothing sensitive is ever shipped to the browser.

![System architecture](docs/images/architecture.svg)

A few things worth calling out:

- **Vite proxies `/api/*`** to `localhost:5000` in development, so the frontend has no base-URL configuration and no CORS handling of its own.
- **Hero and item responses are cached in-process for one hour.** The cache is a module-level variable, which means it is per-process and resets on restart — fine for a single instance, something to revisit if this is ever scaled horizontally.
- **The server boots without a database.** If `MONGO_URI` is missing or unreachable it logs a warning and still listens, so the hero, item, YouTube and patch endpoints keep working. Anything that persists will fail until Mongo is connected.
- **Sightengine fails open.** If the profanity service is unconfigured, unreachable or slower than five seconds, the text is treated as clean and publishing proceeds. The filter is a convenience, not a security control.

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

### 4. Run

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
│  ├─ models/                  User, Build, Comment, Thread, Reply, Hero
│  ├─ routes/                  one router per resource
│  ├─ utils/                   sightengine, apiTracker, patchStore
│  ├─ index.js                 app wiring and startup
│  └─ seed.js                  demo users and builds
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
- **In-process caching.** Hero and item caches are module-level variables, so they are per-process and lost on restart.
- **No automated tests.** There is no test runner configured in any of the three packages.
- **Vote counts are recomputed from arrays** on every read. Correct, and fine at this size, but it is a full array scan per build.
