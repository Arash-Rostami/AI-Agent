# Architecture Overview — AI Orchestration Engine

## MANDATORY: Study the relevant pattern docs before any implementation

Before writing or editing any code in this repository, you MUST first read `CLAUDE.md` (this file) in full, then the `*Pattern.md` doc(s) for every folder your change touches — listed in the index below. This applies regardless of how small the change looks. Do not start editing, refactoring, or adding code until you have read them.

Why this is mandatory, not optional: this codebase has several non-obvious cross-file contracts that are invisible from reading a single file in isolation — dual mode-gating that must be updated in two places at once (`services/servicesPattern.md`), a hardcoded auth allowlist where proximity to a protected path does not imply the same protection (`routes/routesPattern.md`), a static-middleware ordering that silently bypasses the auth chain (`middleware/middlewarePattern.md`), a known role/schema mismatch with three existing compensating workarounds that must not become four (`models/modelsPattern.md`), and more, itemized per doc. Skipping the read risks either reintroducing a known bug or building on top of one without realizing it.

If a task spans multiple folders, read all of their pattern docs before touching any of them — the cross-links (`[[other-doc]]`) exist because the subsystems are coupled, not decorative.

Node.js/Express (`"type":"module"`, ESM throughout), MongoDB via Mongoose, vanilla-JS frontend. A single Express app fronts three LLM providers (Gemini, Groq, ArvanCloud), a tool-calling layer shared by Gemini and ArvanCloud, an in-memory-first chat-history system with background Mongo persistence, and a brute-force in-memory RAG/vector search used only in one operating mode. This document is the map; each subsystem's dense, concrete detail lives in a `*Pattern.md` file inside its own folder — read this first for how the pieces fit together, then the relevant pattern doc before changing that subsystem.

## Pattern doc index

| Folder | Doc | Covers |
|---|---|---|
| `middleware/` | [[middleware/middlewarePattern]] | The request pipeline, auth gate, restricted-mode detection |
| `routes/` | [[routes/routesPattern]] | Full route table, what's auth-guarded and what isn't |
| `controllers/` | [[controllers/controllersPattern]] | Request handlers, the provider-reconciliation layer |
| `services/` | [[services/servicesPattern]] | The three LLM providers, Gemini's tool-calling pipeline, BMS/email integrations |
| `tools/` | [[tools/toolsPattern]] | Gemini function-declaration schemas and tool registration |
| `models/` | [[models/modelsPattern]] | Mongoose schemas and their one owner each |
| `config/` | [[config/configPattern]] | Env loading, boot-time validation, instruction-text loading |
| `utils/` | [[utils/utilsPattern]] | The "memory-first" state managers, RAG pipeline, session/key management |
| `public/assets/js/` | [[public/assets/js/scriptPattern]] | The frontend Handler pattern |
| `public/assets/css/` | [[public/assets/css/stylesPattern]] | Design tokens, theming, cascade order |

## 1. Request lifecycle, end to end

```
app.js middleware chain (order-dependent, see middlewarePattern):
  body parsers → cookieParser → allowFrameEmbedding → express.static('public')
  → checkRestrictedMode → identityMiddleware → apiKeyMiddleware → logAccess → guardChatRoutes
  → routes ('/', '/auth') → errorHandler
```
Each middleware writes fields onto `req` for the next to read — there's no request-context object, just accumulating `req.*` state: `req.isRestrictedMode/isBmsMode/isEteqMode` (restrictedMode.js), `req.userId/userIp/origin/keyIdentifier` + `req.anonId` when the identity was minted (userIdentity.js), `req.geminiApiKey/sessionId/conversationHistory` (keySession.js), `req.user` (authGuard.js, normal-auth branch only). **`express.static` is mounted before the identity/auth chain** — anything resolvable as a literal file under `public/` (including `index.html`) bypasses auth entirely; only the bare `GET /` route goes through `PageController.serveIndex` behind `protect()`. See middlewarePattern §2 for the concrete consequence.

Auth itself is enforced by a hardcoded path allowlist in `guardChatRoutes` (`middleware/routeGaurd.js`), not by router-level middleware on most routes — `/ask` (default Gemini) is deliberately public while `/ask-groq`/`/ask-arvan` (paid providers) require login, and most `/api/*` routes rely on manual `if (!req.userId)` checks inside each controller instead of a shared gate.

## 2. Two unrelated things called "session" (a third was removed)

This is the single most important naming trap in the codebase:
1. **`session_id` cookie + `ConversationManager`'s in-memory `Map`** — chat-history correlation (`utils/conversationManager.js`).
2. **`jwt` cookie** — login/auth, fully stateless, no server-side record (`utils/authManager.js`, `middleware/authGuard.js`).

