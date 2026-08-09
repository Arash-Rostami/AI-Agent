# LLM Provider & Tool-Calling Pattern

## 1. Philosophy

Three LLM providers (Gemini, Groq, ArvanCloud) live side by side with **no shared interface**. Each `services/{provider}/index.js` exports a differently-shaped function; the only reconciliation point is `ChatController.handleAPIEndpoint`, which special-cases ArvanCloud's extra `model`/`fileData` args (see [[../controllers/controllersPattern]]). **Two of the three now support tool-calling**: Gemini natively, and ArvanCloud (GPT-OSS-120B, plus the Gemini-fallback hop) via a parallel OpenAI-style tool-calling loop that reuses Gemini's exact tool definitions and mode-gating rules — see §3b. Groq remains a plain single-turn completion with no tools at all. Don't assume "non-Gemini = no tools" anymore; check §3b before treating ArvanCloud as a dumb passthrough.

> **Removed:** OpenRouter, and the old `GPT-4o-mini-4193n`/`DeepSeek-Chat-V3-0324-mbxyd` ArvanCloud models, are gone. ArvanCloud now serves three models: `GPT-OSS-120B-burmt` (the "ChatGPT" option), `Gemini-3.1-Flash-Lite-Preview-8dzyx` (the Gemini fallback cascade's last hop), and `Gemini-3-Flash-Preview-kc6io` (Thinking mode's backend). **None are vision-capable** — see §2. None are user-selectable except ChatGPT; the two Gemini-named ones are internal-only.

```
services/
├── gemini/
│   ├── index.js         # callGeminiAPI (single-attempt primitive) + askGemini (the real entry point — owns the fallback cascade + Thinking mode)
│   ├── formatter.js       # shapes conversationHistory into Gemini's `contents`; getAllowedTools (offer-layer) + isToolExecutionAllowed (execution-layer) — shared with ArvanCloud
│   ├── permissions.js      # scans history for "you may proceed" affirmations to auto-relax restricted mode
│   ├── responseHandler.js   # dispatches text vs functionCall responses; owns the tool-call → follow-up loop
│   ├── toolHandler.js       # maps named args → each tool fn's positional args; executes — shared with ArvanCloud
│   └── errorHandler.js       # classifies a failure (timeout/quota/leaked-key/other) — does not retry itself
├── groq/index.js      # single function, groq-sdk client, no tools
├── arvancloud/
│   ├── index.js        # chat completions for all three models; callArvanCloudAPIWithTools adds tool-calling (GPT-OSS-120B + the Gemini fallback hop)
│   └── embeddings.js    # separate: RAG embedding generation, used by utils/vectorManager.js
├── bmsTool.js / emailTool.js / timeTool.js / weatherTool.js / webCrawlerTool.js / webSearchTool.js / persolBSDocumentTool.js
│                       # tool implementations — plain positional-arg functions, called from both Gemini's and ArvanCloud's tool loops
└── email/
    ├── index.js         # nodemailer transport
    └── formatter.js      # RTL/LTR detection + HTML templating

tools/
├── toolDefinitions.js   # allToolDefinitions[] + availableTools{} — Gemini-format, single source of truth
└── openAiFormat.js       # toOpenAiTools() — converts the above to OpenAI's tool-calling format for ArvanCloud
```

## 2. Provider signatures — memorize these before wiring a new call site

