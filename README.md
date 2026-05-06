# The Patron's Archive

Deadlock build & strategy hub built on the MERN stack (MongoDB · Express · React · Node.js).

```
deadlock-community/
├─ client/   React + Vite + Tailwind CSS frontend
├─ server/   Node.js + Express + Mongoose backend
└─ package.json   root scripts (run both with one command)
```

## First-time setup

From the `deadlock-community/` folder:

```bash
npm run install:all
```

Configure environment variables (already pre-filled with the YouTube API key):

```bash
# server/.env – set MONGO_URI and (optionally) SIGHTENGINE credentials
```

## Running

```bash
npm run dev
```

This launches:

- Express API at `http://localhost:5000`
- Vite (React) at `http://localhost:3000` — proxies `/api/*` to the backend.

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | – | Register new user |
| POST | /api/auth/login | – | Authenticate, returns JWT |
| GET | /api/auth/me | JWT | Current profile |
| PUT | /api/auth/me | JWT | Update profile |
| DELETE | /api/auth/me | JWT | Delete account |
| GET | /api/builds | – | List (search, hero, role, sort) |
| GET | /api/builds/:id | – | Build detail |
| POST | /api/builds | JWT | Create (Sightengine-checked) |
| PUT | /api/builds/:id | JWT | Update own build |
| DELETE | /api/builds/:id | JWT | Delete own build |
| POST | /api/builds/:id/vote | JWT | Up/down/clear vote |
| GET | /api/heroes | – | Hero list (cached proxy) |
| GET | /api/items | – | Items with tooltip data |
| GET | /api/youtube?videoId=… or ?q=… | – | YouTube proxy |
| POST | /api/sightengine/check | – | Profanity check |

## Migration note

The previous Next.js + TypeScript + Prisma code under `src/` and `prisma/` is
no longer used. Once you've verified the new MERN setup works, delete:

```
src/  prisma/  next.config.ts  next-env.d.ts  tsconfig.json
eslint.config.mjs  postcss.config.mjs  prisma.config.ts  public/
```

…and remove the old `node_modules/` + `package-lock.json` at the root (the
new root `package.json` is the MERN orchestrator).