None share storage or code. See utilsPattern §1 before assuming a "session" bug touches more than one of these. A third thing — `KeySessionManager` (`utils/sessionManager.js`) — used to back the Gemini free-tier fallback cascade, persisted to `data/sessions.json`. It has been **deleted entirely** (cascade removed in §5, zero callers): both the file and `data/sessions.json` are gone. The file `middleware/keySession.js` is unrelated to it despite the shared "session" name — that's the chat-history `session_id` cookie setter.

## 3. The "memory-first" architecture, concretely

Chat history lives in a process-local `Map` (`conversationManager.js`) and is read/written on every turn with zero I/O latency. `ChatController` responds to the client **before** persisting: `res.json(...)` fires, then a fire-and-forget `syncToDB(...).catch(...)` upserts the full history into `InteractionLog` (Mongo) — the client never waits on database latency, and a Mongo failure is logged but invisible to the user.

Consequences worth internalizing:
- A **process restart wipes the in-memory Map**. Non-ETEQ conversations survive in Mongo but don't auto-rehydrate — only the explicit restore flow (`InteractionController.restoreInteraction`) brings one back, and it mints a **new** session id rather than resuming the old one.
- **ETEQ-mode conversations are never persisted at all** (`if (!isEteqMode) syncToDB(...)` gates every write) — they exist only in memory and are lost permanently on restart.
- **`/clear-chat` only clears the in-memory Map entry** — the Mongo record survives and remains restorable/emailable until an explicit `DELETE /api/history/:id`.

## 4. Restricted mode — iframe/BMS/ETEQ, one detection, many consumers

A single middleware (`restrictedMode.js`) sets three **independent** booleans from `Referer`/`X-Frame-Referer` header matching: `isRestrictedMode` (against an `ALLOWED_ORIGINS` env list), `isBmsMode` (hardcoded `export.bmsflow.org` substring), `isEteqMode` (hardcoded `eteq.vercel.app` substring). Because `isBmsMode`/`isEteqMode` don't derive from `ALLOWED_ORIGINS`, a request can have `isBmsMode=true` while `isRestrictedMode=false` — several downstream defenses only trigger `if (isRestrictedMode)`, so that combination silently skips a layer of tool-execution safety checking (see servicesPattern §3 Step 3). These three flags fan out to: auth bypass (`authGuard.protect` skips JWT entirely for any of the three), system-prompt selection (`promptManager.determineAppContext`), and tool availability — `formatter.getAllowedTools`/`isToolExecutionAllowed`, now shared by **both** Gemini's `responseHandler.js` and ArvanCloud's tool loop (see servicesPattern §3b).

**Watch what you put in `ALLOWED_ORIGINS`.** It's meant to list *external* sites permitted to embed this app — but browsers send `Referer: <current-page-URL>` by default on same-origin fetches, so if the app's *own* serving URL is ever listed there (e.g. `http://localhost:3000/` was, briefly), every direct, non-embedded visit to the app gets misclassified as restricted/embedded — silently stripping every tool (including `sendEmail`) unless Web Search is explicitly toggled on. Confirmed live and fixed. Before adding a new entry, ask whether it's genuinely a third-party embedding site, not the app's own address.

## 5. LLM provider layer — two tool-capable providers, no fallback loop

Gemini and ArvanCloud (GPT-OSS-120B, plus the ArvanCloud-hosted Gemini used by the Gemini option) both support tool-calling now — Groq (the "Ollama" option) remains a plain single-turn completion with no tools. `ChatController.handleAPIEndpoint` is the one place reconciling the providers' differing call signatures and return shapes (Gemini/ArvanCloud-with-tools: `{text, sources}`; Groq and the plain ArvanCloud call: a bare string). Gemini's own pipeline (`services/gemini/`) is a chain: request shaping (`formatter.js`) → dispatch (`index.js`) → response/tool-call routing (`responseHandler.js`) → tool execution (`toolHandler.js`); `errorHandler.js` now only logs (`classify` was removed with the cascade). The tool-call follow-up recursion previously had a real bug (12 arguments into an 11-parameter function, corrupting `fileData`/`isEteqMode` and breaking tool calls like `sendEmail` in BMS-mode conversations) — fixed and verified live; see servicesPattern §3 Step 5 if adding a new recursive call there.

