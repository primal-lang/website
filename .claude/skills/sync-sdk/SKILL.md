---
name: sync-sdk
description: Sync the website with the latest Primal SDK version (compiler, docs, changelog)
---

# Sync Primal SDK to Website

Update the Primal website with the latest SDK release from `../primal-sdk/`.

## Prerequisites

Ensure the `../primal-sdk/` directory exists and contains the SDK.

## Steps

### 1. Read SDK Sources

Read the following from the SDK repository to understand changes:

- `../primal-sdk/README.md` — Upstream prose for the narrative pages: its sections map to `public/overview/index.html` (Overview, Goal, Technical envelope, Philosophy → "Design principles") and `public/start/index.html` (Getting started, Syntax, Main function, Typing system, Runtime)
- `../primal-sdk/CHANGELOG.md` — Extract the latest version number and release notes
- `../primal-sdk/docs/lang/reference` — Documentation for each module (used to update reference pages)
- `../primal-sdk/lib/` — Source files to understand function signatures if needed

To scope the work, find which docs actually changed since the last sync:

```
cd ../primal-sdk && git log --oneline -8 -- docs/lang/reference/
```

### 2. Update the Compiled Compiler

Copy the compiled Primal compiler:

```
cp ../primal-sdk/output/primal.js public/playground/js/primal.js
```

### 3. Update Version References

The version string appears as `<version> (<codename>)` in exactly two places:

- `public/versions/index.html` — inside the "The latest release of Primal is version ..." paragraph
- `public/playground/index.html` — the playground navbar title (`v0.5.0 (Bronze Axe)`)

Search for the old version pattern (e.g. `0.4.0`) and replace with the new one. Note that `versions/index.html` does **not** contain a changelog list — it only links to the changelog on GitHub, so there are no release notes to add there.

### 4. Sync Narrative Pages

`README.md` is the upstream copy for the two prose pages. Nothing generates them, so they drift as silently as the highlighting map. Do this yourself rather than in a subagent — it needs judgement about which differences are deliberate.

| README section     | Website section                                     |
| ------------------ | --------------------------------------------------- |
| Overview           | `public/overview/index.html` — "What is Primal?"    |
| Goal               | `public/overview/index.html` — "Goal"               |
| Technical envelope | `public/overview/index.html` — "Technical envelope" |
| Philosophy         | `public/overview/index.html` — "Design principles"  |
| Getting started    | `public/start/index.html` — "Installation"          |
| Syntax             | `public/start/index.html` — "Syntax"                |
| Main function      | `public/start/index.html` — "Main function"         |
| Typing system      | `public/start/index.html` — "Typing system"         |
| Runtime            | `public/start/index.html` — "Runtime"               |

RULES:

- Sync **substance, not wording or markup**. The pages have their own conventions: sentence-case headings, the language name wrapped as `<span class="tagged">Primal</span>`, links as `<a class="custom-link">`, and code shown as static `<div class="code-sample" data-lang="...">` blocks in the body (same escaping rules as the reference pages) instead of fenced blocks. Never restructure a page to match the README's shape.
- The website is deliberately a **superset** in places — "Technical envelope" lists `Lazy evaluated` and `Immutable` which the README omits, and `start` has a website-only "Functions" section. Do not delete page content just because the README lacks it; report it instead.
- Closed lists **must** match: the runtime types under "Typing system" have to equal the README's set, since a release is where types get added. The `Primitives / Collections / Temporal / Filesystem` grouping is a website convention, so only the set of types matters — and confirm a type is real (SDK source or playground) before adding it, rather than trusting the README.
- Installation: the curl command must match what `public/install.sh` actually does — the site hosts the installer the README points at. If the README documents installer behaviour the page omits (today: `primal --update` / `primal --uninstall`), verify it against `public/install.sh` and add it.
- Where a README example and the page disagree (e.g. `pi() = 3.14159;` vs `pi = 3.14159`), do not just copy — run both in the playground and keep whichever compiles on the new release.
- Do not touch `<head>`, meta tags, JSON-LD, or the navbar. The three cards on `public/index.html` are website-authored, not README-derived — leave them alone.

### 5. Update Reference Documentation

**IMPORTANT:** To minimize context window usage, spawn **parallel subagents** for each reference module. Each subagent only reads and processes ONE folder pair.

**Spawn 6 parallel subagents** using the Task tool with `subagent_type: "general-purpose"`:

| Subagent | SDK Docs Path                                    | Website Path                    |
| -------- | ------------------------------------------------ | ------------------------------- |
| 1        | `../primal-sdk/docs/lang/reference/core/`        | `public/reference/core/`        |
| 2        | `../primal-sdk/docs/lang/reference/collections/` | `public/reference/collections/` |
| 3        | `../primal-sdk/docs/lang/reference/encoding/`    | `public/reference/encoding/`    |
| 4        | `../primal-sdk/docs/lang/reference/io/`          | `public/reference/io/`          |
| 5        | `../primal-sdk/docs/lang/reference/primitives/`  | `public/reference/primitives/`  |
| 6        | `../primal-sdk/docs/lang/reference/time/`        | `public/reference/time/`        |

**Prompt template for each subagent:**

````
Sync the reference documentation for the "{MODULE}" module.

1. Read all markdown files from: {SDK_PATH}
2. Read all HTML files from: {WEBSITE_PATH} (`<name>.md` maps to `<name>/index.html`)

FIELD MAPPING — each function occupies ONE block in the <main> body:

    <h2 class="text-white reference-title">Human Readable Name</h2>
    <table class="reference-table">
        <tbody>
            <tr>
                <th scope="row" class="border-bottom reference-table-title">Input</th>
                <td class="border-bottom">INPUT TEXT</td>
            </tr>
            <tr>
                <th scope="row" class="reference-table-title">Output</th>
                <td>OUTPUT TEXT</td>
            </tr>
        </tbody>
    </table>
    <p class="reference-block-label">Signature</p>
    <div id="fn.name" class="code-sample" data-lang="signature"><pre><code>SIGNATURE TEXT</code></pre></div>
    <p class="reference-block-label">Example</p>
    <div id="fn.name.example" class="code-sample" data-lang="primal"><pre><code>EXAMPLE CODE</code></pre></div>

The code lives directly in the markup — there is no script block and nothing is filled in at
runtime. js/primal-highlight.js tokenises whatever is already inside <code> on page load.

Map SDK markdown fields as follows:
- `**Signature:** ` + "`X`" -> the data-lang="signature" block, X being the content inside the backticks
- `**Input:** X`            -> the Input row <td>
- `**Output:** X`           -> the Output row <td>
- `**Example:**` fenced block -> the data-lang="primal" block, without the ``` markers

RULES:
- Copy text EXACTLY from the SDK docs. Do not paraphrase, reword, or "improve" anything.
- `data-lang` picks the tokenizer: `signature` for the type-annotated signature line, `primal`
  for runnable example code, `text` for anything that is not Primal at all (shell commands).
- Content inside <code> is literal: no indentation may be added, and the opening <code> and
  closing </code> must sit flush against the first and last characters of the sample.
- HEADINGS: the SDK uses Title Case (`### To Number`); the website deliberately uses sentence
  case ("To number"). This is a site-wide convention, NOT drift. Do NOT rewrite existing <h2>
  text to match the SDK. Use the SDK heading only to identify WHICH function a section is, and
  to derive a title for a genuinely NEW function — converted to sentence case.
- Trailing periods: the website ends Input/Output text with a period, the SDK is inconsistent.
  Copy the SDK wording but ensure it ends with exactly one period.
- Samples are plain HTML text now, so quotes and backslashes are written literally — a literal
  `\n` inside an example is just `\n`. Only `&`, `<` and `>` need escaping.
- HTML-escape the Input/Output text where needed (& -> &amp;, < -> &lt;, > -> &gt;).
- Ignore `**Purity:**`, `**Constraints:**` and similar fields — the page template has no slot
  for them. Where a page already folds `**Evaluation:**` or `**Alias:**` into the Output cell or
  the sample (the operators page does), leave that content in place.
- Where the SDK says `**Input:** None.`, the website omits the Input row entirely.

SYNC LOGIC:
- Function in SDK but NOT on the website -> add its body block, matching the exact HTML shape and
  indentation of its neighbours.
- Function on the website but NOT in the SDK -> remove its body block.
- Function in both -> update Input, Output, signature, and example.
- Keep function ORDER on the page matching the SDK document order.
- Do NOT touch <head>, meta tags, JSON-LD, navbar, or the back-arrow link.

Report concisely per file what you added / removed / changed, or "no changes needed".
````

**Run all 6 subagents in parallel** (single message with multiple Task tool calls).

**If the SDK added a whole new module** (a `.md` file with no matching website directory), handle it yourself rather than in a subagent, and exclude it from that subagent's scope to avoid a race:

