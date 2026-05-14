
---

### 2. `DEPLOY.md`

```markdown
# Karaneko v2 — Deployment Guide

This project is built for **Cloudflare Pages + D1**.

---

## Prerequisites

- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)
- YouTube Data API v3 Key
- Resend API Key

---

## 1. Local Setup

```bash
git clone https://github.com/charl1107/karaneko-v2.git
cd karaneko-v2
npm install
cp .env.example .env.local

Fill in your .env.local with real values:
envYOUTUBE_API_KEY=your_real_youtube_api_key_here
JWT_SECRET=your_very_long_random_jwt_secret_min_32_chars
RESEND_API_KEY=re_your_actual_resend_key
RESEND_FROM_EMAIL=Karaneko <karaneko@resend.dev>
ADMIN_SECRET=your_strong_random_admin_secret_here

2. Database Setup
Bashwrangler login

# Create D1 Database
npm run db:create

# Run Migrations
npm run db:migrate

3. Set Cloudflare Secrets (Important)
Bashwrangler pages secret put YOUTUBE_API_KEY --project-name karaneko
wrangler pages secret put JWT_SECRET --project-name karaneko
wrangler pages secret put RESEND_API_KEY --project-name karaneko
wrangler pages secret put RESEND_FROM_EMAIL --project-name karaneko
wrangler pages secret put ADMIN_SECRET --project-name karaneko
Paste the real value when prompted for each command.

4. Deploy
Bashnpm run deploy

5. After Deployment

Open your deployed site.
Register a new account.
Check your email (including spam) for verification code from Karaneko <karaneko@resend.dev>.


Useful Commands
Bashnpm run dev:local          # Local dev with Cloudflare bindings
npm run build              # Build locally
wrangler pages deployment list

Notes:

Without a custom domain, emails come from @resend.dev (acceptable for now).
For better deliverability later, add your own domain in Resend.