ArvanCloud's tool-calling loop (`callArvanCloudAPIWithTools`, `services/arvancloud/index.js`) reuses Gemini's exact tool definitions, offer-layer filter, and execution-layer gate — converted to OpenAI's tool format at the boundary (`tools/openAiFormat.js`) rather than duplicated. A real bug was found and fixed here too: GPT-OSS-120B can leak raw internal "harmony" format tokens into its response when denied a tool it wants — `stripHarmonyArtifacts()` sanitizes it. See servicesPattern §3b.

The UI offers four options (`#service-select`): **Gemini** (default), **GPT**, **Ollama**, **Gemini Smart** (disabled — "coming soon"). Controllers call `askGemini` (the Gemini option), `askNativeGemini` (Gemini Smart, via `/ask-smart`), or `handleAPIEndpoint` (GPT/Ollama) — never the low-level `callGeminiAPI` directly. **There is no fallback cascade anymore** — the free-tier `GEMINI_API_KEY` daily quota was getting exhausted and the loop was "crazy logic" the user wanted gone; a premium key is coming. `askGemini` is now a **content dispatch, not a loop**: `useThinkingMode` → ArvanCloud's `Gemini-3-Flash-Preview-kc6io` (plain, tool-less); `fileData` → native `callGeminiAPI` (vision — only path that touches the free-tier key today, so image attachments 429 until the premium key lands); otherwise → ArvanCloud-hosted Gemini (`Gemini-3.1-Flash-Lite-Preview-8dzyx`) with tool-calling. `askNativeGemini` (Gemini Smart) is pure native Gemini (vision + tools, no thinking) — the premium-ready path, UI-disabled until the key is in. The old `KeySessionManager` per-identity sticky-slot + global circuit-breaker bookkeeping (`utils/sessionManager.js`, `data/sessions.json`) is **deleted entirely** — both files removed; re-introduce a real datastore only if a real fallback is ever re-added. See servicesPattern §3a for the full mechanics.

Tools themselves split schema (`tools/`, pure data) from implementation (`services/*Tool.js`, plain functions) with a manual, unenforced sync point (`tools/toolDefinitions.js`) and dual mode-gating (offer-time in `formatter.js`, execution-time in `responseHandler.js`) that must be updated together. The mode-gating (restricted/BMS/ETEQ enabling/disabling tools when accessed via iframe/external apps) is **independent of the provider dispatch** and unchanged by the cascade removal.

## 6. RAG / vector search — narrower than the README implies

`utils/vectorManager.js` maintains an in-memory mirror of the `Vector` Mongo collection, searched via brute-force cosine similarity (no ANN index). It's populated only by an explicit `POST /api/vector/sync` (destructive full-rebuild, no incremental sync) and is queried **only when BMS mode is active** — ETEQ and generic/MAIN modes inject a whole static instruction file as the system prompt instead of doing any vector search. Today only one file (`documents/RAG/cxRag.txt`) is actually ingested. See utilsPattern §4 before assuming RAG covers more than the BMS path.

## 7. Frontend — Handler pattern, no framework

`public/assets/js/app.js` detects which page loaded by DOM presence and lazy-loads a set of per-feature "Handler" classes via dynamic `import()`, split into an immediate "core" tier (chat input) and an idle-deferred tier (everything else). There's no central app object or shared state store — handlers compose each other directly, communicate rarely via `window` `CustomEvent` (one instance: `restore-chat`, bridging `HistoryHandler` and `ChatHandler`), and share exactly one true singleton (`ModalHandler`). See scriptPattern for the full breakdown and the specific duplicated-logic spots (profile loading, email-send, iframe detection) worth consolidating before adding a fourth copy.

CSS is a plain `@import` manifest (`app.css`) over `data-theme`-attribute-driven tokens loosely inspired by Material Design 3's visual language but not its token architecture. `login.html` uses a **separate**, already-drifted token set (`login.css`) rather than sharing `app.css`'s. See stylesPattern for the known duplicated-`@keyframes` block and the one undefined-but-referenced token (`--input-bg-rgb`).

## 8. Cross-cutting things to check before any change

- **Which "session" you're touching** (§2) — chat history and login are two separate systems (API-key rotation was a third, now deleted).
- **Whether `isRestrictedMode` and `isBmsMode`/`isEteqMode` actually agree** for the request path you're changing (§4) — don't assume one implies the other.
- **Whether your change needs `guardChatRoutes` updated** (routesPattern) — auth is allowlist-based, not automatic.
- **Whether you're adding a fourth compensating read-side fix for the `role: 'assistant'` vs. Mongoose-enum mismatch** (modelsPattern) — three already exist; fix the write side instead of adding a fourth.
