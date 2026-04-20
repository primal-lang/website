# Primal SDK Sync Plan

This plan syncs the website with the latest Primal SDK release from `../primal-sdk/`.

---

## Prerequisites

- [ ] Verify `../primal-sdk/` directory exists
- [ ] Verify SDK has been built (check `../primal-sdk/output/primal.js` exists)

---

## Step 1: Read SDK Sources

- [ ] Read `../primal-sdk/CHANGELOG.md` and extract:
  - Latest version number (e.g., `0.5.0`)
  - Release notes for the new version
- [ ] Scan all markdown files in `../primal-sdk/docs/lang/reference/` to understand changes

---

## Step 2: Update the Compiled Compiler

- [ ] Copy compiled Primal compiler:
  ```
  cp ../primal-sdk/output/primal.js public/try/js/primal.js
  ```

---

## Step 3: Update Version References

- [ ] Update `public/versions/index.html`:
  - Update version string (e.g., "0.4.1" → "0.5.0")
  - Add new changelog entries
- [ ] Update `public/try/index.html`:
  - Update version if displayed in the playground UI

---

## Step 4: Update Reference Documentation

For each module, sync the website HTML with the corresponding SDK markdown file.

### Field Mapping Reference

| SDK Markdown Field        | Website HTML Location                       |
| ------------------------- | ------------------------------------------- |
| `**Signature:** \`...\``  | Code block with `id="functionName"`         |
| `**Input:** ...`          | Table cell after "Input" label              |
| `**Output:** ...`         | Table cell after "Output" label             |
| `**Example:**` code block | Code block with `id="functionName.example"` |

### Sync Rules

1. **Function in SDK but NOT in website** → Add the function to the website HTML
2. **Function in website but NOT in SDK** → Remove the function from the website HTML
3. **Function in both** → Update Signature, Input, Output, and Example fields with exact text from SDK

---

### 4.1 Core Module (5 files)

| Status | Website HTML                                  | SDK Markdown                                           |
| ------ | --------------------------------------------- | ------------------------------------------------------ |
| - [ ]  | `public/reference/core/casting/index.html`    | `../primal-sdk/docs/lang/reference/core/casting.md`    |
| - [ ]  | `public/reference/core/comparison/index.html` | `../primal-sdk/docs/lang/reference/core/comparison.md` |
| - [ ]  | `public/reference/core/control/index.html`    | `../primal-sdk/docs/lang/reference/core/control.md`    |
| - [ ]  | `public/reference/core/error/index.html`      | `../primal-sdk/docs/lang/reference/core/error.md`      |
| - [ ]  | `public/reference/core/operators/index.html`  | `../primal-sdk/docs/lang/reference/core/operators.md`  |

**Tasks for each file:**

1. Read SDK markdown, extract all function definitions
2. Read website HTML, identify existing functions
3. Compare function lists (add new, remove obsolete, update existing)
4. For each function, copy exact text for: Signature, Input, Output, Example

---

### 4.2 Collections Module (6 files)

| Status | Website HTML                                     | SDK Markdown                                              |
| ------ | ------------------------------------------------ | --------------------------------------------------------- |
| - [ ]  | `public/reference/collections/list/index.html`   | `../primal-sdk/docs/lang/reference/collections/list.md`   |
| - [ ]  | `public/reference/collections/map/index.html`    | `../primal-sdk/docs/lang/reference/collections/map.md`    |
| - [ ]  | `public/reference/collections/queue/index.html`  | `../primal-sdk/docs/lang/reference/collections/queue.md`  |
| - [ ]  | `public/reference/collections/set/index.html`    | `../primal-sdk/docs/lang/reference/collections/set.md`    |
| - [ ]  | `public/reference/collections/stack/index.html`  | `../primal-sdk/docs/lang/reference/collections/stack.md`  |
| - [ ]  | `public/reference/collections/vector/index.html` | `../primal-sdk/docs/lang/reference/collections/vector.md` |

**Tasks for each file:**

1. Read SDK markdown, extract all function definitions
2. Read website HTML, identify existing functions
3. Compare function lists (add new, remove obsolete, update existing)
4. For each function, copy exact text for: Signature, Input, Output, Example

---

### 4.3 Encoding Module (4 files)

| Status | Website HTML                                  | SDK Markdown                                           |
| ------ | --------------------------------------------- | ------------------------------------------------------ |
| - [ ]  | `public/reference/encoding/base64/index.html` | `../primal-sdk/docs/lang/reference/encoding/base64.md` |
| - [ ]  | `public/reference/encoding/hash/index.html`   | `../primal-sdk/docs/lang/reference/encoding/hash.md`   |
| - [ ]  | `public/reference/encoding/json/index.html`   | `../primal-sdk/docs/lang/reference/encoding/json.md`   |
| - [ ]  | `public/reference/encoding/uuid/index.html`   | `../primal-sdk/docs/lang/reference/encoding/uuid.md`   |

**Tasks for each file:**

1. Read SDK markdown, extract all function definitions
2. Read website HTML, identify existing functions
3. Compare function lists (add new, remove obsolete, update existing)
4. For each function, copy exact text for: Signature, Input, Output, Example

---

### 4.4 IO Module (6 files)

