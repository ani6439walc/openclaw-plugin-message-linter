# AGENTS.md

## Project Overview

This repository contains `message-linter`, an OpenClaw plugin that normalizes outgoing message text before dispatch.

The plugin is a TypeScript ESM package for OpenClaw `2026.6.11`. It focuses on:

- Discord-oriented Markdown cleanup.
- Kaomoji-safe backtick/accent handling.
- Optional Simplified Chinese to Taiwan Traditional Chinese conversion using bundled dictionary assets.

OpenClaw loads the plugin from `./dist/index.js` as declared in `package.json`.

## Tech Stack

- Runtime/package format: TypeScript + ESM.
- Package manager: `pnpm`.
- Test runner: Vitest.
- Build: clean `dist`, then run `tsc`.
- Formatting: Prettier.
- Runtime dependency: `zod`.
- Peer dependency: `openclaw@2026.6.11`.

Do not switch package managers. Use `pnpm` for install, test, build, and formatting tasks.

## Essential Commands

Run these from the repository root:

```bash
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
pnpm run format
```

For documentation-only edits, at minimum run:

```bash
pnpm exec prettier --check AGENTS.md README.md
```

Before handing off code changes, run the full verification set:

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

## Repository Map

- `index.ts` — OpenClaw plugin entry definition and public exports.
- `api.ts` — OpenClaw plugin SDK re-exports and subsystem logger setup.
- `src/plugin.ts` — registers OpenClaw hooks.
- `src/hooks.ts` — hook handlers for `before_tool_call` and `message_sending`.
- `src/config.ts` — feature flag types, defaults, and tolerant Zod config parsing.
- `src/linter.ts` — main lint pipeline shared by hook paths.
- `src/transforms/discord.ts` — Discord Markdown formatting transforms.
- `src/transforms/kaomoji.ts` — kaomoji token sanitization.
- `src/utils/mask.ts` — Markdown code masking/restoration logic.
- `src/utils/kaomoji.ts` — kaomoji token detection helpers.
- `src/transforms/zhtw.ts` — barrel export for ZH-TW conversion.
- `src/transforms/zhtw/index.ts` — lazy ZH-TW manager and asset loading.
- `src/transforms/zhtw/s2t.ts` — trie-based S2T converter.
- `src/transforms/zhtw/case.ts` — opt-in proper-noun case rule scanner/fixer.
- `src/transforms/zhtw/punctuation.ts` — opt-in MoE-style punctuation normalization.
- `src/transforms/zhtw/spacing.ts` — opt-in CJK/ASCII spacing and repeated punctuation normalization.
- `src/transforms/zhtw/quotes.ts` — opt-in Taiwan quote normalization.
- `src/transforms/zhtw/protect.ts` — raw URL/email masking for ZH-TW rule passes.
- `src/transforms/zhtw/scanner.ts` — contextual spelling rule scanner/fixer.
- `assets/` — bundled dictionary/rule data loaded at runtime.
- `scripts/generate-zhtw-data.mjs` — Node-run dictionary generator.
- `openclaw.plugin.json` — plugin metadata and config schema.
- `manifest.test.ts` and `src/**/*.test.ts` — Vitest coverage.

## Runtime Flow

`index.ts` defines the OpenClaw plugin:

1. `definePluginEntry()` creates plugin metadata.
2. `registerMessageLinterPlugin()` is called by OpenClaw.
3. `registerMessageLinterPlugin()` resolves config and creates hook handlers.
4. The plugin registers:
   - `before_tool_call`
   - `message_sending`

`before_tool_call` only mutates message tool calls when:

- `event.toolName === "message"`
- `event.params` is a non-array object
- `params.action === "send"`
- `params.message` is a string

`message_sending` only handles events whose `content` is a string.

## Linter Pipeline

`lintMessageContent()` applies transforms in this order:

1. Resolve features with `resolveFeatures()`.
2. If `zhtw.enabled` is enabled and content contains CJK, run the converter with resolved ZH-TW feature flags.
3. Fix misplaced inline bold code formatting.
4. Mask Markdown fenced code blocks and inline code spans.
5. Format Markdown links.
6. Replace separators.
7. Sanitize kaomoji tokens.
8. Normalize Markdown headings.
9. Format blockquotes.
10. Restore masked Markdown code regions.

