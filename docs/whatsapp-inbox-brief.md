# WhatsApp staff inbox — frontend build brief

A WhatsApp-Web-style panel for staff to read and answer customer conversations,
with the thread updating live as messages land.

## Status

A first version already exists on branch **`whatsapp-chatbot`**:

| File | Role |
| --- | --- |
| `src/pages/Whatsapp/Index.vue` | two-pane panel: conversation list + thread + composer |
| `src/stores/whatsapp.js` | list + thread state, Echo subscription, actions |
| `src/router/routes/crm.js` | route `whatsappConversations.list` → `/whatsapp` |
| `src/config/workspaces.js` | CRM workspace → "WhatsApp" nav group |

It has: list with unread badges, thread with day separators and direction-sided
bubbles, a composer (Enter to send; sending pauses the AI for that chat),
"load earlier messages", live updates over Reverb, and the unread total mirrored
into `document.title`. This brief is the contract behind it plus the work left.

The customer's phone number is the conversation identity. Message history lives
in our database (Meta has no API to read it back), so the panel never talks to
Meta directly — it reads/writes through the platform API, which relays to Meta.

## API contract

Base URL already includes `/api/v1` (`VITE_API_URL`), so paths are relative:
`api.get('/whatsapp/conversations')`. Every endpoint needs a Sanctum session or
bearer token **and** the `whatsappConversations.manage` permission.
Failures: `401` unauthenticated · `403` no permission · `404` id is not a
WhatsApp conversation · `422` validation.

### `GET /whatsapp/conversations`

Inbox list, paginated 30/page, newest activity first.
Query: `q` (name or phone), `unread=1`, `page`.
Envelope: `{ data: { items: Conversation[], pagination } }` — use `castPaginated`.

```jsonc
// Conversation
{
  "id": 42,
  "name": "Arta Krasniqi",
  "phone": "38344123456",
  "ai_enabled": true,            // false once a human takes over
  "unread_count": 3,             // team-wide, inbound since agent_read_at
  "last_contact_at": "2026-08-31T14:07:55+00:00",
  "last_message": { /* Message */ }   // null if none yet
}
```

### `GET /whatsapp/conversations/{id}/messages`

One thread, paginated 50/page, **newest first** — reverse each page for display.
Page 1 = latest 50; `page=2` for older history.

```jsonc
// Message
{
  "id": 9012,
  "conversation_id": 42,
  "direction": 1,                // 1 customer · 2 staff · 3 AI
  "author": "Customer",
  "body": "A keni oferta për Antalya në gusht?",
  "user": "Blerim Hoxha",       // staff name for direction 2, else null
  "at": "2026-08-31T14:07:55+00:00"
}
```

### `POST /whatsapp/conversations/{id}/messages`

Send a staff reply. Body: `body` (string, ≤ 4096, required),
`pause_ai` (bool, default `true`).
The platform sends to Meta **first**, then stores the message as `direction: 2`;
a failed send is a `500` and nothing is stored. Returns `201 { message, data: { id } }`.
The stored message also arrives on the broadcast channel — treat that as the
source of truth for appending it.

### `POST /whatsapp/conversations/{id}/read`

Marks the conversation read for the whole team (`agent_read_at = now`), emits
`.read`. Returns `200`. Call on thread open and on each inbound message while
that thread is focused.

### `POST /whatsapp/conversations/{id}/ai`

Body: `enabled` (bool, required). `false` pauses the AI auto-responder for this
conversation; `true` resumes it **and** starts a fresh AI context. Returns `200`.

### Message directions

- `1` — customer → left bubble, surface colour
- `3` — AI auto-reply → right bubble, tinted
- `2` — staff reply → right bubble, solid accent (`user` holds the staff name)

## Realtime contract

One private channel: **`private-whatsapp-inbox`** — `echo.private('whatsapp-inbox')`.
Authorized at `/broadcasting/auth` with the bearer token + the same permission.
Echo is already connected app-wide on login — reuse `getEcho()`.

| Event | Payload | Handling |
| --- | --- | --- |
| `.message` | `{ message: Message, conversation: Conversation }` | Any message (inbound/AI/staff). Append to the open thread; on other conversations bump `unread_count` and float the row to the top. |
| `.read` | `{ conversation_id: number }` | Clear that row's unread badge. |

Both events are queued server-side → a **queue worker must run** and
`BROADCAST_CONNECTION=reverb`. No client events / whispers (unlike presence).

## State & edge cases the UI must handle

- **Open thread never shows unread.** A `.message` for the open conversation
  keeps its badge at 0 and calls `/read` when the window is focused.
- **De-dupe by message id.** A staff reply returns from the POST *and* arrives
  as `.message` — append once.
- **Missed events on reconnect.** Echo can drop; on reconnect refetch the list
  and the open thread (events fired while offline are not replayed).
- **Read state is team-wide.** No per-agent unread — a colleague reading a chat
  clears the badge for everyone via `.read`.
- **AI toggle.** List row and thread header both reflect `ai_enabled`; sending a
  reply implicitly sets it `false` unless `pause_ai: false`.

## Work remaining

### P1

- **Optimistic send** — render the staff bubble immediately (pending state),
  reconcile on its `.message`, roll back + error on `500`.
- **Reconnect recovery** — hook Echo connection state; on `connected` after a
  drop, re-run the list + open-thread fetches.
- **Error & empty states** — failed send, failed load, no conversations, no
  permission each need a clear message.

### P2

- **Message-body search** — `q` only matches name/phone today; needs a backend
  full-text search over `person_conversation_messages` first.
- **Media messages** — inbound non-text is dropped at the webhook; needs backend
  (store Meta media, expose URL) + image/document/audio bubbles.
- **Delivery & read receipts** — Meta `statuses` webhook events aren't captured
  or broadcast yet; no ticks on staff messages until they are.
- **Deep link** — `/whatsapp/:id` to open a specific conversation.
- **Contact side panel** — link the Person to its Customer record, recent tasks,
  "create task from this chat".
- **Filters & assignment** — `unread=1` exists server-side; add an assigned-agent
  column once the backend models it.
- **Desk niceties** — sound / browser notification on inbound when the tab is
  hidden, ⌘↵ to send, arrow keys between conversations, virtualised thread.

## Platform prerequisites (not frontend work, but the panel is inert without them)

- `BROADCAST_CONNECTION=reverb` on the API (config default is `null`).
- Queue worker running.
- Grant `whatsappConversations.manage` to the relevant roles.
- `php artisan migrate` (adds `agent_read_at`, `ai_context_reset_at` to
  `person_contact_references`).
- Meta credentials + webhook registered (from the chatbot setup).

---

Contract current as of the `whatsapp-chatbot` branches on both repos. The JSON
shapes come from `modules/WhatsApp/Support/ConversationPresenter.php` on the
platform — change a field there and it changes in the `.message` payload too.
