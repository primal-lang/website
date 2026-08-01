# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static documentation website and interactive playground for the **Primal Programming Language** (a declarative, functional, lazy-evaluated, dynamically-typed language). Hosted at https://primal-lang.org via Firebase Hosting.

## Architecture

- **`public/`** — Root served directory (Firebase hosting)
  - **`index.html`** — Landing page
  - **`css/template.css`** — Main stylesheet shared across all pages
  - **`css/highlight.css`** — Code-block styling and token colours. Line 10 selects the active palette.
  - **`css/palettes/`** — One file per palette, each defining the same 25 CSS custom properties
  - **`js/primal-highlight.js`** — Primal tokenizer and static-sample renderer
  - **`js/primal-natives.js`** — Generated native function list (do not edit; see `scripts/gen-natives.sh`)
  - **`js/primal-editor.js`** — Playground editor: a textarea layered over a highlighted `<pre>`
  - **`reference/`** — API documentation, one subdirectory per module (arithmetic, list, string, etc.), each with its own `index.html`
  - **`try/`** — Interactive IDE/playground
    - **`js/primal.js`** — Dart-compiled Primal compiler (~12.6k lines, do not manually edit)
    - **`js/try.js`** — IDE logic (editor, console, sample loading, localStorage persistence)
    - **`samples/`** — `.prm` sample programs loaded by the IDE
  - **`overview/`**, **`start/`**, **`versions/`**, **`feedback/`** — Other site sections
- **`scripts/gen-natives.sh`** — Regenerates `primal-natives.js` from `../primal-sdk/`; run by the `sync-sdk` skill

## Key Conventions

- No package manager or build tools — all dependencies loaded via CDN (Bootstrap 5, Google Fonts, Material Symbols, Split.js)
- Every page shares the same navbar and follows the same Bootstrap-based HTML template structure
- Custom fonts: Nunito (body), Source Code Pro (code), Dalek (branding)
- Syntax highlighting is hand-rolled, with no library. `primal-highlight.js` mirrors the SDK lexer in `../primal-sdk/lib/compiler/lexical/lexical_analyzer.dart` — change one and check the other.
- Code samples are **static markup**, highlighted in place on load: `<div class="code-sample" data-lang="..."><pre><code>…</code></pre></div>`. `data-lang` is `primal` (real source), `signature` (type-annotated documentation pseudo-syntax) or `text` (not Primal, e.g. shell). Content inside `<code>` is literal — never indent it.
- To switch the colour palette site-wide, change the single `@import` on line 10 of `css/highlight.css`. Every palette in `css/palettes/` defines the same variables, so they are interchangeable. Hard-reload after switching: browsers cache that stylesheet aggressively and a stale one looks exactly like broken highlighting.
- The playground editor is a `<textarea>` with transparent text over a highlighted `<pre>`, so the caret, selection and undo stack stay native. The two layers must share every metric that positions a glyph — including `letter-spacing`, which form controls do not inherit.
- Feedback form submits to a Google Apps Script endpoint