Preserve this ordering unless tests and source reasoning prove a different order is safe. The Markdown masking step is intentionally central and prevents transforms from rewriting code spans/fences.

## Feature Defaults

Source of truth: `src/config.ts`.

Current defaults:

```json
{
  "zhtw": {
    "enabled": false,
    "case": false,
    "punctuation": false,
    "spacing": false,
    "quotes": false
  },
  "kaomoji": true,
  "discord": {
    "headings": true,
    "separators": true,
    "links": true,
    "blockquotes": true,
    "boldInlineCode": true
  }
}
```

Keep `openclaw.plugin.json`, README configuration examples, and `DEFAULT_FEATURES` in sync. Boolean `zhtw` config remains supported for backward compatibility; `true` only enables the existing S2T + contextual spelling auto-fix pipeline, while `case`, `punctuation`, `spacing`, and `quotes` stay disabled unless explicitly enabled.

## Coding Conventions

- Keep code simple and local. This package is intentionally small.
- Prefer pure transformation functions for message formatting behavior.
- Keep OpenClaw integration thin; hook handlers should delegate to `src/linter.ts`.
- Use named exports for utilities and transforms.
- Do not add dependencies unless the existing stack cannot solve the problem.
- Keep comments focused on non-obvious behavior, especially parser/masking edge cases.
- Preserve TypeScript strictness and declaration output compatibility.
- Code comments and code identifiers should be in English.

## Testing Conventions

- Add or update tests next to the source behavior being changed.
- For core pipeline changes, update `src/linter.test.ts`.
- For Discord formatting behavior, update `src/transforms/discord.test.ts`.
- For kaomoji behavior, update `src/transforms/kaomoji.test.ts` and/or `src/utils/mask.test.ts`.
- For ZH-TW conversion, update `src/transforms/zhtw.test.ts`, `src/transforms/zhtw/case.test.ts`, `src/transforms/zhtw/punctuation.test.ts`, `src/transforms/zhtw/spacing.test.ts`, `src/transforms/zhtw/quotes.test.ts`, `src/transforms/zhtw/protect.test.ts`, and/or `src/transforms/zhtw/s2t.test.ts`.
- For plugin hook behavior, update `src/hooks.test.ts` or `src/plugin.test.ts`.
- For manifest/schema drift, update `manifest.test.ts` and `src/config.test.ts`.

Run targeted tests during development, then run the full suite before handoff.

## High-Risk Areas

### Markdown code masking

`src/utils/mask.ts` is parser-like code. Be conservative when changing it.

Watch for:

- fenced code blocks
- inline code spans
- multi-backtick inline spans
- unclosed fences/spans
- CRLF line endings
- kaomoji tokens containing backticks
- links/headings/separators inside code regions

### ZH-TW conversion

The ZH-TW converter loads runtime assets lazily. Keep `zhtw` disabled by default unless cold-start and runtime cost are deliberately revisited.

Do not introduce top-level await in the ZH-TW path. The current lazy Promise design keeps plugin loading and bundling safer.

### Spelling scanner

`src/transforms/zhtw/scanner.ts` currently scans each rule using string search plus contextual gating. This is acceptable for message-sized payloads. Do not rewrite it into a complex matcher without profiling evidence and regression tests.

### Package output

`package.json` publishes `dist/` and `assets/`. If build config changes, verify the package dry run:

```bash
pnpm pack --dry-run
```

## Dictionary Generation

`README.md` documents the current dictionary update command:

```bash
pnpm run generate:zhtw
```

The package script is the documented entrypoint for the Node-run generator. Do not document alternative runtimes unless the package script changes and that runtime is verified.

Generated asset files are runtime inputs. If regenerated, inspect the diff carefully and run the full test suite.

## Upstream Sync SOP