| Status | Website HTML                                 | SDK Markdown                                          |
| ------ | -------------------------------------------- | ----------------------------------------------------- |
| - [ ]  | `public/reference/io/console/index.html`     | `../primal-sdk/docs/lang/reference/io/console.md`     |
| - [ ]  | `public/reference/io/debug/index.html`       | `../primal-sdk/docs/lang/reference/io/debug.md`       |
| - [ ]  | `public/reference/io/directory/index.html`   | `../primal-sdk/docs/lang/reference/io/directory.md`   |
| - [ ]  | `public/reference/io/environment/index.html` | `../primal-sdk/docs/lang/reference/io/environment.md` |
| - [ ]  | `public/reference/io/file/index.html`        | `../primal-sdk/docs/lang/reference/io/file.md`        |
| - [ ]  | `public/reference/io/path/index.html`        | `../primal-sdk/docs/lang/reference/io/path.md`        |

**Tasks for each file:**

1. Read SDK markdown, extract all function definitions
2. Read website HTML, identify existing functions
3. Compare function lists (add new, remove obsolete, update existing)
4. For each function, copy exact text for: Signature, Input, Output, Example

---

### 4.5 Primitives Module (3 files)

| Status | Website HTML                                        | SDK Markdown                                                 |
| ------ | --------------------------------------------------- | ------------------------------------------------------------ |
| - [ ]  | `public/reference/primitives/arithmetic/index.html` | `../primal-sdk/docs/lang/reference/primitives/arithmetic.md` |
| - [ ]  | `public/reference/primitives/logic/index.html`      | `../primal-sdk/docs/lang/reference/primitives/logic.md`      |
| - [ ]  | `public/reference/primitives/string/index.html`     | `../primal-sdk/docs/lang/reference/primitives/string.md`     |

**Tasks for each file:**

1. Read SDK markdown, extract all function definitions
2. Read website HTML, identify existing functions
3. Compare function lists (add new, remove obsolete, update existing)
4. For each function, copy exact text for: Signature, Input, Output, Example

---

### 4.6 Time Module (2 files)

| Status | Website HTML                                 | SDK Markdown                                          |
| ------ | -------------------------------------------- | ----------------------------------------------------- |
| - [ ]  | `public/reference/time/duration/index.html`  | `../primal-sdk/docs/lang/reference/time/duration.md`  |
| - [ ]  | `public/reference/time/timestamp/index.html` | `../primal-sdk/docs/lang/reference/time/timestamp.md` |

**Tasks for each file:**

1. Read SDK markdown, extract all function definitions
2. Read website HTML, identify existing functions
3. Compare function lists (add new, remove obsolete, update existing)
4. For each function, copy exact text for: Signature, Input, Output, Example

---

### 4.7 Reference Index Page

| Status | Website HTML                  | Notes                                    |
| ------ | ----------------------------- | ---------------------------------------- |
| - [ ]  | `public/reference/index.html` | Update if any modules were added/removed |

---

## Step 5: Verify JavaScript Bindings

- [ ] Read `../primal-sdk/lib/main/main_web.dart`
- [ ] Check all `@JS('NAME')` annotations
- [ ] Compare with functions in `public/try/js/try.js`
- [ ] Update `try.js` if any annotations changed or were added

---

## Step 6: Sync Sample Programs

- [ ] Compare SDK samples (`../primal-sdk/test/resource/samples/*.prm`) with website samples (`public/try/samples/*.prm`)
- [ ] For each matching filename, copy SDK version to replace website version

---

## Step 7: Verification

- [ ] Open `public/try/index.html` locally in browser
- [ ] Verify playground loads without errors
- [ ] Test a simple Primal program (e.g., `print("Hello")`)
- [ ] Review versions page for correct changelog formatting
- [ ] Spot-check a few reference pages for correct formatting

---

## Summary Checklist

**Total Reference HTML Files to Update: 26**

### By Category:

- Core: 5 files
- Collections: 6 files
- Encoding: 4 files
- IO: 6 files
- Primitives: 3 files
- Time: 2 files

### Quick Reference - All HTML Files:

- [ ] `public/reference/core/casting/index.html`
- [ ] `public/reference/core/comparison/index.html`
- [ ] `public/reference/core/control/index.html`
- [ ] `public/reference/core/error/index.html`
- [ ] `public/reference/core/operators/index.html`
- [ ] `public/reference/collections/list/index.html`
- [ ] `public/reference/collections/map/index.html`
- [ ] `public/reference/collections/queue/index.html`
- [ ] `public/reference/collections/set/index.html`
- [ ] `public/reference/collections/stack/index.html`
- [ ] `public/reference/collections/vector/index.html`
- [ ] `public/reference/encoding/base64/index.html`
- [ ] `public/reference/encoding/hash/index.html`
- [ ] `public/reference/encoding/json/index.html`
- [ ] `public/reference/encoding/uuid/index.html`
- [ ] `public/reference/io/console/index.html`
- [ ] `public/reference/io/debug/index.html`
- [ ] `public/reference/io/directory/index.html`
- [ ] `public/reference/io/environment/index.html`
- [ ] `public/reference/io/file/index.html`
- [ ] `public/reference/io/path/index.html`
- [ ] `public/reference/primitives/arithmetic/index.html`
- [ ] `public/reference/primitives/logic/index.html`
- [ ] `public/reference/primitives/string/index.html`
- [ ] `public/reference/time/duration/index.html`
- [ ] `public/reference/time/timestamp/index.html`
