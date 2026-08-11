# LLM Provider & Tool-Calling Pattern

## 1. Philosophy

Three LLM providers (Gemini, Groq, ArvanCloud) live side by side with **no shared interface**. Each `services/{provider}/index.js` exports a differently-shaped function; the only reconciliation point is `ChatController.handleAPIEndpoint`, which special-cases ArvanCloud's extra `model`/`fileData` args (see [[../controllers/controllersPattern]]). **Two of the three now support tool-calling**: Gemini natively, and ArvanCloud (GPT-OSS-120B, plus the ArvanCloud-hosted Gemini used by the Gemini option's text path) via a parallel OpenAI-style tool-calling loop that reuses Gemini's exact tool definitions and mode-gating rules — see §3b. Groq (the "Ollama" option) remains a plain single-turn completion with no tools at all. Don't assume "non-Gemini = no tools" anymore; check §3b before treating ArvanCloud as a dumb passthrough.

> **Removed:** OpenRouter, and the old `GPT-4o-mini-4193n`/`DeepSeek-Chat-V3-0324-mbxyd` ArvanCloud models, are gone. ArvanCloud now serves three models: `GPT-OSS-120B-burmt` (the "GPT" option), `Gemini-3.1-Flash-Lite-Preview-8dzyx` (the Gemini option's text/tools backend), and `Gemini-3-Flash-Preview-kc6io` (Thinking mode's backend). **None are vision-capable** — see §2. Only GPT is directly user-selectable; the two Gemini-named ones back the Gemini option / Thinking mode.

