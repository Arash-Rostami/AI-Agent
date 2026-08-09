# Tool Definition Pattern

## 1. Philosophy

`tools/` holds pure data — Gemini function-declaration schemas — with zero business logic. Each `tools/<name>/<name>Definition.js` describes *what the model may call and with what shape*; the actual implementation lives in `services/<name>Tool.js` (or `services/<name>/`). This split exists so the schema (what the LLM sees) and the implementation (what actually runs) can be reasoned about independently, but it means **nothing enforces they stay in sync** — see [[../services/servicesPattern]] §3 Step 4 and §4 for how `tools/toolDefinitions.js` wires the two together and what happens when they drift. These same Gemini-format schemas now also power ArvanCloud's tool-calling (GPT-OSS-120B + the Gemini fallback hop) — `openAiFormat.js` converts them at call time, so there's still exactly one schema per tool, not two.

```
tools/
├── toolDefinitions.js              # aggregation point: allToolDefinitions[] + availableTools{}
├── openAiFormat.js                   # toOpenAiTools() — converts the above to OpenAI's shape for ArvanCloud
├── bms/bmsDefinition.js
├── documentReader/persolBSDocumentDefinition.js
├── email/emailDefinition.js
├── time/timeDefinition.js
├── weather/weatherDefinition.js
└── webCrawler/webCrawlerDefinition.js
└── webSearch/webSearchDefinition.js
```

## 2. Shape every definition file follows

```js
export const weatherToolDefinition = {
    functionDeclarations: [{
        name: 'getCurrentWeather',
        description: 'Get the current weather for a location.',
        parameters: {
            type: 'OBJECT',
            properties: { location: {type: 'STRING', description: '...'}, unit: {type: 'STRING', enum: [...]} },
            required: ['location']
        }
    }]
};
```
Types are uppercase (`"OBJECT"`, `"STRING"`) in every file, including `bms/bmsDefinition.js` (fixed — it used to be the one lowercase outlier). Match this convention in any new definition file.

## 3. `toolDefinitions.js` — the single aggregation point
```js
export const allToolDefinitions = [
    weatherToolDefinition, timeToolDefinition, persolBSDocumentDefinition,
    webSearchToolDefinition, bmsToolDefinition, webCrawlerToolDefinition, emailToolDefinition,
];
export const availableTools = {
    getCurrentWeather, getWeatherForecast, getAirQuality, getCurrentTime,
    getBusinessInfo, getWebSearch, searchBmsDatabase, crawlWebPage, sendEmail,
};
```
`allToolDefinitions` (sent to Gemini as `tools[]`) and `availableTools` (name → function map, used by `services/gemini/toolHandler.js` for local dispatch) are **two separate, manually-synced structures**. A `functionDeclarations[].name` with no matching key in `availableTools` (or vice versa) is not caught at startup — it surfaces at call time as `Tool "${toolName}" is not available.` When adding or renaming a tool, update both in the same commit and double-check the name strings match character-for-character.

## 4. Registering a new tool — checklist (mirrors [[../services/servicesPattern]] §4, tools-side only)
1. Write `tools/<name>/<name>Definition.js` following the shape in §2 — uppercase types, `required[]` listing every non-optional param, a `description` detailed enough for the model to infer values without asking the user (the email tool's definition is the reference example: it explicitly instructs the model *"Do not ask for content that can be inferred"*).
2. Import the definition into `toolDefinitions.js` and add it to `allToolDefinitions`.
3. Import the implementation function (from `services/`) and add it to `availableTools` under the **exact** name declared in step 1.
4. Do not import an implementation function into a definition file — definitions are schema-only. (`bmsDefinition.js` used to import `searchBmsDatabase` and never call it; removed.)
5. If the tool needs mode-gating (BMS/ETEQ/restricted), that logic lives in `services/gemini/formatter.js`'s `getAllowedTools`/`isToolExecutionAllowed` (shared by Gemini's `responseHandler.js` and ArvanCloud's tool loop), not here — `tools/` stays pure schema.
6. Write the tool's `description` to state plainly that the model has real, working access and should call it rather than claim it can't — this matters more than it sounds: a vague description makes some models (observed with GPT-OSS-120B via ArvanCloud) fall back to a trained "I don't have that capability" refusal even when the tool was actually offered. The `sendEmail` definition is the reference example after a real, confirmed incident of exactly this refusal.

## 5. Anti-patterns

❌ **Don't add a new definition file with lowercase JSON-schema types.** Match the uppercase `"OBJECT"`/`"STRING"` convention used consistently across every definition file now.

❌ **Don't import an implementation function into a definition file "just in case."** Definitions are schema-only — there's no longer a precedent for this (the old `bmsDefinition.js` exception was removed).

❌ **Don't assume a field declared in a definition's `properties` is actually delivered to the implementation.** The dispatch mapping in `services/gemini/toolHandler.js`'s `TOOL_ARG_MAPPER` can silently drop a field (the email tool's `userTime` is a live example) — always check the mapper entry, not just the schema, when a tool's implementation seems to ignore a parameter the model clearly sent.

❌ **Don't write a passive/hedged tool description.** "Sends an email" invites a capable-but-cautious model to talk about sending instead of calling the function. Say it has real access and should use it — see item 6 above.