Treat upstream synchronization as an evidence-gated audit, not as a blind version bump. The source of truth for pinned ZH-TW revisions and checksums is `scripts/generate-zhtw-data.mjs`; the generated record is `assets/zhtw-sources.json`. Do not duplicate mutable commit IDs in this file.

### Upstream map

- **OpenCC** — compare the pinned revision with the live default branch and inspect changes to `data/dictionary/STPhrases.txt`, `STCharacters.txt`, and `TWVariants.txt`.
- **zhtw-mcp** — compare the pinned revision with the live default branch and inspect `assets/ruleset.json`, relevant scanner/exclusion/fixer code, and regression tests. This plugin intentionally imports only enabled, deterministic, single-suggestion auto-fix rules.
- **OpenClaw** — compare `package.json` with the npm `latest` tag and the installed `openclaw/plugin-sdk` exports. Treat beta or alpha tags as informational unless a prerelease migration is explicitly requested.

### Audit and update sequence

1. Capture `git status`, branch, HEAD, remotes, package versions, current source pins, checksums, and generated counts. Preserve unrelated or pre-existing worktree changes; never reset or overwrite them during an audit.
2. Query official Git refs and package registries live. Record each upstream's default-branch HEAD, stable release, and prerelease separately.
3. Classify drift before editing:
   - **No drift:** pins equal live stable/default refs; verify checksums, semantic rule selection, and reproducible generation without changing source files.
   - **Data drift:** source files changed but schemas and policies did not; inspect the data diff and regenerate from reviewed commits.
   - **Policy/schema drift:** rule fields, exclusion behavior, or SDK contracts changed; add a failing regression test before implementation changes.
   - **Prerelease-only drift:** report it, but do not update stable compatibility automatically.
4. For OpenCC and zhtw-mcp updates, review commit logs and source-file diffs before changing pins. Update commit constants and expected SHA-256 values together; checksum verification must happen before parsing or writing generated assets.
5. Generate first into a temporary directory and compare all six files byte-for-byte with `assets/`. Inspect semantic counts and excluded rule categories separately so intentional non-goals are not mistaken for missing features.
6. When behavior changes, add or update targeted tests next to the affected transform. Preserve this plugin's narrower outgoing-message contract rather than copying server-only diagnostics, subjective review rules, or upstream implementation complexity.
7. Regenerate the repository assets only after the reviewed temporary output is accepted. Keep `README.md`, `assets/zhtw-sources.json`, generator constants, package compatibility metadata, and tests synchronized.
8. Run targeted tests, then `pnpm run format`, `pnpm run typecheck`, `pnpm test`, `pnpm run build`, `pnpm pack --dry-run`, `git diff --check`, and `git diff --cached --check`.

An audit is complete only when every upstream is classified, every generated file is accounted for, stable versus prerelease status is explicit, and the final report distinguishes applied updates from intentional no-op findings.

## Documentation Rules

When updating docs:

- Ground claims in current source, manifests, package scripts, and live command output.
- Verify mutable counts live: test counts, asset entries, package scripts, and runtime paths.
- Search for stale claims before handoff, especially old dictionary counts and old generator commands.
- Keep README examples aligned with `src/config.ts` and `openclaw.plugin.json`.

## Git / Change Hygiene

- Work on a feature/docs branch, not directly on `main`.
- Keep documentation-only changes separate from behavior changes.
- Do not commit `node_modules/`, generated build artifacts unless explicitly required, or local environment files.
- Never include secrets, tokens, cookies, direct messages, or private account material in docs, tests, logs, or fixtures.

Before handoff, report:

- files changed
- commands run
- test/build result
- known concerns or follow-up work

## Known Current Hygiene Notes

- `pnpm audit` may report vulnerabilities through the `openclaw` dependency chain. Prefer upgrading OpenClaw/plugin SDK when compatible instead of forcing transitive overrides in this plugin.
- `pnpm run build` intentionally removes `dist/` before compiling so renamed or deleted sources cannot leave stale publish artifacts.
- `tsconfig.json` includes only `api.ts`, `index.ts`, and `src/**/*.ts`, and excludes tests, `dist/`, and `node_modules/`. Keep the package dry-run aligned if these boundaries change.