```
services/
├── gemini/
│   ├── index.js         # callGeminiAPI (native single-attempt primitive) + askGemini (Gemini option — content dispatch, no cascade) + askNativeGemini (Gemini Smart option) + callArvanGemini/callArvanThinkingAPI (internal)
│   ├── formatter.js       # shapes conversationHistory into Gemini's `contents`; getAllowedTools (offer-layer) + isToolExecutionAllowed (execution-layer) — shared with ArvanCloud
│   ├── permissions.js      # scans history for "you may proceed" affirmations to auto-relax restricted mode
│   ├── responseHandler.js   # dispatches text vs functionCall responses; owns the tool-call → follow-up loop
│   ├── toolHandler.js       # maps named args → each tool fn's positional args; executes — shared with ArvanCloud
│   └── errorHandler.js       # logs errors only (classify removed with the cascade)
├── groq/index.js      # single function, groq-sdk client, no tools (the "Ollama" option)
├── arvancloud/
│   ├── index.js        # chat completions for all three models; callArvanCloudAPIWithTools adds tool-calling (GPT-OSS-120B + the Gemini option's text path)
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
// Gemini option — what ChatController.ask/initialPrompt call. A content dispatch, NOT a loop:
//   useThinkingMode -> callArvanThinkingAPI (ArvanCloud thinking model, tool-less)
//   fileData        -> native callGeminiAPI (vision; free-tier key, 429s today until premium key)
//   otherwise       -> callArvanGemini (ArvanCloud-hosted Gemini, tool-calling). See §3a.
askGemini(message, conversationHistory, keyIdentifier, isRestrictedMode, useWebSearch,
          isBmsMode, fileData, customSystemInstruction, useThinkingMode, isEteqMode)
// → { text, sources }

// Gemini Smart option (UI disabled until premium key) — pure native Gemini, vision + tools, no thinking.
// Reached via POST /ask-smart -> ChatController.askSmart.
askNativeGemini(message, conversationHistory, keyIdentifier, isRestrictedMode, useWebSearch,
                isBmsMode, fileData, customSystemInstruction, isEteqMode)
// → { text, sources }

// callGeminiAPI — the native single-attempt Gemini primitive askGemini/askNativeGemini call.
// Also reused unmodified by responseHandler.js's tool-call follow-up recursion. Frozen
// at 11 positional params — see §3 Step 5's argument-count bug before adding a 12th.
callGeminiAPI(message, conversationHistory, apiKey, isRestrictedMode, useWebSearch,
              keyIdentifier, isBmsMode, fileData, customSystemInstruction, useThinkingMode, isEteqMode)
// → { text, sources }

// Groq — 3-arg shape, no tools (the "Ollama" option)
callGrokAPI(message, conversationHistory, customSystemInstruction)          // → string

// ArvanCloud, plain — no tools, backward-compatible shape for simple callers
callArvanCloudAPI(message, conversationHistory, model, fileData, customSystemInstruction, timeoutMs) // → string

// ArvanCloud, tool-calling — used for the GPT option and the Gemini option's text path (callArvanGemini)
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

### Step 6 — error logging (`errorHandler.js`)
`callGeminiAPI` has no try/catch — a thrown error propagates straight to its caller. `errorHandler.logError(context, error)` just logs the response body / message; the old `classify()` (timeout/quota/leaked-key classification that drove the now-removed cascade) was deleted with the cascade. `responseHandler.js`'s tool-call follow-up recursion still catches its own `callGeminiAPI` call independently (see Step 5).

## 3a. `askGemini` — the Gemini option's content dispatch (no cascade)

`ChatController.ask`/`initialPrompt` call `askGemini`, not `callGeminiAPI` directly. **There is no fallback loop anymore** — the old free-tier cascade (`GEMINI_API_KEY` → ArvanCloud-hosted Gemini, with per-identity sticky slots + a global circuit breaker) was removed because the free-tier daily quota kept exhausting and the loop was unwanted; a premium key is coming. `askGemini` is now a 3-way content dispatch:

```js
if (useThinkingMode) return callArvanThinkingAPI(message, conversationHistory, customSystemInstruction);
if (fileData)        return callGeminiAPI(..., GEMINI_API_KEY, ..., fileData, ...);   // native vision
return                     callArvanGemini(message, conversationHistory, customSystemInstruction, ...); // ArvanCloud Gemini text/tools
```

1. **Thinking mode** — short-circuits, no native call: `callArvanThinkingAPI` posts to ArvanCloud's `ARVAN_THINKING_MODEL_ID` (`Gemini-3-Flash-Preview-kc6io`) via the **plain** `callArvanCloudAPI` (no tools) — **not** `callGeminiAPI`. This is deliberate: ArvanCloud's gateway speaks OpenAI-style chat completions (`messages`, `Authorization: apikey`), while native Gemini speaks Google's own REST shape (`contents`/`tools`/`systemInstruction`, `?key=` query auth) — structurally incompatible, so Thinking mode cannot just point `callGeminiAPI` at a different URL. Deliberately tool-less and file-less. If you want Thinking mode to gain tools, switch it to `callArvanCloudAPIWithTools` (see §3b). Thinking mode's only config is `ARVANCLOUD_THINKING_URL` + the shared `ARVANCLOUD_API_KEY`.
2. **Image attachment** (`fileData` set, no thinking) → native `callGeminiAPI` with `GEMINI_API_KEY` — the **only** path that touches the free-tier key today, so image attachments 429 until the premium key lands. This is why vision lives on the native path, not on ArvanCloud: `services/arvancloud/index.js`'s `VISION_CAPABLE_MODELS` is empty, and routing images through ArvanCloud would drop `fileData`.
3. **Plain text** → `callArvanGemini` → `callArvanCloudAPIWithTools(..., ARVAN_GEMINI_MODEL_ID, null, customSystemInstruction, {isRestrictedMode, useWebSearch, isBmsMode, isEteqMode})`. Tool-calling-capable (`sendEmail`, weather, BMS lookup, web search, etc.) with the same mode-gating Gemini applies — see §3b. **No file/vision on this path** (fileData is the dispatch key, not forwarded here). Default 60s timeout (no per-slot timeout budget anymore).

`THINKING_MODE_ENABLED = true` — **enabled**. `ChatController.ask` checks the flag defensively before spending a quota credit via `manageThinkingMode` (capped at `THINKING_MODE_DAILY_LIMIT = 3`/24h per user), and the UI (`#thinking-mode-btn`, `#mobile-thinking-mode-toggle`) shows only for the Gemini service (`UIHandler.updateServiceUI`'s `isGemini` check — not for Gemini Smart, not for GPT/Ollama). Because Thinking mode has no tool/file support, `ChatHandler.toggleThinkingMode` also **hides and clears** Web Search, the attachment button, and the mic button whenever Thinking is toggled on.

### `askNativeGemini` — the Gemini Smart option (UI disabled until premium)

`ChatController.askSmart` (route `POST /ask-smart`) calls `askNativeGemini`, which calls native `callGeminiAPI` with `GEMINI_API_KEY` — pure native Gemini, vision + tools, **no thinking mode**. This is the premium-ready path: today it 429s on the free tier, so the `#service-select` option `gemini-smart` is `disabled` with a "coming soon" tooltip. Enable the option (remove the `disabled` attribute in `public/index.html`) once the premium key is in. `askSmart` mirrors `ask` but drops `useThinkingMode`/`manageThinkingMode` and responds `{reply, sources, sessionId}` (no `thinkingModeUsage`).

### Removed with the cascade (do not re-introduce lightly)

