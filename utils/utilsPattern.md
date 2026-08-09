# State Manager Pattern ("Memory-First" Architecture)

## 1. Philosophy

`utils/` holds the app's stateful managers — the README's "Memory-First Architecture" claim lives here, concretely, in two files that are easy to confuse by name: `conversationManager.js` (chat history — what the README actually means by "ConversationManager") and `sessionManager.js` (exports `KeySessionManager`, which remembers **which Gemini/ArvanCloud provider slot last worked for a given identity**, not chat sessions). Keep these conceptually separate when reading or extending this layer — nothing about the naming makes that obvious on its own.

There are, in fact, **three unrelated things called "session" in this codebase**, none sharing storage or code:
1. `session_id` cookie / `ConversationManager`'s in-memory Map — chat-history correlation.
2. `jwt` cookie — login/auth, fully stateless (no server-side session record).
3. `KeySessionManager`'s per-identity provider-slot assignment, persisted to `data/sessions.json`.

## 2. `conversationManager.js` — in-memory chat state
```js
const conversationStore = new Map();   // sessionId -> history array
const userSessionMap = new Map();      // userId -> active sessionId
```
Both are module-level, process-local `Map`s with **no eviction logic** — they grow unbounded for the life of the process. `getOrCreateSessionId(userId, ip)` ignores both arguments and always returns `crypto.randomUUID()`; session continuity comes entirely from pairing that call with `mapUserToSession` immediately after (every current call site does this — `keySession.js`, `InteractionController.restoreInteraction`, `InteractionController.newChat` — but it's an implicit contract, not enforced).

`appendAndSave(sessionId, history, userMsg, assistantMsg)` always writes `role: 'assistant'` for model replies — see [[../models/modelsPattern]] for why this doesn't match the Mongoose `InteractionLog` schema's enum, and don't add a third read-side workaround; fix the mismatch at the source instead.

**What happens on restart**: both Maps are wiped. A client with a still-valid `session_id` cookie gets `getHistory(sessionId) === []` (Map miss) — the conversation silently restarts empty even though the cookie looks valid. The transcript isn't gone (unless it was an ETEQ-mode session — see below) — it survives in `InteractionLog` under the same `sessionId`, but nothing auto-rehydrates it. The only path back into memory is the explicit restore flow (`InteractionController.restoreInteraction`), which mints a **new** session id rather than resuming the old one.

**ETEQ mode is the one exception to "memory-first, Mongo-backed": ETEQ conversations are never persisted.** `ChatController` gates every `syncToDB` call with `if (!isEteqMode)`. An ETEQ session that outlives the process (restart, Map eviction if that's ever added) is lost permanently — not degraded, gone.

## 3. `sessionManager.js` — `KeySessionManager` (per-identity provider stickiness + a global circuit breaker, unrelated to chat)
Maps `identifier → {slot, timestamp}` (`slot` is `'primary'|'arvan'`) with a 2-hour sticky TTL, persisted to `data/sessions.json` via **synchronous** `fs.readFileSync`/`writeFileSync`. `getProviderSlot(id)` returns the last-known-working slot for that identity (or `'primary'` if none/expired); `setProviderSlot(id, slot)` is called by `services/gemini/index.js`'s `askGemini` after a slot successfully answers, so the next request from that identity starts there instead of re-trying a dead one. This is real synchronous disk I/O per request that needs a lookup — the opposite of "memory-first" for this specific concern — and has no file locking, so concurrent requests racing a read-modify-write are a real (if currently low-probability, single-process) hazard. If this app is ever scaled to multiple processes/instances, this file-backed store becomes a correctness problem, not just a performance one — it would need to move to Mongo or Redis.

The same class also holds `isPrimaryDown()`/`markPrimaryDown(cooldownMs)`/`clearPrimaryDown()` — an **in-memory-only, global** (not per-identity) flag `askGemini` sets when it detects Gemini's *daily* free-tier quota is exhausted, so a brand-new identity with no sticky slot of its own doesn't also have to eat one guaranteed-fail `primary` attempt before falling over. Don't confuse the two mechanisms: per-identity stickiness remembers what worked for *one caller*; the circuit breaker remembers whether a shared resource is known-broken for *everyone*, right now. See [[../services/servicesPattern]] §3a for the full fallback cascade this backs.

## 4. `vectorManager.js` — RAG ingestion, in-memory search
```js
let vectorCache = [];   // mirrors the Vector Mongo collection, rebuilt at startup and on sync
```
- **`initializeVectors()`** (called from `app.js`, **after** `startServer` — the HTTP server is already accepting traffic while this runs) reads **only from Mongo** (`Vector.find({})`), not from `documents/RAG/*.txt` directly. If `Vector` is empty (fresh DB, sync never run), `vectorCache` stays `[]` and RAG search returns nothing until someone hits the sync endpoint — silently, with no startup warning beyond a log line.
- **`syncDocuments()`** (triggered by `POST /api/vector/sync`) does a **full destructive rebuild**: `Vector.deleteMany({})` then re-reads every `.txt`/`.md` in `documents/RAG/` (currently just `cxRag.txt`), chunks it (`chunkText` — naive fixed-size character slicing, no sentence/overlap awareness), and re-embeds each chunk sequentially via `services/arvancloud/embeddings.js`. A failure partway through leaves the store partially populated with no rollback; a sync mid-traffic briefly empties `vectorCache` for every in-flight request that would have used it.
- **`searchVectors(query, topK=3, filterFileName)`** — brute-force cosine similarity over the in-memory array (no ANN index), with a hardcoded relevance floor `score > 0.15`. Includes a dimension-mismatch warning worth heeding: if the embedding model ever changes without a re-sync, similarity scores silently degrade toward meaningless.
- **RAG is effectively BMS-only today.** `utils/promptManager.js` only calls `searchVectors` when `ragFile` is set, and only the BMS case sets one (`cxRag.txt`); ETEQ and generic/MAIN modes inject a whole static instruction file instead. Don't assume adding a new file to `documents/RAG/` makes it searchable for every mode — it only becomes reachable through the BMS code path unless `promptManager.js` is extended.

## 5. `promptManager.js` — system prompt assembly
`determineAppContext(req)` picks BMS > ETEQ > generic-restricted > MAIN based on `req.isBmsMode`/`isEteqMode`/`isRestrictedMode`, then `constructSystemPrompt` selects a base instruction (from `config/index.js`'s boot-time constants) and, for BMS only, appends vector-search results — falling back to the **entire raw `cxRag.txt` file** if `searchVectors` returns nothing or throws. Its own `getRagFileContent` re-reads `documents/RAG/*.txt` live on every call (unlike `config/index.js`'s one-time `readFileSync`s) — see [[../config/configPattern]] §4 for why this distinction matters when debugging stale-prompt issues.

## 6. Auth/identity managers
`userManager.js` — CLI + library entry point (`node utils/userManager.js create <user> <pass> [role] [avatar]`), detects CLI execution via `process.argv[1] === fileURLToPath(import.meta.url)` so it's safely importable too; `createAppUser` is reused by the HTTP signup route. Loads its own `.env` independently of `config/index.js` (see [[../config/configPattern]]). Password hashing happens in the `User` model's `pre('save')` hook, not here — `createAppUser` just calls `.save()`.

`authManager.js` — a single `generateToken(id)` wrapper around `jwt.sign`. Nothing else.

## 7. Logging managers
`interactionLogManager.js`'s `syncToDatabase` does an **upsert-by-`sessionId`** that overwrites the entire `messages` array every call — not an incremental append. It remaps `'tool_request'`/`'tool_response'` roles to `'system'` before writing (the schema doesn't allow the former two) but does **not** fix the separate `'assistant'` vs. enum mismatch — see [[../models/modelsPattern]].

`logManager.js` is not a Mongo writer at all — `SILENT_PATH(req)` is a path-matching helper used only to suppress noisy `console.log` output for polling/asset paths in `accessLogger.js` and `restrictedMode.js`. It does not gate whether any log document gets written.

## 8. Anti-patterns

❌ **Don't confuse `sessionManager.js` (provider-slot stickiness) with `conversationManager.js` (chat history)** when tracing a bug that mentions "session" — check which of the three session concepts in §1 is actually implicated first.

❌ **Don't assume a `documents/RAG/*.txt` file is searchable from every mode.** Only BMS mode calls `searchVectors` today; a new RAG file needs `promptManager.js` changes to be reachable elsewhere.

❌ **Don't add a fourth read-side compensation for the `role: 'assistant'` vs. Mongoose-enum mismatch.** Fix it at the write side (`conversationManager.appendAndSave` or the schema) instead — see [[../models/modelsPattern]].

❌ **Don't treat `KeySessionManager`'s file-backed store as production-scale-safe.** It's fine for a single process; it is not safe for horizontal scaling without a real datastore behind it.
