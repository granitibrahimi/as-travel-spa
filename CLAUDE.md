# AS Travel SPA — Project Rules

A standalone Vue 3 (Vite) SPA that talks to the AS Travel platform API over a
bearer token. This file documents conventions to follow when working here.

## Build & output

- Build to `public/` (not `dist/`), and the HTML entry is emitted as
  **`index.php`**, not `index.html`. This is handled by the `htmlToPhp` plugin
  and `build.outDir` in `vite.config.js` — don't change it back.
- Verbatim static assets (favicon, logos, etc.) live in **`static/`**, which is
  Vite's `publicDir`. They are copied to the build root. Do **not** put static
  files in `public/` — that folder is the build output and is gitignored.
- `VITE_*` env vars are inlined at **build time**. Any environment (local,
  Laravel Cloud, etc.) must have them set *before* building.

## Git

- **Do not** add a `Co-Authored-By` trailer (or any co-author line) to commits.
- Only commit/push when explicitly asked. Branch off `main` if needed.

## API & data

- All API access goes through `src/helpers/api.js` (axios instance). Request
  paths are **relative** to `VITE_API_URL` (which already includes `/api/v1`),
  e.g. `api.get('/messages')`, not a full URL.
- The bearer token is attached automatically; a `401` clears it and bounces to
  login. Don't re-implement auth headers per request.
- List endpoints use a resource-collection envelope: rows in `data`, paginator
  in `meta`. Normalize as `{ data: data.data, ...data.meta }` and render with
  `ApiPagination`. Cancel in-flight requests with `AbortController` on re-fetch.

## Auth, permissions & user snapshot

- The current user (incl. permissions) is cached **in memory** in the Pinia
  auth store (`src/stores/auth.js`) as `auth.user`. It is refreshed on **login**
  and on **app boot** (`bootstrap()` calls `/me`); it is *not* persisted to
  localStorage (only the token is) and *not* refetched on SPA navigation.
- **Reuse the `auth.user` snapshot** rather than calling `/me` again. To force a
  refresh, call `auth.bootstrap()` (updates the shared snapshot app-wide).
- Check permissions with `auth.can('perm')` / `auth.canAny([...])`. Never gate
  UI on ad-hoc permission logic.

## Navigation

- The sidebar/workspaces are defined in `src/config/workspaces.js` and filtered
  by permissions (`can` / `canAny`). Add nav items there, not in the layout.
- Navigation currently keys off **path strings** (`to: '/foo'`), and
  `AppLayout.vue` matches the active item via `route.path`. Routes are named in
  `src/router.js`; you may navigate by name (`router.push({ name })`), but if you
  switch nav config to named routes you must also update the active-state
  matching and the page-label lookups (`OnlineUsers.vue`, `Me.vue`).

## Real-time (Laravel Reverb / Echo)

- Real-time uses Laravel Echo + pusher-js against a Reverb server, wired in
  `src/helpers/echo.js`. Its lifecycle is tied to auth (connect on login/boot,
  disconnect on logout).
- Only the **public** `VITE_REVERB_*` vars belong in the client
  (`VITE_REVERB_APP_KEY`, `_HOST`, `_PORT`, `_SCHEME`). **Never** expose
  `REVERB_APP_ID` or `REVERB_APP_SECRET` — they are server-side secrets and
  would be baked into the shipped bundle.
- Presence (who's online + current page) uses a presence channel plus client
  "whisper" events for live URLs — see `src/stores/presence.js`.

## List-view row actions

Decide the actions UI by the **number of actions available for that row**:

- **Up to 4 actions → the three-dots (⋯) dropdown.** Use
  `src/components/DropdownMenu.vue` with an `items` array of
  `{ label, href?, action?, danger? }`. Destructive actions open a
  `ConfirmDialog`. See `src/pages/MealTypes/Index.vue` and
  `src/pages/Messages/Index.vue` for the pattern.
- **More than 4 actions → the right-side `<aside>` overlay.** Use
  `src/components/ActionsOverlay.vue`: a ⋯ button sets the selected row and the
  overlay lists the actions.

Count only the actions the user can actually see (after permission filtering).

## Code style

- 4-space indentation. Vue SFCs use `<script setup>`.
- Match surrounding patterns: stores in `src/stores/`, shared UI in
  `src/components/`, pages in `src/pages/<Feature>/`. Reuse existing components
  (`FullWidthBox`, `Loader`, `InputText`, `ApiPagination`, etc.) over new markup.
</content>
