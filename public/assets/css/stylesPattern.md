# CSS Architecture & Design Tokens

## 1. Core Philosophy

Plain semantic class names (not BEM, not utility-first — one escape-hatch utility, `.hidden`), a custom-property token layer inspired by Material Design 3's *visual* language (soft elevation, pill radii, the MD3 "emphasized" easing curve) but **not** MD3's token architecture (no role/state layering, no `--md-sys-color-*` naming, only two elevation levels). Light/dark theming is a `data-theme` attribute on `<html>`, not a class and not `prefers-color-scheme`.

```
public/assets/css/
├── app.css          # pure @import manifest — no rules of its own, load order matters
├── font.css          # @imports Font Awesome
├── login.css           # standalone, NOT imported by app.css — its own separate token set
└── modules/
    ├── base.css          # imported FIRST — reset + :root/[data-theme=dark] tokens; everything else depends on it
    ├── header.css, messages.css, input.css, history.css, menu.css, modal.css, settings.css
    ├── animations.css, loader.css
    └── responsive.css    # imported LAST — @media overrides win the cascade by source order
```

## 2. Import order is load-bearing

```css
/* app.css */
@import 'modules/base.css';       /* tokens + reset — must come first */
@import 'modules/header.css';
@import 'modules/messages.css';
@import 'modules/input.css';
@import 'modules/history.css';
@import 'modules/menu.css';
@import 'modules/modal.css';
@import 'modules/settings.css';
@import 'modules/animations.css';
@import 'modules/loader.css';
@import 'modules/responsive.css'; /* last — its @media rules override same-specificity component rules by source order */
```
`base.css` itself chains two more imports before its own rules — Google Fonts (Vazirmatn) then `font.css` (Font Awesome). This chain is a real first-paint cost (`app.css → base.css → font.css/Google Fonts` must resolve serially, no bundler inlines them) — be aware of it before adding a fourth chained `@import`; prefer a `<link>` in the HTML `<head>` for a new external font/icon set over another nested `@import`.

**When adding a new module file**: import it in `app.css` in the position matching its role — base/tokens first, components in the middle, `animations`/`loader` after components, `responsive.css` always last so its overrides win.

## 3. Design tokens (`base.css`, `:root` + `[data-theme="dark"]`)

```css
:root {
    --primary-color: #0b57d0;   --primary-hover: #0842a0;
    --bg-color: #f0f4f9;         --surface-color: #ffffff;
    --text-color: #1e1e1e;        --text-secondary: #444746;
    --border-color: #e3e3e3;       --success-color: #146c2e;   --error-color: #b3261e;
    --user-msg-bg: #0b57d0;         --user-msg-text: #ffffff;
    --ai-msg-bg: #ffffff;            --ai-msg-text: #1e1e1e;
    --shadow: 0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.24);
    --shadow-lg: 0 4px 6px rgba(0,0,0,.07), 0 10px 15px rgba(0,0,0,.1);
    --radius-md: 12px; --radius-lg: 16px; --radius-pill: 999px;
    --transition: all 0.3s cubic-bezier(0.2, 0.0, 0, 1.0);   /* MD3's "emphasized" easing curve */
    --font-scale: 1;   /* multiplier, not a type scale — see §5 */
}
[data-theme="dark"] { --primary-color: #a8c7fa; --bg-color: #000000; /* ...full parallel override block... */ }
```
Naming is flat/semantic (`--primary-color`, `--surface-color`), **not** MD3's role-layered `--md-sys-color-*` scheme — there's no `-container`/`-on-*` pairing. This is the main gap worth closing if the design system is ever formalized: several component files hardcode `#000000`/`#ffffff` for "text on colored background" instead of a `--on-primary`-style token (see §6). When adding a new token, follow the existing flat naming, and if it's a "contrast color for X," consider whether an `--on-*` token would eliminate a future duplicated dark-mode override instead of adding another hardcoded hex.

## 4. Theming mechanism

```css
[data-theme="dark"] { /* full token override block */ }
```
```js
// ThemeToggler.js
const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
root.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
```
Toggling uses the **View Transitions API** for an animated circular reveal from the click point, with matching CSS in `animations.css`:
```css
::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
::view-transition-old(root) { z-index: 1; }
::view-transition-new(root) { z-index: 9999; }
```
and a graceful fallback in JS when `document.startViewTransition` is unavailable. Individual component files (`header.css`, `history.css`, `input.css`, `menu.css`, `settings.css`) also carry **manual** `[data-theme="dark"]` overrides beyond the token layer — mostly flipping icon/text color to `#000000` on light-tinted dark-mode accent buttons. When adding a new themed component, prefer expressing the difference as a token override in `base.css` over adding another manual `[data-theme="dark"] .my-new-class { color: #000 }` block — the existing repetition of that exact pattern across five files is the thing to avoid growing further.

