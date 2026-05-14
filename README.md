# Karaneko v2 🎤

**A modern, real-time karaoke app** built with Next.js 15, Cloudflare D1, and YouTube integration.

Sing along to your favorite songs, compete with friends on voice scoring, host parties with remote control, and climb the leaderboard.

## ✨ Features

- YouTube-powered song search with lyrics
- Real-time voice scoring
- Mobile-first KTV Mode (optimized for phones)
- Party Mode with remote control
- User accounts, favorites, history & stats
- Global leaderboard
- Admin dashboard
- Secure authentication (JWT + refresh tokens)
- Rate limiting & security hardening

## 🚀 Quick Deploy

See [`DEPLOY.md`](DEPLOY.md) for complete deployment instructions.

### Local Development

```bash
git clone https://github.com/charl1107/karaneko-v2.git
cd karaneko-v2
npm install
cp .env.example .env.local
npm run db:migrate:local
npm run dev:local

Tech Stack

Framework: Next.js 15 (App Router) + React 19
Database: Cloudflare D1
Styling: Tailwind CSS
Email: Resend
Deployment: Cloudflare Pages

Project Status
✅ Production Ready

Full auth system with refresh tokens
Rate limiting & security
Mobile KTV experience
Email verification working with Resend

Remaining: More real-device testing + tests
