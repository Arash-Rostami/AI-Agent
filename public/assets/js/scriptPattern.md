# JavaScript Architecture — Handler Pattern

## 1. Core Philosophy

Vanilla ES modules, no framework, no bundler-driven code-splitting beyond native dynamic `import()`. Two pages (`index.html` chat UI, `login.html` auth UI) share one entry point, `app.js`, which decides what to load by **DOM presence, not URL**: `document.getElementById('login-form')` vs `document.getElementById('messages')`. Each feature is a "Handler" class, but there is no enforced base contract — `BaseHandler` is an opt-in mixin, not a required superclass, and most handlers don't use it.

```
public/assets/js/
├── app.js                       # entry point: page detection + lazy-load orchestration
└── modules/
    ├── BaseHandler.js            # opt-in mixin: userId + parentOrigin + shared MessageFormatter
    ├── MessageFormatter.js        # hand-rolled markdown renderer + XSS-escaping, shared via injection
    ├── ChatHandler.js              # orchestrator for the chat page (extends BaseHandler)
    ├── UIHandler.js                  # DOM/view layer for chat — owns all rendering, no backend calls
    ├── HistoryHandler.js              # sidebar history browser (extends BaseHandler) — largest module
    ├── EmailHandler.js                 # "email this chat" (extends BaseHandler) — instantiated TWICE, independently
    ├── AudioHandler.js, ModalHandler.js, PromptHandler.js, ...  # leaf feature modules
    └── LoginHandler.js, LogoutHandler.js, ThemeToggler.js, ...   # page-level / cross-page utilities
```

## 2. The `BaseHandler` mixin — what it actually provides

```js
export default class BaseHandler {
    constructor() {
        this.userId = this.getUserId();            // from ?user= query param
        this.parentOrigin = this.getParentOrigin();  // iframe-embedding origin, cached in sessionStorage
        this.formatter = new MessageFormatter();
    }
}
```
That's the entire contract — no DOM-query helpers, no event-binding helpers, no lifecycle hooks. `init()`/`cacheDOMElements()` are per-handler conventions each module reinvents itself.

**Extends `BaseHandler`**: `ChatHandler`, `EmailHandler`, `HistoryHandler` — the three modules that need `userId`/`parentOrigin` for authenticated fetches (`X-User-Id`, `X-Frame-Referer` headers).
**Plain classes, no `BaseHandler`**: everything else (`AudioHandler`, `FontSizeHandler`, `LoginHandler`, `LogoutHandler`, `MenuHandler`, `ModalHandler`, `PinHandler`, `PromptHandler` (exports `PromptSuggestionsHandler`), `SettingsHandler`, `SyncHandler`, `ThemeToggler` (exports `ThemeToggle`), `UIHandler`).

When adding a new handler: extend `BaseHandler` only if it needs `userId`/`parentOrigin` for a backend call carrying those headers. Don't extend it "for consistency" — most handlers correctly don't.

## 3. Boot sequence (`app.js`)

There is **no central app object** holding handler references — each handler is instantiated and left to self-wire via its own constructor; nothing is stored except transient locals inside `.then()` callbacks.

```js
document.addEventListener('DOMContentLoaded', () => {
    import('./modules/ThemeToggler.js').then(({default: ThemeToggle}) => new ThemeToggle('theme-toggle'));  // both pages

    if (loginPage) { import('./modules/LoginHandler.js').then(...) }

    if (chatPage) {
        Promise.all([import('./modules/ChatHandler.js'), import('./modules/FontSizeHandler.js')])
            .then(([{default: ChatHandler}, {default: FontSizeHandler}]) => { new ChatHandler(); new FontSizeHandler(); });

        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 500));
        idle(() => {
            loadModule('./modules/HistoryHandler.js', 'HistoryHandler');
            loadModule('./modules/ModalHandler.js', 'ModalHandler');
            loadModule('./modules/LogoutHandler.js', 'LogoutHandler', 'logout-btn');
            // ...SyncHandler, SettingsHandler, MenuHandler, PinHandler
        }, {timeout: 2000});
    }
});
```
**Two-tier lazy loading**: "core" (`ChatHandler`, `FontSizeHandler`) loads immediately via `Promise.all`; everything else waits behind `requestIdleCallback` (2000ms timeout cap, `setTimeout(fn,500)` fallback) — a deliberate performance budget favoring the chat input's responsiveness over secondary features. **Every dynamic import is wrapped in `.catch(err => console.error(...))`** — a module failing to load never throws to the page, it just leaves that feature inert. When adding a new feature module, decide which tier it belongs to: does the user need it in the first paint (core), or can it wait until idle (everything else)?

## 4. Cross-handler communication — three coexisting mechanisms, pick deliberately

**a) Direct composition** (the default) — a handler `new`s its dependency in its own constructor:
```js
// ChatHandler.js
this.uiHandler = new UIHandler(this.formatter);
this.audioHandler = new AudioHandler();
this.emailHandler = new EmailHandler();
```
Note this means `EmailHandler` is instantiated **twice, independently** — once inside `ChatHandler`, once inside `HistoryHandler` — with no shared instance. Both work correctly since `EmailHandler` is stateless, but don't assume there's one canonical instance anywhere in the app.

