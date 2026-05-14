# Karaneko 🎤
> Sing Your Heart Out — Party KTV + Solo Scoring App

A full-stack Next.js karaoke app deployed on **Cloudflare Workers** with **D1 database**.

---

## Quick Start (Local Dev)

### 1. Install dependencies
```bash
npm install
```

### 2. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 3. Create local D1 database
```bash
npm run db:create        # creates karaneko-db on Cloudflare
npm run db:migrate:local # sets up tables locally
```

### 4. Fill in `.env.local`
```dotenv
YOUTUBE_API_KEY=AIza...        # console.cloud.google.com
JWT_SECRET=random_32_chars...  # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
RESEND_API_KEY=re_...          # resend.com
```

### 5. Run local dev server
```bash
npm run dev:local
# This runs: node scripts/dev-local.cjs
```

Open [http://localhost:3000](http://localhost:3000)

> ⚠️ Use `npm run dev:local` not `npm run dev` — only dev:local has D1 access

---

## Deploy to Cloudflare

See [DEPLOY.md](./DEPLOY.md) for the full deployment guide.

**Quick deploy:**
```bash
npm run db:migrate          # run schema on production D1
wrangler pages secret put YOUTUBE_API_KEY --project-name <your-pages-project>
wrangler pages secret put JWT_SECRET --project-name <your-pages-project>
wrangler pages secret put RESEND_API_KEY --project-name <your-pages-project>
npm run deploy
```

Create the Cloudflare Pages project before setting Pages secrets. If you name the
project `karaneko`, replace `<your-pages-project>` with `karaneko`.

---

## Project Structure

```
karaneko/
├── app/
│   ├── api/
│   │   ├── auth/           ← register, login, logout, me, verify, resend-code
│   │   ├── search/         ← YouTube search (server-side, key never exposed)
│   │   ├── trending/       ← Trending songs
│   │   ├── category/       ← Browse by genre
│   │   ├── lyrics/         ← LRCLIB synced lyrics
│   │   ├── scores/         ← Save & fetch scores
│   │   ├── ranking/        ← Global ranking board
│   │   └── rooms/          ← Party KTV rooms
│   ├── admin/              ← Admin dashboard (admin role only)
│   ├── ktv/                ← Party KTV big screen
│   ├── remote/             ← Phone remote controller
│   ├── party/              ← Create/join a room
│   ├── player/             ← Solo karaoke player
│   ├── search/             ← Search results
│   ├── ranking/            ← Ranking board page
│   ├── favorites/          ← Saved favorites
│   └── history/            ← Play history
├── components/
│   ├── KaraokePlayer.tsx   ← YouTube + lyrics + voice scoring
│   ├── RankingPanel.tsx    ← Slide-in ranking board (no music interruption)
│   ├── LyricsDisplay.tsx   ← Synced lyrics with auto-scroll
│   ├── PitchVisualizer.tsx ← Real-time pitch canvas
│   ├── MicControls.tsx     ← Reverb/echo + smart device detection
│   ├── KaraokeSettings.tsx ← Settings modal (scoring, remote permissions)
│   ├── SongCard.tsx        ← Song card component
│   ├── AuthModal.tsx       ← Login/register + email verification
│   └── Navbar.tsx          ← Navigation bar
├── context/
│   ├── AuthContext.tsx     ← User session + logout listeners
│   ├── QueueContext.tsx    ← Queue (clears on logout), favorites, history
│   └── RoomSettingsContext.tsx ← KTV room settings
├── hooks/
│   ├── useVoiceScoring.ts  ← Web Audio API pitch detection + scoring
│   ├── useMicPassthrough.ts ← Mic → speakers with reverb/echo
│   └── useAudioDevices.ts  ← Smart headphone/bluetooth detection
├── lib/
│   ├── auth.ts             ← JWT (jose) + password hashing (Web Crypto)
│   ├── db.ts               ← Cloudflare D1 binding
│   └── email.ts            ← Resend email (verification codes)
├── d1/
│   └── schema.sql          ← D1 database schema (run once)
├── types/index.ts
├── wrangler.toml           ← Cloudflare config
├── .env.local              ← Local dev secrets (never commit)
└── DEPLOY.md               ← Full deployment guide
```

---

## Features

| Feature | Status |
|---|---|
| YouTube search (API key server-side) | ✅ |
| YouTube IFrame player | ✅ |
| Synced lyrics (LRCLIB) | ✅ |
| Real-time pitch detection | ✅ |
| Voice scoring (S/A/B/C/D rank) | ✅ |
| Mic passthrough + reverb/echo | ✅ |
| Smart audio device detection | ✅ |
| Slide-in ranking board | ✅ |
| Email verification (Resend) | ✅ |
| JWT auth (edge-compatible) | ✅ |
| Queue clears on logout | ✅ |
| Party KTV mode (big screen) | ✅ |
| Phone remote via QR code | ✅ |
| Real-time queue sync (polling) | ✅ |
| Admin dashboard | ✅ |
| Cloudflare D1 database | ✅ |
| Cloudflare Workers deployment | ✅ |

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `YOUTUBE_API_KEY` | `.env.local` + Pages secret | YouTube Data API v3 key |
| `JWT_SECRET` | `.env.local` + Pages secret | 32+ char random string |
| `RESEND_API_KEY` | `.env.local` + Pages secret | Resend email API key |
| `DB` | `wrangler.toml` | D1 database binding (not a secret) |

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev:local` | Local dev with D1 (use this!) |
| `npm run dev` | Local dev without D1 (UI only) |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run db:create` | Create D1 database on Cloudflare |
| `npm run db:migrate` | Run schema on production D1 |
| `npm run db:migrate:local` | Run schema on local D1 |
| `npm run db:admin` | Make a user admin (edit username first) |
