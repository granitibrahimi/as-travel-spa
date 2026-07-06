# AS Travel SPA

Standalone **Vue 3** single-page app (Vite) for the AS Travel CRM/Finance
workspaces. It has no backend of its own — it talks to the AS Travel platform
API over **Sanctum bearer tokens**.

## Stack
Vue 3 · Vue Router · Pinia · axios · Tailwind CSS 3 · Vite 5

## Setup
```bash
npm install
cp .env.example .env   # set VITE_API_URL to the platform API base URL
npm run dev            # http://localhost:5173
```

## Build
```bash
npm run build          # static output in dist/
npm run preview        # serve the production build locally
```

> `VITE_API_URL` is inlined into the bundle **at build time**, so set it for
> the target environment before running `npm run build`.

## Deployment
`npm run build` produces a static site in `dist/`. Deploy that folder to any
static host (Netlify, Vercel, Cloudflare Pages, S3/CloudFront, …). Configure the
host's SPA fallback so every route serves `index.html` (Vue Router owns
client-side routing).

## Structure
```
index.html          Vite entry (mounts #app)
src/
  main.js           bootstraps Vue + Pinia + Router
  api.js            axios client (bearer token from localStorage)
  router.js         routes + auth guard
  stores/auth.js    login / logout / bootstrap / permission checks
  pages/            Login, Home
```