## 5. Naming convention & the one utility class

Component root → descendant via space-combinator (`.message-avatar`, `.history-details-header`), state via a plain suffix class with no prefix convention (`.active`, `.recording`, `.fade-out`, `.danger` — not `.is-active`/`.has-danger`). IDs are used directly in some component stylesheets for one-off elements (`#thinking-mode-btn::before`, `#settings-avatar-preview`) alongside classes — not a strict class-only discipline. The one true utility is `.hidden { display: none !important; }`, used pervasively for JS-driven show/hide. Follow this: semantic classes for structure/state, `.hidden` for visibility toggling, IDs only for genuinely singular elements a script also targets directly.

`--font-scale` (§3) is a multiplier applied at `html { font-size: calc(16px * var(--font-scale)) }`, driven by `FontSizeHandler.js`. It only scales content sized in `rem`/`em` — several component files still use fixed `px` for chrome (icon buttons at `44px`), so text scales with the user's font-size preference but button/icon chrome does not. Use `rem`/`em` for new text-adjacent sizing if it should participate in this scaling; fixed `px` is acceptable (and consistent with existing chrome) for fixed-size UI controls.

## 6. Known gaps — read before touching these areas

**`login.css` is a single unformatted line (9,430 bytes, one line — hence `wc -l` reporting 0), collapsed from 365 pretty-printed lines in a past commit ("adding sign up").** It is functionally intact (full `.card`/`.card-nav`/`.card-hero`/`.card-form` styling plus a `@media (max-width:768px)` block), just unreadable as a diff. If you touch it, consider reformatting it back to multi-line first so future changes are reviewable — don't add more minified content on top of it.

**`login.html` uses a completely separate CSS entry (`login.css`) from `index.html` (`app.css`), with its own independently-declared token set that has already drifted** (`--text-color: #111` in `login.css` vs `#1e1e1e` in `base.css`; `login.css` invents `--bg-gradient`, unused by the main app). If you change a shared-looking token (colors, radii), check whether `login.css` needs the same edit — it will not pick it up automatically.

**`--input-bg-rgb` is referenced but never defined.** `input.css`'s `.prompt-card` does `background: rgba(var(--input-bg-rgb), 0.8)` — no such custom property exists anywhere (only the hex `--input-bg`). This silently resolves to an invalid `rgba()` and `.prompt-card` falls back to unstyled. If you're touching `.prompt-card`, add the missing `--input-bg-rgb` (light) / dark-mode equivalent to `base.css` rather than hardcoding an rgb triplet inline.

**`animations.css`'s entire `@keyframes` block (11 keyframes) is duplicated verbatim** — lines 1-129 and lines 130-257 define the same animations twice with identical bodies (only `shimmer-slide` at the end is unique). Harmless at runtime (the later duplicate silently wins), but if you're editing an existing keyframe, **edit both copies or you'll get inconsistent behavior depending on which duplicate a future cleanup removes** — better yet, delete one copy while you're in there.

**`.action-btn` in `responsive.css` is dead CSS** — no HTML element or other stylesheet references it; it's a leftover from before the input toolbar was refactored into `.attachment-btn`/`.mic-btn`/`.kebab-item`. Don't pattern-match against it when adding new mobile button styles.

**Two different reds for "destructive" actions.** `history.css`'s `.close-btn:hover` correctly uses `var(--error-color)`; `settings.css`'s `.secondary-btn` (remove-avatar) hardcodes `#dc2626` instead. Use `var(--error-color)` for any new destructive-action styling — don't introduce a third hardcoded red.

**Two same-named, differently-defined `.loading-spinner` rulesets** exist in `history.css` and `modal.css`, both imported into the same global cascade — currently harmless only because each is scoped to its own modal's DOM subtree in practice. If you add a `.loading-spinner` somewhere that isn't clearly inside one of those two subtrees, scope it explicitly (a parent class) rather than relying on the bare class name.

## 7. Anti-patterns

❌ **Don't hardcode a contrast color (`#000`/`#fff`) for "text on a themed accent."** It's already repeated across five files for dark-mode icon/text flips — a `--on-primary`-style token would remove the need to keep adding this per component.

❌ **Don't add a new external font/icon `@import` chained inside another CSS file.** It compounds the existing serial-fetch first-paint cost of `app.css → base.css → font.css`; use a direct `<link>` in the HTML instead.

❌ **Don't assume `login.css` inherits anything from `base.css`.** They are two independent token sets today — verify visually if you change a shared value.

❌ **Don't add a second copy-pasted `@keyframes` block "to be safe."** If you need to reuse an animation across files, reference the existing name from `animations.css` — don't redefine it, extending the existing duplication problem.
