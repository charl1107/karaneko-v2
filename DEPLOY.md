## Karaneko v2 Deployment Guide

### Prerequisites
- Cloudflare account
- Node.js 20+
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/charl1107/karaneko-v2.git
cd karaneko-v2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables (Critical)

Create `.dev.vars` for local development:

```env
YOUTUBE_API_KEY=your_youtube_api_key
JWT_SECRET=your_strong_jwt_secret
RESEND_API_KEY=your_resend_api_key
ADMIN_SECRET=your_strong_admin_secret_here
```

**Important Secrets for Cloudflare:**

Go to Cloudflare Dashboard → Your Project → Settings → Variables & Secrets and add:

- `YOUTUBE_API_KEY`
- `JWT_SECRET` (min 32 chars)
- `RESEND_API_KEY`
- `ADMIN_SECRET` ← **Required for admin login**

### 4. Database Setup (D1)
```bash
# Create database
npx wrangler d1 create karaneko-db

# Update wrangler.toml with the new database ID

# Apply schema
npm run db:migrate
```

### 5. Local Development
```bash
npm run dev:local
```

### 6. Deploy to Cloudflare Pages
```bash
npm run deploy
```

### Admin Login Instructions
1. Create an account normally
2. Set that username as admin in the database (role = 'admin')
3. To login as admin: `yourpassword` + `ADMIN_SECRET` (concatenated)

Example: Password field = `mypasswordSuperSecret123!`

### New Pages
- `/about`
- `/privacy`
- `/terms`
- `/contact`

For full setup, see README.md
