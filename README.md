# gameOn

A sports venue booking & player-matching platform (Playo-style) — discover
venues, book courts, split the bill, host or join pickup games, and chat with
your group. Built as three apps sharing one API:

```
playo/
├── backend/    Express + PostgreSQL (Prisma) + Socket.IO — the API and chat server
├── mobile/     Expo Router (React Native) — the player-facing app (iOS/Android/web)
├── admin/      Vite + React — the venue owner/admin web console
└── docker-compose.yml   Local Postgres for development
```

## Stack

| Layer | Choice |
|---|---|
| Mobile | React Native via Expo SDK 57, Expo Router, Zustand, TanStack Query, Socket.IO client, react-native-maps |
| Admin web | React 19, Vite, React Router, TanStack Query, Recharts |
| Backend | Node.js + Express, Prisma ORM, PostgreSQL, Socket.IO, JWT auth, Zod validation |
| Payments | Provider-abstracted (`mock` \| `razorpay` \| `stripe`) — ships on `mock`, which auto-settles so the app is fully testable with no external keys |
| OTP / SMS | Provider-abstracted (`mock` \| `twilio` \| `msg91`) — `mock` logs the code to the server console and echoes it in the API response in dev |
| Push | Provider-abstracted (`mock` \| `fcm`) |
| Maps | Google Maps via `react-native-maps` (native only; falls back to a message on web) |

Every external integration (payments, SMS, push, maps) sits behind a small
driver interface in `backend/src/services/`, so swapping in a real provider
means adding credentials to `.env` and changing one config value — no call
sites change.

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres) — or point `DATABASE_URL` at any Postgres 14+ instance
- Expo Go app on your phone, or an iOS/Android simulator, to run the mobile app
- Windows/macOS/Linux all work; commands below use `npm`

## First-time setup

```bash
# 1. Start Postgres
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma db push       # creates tables from prisma/schema.prisma
node prisma/seed.js      # seeds 5 venues, 10 users, 2 games, a sample booking
npm run dev              # http://localhost:4000

# 3. Admin console (new terminal)
cd admin
cp .env.example .env
npm install
npm run dev               # http://localhost:5173

# 4. Mobile app (new terminal)
cd mobile
npm install
npm run start              # opens Expo dev tools — scan the QR with Expo Go, or open http://localhost:8081 in a browser
```

Once Metro is running, the same server also serves a web build at
`http://localhost:8081` — handy for a quick look without a phone or simulator.
Native-only modules (`react-native-maps`) show a "available in the app" note
there instead of a real map; everything else works.

### Demo accounts (OTP driver = mock)

The mock OTP driver logs a 6-digit code to the **backend terminal** on every
`/auth/otp/request` call, and also echoes it back in the API response in dev
(the login screens pre-fill it for you). Alternatively every phone number
accepts the fixed dev code in `backend/.env` (`OTP_DEV_CODE`, default `000000`)
without requesting a code first. Enter phone numbers as the 10-digit local
part only (the login screen prepends `+91`) — e.g. type `9000000000`, not
`+919000000000`.

| Role | Type this into the phone field | Full number | Notes |
|---|---|---|---|
| Venue owner | *(admin console only — see below)* | `+919900000001` (Priya Sharma) | Owns all 5 seeded venues |
| Admin | *(admin console only)* | `+919900000002` | Full access to every venue |
| Player | `9000000000` | `+919000000000` (Arjun Rao) | Has a confirmed booking and pending game invites |
| Player | `9000000001` … `9000000007` | `+919000000001` … `+919000000007` | 7 more seeded players with varying skill levels and sports |

The admin console's login screen has no 10-digit formatting assumption — type
the full `+919900000001` / `+919900000002` there directly.

## Project structure

### backend/
```
src/
  config/env.js          Centralised, typed env access
  lib/                   prisma client, ApiError, geo (haversine), gameAccess guard
  middleware/             auth (JWT), validate (zod), error handler
  services/                otp, payment, notification, slot-generation drivers
  routes/                  auth, users, venues, bookings, games, messages, reviews,
                           notifications, payments, admin (venue-owner console)
  sockets/                Socket.IO chat gateway (JWT handshake auth, room-per-game)
  app.js / server.js      Express app assembly / HTTP+socket bootstrap
prisma/
  schema.prisma           Full data model (users, venues, courts, slots, bookings,
                           splits, games, players, messages, reviews, notifications)
  seed.js                 Demo data generator
```

