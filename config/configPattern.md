# Config & Bootstrap Pattern

## 1. Philosophy

`config/index.js` is the single place environment variables are read, validated, and turned into typed exports — but `utils/userManager.js` loads its own `.env` independently for standalone CLI use, bypassing this module. If you add a new API key or config value, decide up front whether it needs to be readable from a bare CLI script — if so, follow `userManager.js`'s pattern of resolving `.env` relative to its own file rather than assuming CWD.

There's exactly one Gemini key now: `GEMINI_API_KEY`, the sole hop of the free-tier fallback cascade in `services/gemini/index.js` before it falls through to ArvanCloud. (`GEMINI_API_KEY_ALT` was removed — that project returned a persistent `403 PERMISSION_DENIED`, not a transient error, so it was dead weight in the rotation. `GEMINI_API_KEY_PREMIUM`/`GEMINI_API_URL_THINKING` were also removed — Thinking mode now runs entirely through ArvanCloud's `Gemini-3-Flash-Preview-kc6io`, not native Google Gemini at all, since the two APIs are structurally incompatible; see [[../services/servicesPattern]] §3a.)

(Historically `GEMINI_API_KEY`'s export was wired to read `GEMINI_API_KEY_PREMIUM`'s value — a naming trap. That's fixed; the export now reads its own like-named env var.)

## 2. Fail-fast startup validation
```js
// config/index.js
if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY in .env file');
    process.exit(1);
}
```
This runs at **import time** — a top-level side effect — before `connectDB()` is ever called and before any Mongoose model is registered. `ARVANCLOUD_GEMINI_URL`/`ARVANCLOUD_THINKING_URL` are not fail-fast — a missing one just means that cascade hop or Thinking mode throws at call time instead of at boot. When adding a new required env var, decide whether it deserves the same fail-fast treatment or should degrade gracefully (most optional integrations — weather, BMS — currently just throw at call time instead, e.g. `bmsTool.js`'s `if (!AI_SERVICE_SECRET) throw new Error(...)`).

## 3. Insecure default — fix before deploying anywhere real
```js
JWT_SECRET: process.env.JWT_SECRET || 'default_secret_key_change_me'
```
If `JWT_SECRET` is unset, the app boots successfully with a publicly-known secret baked into source — this silently defeats JWT verification in both `middleware/userIdentity.js` and `middleware/authGuard.js`. There is no fail-fast check for this one, unlike the Gemini vars above. Always set `JWT_SECRET` explicitly, including in local dev — don't rely on the fallback "working."

## 4. Instruction text loaded once, synchronously, at boot
```js
export const SYSTEM_INSTRUCTION_TEXT = fs.readFileSync(path.resolve(__dirname,'..','documents','instructions.txt'),'utf-8');
export const CX_BMS_INSTRUCTION      = fs.readFileSync(path.resolve(__dirname,'..','documents','cxbms.txt'),'utf-8');
export const ETEQ_INSTRUCTION        = fs.readFileSync(path.resolve(__dirname,'..','documents','eteq.txt'),'utf-8');
export const PERSOL_BS_INSTRUCTION   = fs.readFileSync(path.resolve(__dirname,'..','documents','persolbs.txt'),'utf-8');
```
These four files are read exactly once at process start. **Editing any of them requires a restart to take effect** — there's no watcher, no hot-reload. This is different from `utils/promptManager.js`'s own `getRagFileContent` helper, which re-reads `documents/RAG/*.txt` live on every request (used only as the vector-search fallback path) — don't assume the two instruction-loading mechanisms behave the same way when debugging a "why didn't my prompt edit take effect" issue; check which loader owns the file you edited.

## 5. `documents/email.txt` is unreferenced
Confirmed via full-repo search: no `.js` file reads this document. It's not part of the four hardcoded instruction constants above, and not part of RAG ingestion (only `documents/RAG/*` is ingested — see [[../utils/utilsPattern]]). Don't assume adding content to `documents/*.txt` automatically wires it into the system prompt or RAG — only the five specific files referenced by `config/index.js` and `utils/vectorManager.js`'s `ragDirectory` actually get consumed.

## 6. `config/db.js`
Thin `mongoose.connect(MONGO_URI)` wrapper, called from `utils/serverManager.js`'s `startServer` before the HTTP server starts listening for real traffic (see [[../utils/utilsPattern]] for the full boot sequence, including the vector-init race).

## 7. Anti-patterns

❌ **Don't reintroduce a second native-Gemini key into the fallback cascade without checking it first.** `GEMINI_API_KEY_ALT` was removed because its project returned a persistent `403 PERMISSION_DENIED` — a real, non-transient failure, not something the cascade could route around. Verify a new key actually works before wiring it in.

❌ **Don't assume editing a `documents/*.txt` file takes effect without a restart.** Only `cxRag.txt` (via `promptManager.getRagFileContent`'s fallback path) is read live; the four instruction constants are boot-time snapshots.

❌ **Don't ship without setting `JWT_SECRET`.** The fallback is not a placeholder that fails loudly — it's a working (and therefore dangerous) default.
