# 🚀 Deploy Karaneko to Cloudflare

## Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI: `npm install -g wrangler`

---

## Step 1 — Login to Cloudflare
```bash
wrangler login
```

---

## Step 2 — Create D1 Database
```bash
npm run db:create
```
Output will look like:
```
✅ Successfully created DB 'karaneko-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Open `wrangler.toml` and replace `YOUR_D1_DATABASE_ID_HERE` with that ID.

---

## Step 3 — Run the Schema
```bash
npm run db:migrate
```
Creates all tables and seeds default categories.

---

## Step 4 — Set Secrets
Create or deploy the Cloudflare Pages project first. Then set secrets on that
Pages project. If you used a different Pages project name, replace `karaneko`.

```bash
wrangler pages secret put YOUTUBE_API_KEY --project-name karaneko
# → paste your YouTube Data API v3 key
# → get it at: console.cloud.google.com → Enable "YouTube Data API v3"

wrangler pages secret put JWT_SECRET --project-name karaneko
# → paste a random 32+ char string
# → generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

wrangler pages secret put RESEND_API_KEY --project-name karaneko
# → paste your Resend API key
# → get it at: resend.com → API Keys → Create
```

---

## Step 5 — Deploy
```bash
npm run deploy
```
Your app goes live at: `https://karaneko.pages.dev`

---

## Step 6 — Make Yourself Admin
Register an account first, then run:
```bash
wrangler d1 execute karaneko-db \
  --command="UPDATE users SET role='admin' WHERE username='YOUR_USERNAME';"
```

---

## Local Development

```bash
# 1. Set up local database (run once)
npm run db:migrate:local

# 2. Fill in .env.local
cp .env.example .env.local
# Edit .env.local with your actual keys

# 3. Start dev server with D1
npm run dev:local
```

> `npm run dev:local` runs `node scripts/dev-local.cjs`
> This starts the standard Next.js dev server with Cloudflare bindings enabled, including D1.

---

## Custom Domain (optional)
1. Cloudflare Dashboard → Pages → karaneko → Custom Domains
2. Add your domain → follow DNS instructions

---

## Secrets Summary

| Secret | Get it from |
|---|---|
| `YOUTUBE_API_KEY` | [console.cloud.google.com](https://console.cloud.google.com) → YouTube Data API v3 |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |

---

## Troubleshooting

**"D1 database binding 'DB' not found"**
→ For local: use `npm run dev:local` not `npm run dev`
→ For production: check `database_id` in `wrangler.toml` is correct

**"Invalid API Key" from YouTube**
→ Make sure YouTube Data API v3 is enabled in Google Cloud Console

**Emails not sending**
→ Check `RESEND_API_KEY` is set correctly
→ In dev, check `.env.local` has `RESEND_API_KEY`

**Build fails**
→ Make sure all API routes have `export const runtime = "edge"`
→ Run `npx tsc --noEmit` to check for type errors first
