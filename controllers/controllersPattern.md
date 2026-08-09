# Controller Pattern

## 1. Philosophy

Controllers are the seam between HTTP and the rest of the app: they read `req.*` fields already resolved by the middleware chain (`req.userId`, `req.sessionId`, `req.geminiApiKey`, `req.conversationHistory`, `req.isBmsMode`/`isEteqMode`/`isRestrictedMode`), call into `services/`/`utils/`, and shape a JSON response. Each controller wraps its own body in `try/catch` and produces its own error shape — there is no shared response envelope or error-formatting helper, so error responses are inconsistent across controllers (see §5). Persistence to MongoDB is deliberately decoupled from the response: controllers respond first, then fire-and-forget a background sync, matching the "memory-first" architecture (see [[utilsPattern]] and the root architecture doc).

## 2. `ChatController.js` — the biggest and most important controller

Internal (non-exported) helpers: `syncToDB`, `validateMessage`, `getFileData`, `manageThinkingMode`.

### `manageThinkingMode(userId, attemptConsume)`
Rate-limits "thinking mode" to 2 uses/24h, stored on `User.thinkingMode {count, lastReset}`. Requires `userId` to match `/^[0-9a-fA-F]{24}$/` (a Mongo ObjectId shape):
```js
if (!/^[0-9a-fA-F]{24}$/.test(userId)) return { allowed: false, ... };
```
Iframe-identity users get `userId = "${hostname}_${rawUserId}"` from `identityMiddleware` — that string never matches the ObjectId regex, so **thinking mode is silently unavailable for all embedded/iframe traffic**, not just deliberately disabled for it. If thinking mode should ever be offered to iframe users, this is the gate to change, not something to route around downstream.

### `initialPrompt(req, res)` — `GET /initial-prompt`
Builds a locale-appropriate greeting (Persian if `isRestrictedMode && !isBmsMode && !isEteqMode`, else English), calls `constructSystemPrompt` then `askGemini` (not `callGeminiAPI` directly — see [[../services/servicesPattern]] §3a for the fallback cascade this runs), persists via `ConversationManager.appendAndSave` + fire-and-forget `syncToDB` (skipped for ETEQ mode). Has its own hardcoded fallback greeting text on error — this endpoint **never** returns a non-2xx to the client, even on internal failure, by design (a broken greeting shouldn't block the chat UI from loading).

### `ask(req, res)` — `POST /ask`, the primary chat endpoint
```js
validateMessage(message);                                  // 400 if empty/non-string
if (useThinkingMode && !THINKING_MODE_ENABLED) useThinkingMode = false;   // don't spend a quota credit on a guaranteed rejection
const usage = await manageThinkingMode(userId, useThinkingMode);
const systemInstruction = await constructSystemPrompt(req, message);
const fileData = getFileData(req.file);                     // {mimeType, data:base64} or null
const {text, sources} = await askGemini(
    message, conversationHistory, keyIdentifier, isRestrictedMode,
    useWebSearch, isBmsMode, fileData, systemInstruction, useThinkingMode, isEteqMode
);
const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, message, text);
res.json({reply: text, sources, thinkingModeUsage: usage, sessionId});
if (!isEteqMode) syncToDB(sessionId, userId, updated);       // fires AFTER res.json — response never waits on Mongo
```
Note the response is sent before the database write starts — the client never waits on Mongo latency, and a Mongo failure here is caught and logged but never surfaces to the user (`syncToDB = (...) => syncToDatabase(...).catch(err => console.error(err.message))`). `req.geminiApiKey` is no longer used here — `askGemini` resolves its own keys per hop from `keyIdentifier`; only `simpleApi` below still reads `req.geminiApiKey`.

### `handleAPIEndpoint(apiCall, apiName)` — higher-order factory backing `/ask-groq`, `/ask-arvan`
```js
export const handleAPIEndpoint = (apiCall, apiName) => async (req, res) => {
    validateMessage(message);
    if (apiName === 'ArvanCloud' && !model) return res.status(400).json({error: 'model is required'});
    const fileData = apiName === 'ArvanCloud'
        ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`   // URI string
        : {mimeType: req.file.mimetype, data: req.file.buffer.toString('base64')};    // object
    let text, sources = [];
    if (apiName === 'ArvanCloud') {
        ({text, sources} = await apiCall(message, conversationHistory, model, fileData, systemInstruction, {
            isRestrictedMode, useWebSearch, isBmsMode, isEteqMode
        }));
    } else {
        text = await apiCall(message, conversationHistory, systemInstruction);
    }
    res.json({reply: text, sources, sessionId});
    ...
};
```
This factory is the **only** place reconciling the providers' different call signatures and return shapes. `routes/web.js` injects `callArvanCloudAPIWithTools` (not the plain `callArvanCloudAPI`) as `apiCall` for the ArvanCloud route, so it returns `{text, sources}` like Gemini; Groq still returns a bare string, normalized into the same `text`/`sources` shape here before responding. If you add a new provider, extend this `if/else` to match whichever shape it returns rather than inventing a second factory.

### `simpleApi(req, res)` — `POST /api/`, stateless headless endpoint
```js
const finalMessage = req.body
    ? (typeof req.body === 'string' ? req.body : (req.body.message ?? JSON.stringify(req.body)))
    : '';
