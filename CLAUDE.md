# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static documentation website and interactive playground for the **Primal Programming Language** (a declarative, functional, lazy-evaluated, dynamically-typed language). Hosted at https://primal-lang.org via Firebase Hosting.

## Deployment

```bash
./scripts/deploy.sh   # runs: firebase deploy --only hosting
```

No build step — this is a pure static site. All files under `public/` are served directly.

## Architecture

- **`public/`** — Root served directory (Firebase hosting)
  - **`index.html`** — Landing page
  - **`css/template.css`** — Main stylesheet shared across all pages
  - **`js/highlight.js`** — CodeMirror syntax highlighting integration
  - **`reference/`** — API documentation, one subdirectory per module (arithmetic, list, string, etc.), each with its own `index.html`
  - **`try/`** — Interactive IDE/playground
    - **`js/primal.js`** — Dart-compiled Primal compiler (~19k lines, do not manually edit)
    - **`js/try.js`** — IDE logic (editor, console, sample loading, localStorage persistence)
    - **`samples/`** — `.prm` sample programs loaded by the IDE
  - **`overview/`**, **`start/`**, **`versions/`**, **`feedback/`** — Other site sections

## Key Conventions

- No package manager or build tools — all dependencies loaded via CDN (Bootstrap 5, CodeMirror 5, Google Fonts, Split.js, jQuery)
- Every page shares the same navbar and follows the same Bootstrap-based HTML template structure
- Custom fonts: Nunito (body), Source Code Pro (code), Dalek (branding)
- The interactive playground uses CodeMirror for editing and compiles/runs Primal code client-side via the Dart-compiled `primal.js`
- Feedback form submits to a Google Apps Script endpoint