Slots are **generated lazily** per court/day from the venue's opening hours
(`services/slot.service.js`) rather than pre-populated for all time — this
keeps the `slots` table from growing unbounded while still giving bookings a
real row to lock against (a slot is claimed with a conditional `updateMany`,
so two people tapping the same slot at once can't both win it).

### mobile/
Expo Router file-based routing under `app/`:

```
app/
  index.tsx                 Auth gate → onboarding / profile-setup / tabs
  onboarding/                welcome, phone+OTP login, profile setup (sports, skill, location)
  (tabs)/                    home, search (list+map), games (find/host), bookings, profile
  venue/[id].tsx             Venue detail: gallery, amenities, day/court picker, slot grid
  checkout.tsx               Booking + split-the-bill + payment
  game/new.tsx               Host a game (from a booking, or standalone with date/time picker)
  game/[id].tsx              Game detail: players, join/leave/approve, host controls
  game/[id]/chat.tsx         Real-time group chat (Socket.IO + REST history fallback)
  player/[id].tsx            Public player profile, badges, rate-a-player
  notifications.tsx, settings/  Notification inbox, profile editing, sign out
src/
  api/                       One module per resource, thin wrappers over axios
  store/auth.store.ts         Zustand + SecureStore-persisted session
  hooks/                      useLocation, useGameSocket
  components/                 Shared UI (cards, buttons, avatars, map view, ...)
```

### admin/
```
src/
  pages/Login.tsx             Phone+OTP sign-in (same auth as mobile; PLAYER role is rejected)
  pages/VenuesList.tsx        Owner's venues + create-venue form
  pages/VenueDetail/          Tabs: Info (edit), Courts (add/price/remove),
                              Calendar (per-court slot grid, block/unblock),
                              Bookings (table), Analytics (revenue & utilisation charts)
```

## Configuration reference

All of the following live in `backend/.env` (copy from `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Session tokens |
| `OTP_DRIVER` (`mock`/`twilio`/`msg91`), `OTP_DEV_CODE` | SMS OTP delivery |
| `PAYMENT_DRIVER` (`mock`/`razorpay`/`stripe`), `RAZORPAY_*`, `STRIPE_*`, `PLATFORM_FEE_BPS` | Payments + platform commission |
| `PUSH_DRIVER` (`mock`/`fcm`), `FCM_SERVER_KEY` | Push notifications |
| `GOOGLE_CLIENT_ID` | Google sign-in token verification |
| `GOOGLE_MAPS_API_KEY` | Mirrored into `mobile/app.json` for the native Maps SDK |

To go live with real payments/SMS: fill in the provider credentials and flip
the `*_DRIVER` value — every route that touches payments/OTP/push already
calls through the driver abstraction in `backend/src/services/`.

## Known simplifications (by design, given MVP scope)

- **Single timezone**: slot times are generated from local midnight on the
  server process. Fine for a single-region deployment; a multi-region one
  would add a `timezone` column to `Venue` and localize per row.
- **Apple sign-in** is stubbed (`backend/src/routes/auth.routes.js`) — it
  needs Apple's rotating JWKS to verify the identity token, left unimplemented
  rather than faking verification. Google sign-in is fully wired.
- **Stripe webhook signature verification** needs the Stripe SDK's
  `constructEvent` (not hand-rolled here); Razorpay's HMAC verification is
  implemented in full.
- Slot cancellation refund policy is a simple 12-hour cutoff
  (`backend/src/routes/booking.routes.js`) — adjust to your actual policy.

## What's implemented vs. phase 2

**MVP (this build):** phone OTP + Google sign-in, profile setup, venue
discovery (list + map, filters, distance/rating/price sort), venue detail with
live slot availability, booking with bill-splitting and mock/real payment,
find/host-a-game with nearby-player auto-invite, join/approve/leave flows,
real-time group chat, booking history, ratings & reviews (venues and
players), referral codes + reward points, push/in-app notifications, and a
full venue-owner console (listing management, court pricing, calendar with
slot blocking, bookings table, revenue/utilisation analytics).

**Not built (phase 2, per the original brief):** tournaments/leagues, coaching
bookings, a wallet/loyalty ledger beyond simple point increments, a social
feed of played games, and AI-based skill matching (the current "invite nearby
players" logic is a straightforward radius + skill-level-adjacency filter,
not a learned model).
