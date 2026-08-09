# Middleware Pipeline Pattern

## 1. Philosophy

Every request passes through a fixed, order-dependent chain mounted once in `app.js` before any route is registered. Each middleware owns one concern and writes its result onto `req` for the next one to read — there is no shared request-context object, just an accumulating set of `req.*` fields (`req.isRestrictedMode`, `req.userId`, `req.sessionId`, `req.geminiApiKey`, ...). Order is load-bearing: a middleware that reads a field must be mounted after the middleware that sets it.

```
app.js
├── express.json() / urlencoded() / text()   # body parsers — must run first
├── cookieParser()                            # before anything reads req.cookies
├── allowFrameEmbedding      (frameGuard.js)   # relaxes CSP for allowed referers
├── express.static('public', {index:false})    # ⚠ serves index.html, login.html, assets — bypasses everything below
├── checkRestrictedMode      (restrictedMode.js) # sets isRestrictedMode/isBmsMode/isEteqMode
├── identityMiddleware       (userIdentity.js)   # sets userId/userIp/origin/keyIdentifier
├── apiKeyMiddleware         (keySession.js)     # sets geminiApiKey/sessionId/conversationHistory
├── logAccess                (accessLogger.js)   # writes AccessLog (GET / only)
├── guardChatRoutes          (routeGaurd.js)     # the actual JWT auth gate
├── mainRoutes ('/'), authRoutes ('/auth')
└── errorHandler                                 # 4-arg Express error handler, last
```

## 2. The static-middleware bypass (read this before touching auth)

`app.use(express.static('public', {index: false}))` runs **before** `checkRestrictedMode`, `identityMiddleware`, and `guardChatRoutes`. `{index:false}` only disables automatic `index.html` resolution for directory-style requests (`GET /`) — it does **not** stop an explicit `GET /index.html` from being served as a plain file.

Consequence: `guardChatRoutes`'s `protectedPaths` array literally lists `'/index.html'` (`routeGaurd.js:5`), but that entry is dead code — any request for `/index.html` is served by `express.static` first and never reaches `guardChatRoutes` or `protect()`. Only the bare `GET /` (which static middleware skips) actually goes through the auth gate and lands in `PageController.serveIndex`. If you need every route that serves the SPA shell to require auth, either move `express.static` after the guard/identity chain, or drop `index.html` from `public/` and always serve it through `PageController`.

## 3. File-by-file

### `frameGuard.js` — `allowFrameEmbedding`
```js
export const allowFrameEmbedding = (req, res, next) => {
    if (req.headers.referer && ALLOWED_ORIGINS.some(origin => req.headers.referer.startsWith(origin))) {
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }
    next();
};
```
Checks the standard `referer` header only (not `x-frame-referer`, unlike the two middlewares below it in the pipeline). If it matches `ALLOWED_ORIGINS` (env CSV), it sets a **wildcard** `frame-ancestors *` CSP — permissive for *any* origin once the gate passes once, not scoped to the matched origin. Note: this app never sets `X-Frame-Options` in the first place (no `helmet`), so `res.removeHeader(...)` is a no-op unless a reverse proxy injects that header upstream — the CSP header is the operative permission.

### `restrictedMode.js` — `checkRestrictedMode`
```js
const { 'x-frame-referer': frameRef, referer: stdRef } = req.headers;
const referer = (frameRef || stdRef || '').toLowerCase();

req.isRestrictedMode = ALLOWED_ORIGINS.some(o => referer.startsWith(o));
req.isBmsMode = referer.includes('export.communitasker.io');
req.isEteqMode = referer.includes('eteq.vercel.app');
```
Three **independent** booleans, not a tiered enum. `isBmsMode`/`isEteqMode` are hardcoded hostname substring checks, computed without reference to `ALLOWED_ORIGINS` — so a request can have `isBmsMode=true` while `isRestrictedMode=false` if `export.communitasker.io` isn't also listed in `ALLOWED_ORIGINS`. This matters downstream: `authGuard.protect` and `responseHandler.handleToolCall`'s execution-time tool gate both branch on `isRestrictedMode`, not on `isBmsMode`/`isEteqMode` directly — see §5.

