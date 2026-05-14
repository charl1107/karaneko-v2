# Karaneko v2

A modern karaoke singing app with real-time scoring, party KTV mode, and phone remote control.

## ✨ Features

- YouTube-based karaoke with synced lyrics
- Real-time pitch detection and scoring (S/A/B/C/D ranks)
- Solo + Party KTV mode (Big screen + Phone controller)
- Email verification with Resend (free tier supported)
- Secure admin login with secret suffix
- Rate limiting & caching
- About, Privacy, Terms of Service, and Contact pages

## Admin Login

To login as admin:
1. Set `ADMIN_SECRET` in Cloudflare
2. Use your admin username
3. Password = `yournormalpassword` + `ADMIN_SECRET`

## New Pages
- `/about` - About the project
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/contact` - Contact form

## Environment Variables

See `DEPLOY.md` for full list.

## Quick Start

See `DEPLOY.md`