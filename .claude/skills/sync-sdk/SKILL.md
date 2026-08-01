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
cp ../primal-sdk/output/primal.js public/try/js/primal.js
```

### 3. Update Version References

The version string appears as `<version> (<codename>)` in exactly two places:

- `public/versions/index.html` — inside the "The latest release of Primal is version ..." paragraph
- `public/try/index.html` — the playground navbar title (`v0.5.0 (Bronze Axe)`)

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

- Sync **substance, not wording or markup**. The pages have their own conventions: sentence-case headings, the language name wrapped as `<span class="tagged">Primal</span>`, links as `<a class="custom-link">`, and code shown through `setSampleCode('sampleX', '...')` at the bottom of the file (same escaping rules as the reference pages) instead of fenced blocks. Never restructure a page to match the README's shape.
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

FIELD MAPPING — each function appears in TWO places on the website page:

(A) In the <main> body:
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
    <div id="fn.name" class="code-sample"></div>
    <p class="reference-block-label">Example</p>
    <div id="fn.name.example" class="code-sample"></div>

(B) At the bottom of the file, inside <script type="module">:
    setSampleCode('fn.name', 'SIGNATURE TEXT')
    setSampleCode('fn.name.example', 'EXAMPLE CODE')

The divs in (A) are EMPTY placeholders — CodeMirror fills them at runtime. The actual signature
and example text lives ONLY in the setSampleCode() calls in (B). Keep both places consistent.

Map SDK markdown fields as follows:
- `**Signature:** ` + "`X`" -> setSampleCode('fn.name', 'X'), X being the content inside the backticks
- `**Input:** X`            -> the Input row <td>
- `**Output:** X`           -> the Output row <td>
- `**Example:**` fenced block -> setSampleCode('fn.name.example', 'CODE'), without the ``` markers

RULES:
- Copy text EXACTLY from the SDK docs. Do not paraphrase, reword, or "improve" anything.
- HEADINGS: the SDK uses Title Case (`### To Number`); the website deliberately uses sentence
  case ("To number"). This is a site-wide convention, NOT drift. Do NOT rewrite existing <h2>
  text to match the SDK. Use the SDK heading only to identify WHICH function a section is, and
  to derive a title for a genuinely NEW function — converted to sentence case.
- Trailing periods: the website ends Input/Output text with a period, the SDK is inconsistent.
  Copy the SDK wording but ensure it ends with exactly one period.
- setSampleCode uses single-quoted JS strings — escape single quotes as \' and escape backslashes
  (a literal `\n` inside an example must be written `\\n`).
- HTML-escape the Input/Output text where needed (& -> &amp;, < -> &lt;, > -> &gt;).
- Ignore `**Purity:**`, `**Constraints:**` and similar fields — the page template has no slot
  for them. Where a page already folds `**Evaluation:**` or `**Alias:**` into the Output cell or
  the sample (the operators page does), leave that content in place.
- Where the SDK says `**Input:** None.`, the website omits the Input row entirely.

SYNC LOGIC:
- Function in SDK but NOT on the website -> add both the (A) body block and the (B) setSampleCode
  lines, matching the exact HTML shape and indentation of its neighbours.
- Function on the website but NOT in the SDK -> remove both its (A) block and its (B) lines.
- Function in both -> update Input, Output, signature, and example.
- Keep function ORDER on the page matching the SDK document order.
- Do NOT touch <head>, meta tags, JSON-LD, navbar, the back-arrow link, or the <noscript> note.

Report concisely per file what you added / removed / changed, or "no changes needed".
````

**Run all 6 subagents in parallel** (single message with multiple Task tool calls).

**If the SDK added a whole new module** (a `.md` file with no matching website directory), handle it yourself rather than in a subagent, and exclude it from that subagent's scope to avoid a race:

1. Create `public/reference/<group>/<module>/index.html` by copying an existing sibling page and replacing the title, meta description, canonical/og/twitter URLs, JSON-LD breadcrumb, and content.
2. Add a `reference-grid-item` tile to the right category in `public/reference/index.html`, positioned to match the module order in `../primal-sdk/docs/lang/index.md`.
3. Add a `<url>` entry to `public/sitemap.xml`.

### 6. Sync Syntax Highlighting

`public/js/highlight.js` contains a hardcoded regex map (`extras`) of every native function, used for syntax highlighting in both the playground and every reference code sample. It is **not** generated, so it silently drifts — verify it on every sync:

```
cd ../primal-sdk/docs/lang/reference && grep -rhoP '(?<=\*\*Signature:\*\* `)[a-zA-Z][a-zA-Z0-9._]*(?=\()' . | sort -u
```

Compare that against the map's keys and add anything missing, grouped under the existing `// module` comments and matching the neighbouring entries' style. Also check for **renamed** functions — a stale key (e.g. `time_epoch` after it became `time_toEpoch`) highlights nothing.

Entry order does not matter: every pattern ends in a `(?=\()` lookahead, so a shorter name cannot shadow a longer one (`bool_and` will not swallow `bool_andStrict`).

The only non-function keys are the language keywords `and`, `else`, `if`, `main`, `or`.

### 7. Verify JavaScript Bindings

Read `../primal-sdk/lib/main/main_web.dart` and check that all JavaScript annotations (e.g., `@JS('NAME')`) are aligned with the corresponding functions in `public/try/js/try.js`.

- If any annotations have changed or new ones were added, update `try.js` accordingly
- Ensure function names in Dart match the JavaScript function names expected by the compiler
- Check that every binding is actually _called_. `compileInput` / `intermediateRepresentationEmpty` allocate an entry in a compiler-side registry, and `disposeCode` / `disposeExpression` must be called in a `finally` to release it — otherwise the playground leaks on every keystroke. Registry ids start at `0`, so guard with `!== null`, never with truthiness.

### 8. Sync Sample Programs

Compare sample files between the SDK and the website:

- SDK samples: `../primal-sdk/test/resources/samples/*.prm`
- Website samples: `public/try/samples/*.prm`

For each sample file in the website that has a matching filename in the SDK:

- Copy the SDK version to replace the website version

This ensures the playground samples stay in sync with the SDK's tested examples.

**Also check the inline default program**: `SAMPLES['default']` at the top of `public/try/js/try.js` is the program every first-time visitor sees, and it is NOT covered by the `.prm` sync above, so it rots silently whenever the language syntax changes. Compile it and confirm it still runs.

## Verification

Serve the site and exercise it for real — do not rely on the subagents' self-reports:

```
cd public && python3 -m http.server 8777
```

1. Open `http://localhost:8777/try/` and confirm the navbar shows the new version.
2. Clear `localStorage` and hard-reload to check the first-visit default program compiles.
3. Run a program using the release's new functions, and evaluate one in the REPL console (that exercises the second dispose call site).
4. Edit the source many times in a row and confirm results stay correct with disposal active.
5. Open a reference page for a newly added module and confirm the signature and example blocks render with syntax highlighting (unhighlighted text means step 6 was missed).
6. Open `/overview/` and `/start/` and check them against the README, then paste each `start` code sample into the playground to confirm it still compiles.
7. Check the browser console for errors.

A good scripted cross-check: parse every `**Signature:**` / `**Input:** `/ `**Output:** `/ `**Example:**` from the SDK markdown, parse the `setSampleCode()` calls and Input/Output cells from each page, and diff them keyed by function name (not by position — some pages carry extra literal-syntax sections such as `list_new` that have no SDK signature).