1. Create `public/reference/<group>/<module>/index.html` by copying an existing sibling page and replacing the title, meta description, canonical/og/twitter URLs, JSON-LD breadcrumb, and content.
2. Add a `reference-grid-item` tile to the right category in `public/reference/index.html`, positioned to match the module order in `../primal-sdk/docs/lang/index.md`.
3. Add a `<url>` entry to `public/sitemap.xml`.

### 6. Sync Syntax Highlighting

The native function list used by the highlighter is generated from the SDK, so it cannot drift the way the old hand-maintained map did. Regenerate it:

```
scripts/gen-natives.sh
```

That rewrites `public/js/primal-natives.js` from `../primal-sdk/lib/compiler/library/**/*.dart`, where each native declares itself as `name: 'some_function',`. The script fails loudly if the count drops below 250, which is the signal that the SDK changed how natives are declared and the extraction pattern needs updating — do not "fix" that by lowering the threshold.

Commit the regenerated file; a diff here is the reliable record of which natives the release added or renamed.

Language keywords (`if`, `else`, `let`, `in`, `and`, `or`, `not`) are **not** in that list. They live in `PRIMAL_KEYWORDS` in `public/js/primal-highlight.js` and only change if the language grammar does — check `../primal-sdk/lib/compiler/lexical/lexical_analyzer.dart` if the release touched the lexer.

### 7. Verify JavaScript Bindings

Read `../primal-sdk/lib/main/main_web.dart` and check that all JavaScript annotations (e.g., `@JS('NAME')`) are aligned with the corresponding functions in `public/playground/js/playground.js`.

- If any annotations have changed or new ones were added, update `playground.js` accordingly
- Ensure function names in Dart match the JavaScript function names expected by the compiler
- Check that every binding is actually _called_. `compileInput` / `intermediateRepresentationEmpty` allocate an entry in a compiler-side registry, and `disposeCode` / `disposeExpression` must be called in a `finally` to release it — otherwise the playground leaks on every keystroke. Registry ids start at `0`, so guard with `!== null`, never with truthiness. `playground.js` also keeps the last successful compile alive on purpose, for the console to evaluate against; that one is released when the next compile replaces it, not in a `finally`.
- Confirm compiler errors still carry their position as `at [row, column]`. `GenericError` has no location field, so `playground.js` reads the position out of the message text with the `ERROR_LOCATION` pattern to underline the offending token. Check `../primal-sdk/lib/compiler/models/location.dart` still formats as `[$row, $column]`, and that `lexical_error.dart` / `syntactic_error.dart` still interpolate a `Location` or a `Token` into their messages. A rewording here does not break anything loudly — the markers just stop appearing.

### 8. Sync Sample Programs

Compare sample files between the SDK and the website:

- SDK samples: `../primal-sdk/test/resources/samples/*.prm`
- Website samples: `public/playground/samples/*.prm`

For each sample file in the website that has a matching filename in the SDK:

- Copy the SDK version to replace the website version

This ensures the playground samples stay in sync with the SDK's tested examples.

**Also check the inline default program**: `SAMPLES['default']` at the top of `public/playground/js/playground.js` is the program every first-time visitor sees, and it is NOT covered by the `.prm` sync above, so it rots silently whenever the language syntax changes. Compile it and confirm it still runs.

## Verification

Serve the site and exercise it for real — do not rely on the subagents' self-reports:

```
cd public && python3 -m http.server 8777
```

1. Open `http://localhost:8777/playground/` and confirm the navbar shows the new version.
2. Clear `localStorage` and hard-reload to check the first-visit default program compiles.
3. Run a program using the release's new functions, and evaluate one in the REPL console (that exercises the second dispose call site).
4. Edit the source many times in a row and confirm results stay correct with disposal active.
5. Open a reference page for a newly added module and confirm the signature and example blocks render with syntax highlighting. A new function showing as plain identifier-coloured text means step 6 was missed. **Hard-reload (Ctrl+Shift+R)** — Chrome caches `highlight.css` and the palette it imports aggressively on localhost, and a stale stylesheet looks exactly like broken highlighting.
6. Open `/overview/` and `/start/` and check them against the README, then paste each `start` code sample into the playground to confirm it still compiles.
7. Type a program with a bad token (`main() = 1 $ 2`) and confirm the offending token is underlined and its gutter line marked. No marker means the message wording changed and step 7's location check was missed.
8. Check the browser console for errors.

A good scripted cross-check: parse every `**Signature:**` / `**Input:** `/ `**Output:** `/ `**Example:**` from the SDK markdown, parse the `<div class="code-sample">` blocks and Input/Output cells from each page, and diff them keyed by function name (not by position — some pages carry extra literal-syntax sections such as `list_new` that have no SDK signature).
