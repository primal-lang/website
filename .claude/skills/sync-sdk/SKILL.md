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
- `../primal-sdk/docs/` — Documentation for each module (used to update reference pages)
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

For each module in `public/reference/*/index.html`:

- Compare with corresponding SDK docs in `../primal-sdk/docs/`
- Add any new functions introduced in this release
- Update function signatures or descriptions if changed
- Remove deprecated functions if any

Available reference modules:
- arithmetic, casting, comparison, console, control, directory, environment, error, file, hash, json, list, logic, map, operators, queue, set, stack, string, timestamp, vector

### 5. Verify JavaScript Bindings

Read `../primal-sdk/lib/main/main_web.dart` and check that all JavaScript annotations (e.g., `@JS('NAME')`) are aligned with the corresponding functions in `public/try/js/try.js`.

- If any annotations have changed or new ones were added, update `try.js` accordingly
- Ensure function names in Dart match the JavaScript function names expected by the compiler

## Verification

After syncing:
1. Open `public/try/index.html` locally and verify the playground loads
2. Test a simple Primal program to confirm the compiler works
3. Review the versions page for correct changelog formatting
