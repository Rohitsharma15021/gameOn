# Running gameOn locally

Four apps, one Postgres database. Follow these steps in order the first
time; see [Everyday startup](#everyday-startup) for the short version once
it's all set up once.

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres)
- npm

## 1. Start Docker Desktop

Postgres runs in a container, so Docker Desktop must be running first.
Launch it from the Start menu and wait until it's fully started (the whale
icon in the system tray stops animating) before continuing.

## 2. Start Postgres

From the repo root:

```bash
docker compose up -d
```

This starts a `gameon-postgres` container on port `5433`. Check it's healthy:

```bash
docker ps --filter name=gameon-postgres
```

## 3. Install dependencies

```bash
# backend, admin, and web (npm workspaces)
npm install

# mobile (separate package, not an npm workspace)
npm --prefix mobile install
```

## 4. Set up the backend

```bash
cd backend
copy .env.example .env    # (macOS/Linux: cp .env.example .env)
npx prisma db push        # creates tables from prisma/schema.prisma
node prisma/seed.js       # seeds demo venues, users, games, a booking
cd ..
```

Skip `node prisma/seed.js` if you've already seeded once — it's safe to
re-run, but not required. The default `.env` already points at the
`docker compose` Postgres (`localhost:5433`) and uses mock drivers for
OTP/payments/push, so nothing else needs configuring to run locally.

`admin/.env` is already checked in with `VITE_API_URL=http://localhost:4000`.
Mobile needs no `.env` for local web/simulator use (it defaults to
`localhost:4000` — see `mobile/.env.example` if you ever run it on a
physical device over LAN).

## 5. Start everything

Each app runs in its own terminal (or background process) and stays running
with hot reload.

```bash
npm run backend    # http://localhost:4000  — Express API + Socket.IO
npm run admin      # http://localhost:5173  — venue-owner console (Vite)
npm run web        # http://localhost:5174  — public marketing landing page (Vite)
npm run mobile     # http://localhost:8081  — Expo dev server (web build + QR for Expo Go)
```

For the mobile app: once Metro finishes bundling, `http://localhost:8081`
serves a web build directly in the browser — handy for a quick look without
a phone. To use a real device/simulator instead, scan the QR code Expo
prints, or press `i` / `a` in that terminal for iOS/Android simulators.

## 6. Log in

All login is phone + OTP (no traditional passwords). The dev OTP driver logs
the code to the **backend terminal** and also echoes it back in the API
response, so the login screens pre-fill it automatically. The fixed dev code
is `000000` if you'd rather type it directly.

**Admin console** (`localhost:5173`) — enter the full number with `+91`:

| Role | Phone |
|---|---|
| Admin (all venues) | `+919900000002` |
| Venue owner (Priya Sharma, owns all 5 seeded venues) | `+919900000001` |

**Mobile app** (`localhost:8081` or Expo Go) — enter just the 10-digit local
part, the app prepends `+91`:

| Role | Phone |
|---|---|
| Player (Arjun Rao — has a confirmed booking) | `9000000000` |
| More players | `9000000001` … `9000000007` |

## Everyday startup

Once step 3–4 have been done once, day-to-day you only need:

```bash
docker compose up -d   # if Docker Desktop was fully stopped
npm run backend
npm run admin
npm run web
npm run mobile
```

## Troubleshooting

- **`docker compose up -d` fails with a pipe/engine error** — Docker
  Desktop isn't running yet; start it and wait for it to fully initialize,
  then retry.
- **Backend can't reach the database** — confirm the container is `Up
  (healthy)` with `docker ps`, and that `backend/.env`'s `DATABASE_URL`
  points at port `5433` (matches `docker-compose.yml`).
- **Port already in use** — something else on your machine is already
  bound to `4000`/`5173`/`5174`/`8081`; stop it or adjust the relevant
  app's port config (`vite.config.ts` for admin/web, `PORT` in
  `backend/.env` for the API).
- **Mobile shows stale data after backend changes** — Expo's Metro bundler
  hot-reloads on save; if something looks stuck, stop and re-run
  `npm run mobile`.
