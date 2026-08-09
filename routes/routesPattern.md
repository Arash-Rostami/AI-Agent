# Route Table Pattern

## 1. Philosophy

Routes are thin: every handler is a controller function imported and wired directly, with per-route middleware (`upload.single('file')`, `avatarUpload`, `protect`) applied inline. There is no route-level input validation layer (no Joi schema wired in despite `joi` being a dependency) — validation happens inside each controller. Auth is **not** applied at the router level for most paths; it's enforced globally upstream by `middleware/routeGaurd.js` (see [[middlewarePattern]]) or manually inside individual controllers via `if (!req.userId) return res.status(401)...`. When adding a route, always check whether `guardChatRoutes`'s allowlist needs updating — proximity to an existing path does not imply the same protection (`/ask` is public, `/ask-groq` is not).

## 2. `routes/auth.js` — mounted at `/auth`

| Method | Path | Middleware | Handler purpose |
|---|---|---|---|
| POST | `/auth/login` | — | Verify credentials via `User.matchPassword`, issue `jwt` cookie |
| POST | `/auth/signup` | — | Gate on `SIGNUP_SECRET` env var matching client-supplied `secretKey`; create user |
| POST | `/auth/logout` | — | Overwrite `jwt` cookie with `expires: new Date(0)` |
| GET | `/auth/admin` | — | Best-effort JWT decode; returns `{username, avatar, canSync}`, never errors |
| POST | `/auth/change-password` | `protect` | Requires `req.user` |
| POST | `/auth/upload-avatar` | `protect`, `avatarUpload.single('avatar')` | Disk upload, ≤3MB, image extensions only |
| POST | `/auth/remove-avatar` | `protect` | Deletes avatar file, nulls `user.avatar` |

`/auth/admin`'s `canSync` flag is a hardcoded username allowlist (`['arash','siamak','ata'].includes(user.username.toLowerCase())`) rather than a check against the `role` field already on `models/User.js` — if you add a proper RBAC role, migrate this check to use it instead of extending the literal list.

## 3. `routes/web.js` — mounted at `/`

| Method | Path | Middleware | Handler | Auth (via `guardChatRoutes`) |
|---|---|---|---|---|
| GET | `` (`/`) | — | `PageController.serveIndex` | ✅ protected |
| GET | `/initial-prompt` | — | `ChatController.initialPrompt` | ✅ protected (prefix match) |
| POST | `/ask` | `upload.single('file')` | `ChatController.ask` | ❌ **not** protected |
| POST | `/ask-groq` | `upload.single('file')` | `ChatController.handleAPIEndpoint(callGrokAPI, 'Groq')` | ✅ protected (prefix match) |
| POST | `/ask-arvan` | `upload.single('file')` | `ChatController.handleAPIEndpoint(callArvanCloudAPIWithTools, 'ArvanCloud')` | ✅ protected |
| POST | `/clear-chat` | — | `InteractionController.clearChat` | ❌ manual `req.userId` check only |
| POST | `/new-chat` | — | `InteractionController.newChat` | ❌ |
| GET | `/api/history` | — | `InteractionController.getInteraction` | ❌ manual `req.userId` check only |
| GET | `/api/history/:id` | — | `InteractionController.getInteractionDetails` | ❌ |
| POST | `/api/history/:id/restore` | — | `InteractionController.restoreInteraction` | ❌ |
| DELETE | `/api/history/:id` | — | `InteractionController.deleteInteraction` | ❌ |
| POST | `/api/history/:id/email` | — | `EmailController.emailInteraction` | ❌ manual `req.userId` check only |
| POST | `/api/vector/sync` | — | `VectorController.syncVectors` | ❌ **no auth check anywhere**, UI-only restriction via `canSync` |
| POST | `/api/` | — | `ChatController.simpleApi` | ❌ |

All ArvanCloud model selections (currently `chatgpt`, backend model `GPT-OSS-120B-burmt`) route through the same `/ask-arvan` — disambiguated inside the request body (`model` field), not by URL, so adding a new ArvanCloud-backed model doesn't need a new route, just a new entry in `services/arvancloud/index.js`'s `MODELS` map (see [[servicesPattern]]). The Gemini fallback cascade's ArvanCloud hop (`Gemini-3.1-Flash-Lite-Preview-8dzyx`) is called internally by `services/gemini/index.js`, not through this route.

`upload.single('file')` on the four `/ask*` routes uses `middleware/uploadHandler.js`'s **memory storage with no size/type filter** — every uploaded chat attachment is buffered in RAM unbounded before the controller ever sees it.

## 4. Anti-patterns

❌ **`POST /api/vector/sync` has zero server-side auth.** Any caller who knows the path can trigger a full vector-store rebuild (`Vector.deleteMany({})` then re-embed every RAG file) — the `canSync` gate only hides the sync button in the UI for non-allowlisted usernames. If this route stays unauthenticated, treat that as a known gap, not a design choice to imitate for new admin-only routes — add `protect` (or a dedicated admin check) to any future route with write/rebuild side effects.

❌ **Don't add a new `/ask-*`-shaped route without registering it in `guardChatRoutes`'s prefix check** — it already covers `/ask-*` generically, but a route named e.g. `/query` or `/chat` would silently fall through to the unauthenticated default, mirroring the `/ask` gap. Confirm the auth story for every new endpoint explicitly rather than assuming it follows from a similar-looking neighbor.

❌ **Don't skip the `model`/`fileData` special-casing when wiring a new ArvanCloud-style provider through `ChatController.handleAPIEndpoint`.** ArvanCloud is the only provider requiring a `model` field and a `data:mime;base64,...` URI file shape (vs. Gemini's `{mimeType,data}` object) — the factory branches on `apiName === 'ArvanCloud'` explicitly; a new provider with a different contract needs its own branch there, not a silent reuse of an existing one.
