# Message Linter for OpenClaw

[![OpenClaw](https://img.shields.io/badge/Platform-OpenClaw-blue.svg)](https://github.com/openclaw/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Message Linter is an OpenClaw plugin that normalizes outgoing message text before it is sent. It currently focuses on Discord-oriented Markdown cleanup, kaomoji-safe backtick handling, and optional Simplified Chinese to Taiwan Traditional Chinese conversion.

## Overview

The plugin registers two OpenClaw hooks:

1. `before_tool_call` — formats `message` tool calls only when `params.action === "send"` and `params.message` is a string.
2. `message_sending` — formats string message content immediately before dispatch.

Both hooks use the same linter pipeline, so tool-based sends and direct outgoing messages stay consistent.

## Key Features

- **Discord formatters**
  - Wrap Markdown link URLs in angle brackets, for example `[Example](https://example.com)` becomes `[Example](<https://example.com>)`, which suppresses Discord link embeds.
  - Normalize Markdown headings only when H4+ headings are present: the minimum heading level is shifted to H1 and the maximum is capped at H3.
  - Replace standalone `---` or `───` separators with a Discord-friendly strikethrough spacer.
  - Ensure blockquote lines use `> ` spacing for Discord compatibility.
  - Convert misplaced inline bold code from `` `**text**` `` to ``**`text`**``.
- **Kaomoji integrity**
  - Detect likely kaomoji tokens and replace raw backticks/accents that could accidentally start Markdown inline code.
  - Preserve real inline code spans and fenced code blocks through Markdown code masking.
- **Optional ZH-TW conversion**
  - Convert Simplified Chinese to Taiwan Traditional Chinese using bundled OpenCC-derived dictionaries, contextual spelling rules, opt-in proper-noun case rules, and opt-in punctuation/spacing/quote normalization.
  - Disabled by default to avoid unnecessary cold-start asset loading.

## Linter Pipeline

`lintMessageContent()` applies transformations in this order:

1. Resolve feature flags with tolerant defaults.
2. If `features.zhtw.enabled` is enabled and the message contains CJK characters, run `convertZhTw()` with the resolved ZH-TW feature flags.
3. Fix misplaced inline bold code formatting.
4. Mask Markdown fenced code blocks and inline code spans.
5. Format Markdown links.
6. Replace separators.
7. Sanitize kaomoji tokens.
8. Normalize Markdown headings.
9. Format blockquotes.
10. Restore masked Markdown code regions.

The masking step is intentionally central: formatters should not rewrite links, headings, separators, or kaomoji-like characters inside code spans or fenced code blocks.

## ZH-TW Conversion

The Simplified-to-Traditional Chinese conversion feature is implemented entirely in native TypeScript and does not require an external OpenCC binary at runtime.

### Architecture

The conversion pipeline uses a trie-based longest-match phrase matcher with lazy initialization:

1. **Module singleton** — `ZhTwManager` owns the converter, spelling rules, case rules, and a cached initialization Promise. Assets are loaded on the first `convertZhTw()` call.
2. **Trie matching** — phrase mappings are stored in a trie keyed by character, so each input position walks only possible phrase prefixes instead of scanning every phrase.
3. **Single-character fallback** — when no phrase matches, the converter falls back to the character map.
4. **Protected zones** — phrase outputs are marked so Taiwan variant normalization does not overwrite phrase-level conversion results.
5. **Contextual spelling pass** — spelling rules are gated by context clues, negative context clues, positional clues, and exceptions before fixes are applied.
6. **Right-to-left fixes** — overlapping fixes are deduplicated, then applied from right to left to preserve offsets.

### Dictionary Data

Dictionary files are stored in `assets/` and loaded at runtime:

| File                         | Current entries | Description                            |
| ---------------------------- | --------------: | -------------------------------------- |
| `assets/s2t-phrases.txt`     |          38,714 | OpenCC STPhrases-derived mappings      |
| `assets/s2t-chars.txt`       |           3,882 | OpenCC STCharacters-derived mappings   |
| `assets/s2t-tw-variants.txt` |              38 | OpenCC TWVariants-derived mappings     |
| `assets/spelling-rules.json` |           1,694 | Contextual cross-strait spelling rules |
| `assets/case-rules.json`     |              15 | Proper-noun case correction rules      |

To update dictionaries from upstream, use the package script:

```bash
pnpm run generate:zhtw
```

The script fetches OpenCC dictionaries and the zhtw-mcp ruleset, filters auto-fixable spelling rule types, imports case rules, then regenerates the `assets/` files.

## Configuration

Integrate the plugin into `openclaw.json` or the relevant plugin configuration block:

```json
{
  "plugins": {
    "message-linter": {
      "features": {
        "zhtw": {
          "enabled": false,
          "profile": "base",
          "relaxed": false,
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
    }
  }
}
```

Defaults are tolerant: invalid or missing feature config falls back to the values above.

For backward compatibility, `"zhtw": true` and `"zhtw": false` are still accepted. Boolean `true` enables the existing S2T + contextual spelling auto-fix pipeline only; `case`, `punctuation`, `spacing`, and `quotes` stay disabled unless explicitly enabled.

## Development

Install dependencies:

```bash
pnpm install
```

Run the standard checks:

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

Available package scripts:

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| `pnpm run typecheck`     | Run TypeScript without emitting.            |
| `pnpm test`              | Run the Vitest test suite.                  |
| `pnpm run build`         | Compile TypeScript into `dist/`.            |
| `pnpm run format`        | Format Markdown, JSON, TS, and MJS files.   |
| `pnpm run generate:zhtw` | Regenerate bundled ZH-TW dictionary assets. |

Current verified test status: 176 tests passing across 15 test files.

## Package Layout

The published package includes:

- `dist/` — compiled plugin entry and modules.
- `assets/` — bundled ZH-TW dictionaries, spelling rules, and case rules.
- `openclaw.plugin.json` — plugin metadata and configuration schema.
- `README.md`, `package.json`, and `LICENSE`.

OpenClaw loads the plugin from `./dist/index.js` according to `package.json`.

## Acknowledgments

The ZH-TW conversion feature was inspired by [zhtw-mcp](https://github.com/sysprog21/zhtw-mcp), a Rust-based text processing server for Traditional Chinese. The dictionary and contextual spelling-rule approach also builds on OpenCC dictionary data.

---

_🌸 Powered by Ani | [OpenClaw Plugin] © 2026_
