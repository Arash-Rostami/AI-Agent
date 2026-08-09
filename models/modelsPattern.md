# Mongoose Model Pattern

## 1. Philosophy

Five schemas, each owned by exactly one manager/controller that's the sole writer — `models/` itself has no cross-model logic. MongoDB here is a background persistence tier, not the primary read path for anything hot (chat history reads/writes go through the in-memory store first — see [[../utils/utilsPattern]]). Two schemas (`InteractionLog`, `Vector`) participate in the "memory-first" architecture directly; `User`, `AccessLog`, `EmailLog` are conventional Mongo-first records.

## 2. `User.js`
Fields: `username` (unique, trimmed), `password` (bcrypt-hashed), `role` (default `'user'`, exists but underused — see gotcha), `avatar`, `thinkingMode: {count, lastReset}`, `createdAt`.
```js
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(10));
});
userSchema.methods.matchPassword = async function (entered) {
    return await bcrypt.compare(entered, this.password);
};
```
Hashing happens in the schema's `pre('save')` hook, not in `utils/userManager.js` — any code path that creates/updates a `User` via `.save()` (including `userManager.createAppUser`) gets hashing for free; a path using `findOneAndUpdate` directly on `password` would **not**, since Mongoose hooks don't run on update queries by default.

**Gotcha**: `routes/auth.js`'s `/auth/admin` `canSync` check is a hardcoded username allowlist (`['arash','siamak','ata']`), not a check against `role` — the `role` field exists on this schema but isn't the actual authorization mechanism for the one privileged feature (vector sync) currently gated by role-like logic. If you build real RBAC, migrate that check here first.

## 3. `InteractionLog.js` — chat transcripts, the Mongo half of "memory-first"
```js
messages: [{ role: {type: String, enum: ['user', 'model', 'system']}, parts: [{text: String}], timestamp: Date }]
```
Indexed on `sessionId`, `userId`, compound `{userId, sessionId}`, and `{userId, createdAt:-1}` (for the paginated history sidebar). `fetchHistoryPreviews(userId, cursor, limit)` is a static aggregation producing a 50-char preview of the first user message per session.

**Known data-integrity gap**: the runtime consistently writes `role: 'assistant'` for model replies (`utils/conversationManager.js`), but the schema enum only allows `'user' | 'model' | 'system'`. Because `utils/interactionLogManager.js`'s `syncToDatabase` uses `findOneAndUpdate` **without `runValidators: true`**, Mongoose does not reject the out-of-enum value — it's silently persisted. Three separate places already compensate for this by treating `'model'` and `'assistant'` as equivalent on read (`InteractionController.restoreChat`, and two spots in the frontend `HistoryHandler.js`/`ChatHandler.js`). **Don't add a fourth compensating check** — either fix the enum to include `'assistant'`, or fix `ConversationManager.appendAndSave` to write `'model'`, and remove the read-side workarounds once the write side is consistent. Any new code that queries `messages.role` should account for both spellings until this is resolved.

## 4. `Vector.js` — RAG chunks
Fields: `fileName`, `chunkId` (`${file}_${i}`, looks unique but **has no unique index** — correctness currently depends entirely on `vectorManager.syncDocuments()` always wiping the collection before re-inserting), `text`, `vector: [Number]`, `createdAt`. Indexed on `{fileName:1}`. Loaded wholesale into an in-memory `vectorCache` array at startup (`initializeVectors`) and re-synced only via the explicit `POST /api/vector/sync` route — see [[../utils/utilsPattern]] for the ingestion/query pipeline.

## 5. `AccessLog.js`
Fields: `userId`, `ipAddress` (required), `origin`, `timestamp` (default now). No index beyond `_id`. Written from **two independent places** with different volume/semantics: `middleware/accessLogger.js` (once per root-page `GET /`) and `middleware/authGuard.js`'s `protect` (once per request for every iframe/BMS/ETEQ caller, since those bypass JWT auth and get a log entry instead). If you're querying this collection for analytics, be aware iframe traffic is over-represented relative to normal browser traffic by request volume, not just page-load volume.

## 6. `EmailLog.js`
Fields: `userId` (indexed, default null — but see gotcha), `recipient`, `subject`, `status` (`enum: pending|success|failed`), `provider` (default `'brevo'`), `metadata: Mixed`, `error`, timestamps. Compound index `{userId:1, createdAt:-1}` implies per-user analytics/rate-limiting.

**Gotcha**: every write goes through `services/emailTool.js` with `userId` hardcoded to the constant `SYSTEM_USER = 'system_user'` — never the actual requester. The per-user index exists but the data behind it is not actually per-user; rate-limit queries against this collection (`checkRateLimit`) are effectively global. Don't build new per-user reporting on top of this collection's `userId` field without first fixing the write path.

## 7. Anti-patterns

❌ **Don't add a `findOneAndUpdate`/`updateOne` write to `InteractionLog` without either passing `runValidators: true` or first fixing the `'assistant'` vs. enum mismatch above** — the current silent-bypass behavior is a known gap, not a pattern to extend.

❌ **Don't rely on `Vector.chunkId` uniqueness being enforced by the database.** It isn't; it's only correct because ingestion always wipes-then-reinserts. A partial/incremental sync feature would need to add a real unique index first.

❌ **Don't build a per-user email report against `EmailLog.userId`** until `services/emailTool.js` stops hardcoding `SYSTEM_USER` — the field is populated but not meaningful today.