```js
// Gemini — what ChatController actually calls. Owns the free-tier fallback cascade
// (GEMINI_API_KEY -> GEMINI_API_KEY_ALT -> ArvanCloud Gemini) and the Thinking-mode
// short-circuit (fixed GEMINI_API_KEY_PREMIUM key, no cascade). See §3.
askGemini(message, conversationHistory, keyIdentifier, isRestrictedMode, useWebSearch,
          isBmsMode, fileData, customSystemInstruction, useThinkingMode, isEteqMode)
// → { text, sources }

// callGeminiAPI — the single-attempt Gemini-native primitive askGemini calls per hop.
// Also reused unmodified by responseHandler.js's tool-call follow-up recursion. Frozen
// at 11 positional params — see §3 Step 5's argument-count bug before adding a 12th.
callGeminiAPI(message, conversationHistory, apiKey, isRestrictedMode, useWebSearch,
              keyIdentifier, isBmsMode, fileData, customSystemInstruction, useThinkingMode, isEteqMode)
// → { text, sources }

// Groq — 3-arg shape, no tools
callGrokAPI(message, conversationHistory, customSystemInstruction)          // → string

// ArvanCloud, plain — no tools, backward-compatible shape for simple callers
callArvanCloudAPI(message, conversationHistory, model, fileData, customSystemInstruction, timeoutMs) // → string

// ArvanCloud, tool-calling — used for the ChatGPT dropdown option and the Gemini cascade's 'arvan' hop
callArvanCloudAPIWithTools(message, conversationHistory, model, fileData, customSystemInstruction,
                            {isRestrictedMode, useWebSearch, isBmsMode, isEteqMode, timeoutMs})
// → { text, sources }
```
`askGemini` and `callArvanCloudAPIWithTools` return `{text, sources}`; the plain `callArvanCloudAPI` and Groq return a bare string with no `sources` field. `sources` is only ever populated by the `getWebSearch` tool, regardless of which provider called it.