```
Accepts a raw `text/plain` body (enabled by `express.text()` in `app.js`), a JSON `{message}`, or arbitrary JSON stringified as a fallback. Calls `callSimpleGeminiAPI` — **does not** touch `ConversationManager` or `syncToDB**; this endpoint is intentionally historyless. Use it as the template for any future "headless integration" endpoint that shouldn't participate in chat-session state.

## 3. `EmailController.js`
`emailInteraction(req, res)` — `POST /api/history/:id/email`. Requires `req.userId` (401) and body `email` (400). Loads messages from `InteractionLog` first, falling back to `ConversationManager.getHistory(sessionId)` if no DB doc exists — mirrors the memory-first-but-Mongo-is-source-of-truth pattern used elsewhere. Filters out `role === 'system'` messages before handing off to `sendChatHistory` (see [[../services/servicesPattern]]) — note this shares the *same global* rate limit as every LLM-triggered `sendEmail` tool call (see services doc).

## 4. `InteractionController.js`
- **`getInteraction`** (`GET /api/history`) — cursor-paginated preview list. On the *first* page (`!cursor`), fire-and-forgets a cleanup delete of any `InteractionLog` with no `role:'user'` message:
```js
if (!cursor) InteractionLog.deleteMany({userId, 'messages.role': {$ne: 'user'}}).catch(() => {});
```
This is an implicit data-retention policy tied to a *read* endpoint's side effect — easy to miss when reasoning about what deletes history data. If you need to preserve greeting-only sessions for any reason, this is where that cleanup lives.
- **`restoreInteraction`** (`POST /api/history/:id/restore`) — loads old messages, mints a **new** session id (never resumes the old one), repopulates `ConversationManager` in-memory, sets a fresh `session_id` cookie.
- **`clearChat`** (`POST /clear-chat`) — deletes the in-memory Map entry only; the Mongo `InteractionLog` document is untouched and remains restorable/emailable. "Clear" is a client-side reset, not a data-deletion operation — only `deleteInteraction` (`DELETE /api/history/:id`) actually removes Mongo data.
- **`newChat`** (`POST /new-chat`) — mints a new session id and remaps `userId → sessionId`; does **not** clear the old session, it just stops pointing at it (the old session remains in the Map until process restart or an explicit clear/delete).
- **`restoreChat(log)`** — exported utility (not a route handler): normalizes `role === 'model' ? 'assistant' : msg.role` and reconstructs `content` from `parts[].text`, `msg.content`, or a `'[Restored Content]'` placeholder. This defensive remapping exists because of the `role` naming mismatch documented in [[../models/modelsPattern]] — new code reading `InteractionLog.messages` should go through the same normalization rather than assuming `role` is always `'assistant'`/`'model'` consistently.

## 5. `PageController.js` / `VectorController.js`
`PageController.serveIndex` is the only controller reachable through the `protectedPaths`/`protect()` gate for the root path — everything else it might have owned (serving other static pages) goes through `express.static` directly. `VectorController.syncVectors` is a thin wrapper over `utils/vectorManager.js`'s `syncDocuments()` with no auth check in the controller itself (see [[../routes/routesPattern]] for the routing-level gap).

## 6. Decision matrix

| When you need to... | Do this... | Why |
|---|---|---|
| Add a new LLM-provider endpoint | Extend `ChatController.handleAPIEndpoint`'s `if/else`, wire via `routes/web.js` | Single reconciliation point for differing provider signatures/return shapes |
| Add a stateless/headless endpoint | Model it on `simpleApi` — no `ConversationManager`, no `syncToDB` | Keeps historyless integrations from polluting session state |
| Persist something after responding | Fire-and-forget with `.catch(err => console.error(...))`, after `res.json(...)` | Matches the memory-first pattern; never make the client wait on Mongo |
| Check who's calling | `if (!req.userId) return res.status(401)...` inline | No router-level auth exists for most `/api/*` routes — each controller enforces its own |

## 7. Anti-patterns

❌ **Don't assume a 500 response shape is consistent across controllers.** `ChatController` includes `details: error.message` (leaks internals); most of `InteractionController`/`EmailController` return a bare generic message; `VectorController.syncVectors` also leaks `error.message`. If you're adding client-side error handling that inspects response bodies, don't rely on a uniform shape — check each controller you're integrating with.

❌ **Don't add a second `session_id`-cookie-setting block.** The exact same options object (`{httpOnly:true, maxAge:24*60*60*1000, sameSite:'strict'}`) is already duplicated across `keySession.js`, `restoreInteraction`, and `newChat` — a fourth call site should factor this into a shared helper instead of copying it again.

❌ **Don't call `ConversationManager.getOrCreateSessionId(userId, ip)` expecting idempotent lookup-or-create semantics.** Despite the name, it always mints a fresh UUID (`utils/conversationManager.js`) — session stability comes entirely from pairing it with `mapUserToSession` immediately after, which every current call site does. Skipping that pairing makes the new session id unreachable on the next request.
