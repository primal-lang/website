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

- `../primal-sdk/CHANGELOG.md` — Extract the latest version number and release notes
- `../primal-sdk/docs/lang/reference` — Documentation for each module (used to update reference pages)
- `../primal-sdk/lib/` — Source files to understand function signatures if needed

### 2. Update the Compiled Compiler

Copy the compiled Primal compiler:

```
cp ../primal-sdk/output/primal.js public/try/js/primal.js
```

### 3. Update Version References

Update the version number in these files:

- `public/versions/index.html` — Update the version string (e.g., "0.4.1") and add new changelog entries
- `public/try/index.html` — Update version if displayed in the playground UI

Search for the old version pattern (e.g., `0.4.1`) and replace with the new version.

### 4. Update Reference Documentation

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
2. Read all HTML files from: {WEBSITE_PATH}

For each function, sync these fields (copy text EXACTLY from SDK docs):

| SDK Markdown Field        | Website HTML Location                       |
| ------------------------- | ------------------------------------------- |
| `**Signature:** \`...\``  | Code block with `id="functionName"`         |
| `**Input:** ...`          | Table cell after "Input" label              |
| `**Output:** ...`         | Table cell after "Output" label             |
| `**Example:**` code block | Code block with `id="functionName.example"` |

Rules:
- Copy the EXACT text from these fields - do not paraphrase or modify
- For Signature: extract only the content inside the backticks
- For Input/Output: copy the description text after the colon
- For Example: copy the code inside the code block (without ``` markers)

Sync logic:
- Function in SDK but NOT in website → Add it following existing HTML format
- Function in website but NOT in SDK → Remove it from website HTML
- Function in both → Update Signature, Input, Output, Example with SDK text

Edit the website HTML files directly to apply changes.
````

**Run all 6 subagents in parallel** (single message with multiple Task tool calls).

### 5. Verify JavaScript Bindings

Read `../primal-sdk/lib/main/main_web.dart` and check that all JavaScript annotations (e.g., `@JS('NAME')`) are aligned with the corresponding functions in `public/try/js/try.js`.

- If any annotations have changed or new ones were added, update `try.js` accordingly
- Ensure function names in Dart match the JavaScript function names expected by the compiler

### 6. Sync Sample Programs

Compare sample files between the SDK and the website:

- SDK samples: `../primal-sdk/test/resource/samples/*.prm`
- Website samples: `public/try/samples/*.prm`

For each sample file in the website that has a matching filename in the SDK:

- Copy the SDK version to replace the website version

This ensures the playground samples stay in sync with the SDK's tested examples.

## Verification

After syncing:

1. Open `public/try/index.html` locally and verify the playground loads
2. Test a simple Primal program to confirm the compiler works
3. Review the versions page for correct changelog formatting