**Vision**: only native Gemini (via `fileData` → Gemini's `inlineData`) supports image/PDF understanding today. `services/arvancloud/index.js`'s `VISION_CAPABLE_MODELS` allowlist is currently empty — `GPT-OSS-120B-burmt` is text-only and the ArvanCloud Gemini fallback never receives `fileData` (see §3a). The frontend's `supportsAttachments` check (`UIHandler.js`) mirrors this — only `service === 'gemini'` shows the attachment button, even though ChatGPT now supports tools.

Auth schemes also differ per provider — don't copy one provider's header pattern onto another:
| Provider | Scheme |
|---|---|
| Gemini | API key as a **query string** param (`?key=${apiKey}`) — appears in access logs/proxies |
| Groq | SDK-managed Bearer (via `groq-sdk` client, built once at module load) |
| ArvanCloud | Non-standard `Authorization: apikey ${key}` (not `Bearer`) |

Hardcoded model IDs live directly in source, not config: Groq `'llama-3.1-8b-instant'` (`groq/index.js`), ArvanCloud's `MODELS` map (exported as `ARVAN_CHATGPT_MODEL_ID` = `'GPT-OSS-120B-burmt'`, `ARVAN_GEMINI_MODEL_ID` = `'Gemini-3.1-Flash-Lite-Preview-8dzyx'`, `ARVAN_THINKING_MODEL_ID` = `'Gemini-3-Flash-Preview-kc6io'`), embeddings `'Embedding-3-Large-nxekt'`. When adding a model, follow the existing pattern (hardcode it here) rather than introducing a partial config-driven path for just one provider.

Groq's original model, `qwen/qwen3-32b`, was deprecated by Groq (404 model_not_found) and briefly replaced with the preview-only `qwen/qwen3.6-27b` — which turned out to inline its full chain-of-thought as `<think>...</think>` in the response content, requiring a `stripThinkTags` cleanup step in `groq/index.js`. Settled on `llama-3.1-8b-instant` instead: a stable production-tier model, faster (~500ms observed), and emits no reasoning-trace tags — `stripThinkTags` is kept as a defensive no-op in case a future model swap reintroduces one.

## 3. Gemini pipeline — request → tool call → follow-up

```
gemini/
├── index.js          # orchestrator: builds request, dispatches, retries via errorHandler
├── formatter.js       # shapes conversationHistory into Gemini's `contents`, filters tools by mode
├── permissions.js      # scans history for "you may proceed" affirmations to auto-relax restricted mode
├── responseHandler.js   # dispatches text vs functionCall responses; owns the tool-call → follow-up loop
├── toolHandler.js       # maps Gemini's named args → each tool fn's positional args; executes
└── errorHandler.js       # 429/leaked-key detection → key rotation → single retry
```

### Step 1 — permission auto-relax (`index.js` + `permissions.js`)
```js
if (isRestrictedMode && permissions.hasUserGranted(conversationHistory)) isRestrictedMode = false;
```
`hasUserGranted` re-scans the **entire** history every call (O(n) per request) looking for an assistant refusal phrase followed by a user affirmation matching a large multilingual regex (`utils/affirmationMemoryManager.js`). This flips `isRestrictedMode` for the current call only — it is not persisted, so it must be re-derived from history on every subsequent turn too.

### Step 2 — tool filtering, offer layer (`formatter.getAllowedTools`)
```js
if (isBmsMode) return allTools.filter(t => !isWebSearchTool(t));                                  // everything except web search
if (isEteqMode) return allTools.filter(t => isEmailTool(t) || (useWebSearch && isWebSearchTool(t))); // email (+ web search if requested)
if (isRestrictedMode) return useWebSearch ? allTools.filter(isWebSearchTool) : undefined;            // web search only, or nothing
return useWebSearch ? allTools : allTools.filter(t => !isWebSearchTool(t));                          // unrestricted default
```

### Step 3 — tool filtering, execution layer (`responseHandler.handleToolCall`) — a **second, independent** check
```js
if (isRestrictedMode) {
    const isBmsAllowed = (toolName === 'searchBmsDatabase' && isBmsMode);
    const isEteqAllowed = isEteqMode && (toolName === 'sendEmail' || (useWebSearch && ...));
    const isWebSearchAllowed = (toolName === 'getWebSearch' || toolName === 'crawlWebPage') && useWebSearch;
    if (!(isBmsAllowed || isEteqAllowed || isWebSearchAllowed)) {
        return {text: "I apologize, but I cannot perform external actions in this mode.", sources: []};
    }
}
```
This block only runs `if (isRestrictedMode)` — it is skipped entirely when `isBmsMode`/`isEteqMode` is true but `isRestrictedMode` is false (a real possibility, see [[../middleware/middlewarePattern]] §3 `restrictedMode.js`). **Both gates must be updated together** whenever a tool's mode-eligibility changes — there is no single source of truth for "which tools does mode X allow," it's duplicated between `formatter.js` and `responseHandler.js` by design (offer-time vs. execution-time defense in depth), so an update to one without the other is a partial fix, not a complete one.

### Step 4 — execution (`toolHandler.js`)
```js
const TOOL_ARG_MAPPER = {
    getCurrentWeather: ({location, unit}) => [location, unit],
    sendEmail: ({to, subject, text, html} = {}) => [to, subject, text, html],   // ⚠ drops `userTime` — see §5
    ...
};
export function executeTool(toolName, toolArgs) {
    const fn = availableTools[toolName];
    if (!fn) throw new Error(`Tool "${toolName}" is not available.`);
    const argsArray = TOOL_ARG_MAPPER[toolName] ? TOOL_ARG_MAPPER[toolName](toolArgs) : [toolArgs];
    return fn(...argsArray);
}
```
`TOOL_ARG_MAPPER` is the seam between Gemini's named-parameter JSON args and each tool's plain positional-argument function signature. **Every new tool needs an entry here** unless its implementation function is happy taking the whole raw args object as its single parameter.

### Step 5 — the follow-up round (fixed argument-count bug)
After a tool executes, `responseHandler` appends synthetic history entries and **recurses into `callGeminiAPI`** to get the model's natural-language explanation of the tool result:
```js
nextResponse = await callGeminiAPI(
    "Tool execution complete. Please analyze the tool_response provided above and answer the user's original request.",
    newConversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier,
    isBmsMode, null, null, false, isEteqMode        // exactly 11 args, matches callGeminiAPI's signature
);
```
**This used to pass 12 arguments into the 11-parameter signature** — position 8 (`fileData`) got a duplicate `isBmsMode` boolean instead of `null`, and position 11 (`isEteqMode`) got a hardcoded `false` (the real value silently dropped as the 12th arg). When `isBmsMode` was `true`, `formatContents` (`formatter.js`) read that truthy boolean via `if (fileData)` and pushed a malformed `inlineData: {mimeType: undefined, data: undefined}` into the request — Gemini's API would reject it, throwing, which `handleToolCall`'s catch turned into the generic *"I executed the requested tool but failed to produce a follow-up explanation"* message. This is what was breaking tool calls (including `sendEmail`) in BMS-mode conversations. Fixed — verified live by reproducing the exact `isBmsMode: true` + tool-call scenario post-fix. If you're adding a new recursive `callGeminiAPI` call anywhere, count your arguments against the 11-param signature before shipping.

### Step 6 — failure classification (`errorHandler.js`) — classifies only, never retries
```js
export function classify(error) {
    // ...
    return {status, isTimeout, isQuotaExceeded, isLeakedKey, failoverEligible};
}
```
`callGeminiAPI` itself has no try/catch anymore — a thrown error propagates straight to its caller. `errorHandler.classify` just answers "what kind of failure was this"; only `askGemini`'s cascade loop (§3a) decides whether that justifies moving to the next provider. `responseHandler.js`'s tool-call follow-up recursion still catches its own `callGeminiAPI` call independently (unrelated to this — see Step 5).

## 3a. The free-tier fallback cascade (`askGemini`) — the real entry point

`ChatController.ask`/`initialPrompt` call `askGemini`, not `callGeminiAPI` directly. `askGemini` owns two independent things:

**Thinking mode** — short-circuits immediately, no cascade, no fallback: if `useThinkingMode`, it calls `callArvanThinkingAPI`, which posts to ArvanCloud's `ARVAN_THINKING_MODEL_ID` (`Gemini-3-Flash-Preview-kc6io`) via the **plain** `callArvanCloudAPI` (no tools) — **not** `callGeminiAPI`. This is deliberate, not an oversight: ArvanCloud's gateway speaks OpenAI-style chat completions (`messages`, `Authorization: apikey`), while native Gemini speaks Google's own REST shape (`contents`/`tools`/`systemInstruction`, `?key=` query auth) — the two are structurally incompatible, so Thinking mode cannot just point `callGeminiAPI` at a different URL. Deliberately kept tool-less and file-less (unlike the `'arvan'` cascade hop and the ChatGPT option, which both got tool-calling — see §3b) — if you want Thinking mode to gain tools too, switch it to `callArvanCloudAPIWithTools`. `GEMINI_API_KEY_PREMIUM`/`GEMINI_API_URL_THINKING` are no longer read anywhere in code (removed from `config/index.js`'s exports) — Thinking mode's only remaining config is `ARVANCLOUD_THINKING_URL` + the shared `ARVANCLOUD_API_KEY`.