### `userIdentity.js` — `identityMiddleware`
```js
const rawUserId = req.query.user || req.headers['x-user-id'];
if (rawUserId && String(rawUserId).trim().toLowerCase() !== 'null') {
    origin = hostName(referer);
    userId = origin ? `${origin}_${rawUserId}` : rawUserId;      // iframe identity — UNVERIFIED
} else if (req.cookies.jwt) {
    origin = hostName(referer);
    const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
    userId = decoded.id;                                          // direct-login identity — signed
}
req.keyIdentifier = userId || userIp;
```
Two identity sources, and **branch (a) wins over branch (b)**: if `x-user-id`/`?user=` is present, the JWT cookie is ignored for identity purposes even for a logged-in user. Iframe identity is trusted verbatim with zero signature check — namespacing by `${refererHostname}_${rawUserId}` only prevents ID collisions across different embedding sites, it is not an authorization mechanism. Anything downstream that treats `req.userId` as proof of identity (thinking-mode rate limiting, history ownership) inherits this trust assumption for embedded traffic.

### `keySession.js` — `apiKeyMiddleware`
```js
const isExternalService = ['/ask-groq', '/ask-arvan'].some(p => req.path.startsWith(p));
req.geminiApiKey = isExternalService ? null : GEMINI_API_KEY;

let sessionId = req.cookies?.session_id;
if (!sessionId && !isRootGet && req.userId) sessionId = ConversationManager.getActiveSession(req.userId);
if (isRootGet || !sessionId) {
    sessionId = ConversationManager.getOrCreateSessionId(req.userId, req.userIp);
    ConversationManager.mapUserToSession(req.userId, sessionId);
}
if (isRootGet) res.cookie('session_id', sessionId, {httpOnly: true, maxAge: 24*60*60*1000, sameSite: 'strict'});
req.sessionId = sessionId;
req.conversationHistory = ConversationManager.getHistory(sessionId);
```
The `session_id` cookie is only **set** on `GET /` — every other route relies on the cookie already being there from the initial page load, or falls back to the in-memory `userId → sessionId` map. `req.geminiApiKey` is just the primary key now, and only `ChatController.simpleApi` still reads it — the real chat path (`ask`/`initialPrompt`) calls `services/gemini/index.js`'s `askGemini` directly with `keyIdentifier`, which owns its own two-way fallback cascade (`GEMINI_API_KEY` → an ArvanCloud Gemini model) backed by `utils/sessionManager.js`'s per-identity sticky provider slot — see [[../services/servicesPattern]] §3a. This middleware no longer does any key rotation/assignment itself.

### `authGuard.js` — `protect`
```js
if (req.isRestrictedMode || req.isBmsMode || req.isEteqMode) {
    await AccessLog.create({ userId: req.userId || req.query.user || 'anonymous_iframe', ... });
    return next();                              // NO JWT check, NO req.user set
}
// normal branch: verify req.cookies.jwt, load User (minus password) into req.user
if (!token) return res.redirect('/login.html'); // 302 + HTML, not a JSON 401
```
Iframe/BMS/ETEQ traffic **skips authentication entirely** by design — the three restricted-mode flags are treated as sufficient authorization on their own. Failure mode for the normal branch is an HTML redirect, not a JSON error — any `fetch()` caller hitting a guarded endpoint with an expired cookie gets a redirected HTML page back, not a parseable error body.

### `routeGaurd.js` — `guardChatRoutes` (the actual gate; typo in the filename is original, not a copy error)
```js
const publicPaths = ['/login.html', '/js/login.js', '/auth/login', '/favicon.ico'];
const protectedPaths = ['/', '/index.html'];

if (publicPaths.includes(req.path)) return next();
if (protectedPaths.includes(req.path) || req.path.startsWith('/ask-') || req.path.startsWith('/initial-prompt')) {
    return protect(req, res, next);
}
next();
```
This hardcoded allowlist/prefix table is the only thing standing between an arbitrary route and `protect()`. Read it literally: `/ask` (no trailing hyphen) does **not** match `startsWith('/ask-')`, so the primary Gemini chat endpoint is intentionally unauthenticated (anonymous visitors can chat for free on the default Gemini path), while `/ask-groq`, `/ask-arvan` (paid third-party providers) **do** require login. Everything else — `/clear-chat`, `/new-chat`, all of `/api/*`, `/auth/signup`, `/auth/admin`, `/auth/change-password`, `/auth/upload-avatar`, `/auth/remove-avatar` — falls through with no auth check at this layer and relies entirely on each controller manually checking `if (!req.userId) return res.status(401)...`.