`PROVIDER_ORDER`, `PROVIDER_KEYS`, `PRIMARY_TIMEOUT_MS`/`ARVAN_TIMEOUT_MS`/`PRIMARY_DOWN_COOLDOWN_MS`, `rotateToStart`, `isSlotConfigured`, `withTimeout`, `callArvanGeminiFallback` (renamed `callArvanGemini`), and `errorHandler.classify` are all gone. `utils/sessionManager.js` (`KeySessionManager`) and `data/sessions.json` are **deleted entirely** — their only import was removed, so they had zero callers and were deleted (filesystem + gitignored `data/sessions.json`). Re-introduce a real datastore (Mongo/Redis) only if a real fallback (e.g. premium-primary → ArvanCloud-secondary) is ever re-added; a content dispatch has nothing for a sticky slot to remember.

## 3b. ArvanCloud tool-calling (`callArvanCloudAPIWithTools`)

Reuses Gemini's tool definitions and gating rules rather than duplicating them — the only new thing is the OpenAI-shape translation and the loop mechanics:

1. **Offer layer**: `formatter.getAllowedTools(...)` (the same Gemini-format filter Gemini itself uses) picks the allowed subset, then `tools/openAiFormat.js`'s `toOpenAiTools()` converts it to OpenAI's `{type:'function', function:{name, description, parameters}}` shape (recursively lowercasing `type` values — Gemini's schemas use `"OBJECT"`/`"STRING"`, OpenAI wants `"object"`/`"string"`).
2. **Loop**: up to `MAX_TOOL_ROUNDS = 5` request/response round trips. Each round, if the response has no `tool_calls`, that's the final answer — return it. Otherwise, push the assistant's tool-call message, execute each requested tool via the **same** `toolHandler.executeTool`/`safeParseArgs` Gemini uses (arg-mapping, dispatch — identical code, zero duplication), push one `{role:'tool', tool_call_id, content}` message per result, and loop again.
3. **Execution-layer gating**: `formatter.isToolExecutionAllowed(...)` — the same shared function `responseHandler.js` calls — checked per tool call before executing. A blocked call gets `{error: 'This action is not permitted in the current mode.'}` fed back as the tool's result rather than being silently dropped, so the model can explain the refusal to the user.
4. **`sources`**: only `getWebSearch` populates it, same as Gemini's path.

**A real bug found and fixed here**: GPT-OSS-120B is trained on OpenAI's "harmony" multi-channel response format. When it wants a tool that wasn't offered (e.g. every tool stripped by restricted-mode gating with no BMS/ETEQ/web-search match), it can emit a raw, unparsed channel/tool-call attempt as plain text instead of declining — e.g. `<|start|>assistant<|channel|>commentary to=web_getCurrentWeather<|constrain|>json<|message|>{...}<|call|>`. `stripHarmonyArtifacts()` in `services/arvancloud/index.js` detects the `<|` marker and drops everything from there onward, falling back to *"I'm not able to perform that action in this mode."* if nothing legitimate is left. Applied to **both** `callArvanCloudAPI` and `callArvanCloudAPIWithTools`'s content extraction — verified live, reproduced consistently before the fix, clean after.

Wired into: the GPT dropdown option (`ChatController.handleAPIEndpoint`, routed via `routes/web.js`'s `callArvanCloudAPIWithTools` injection) and the Gemini option's text path (`callArvanGemini` in `services/gemini/index.js` — §3a). **Not** wired into Thinking mode (`callArvanThinkingAPI` deliberately still uses the plain, tool-less `callArvanCloudAPI`), the Gemini Smart option (`askNativeGemini` uses native Gemini directly), or Groq (no tool mechanism exists for it at all).

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

❌ **Don't call `callGeminiAPI` directly from a controller.** Call `askGemini` (Gemini option) or `askNativeGemini` (Gemini Smart, via `ChatController.askSmart`) — they're the chat entry points. `callGeminiAPI` is a low-level primitive meant to be called per-dispatch (by `askGemini`/`askNativeGemini`) or for the tool-call follow-up (by `responseHandler.js`), not as a chat entry point.

❌ **Don't add a `timeoutMs` (or any 12th) positional parameter to `callGeminiAPI`.** See §2 — `responseHandler.js`'s follow-up recursion already overflows the 11-param signature by one; a 12th parameter would catch that overflowing argument instead of dropping it, corrupting whatever the new parameter controls. Pass any timeout through the axios `timeout` config inside `callGeminiAPI` instead.

❌ **Don't re-add a fallback loop into `askGemini`.** The cascade (`PROVIDER_ORDER`/`PROVIDER_KEYS`/`withTimeout`/sticky slots/circuit breaker) was deliberately removed; `askGemini` is a content dispatch now (§3a). If a premium-primary → ArvanCloud-secondary fallback is ever genuinely needed, re-introduce a real datastore (Mongo/Redis) deliberately rather than bolting an ad-hoc loop (or the old `fs`-backed `KeySessionManager`) back in.