**b) `window`-level `CustomEvent`** — the only true pub/sub in the codebase, and it exists specifically because `HistoryHandler` and `ChatHandler` are lazy-loaded independently with no reference to each other:
```js
// HistoryHandler.js (producer)
window.dispatchEvent(new CustomEvent('restore-chat', {detail: {messages, sessionId}}));
// ChatHandler.js (consumer)
window.addEventListener('restore-chat', (e) => this.restoreSession(e.detail.messages, e.detail.sessionId));
```
This is a single-use pattern — no other cross-module signal uses `CustomEvent`. **Use this mechanism, not a new direct import, when two lazy-loaded modules need to talk and neither should force-load the other.**

**c) Global singleton via static methods** — `ModalHandler` implements a manual singleton (not a module-level singleton import):
```js
static instance = null;
constructor() { if (ModalHandler.instance) return ModalHandler.instance; ModalHandler.instance = this; this.init(); }
static alert(message) { return new ModalHandler().show('alert', message); }
```
Every `new ModalHandler()` call returns the same instance because the constructor short-circuits. Call `ModalHandler.alert/confirm/prompt/loading(...)` from anywhere without holding a reference — this is the app's only shared UI-primitive singleton; don't build a second one for a different concern without a reason.

There is **no shared app-level state store** — no Redux-like pattern, no `EventEmitter`. State lives per-handler; `currentSessionId` is tracked independently in both `ChatHandler` and `HistoryHandler`, synced only via the one `restore-chat` event.

## 5. `MessageFormatter` — shared rendering, injected not imported-fresh

Instantiated once per `BaseHandler` constructor and threaded down by reference: `BaseHandler → ChatHandler.formatter → new UIHandler(this.formatter)`. `HistoryHandler` gets its **own separate instance** via its own `BaseHandler` constructor call — harmless since the class is stateless, but it's a second instance, not a shared singleton; don't assume `formatter` identity is stable across modules if you ever need to add per-instance state to it.

Implements a hand-rolled markdown-ish parser (code fences → tables → lists → headers/bold/italic → paragraphs) and a **partial** `escapeHtml` (only `&`, `<`, `>` — not quotes), applied before/around the markdown transforms rather than after full HTML assembly. Treat this as an active XSS surface to review before trusting any new source of AI-generated or user-generated content through this path — don't assume "it's escaped" without checking exactly what `escapeHtml` covers at the point you're adding content.

## 6. Decision matrix

| When you need to... | Do this... | Why |
|---|---|---|
| Add a feature needed at first paint | Add it to the `Promise.all` core-load block in `app.js` | Matches the existing perf-budget split |
| Add a secondary feature | Add it via `loadModule(...)` inside the `requestIdleCallback` block | Keeps first paint fast |
| Let two lazy modules communicate | Dispatch/listen a `window` `CustomEvent`, like `restore-chat` | Avoids forcing one module to eagerly import the other |
| Show a confirm/alert/prompt/loading UI | Call `ModalHandler.alert/confirm/prompt/loading(...)` statically | It's the one shared UI singleton — don't use native `alert()`/`confirm()` (see anti-patterns) |
| Read/write a small persisted UI preference | `localStorage`, following `ThemeToggler`'s (`theme`), `FontSizeHandler`'s (`fontScale`), `PinHandler`'s (`pinnedInterface`) pattern | No central constants file exists — pick a clear, unique key string |

## 7. Anti-patterns — known issues in this codebase, don't extend them

❌ **Don't use native `alert()`/`confirm()` for new UI.** `SettingsHandler` is the one outlier still using them instead of `ModalHandler` — it's an inconsistency to fix, not a second acceptable style.

❌ **Don't re-implement iframe detection (`window.self !== window.top`).** It's already independently duplicated three times (`BaseHandler.getParentOrigin`, `MenuHandler.checkRestrictedMode`, `PromptHandler.init`) — if you need it in a fourth place, extract a shared `isEmbedded()` helper instead of copy-pasting a fourth time.

❌ **Don't duplicate a "fetch `/auth/admin` and render the profile" call.** `MenuHandler` and `SettingsHandler` already do this independently on every chat-page load — a new module needing the same data should factor out a shared cache/helper, not add a third network round-trip.

❌ **Don't wire a DOM id from a handler without confirming it exists in the actual HTML.** `MenuHandler`'s `#email-chat-btn` doesn't exist in `index.html` (the real trigger is `#email-chat-action`), making `addEmailChatListener()` and `handleEmailActiveChat()` dead code — always cross-check a new handler's queried ids/classes against the markup it targets.

❌ **Don't leave a state field implicitly `undefined` when a sibling field right next to it is explicitly initialized.** `ChatHandler.isWebSearchActive` is never set in the constructor (unlike `isThinkingModeActive = false` beside it) — it happens to work via `!undefined` on first toggle, but initialize every piece of boolean state explicitly for a new handler.

❌ **Don't let a handler's exported class name drift from its filename.** `ThemeToggler.js` exports `ThemeToggle`; `PromptHandler.js` exports `PromptSuggestionsHandler`. Both work, but "grep the filename, find the class" breaks for these two — keep new modules' filename and class name matching.