**Rule when adding a new route**: decide up front whether it needs `guardChatRoutes` coverage, and add the exact path or a prefix rule here — don't assume proximity to an existing guarded path (`/ask` vs `/ask-*`) implies the same protection.

### `accessLogger.js` — `logAccess`
No-op for everything except `GET /` (`if (req.path !== '/' || req.method !== 'GET') return next();`). Fire-and-forget `AccessLog.create(...)` sourced from fields set by `identityMiddleware`. The `SILENT_PATH(req)` check imported from `utils/logManager.js` is dead in this file specifically — it only gates console noise, and this function only ever runs for `GET /` regardless.

### `avatarUpload.js` / `uploadHandler.js` — two multer instances, two safety postures
| | `avatarUpload.js` | `uploadHandler.js` |
|---|---|---|
| Storage | disk (`uploadDir`) | **memory** (`multer.memoryStorage()`) |
| Filter | extension allowlist (jpg/jpeg/png/gif/webp) | **none** |
| Size cap | 3MB | **none** (multer default = `Infinity`) |
| Used by | `/auth/upload-avatar` | `/ask`, `/ask-groq`, `/ask-arvan` |

`avatarUpload.js`'s filename generator computes `userId` from `req.user._id` but never uses it in the output filename (`'avatar-' + uniqueSuffix + ext`) — avatar files are not namespaced by user, only randomized; dead variable, worth fixing if per-user avatar auditing is ever needed. When adding a new upload route, default to `avatarUpload`'s posture (disk + filter + cap) unless you have a specific reason to buffer arbitrary user files in memory unbounded.

### `errorHandler.js`
```js
export default function errorHandler(err, req, res, next) {
    console.error('❌ Server Error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
}
```
Rarely reached — nearly every controller wraps its own body in `try/catch` and returns its own error shape (see [[controllersPattern]] for the inconsistency this creates). This is the last-resort net, not the primary error-handling mechanism.

## 4. Decision matrix

| When you need to... | Do this... | Why |
|---|---|---|
| Add a new protected route | Add its exact path (or a prefix) to `guardChatRoutes`'s `protectedPaths` check | It's the only enforcement point; `authGuard.protect` is never called directly by app.js |
| Read the caller's identity | Use `req.userId`/`req.keyIdentifier`, set by `identityMiddleware` | `req.user` (full Mongo doc) is only set by `authGuard.protect`, and never for restricted/BMS/ETEQ traffic |
| Branch on embed context | Use `req.isBmsMode`/`req.isEteqMode`/`req.isRestrictedMode` | Set once by `restrictedMode.js`; don't re-derive referer checks elsewhere |
| Accept a file upload | Model it on `avatarUpload.js` (disk + filter + cap) unless the file is genuinely transient and small | `uploadHandler.js`'s unbounded memory storage is a known gap, not a template |

## 5. Anti-patterns / known gaps

❌ **Don't assume `isBmsMode`/`isEteqMode` implies `isRestrictedMode`.** They're computed independently; the tool-call execution-time safety check in `services/gemini/responseHandler.js` only runs `if (isRestrictedMode)`, so a BMS/ETEQ host missing from `ALLOWED_ORIGINS` loses that second-layer defense (the offer-layer filter in `formatter.getAllowedTools` still applies independently).

❌ **Don't add a new static file under `public/` and expect `guardChatRoutes` to protect it.** `express.static` is mounted before the guard chain; anything resolvable as a literal file bypasses auth/identity/logging entirely.

❌ **Don't duplicate the `session_id`-cookie-setting options block.** `{httpOnly:true, maxAge:24*60*60*1000, sameSite:'strict'}` is currently copy-pasted in three places (`keySession.js`, `InteractionController.restoreInteraction`, `InteractionController.newChat`) — if you need a fourth, factor it into a shared helper in `keySession.js` instead of copying again.

❌ **Don't rely on `JWT_SECRET` having a safe default.** `config/index.js` falls back to a hardcoded string if the env var is unset — the app boots "successfully" with a publicly-known secret, silently defeating both `identityMiddleware` and `authGuard`'s JWT verification. Always set `JWT_SECRET` in every environment, including local dev.