`THINKING_MODE_ENABLED = true` (`services/gemini/index.js`) — **enabled**. `ChatController.ask` still checks the flag defensively before spending a quota credit via `manageThinkingMode` (capped at `THINKING_MODE_DAILY_LIMIT = 3`/24h per user), and the UI (`#thinking-mode-btn`, `#mobile-thinking-mode-toggle`) shows/hides with the Gemini service selection exactly like the Web Search button (`UIHandler.updateServiceUI`'s `isGemini` check). Because Thinking mode has no tool/file support, `ChatHandler.toggleThinkingMode` also **hides and clears** Web Search, the attachment button, and the mic button whenever Thinking is toggled on (and force-disables Web Search if it was already active) — so the UI never offers a control that would silently no-op.

**The cascade** (everything else):
```js
const PROVIDER_ORDER = ['primary', 'arvan'];
const PROVIDER_KEYS = {primary: GEMINI_API_KEY};
const FALLBACK_TIMEOUT_MS = 10000;
```
1. Look up the caller's last-known-working slot via `sessionManager.getProviderSlot(keyIdentifier)` (default `'primary'`), rotate `PROVIDER_ORDER` to start there, and drop any slot whose key isn't configured **or whose global circuit breaker is tripped** (`isSlotConfigured`, which now also checks `sessionManager.isPrimaryDown()`).
2. Try each slot in order. `'primary'` calls `callGeminiAPI` (full Gemini-native request — tools, RAG-augmented system prompt, everything); `'arvan'` calls `callArvanGeminiFallback`, which now calls `callArvanCloudAPIWithTools(..., ARVAN_GEMINI_MODEL_ID, null, ..., {isRestrictedMode, useWebSearch, isBmsMode, isEteqMode})` — see §3b. **Still no file/vision support on this hop** (fileData is never forwarded), but tool actions (`sendEmail`, weather, BMS lookup, web search, etc.) now work on the fallback too, with the same mode-gating Gemini applies.
3. Each attempt is wrapped in `withTimeout(attempt, timeoutMs, label)` — a `Promise.race` against a timer, **not** a true `AbortController` cancellation (the original request isn't killed, just no longer awaited; a late response is silently discarded). This exists specifically so `callGeminiAPI`'s signature never needs a `timeoutMs` parameter — see the note in §2 about why a 12th positional param would corrupt the Step 5 bug. **The timeout differs per slot**: `primary` gets `PRIMARY_TIMEOUT_MS = 10000` (fast discovery — a real 429/leak is near-instant, so 10s is plenty and keeps failover snappy); `arvan` gets `ARVAN_TIMEOUT_MS = 30000`. This split exists because of a **real, confirmed bug**: with both hops sharing one 10s budget, a genuinely-working tool call on the `arvan` hop (e.g. `sendEmail` — LLM round trip + an actual SMTP send + a follow-up LLM call to confirm) could exceed 10s and get killed by the timeout even though the email had already sent — and since `arvan` is the *last* hop, that timeout was a hard, unrecoverable failure with no further fallback. Verified live both ways: failed at 10s, succeeded at ~11.3s once the budget was raised to 30s. If you ever add a third hop after `arvan`, don't assume `ARVAN_TIMEOUT_MS` transfers — reason about that hop's actual worst-case latency.
4. On success: `sessionManager.setProviderSlot(keyIdentifier, slot)` persists the winner, then return.
5. On failure: `errorHandler.classify(error)`. If `failoverEligible` is `false` (a real error — bad request, malformed response, missing-key config error, or a `403` that isn't the literal "reported as leaked" text) it's rethrown **immediately**, no further hops attempted — the cascade only continues past **timeout, 429, or leaked-key** errors. If eligible, log a warning and move to the next slot.
6. All slots exhausted → throw the last error.

This means two independent iframe users hitting a quota-exhausted `GEMINI_API_KEY` fail over **independently** (each identity has its own sticky slot in `data/sessions.json`) — one user's failure doesn't affect another's starting slot.

**Global circuit breaker for a known-dead primary** (`sessionManager.isPrimaryDown()`/`markPrimaryDown()`/`clearPrimaryDown()`, in-memory only, not persisted): the per-identity sticky slot above only helps an identity that has *already* failed over once — a brand-new identity would still try the doomed `primary` and eat a guaranteed failure first. When `errorHandler.classify()` detects the `primary` failure was specifically a **daily** quota exhaustion (`isDailyQuotaExceeded` — checks the error's `quotaId` for `PerDay`, not just any 429), `askGemini` calls `sessionManager.markPrimaryDown(PRIMARY_DOWN_COOLDOWN_MS)` (15 minutes), and `isSlotConfigured('primary')` then filters `primary` out of the rotation entirely for **every** identity until the cooldown expires — zero wasted calls, zero added latency, invisible to the user. Verified live: a second, unrelated identity's very next request skipped `primary` with no attempt/error logged at all and went straight to `arvan`, ~1.8s faster than the first request that discovered the outage. Don't confuse this with the per-identity sticky slot — one is per-caller memory of "what worked last for you," the other is global memory of "is this resource known-broken for everyone right now."

## 3b. ArvanCloud tool-calling (`callArvanCloudAPIWithTools`)

Reuses Gemini's tool definitions and gating rules rather than duplicating them — the only new thing is the OpenAI-shape translation and the loop mechanics:

1. **Offer layer**: `formatter.getAllowedTools(...)` (the same Gemini-format filter Gemini itself uses) picks the allowed subset, then `tools/openAiFormat.js`'s `toOpenAiTools()` converts it to OpenAI's `{type:'function', function:{name, description, parameters}}` shape (recursively lowercasing `type` values — Gemini's schemas use `"OBJECT"`/`"STRING"`, OpenAI wants `"object"`/`"string"`).
2. **Loop**: up to `MAX_TOOL_ROUNDS = 5` request/response round trips. Each round, if the response has no `tool_calls`, that's the final answer — return it. Otherwise, push the assistant's tool-call message, execute each requested tool via the **same** `toolHandler.executeTool`/`safeParseArgs` Gemini uses (arg-mapping, dispatch — identical code, zero duplication), push one `{role:'tool', tool_call_id, content}` message per result, and loop again.
3. **Execution-layer gating**: `formatter.isToolExecutionAllowed(...)` — the same shared function `responseHandler.js` calls — checked per tool call before executing. A blocked call gets `{error: 'This action is not permitted in the current mode.'}` fed back as the tool's result rather than being silently dropped, so the model can explain the refusal to the user.
4. **`sources`**: only `getWebSearch` populates it, same as Gemini's path.

**A real bug found and fixed here**: GPT-OSS-120B is trained on OpenAI's "harmony" multi-channel response format. When it wants a tool that wasn't offered (e.g. every tool stripped by restricted-mode gating with no BMS/ETEQ/web-search match), it can emit a raw, unparsed channel/tool-call attempt as plain text instead of declining — e.g. `<|start|>assistant<|channel|>commentary to=web_getCurrentWeather<|constrain|>json<|message|>{...}<|call|>`. `stripHarmonyArtifacts()` in `services/arvancloud/index.js` detects the `<|` marker and drops everything from there onward, falling back to *"I'm not able to perform that action in this mode."* if nothing legitimate is left. Applied to **both** `callArvanCloudAPI` and `callArvanCloudAPIWithTools`'s content extraction — verified live, reproduced consistently before the fix, clean after.

Wired into: the ChatGPT dropdown option (`ChatController.handleAPIEndpoint`, routed via `routes/web.js`'s `callArvanCloudAPIWithTools` injection) and the free-tier cascade's `'arvan'` hop (§3a). **Not** wired into Thinking mode (`callArvanThinkingAPI` deliberately still uses the plain, tool-less `callArvanCloudAPI`) or Groq (no tool mechanism exists for it at all).

## 4. Adding a new tool — the full checklist

1. Implement in `services/<name>Tool.js` (or `services/<name>/` for multi-file integrations like `email/`) with **plain positional parameters**, returning a JSON-serializable object. Throw `Error` for failures that should surface as a caught exception (`responseHandler`'s generic `try/catch`); return `{error: message}` only if you deliberately want the "failure" to look like a normal tool response to the model (BMS and email tools currently do this — see §5).
2. Write `tools/<name>/<name>Definition.js` exporting `{functionDeclarations: [{name, description, parameters}]}` in Gemini's schema format. Use uppercase `"OBJECT"`/`"STRING"` types to match every existing definition except `bmsDefinition.js` (a known inconsistency, not a convention to follow). `tools/openAiFormat.js` converts this to OpenAI's shape automatically for ArvanCloud — don't hand-write a second definition.
3. Register both in `tools/toolDefinitions.js` — add the definition object to `allToolDefinitions` (array, sent to Gemini **and**, converted, to ArvanCloud) **and** the function to `availableTools` (name→function map, used by both providers' dispatch). These two structures are manually kept in sync; nothing enforces that a name in one also exists in the other. A mismatch surfaces only at call time as `Tool "${toolName}" is not available.`
4. Add a `TOOL_ARG_MAPPER` entry in `services/gemini/toolHandler.js` if the tool's parameter names/order need translating from the model's arg object — shared by both providers.
5. If the tool needs mode-gating, update **both** `formatter.getAllowedTools` (offer layer) and `formatter.isToolExecutionAllowed` (execution layer, called from both `responseHandler.js` and ArvanCloud's tool loop) — see §3 Step 3.
6. A tool registered this way is now available to **Gemini and ArvanCloud** (ChatGPT + the fallback hop) automatically — no extra wiring needed per provider. Groq still gets none; there's no tool mechanism for it.

## 5. BMS and Email — the two most layered integrations

**BMS** (`services/bmsTool.js` + `tools/bms/bmsDefinition.js`): a thin authenticated proxy to an external BMS API (`X-AI-SECRET` header, 15s timeout). On failure it **returns** `{error: message}` rather than throwing — this bypasses `responseHandler`'s generic tool-error catch, so a BMS outage looks like a normal (if unsuccessful) tool response to the model rather than a caught exception. Gated to `isBmsMode` at both filter layers described in §3.

**Email** (`services/emailTool.js` + `tools/email/emailDefinition.js` + `services/email/`): definition → dispatch (`toolHandler`) → business logic (`emailTool.js`) → formatting (`email/formatter.js`) → transport (`email/index.js`, lazy-singleton nodemailer). Reused as-is by both Gemini's and ArvanCloud's tool loops — same function, same rules, regardless of which provider called it. Things worth knowing before touching this path:
- **Requires a live MongoDB connection.** `checkRateLimit` queries `EmailLog.countDocuments(...)` — if Mongo is unreachable/slow, this hangs for Mongoose's default buffering window (~10s) then fails with a `buffering timed out` error, which surfaces to the user as a generic "technical error" with no indication the real cause is DB connectivity. Verified live: reproduced this exact failure by exercising the tool without an established DB connection.
- **Rate limiting is global, not per-user.** `checkRateLimit` is always called with the constant `SYSTEM_USER = 'system_user'` (`emailTool.js`), not the actual requester — the 10-emails/hour cap (`MAX_EMAILS_PER_HOUR`) is one shared bucket across every user, every mode, every provider (Gemini's tool call, ArvanCloud's tool call, **and** the human-triggered `sendChatHistory` export). If you need per-user limits, this constant is what to change, and it affects every call path.
- **`userTime` is a dead field.** The tool schema asks the model to supply it, but `TOOL_ARG_MAPPER.sendEmail` never forwards it to the implementation — `generateTimestamp` always falls back to server-generated time. Don't rely on it being populated; either wire the mapper to pass it through, or drop it from the schema.
- `email/formatter.js`'s `detectDirection` is a hand-rolled heuristic (counts Unicode ranges in the first 100 chars), not a proper bidi algorithm — good enough for picking an RTL/LTR wrapper, not a general-purpose text-direction utility.

## 6. Anti-patterns

❌ **Don't add a 12th argument to a recursive `callGeminiAPI` call.** See §3 Step 5 — this exact mistake (a duplicate positional arg silently overflowing the 11-param signature) was a real, shipped bug that broke tool calls in BMS mode. Count arguments against the signature before adding a new recursive call site.

❌ **Don't assume a tool's failure always throws.** BMS and email tools return `{error}` objects instead; a `try/catch` around `executeTool` alone will not catch every real failure mode — check the specific tool's implementation.

❌ **Don't add a new tool's mode-gating in only one of the two filter layers.** `formatter.getAllowedTools` (what's offered) and `formatter.isToolExecutionAllowed` (what's allowed to execute, called from both `responseHandler.js` and ArvanCloud's tool loop) are independently maintained; updating one and not the other creates a tool that's either invisible-but-still-blockable or offered-but-unenforced depending on which one you missed.

❌ **Don't expect `sources` from Groq or the plain `callArvanCloudAPI`.** Only `getWebSearch` populates it, and only through a tool-calling-capable path (`askGemini`/`callGeminiAPI` or `callArvanCloudAPIWithTools`) — Groq has no tool mechanism at all, and the plain ArvanCloud call never offers tools.

❌ **Don't add a second copy of a tool schema in OpenAI format.** `tools/openAiFormat.js`'s `toOpenAiTools()` converts the existing Gemini-format definitions automatically — hand-writing a parallel OpenAI schema creates a second thing to keep in sync for no reason.

❌ **Don't assume ArvanCloud's `content` field is always clean user-facing text.** GPT-OSS-120B can leak raw "harmony" format tokens (`<|channel|>...<|call|>`) when it wants a tool it wasn't given — `stripHarmonyArtifacts()` handles the known case, but if you see a response with `<|` in it, that's this issue, not new model output to trust.

❌ **Don't call `callGeminiAPI` directly from a controller.** Call `askGemini` — it's the one that applies the fallback cascade and persists the winning provider slot. `callGeminiAPI` is a low-level primitive meant to be called per-hop (by `askGemini`) or for the tool-call follow-up (by `responseHandler.js`), not as a chat entry point.

❌ **Don't add a `timeoutMs` (or any 12th) positional parameter to `callGeminiAPI`.** See §2 — `responseHandler.js`'s follow-up recursion already overflows the 11-param signature by one; a 12th parameter would catch that overflowing argument instead of dropping it, corrupting whatever the new parameter controls. Use `withTimeout()` externally instead, as `askGemini` does.

❌ **Don't put `GEMINI_API_KEY_PREMIUM` in `PROVIDER_KEYS` or `PROVIDER_ORDER`.** It's reserved for Thinking mode exclusively — mixing it into the free-tier cascade defeats the point of having a dedicated key for that feature.
