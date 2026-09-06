# Nova Arena handoff

## Public deployment

https://nova-arena-public.vercel.app

The source repository is https://github.com/serhii1staf/nova-arena.

## Local project

The workspace is currently at:

`C:\Users\Bruker\Downloads\scalable-3d-multiplayer-shooter`

This folder should be published to a private or public GitHub repository before another AI can clone it.

## Stack

- Next.js 16, React 19, TypeScript
- Three.js, React Three Fiber, Rapier physics
- Neon PostgreSQL through Drizzle
- Cloudflare Worker + Durable Object WebSocket realtime server
- Vercel production deployment

## Deploy targets

- Vercel project: `scalable-3d-multiplayer-shooter`
- Cloudflare Worker: `nova-arena-realtime`
- Cloudflare Worker endpoint: `https://nova-arena-realtime.odi44972.workers.dev`

## Required secrets

Do not commit or paste secret values into source files. Configure these in the relevant provider dashboards:

- Vercel Production: `DATABASE_URL`
- Cloudflare Wrangler authentication for deploying `cloudflare/`
- Vercel CLI authentication for deploying the Next.js app

The local `.env.local` file is ignored by Git. Rotate any API keys that were previously pasted into chat.

## Commands

```powershell
npm install
npm run typecheck
npm run lint
npm run build
vercel --prod
Push-Location cloudflare
wrangler deploy --config wrangler.jsonc
Pop-Location
```

The database schema can be initialized with:

```powershell
node scripts\migrate-db.cjs
```

## Important architecture note

The browser uses Cloudflare WebSockets for realtime positions. Neon stores profiles, skins, matches, leaderboard data, and persistent presence-related records. Realtime combat authority is not yet server-authoritative.