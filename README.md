# Message Linter for OpenClaw

[![OpenClaw](https://img.shields.io/badge/Platform-OpenClaw-blue.svg)](https://github.com/openclaw/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust message formatting and sanitization plugin for the OpenClaw platform, designed to ensure consistent, readable, and aesthetically pleasing message presentation across modern communication platforms.

## Overview

Message Linter automatically processes outgoing communications to normalize Markdown structure, suppress unwanted rich media embeds, and perform high-fidelity linguistic conversion. It is built to maintain professional communication standards while preserving expressive elements like Kaomoji.

## Key Features

- **Link Embed Suppression**: Automatically wraps Markdown link URLs in angle brackets (`<URL>`) to prevent cluttered automatic previews in clients like Discord.
- **Heading Normalization**: Dynamically adjusts Markdown heading levels (shifting to a minimum of H1 and capping at H3) to maintain a consistent visual hierarchy.
- **Advanced ZHTW Conversion**: Provides high-fidelity, context-aware Simplified-to-Traditional Chinese conversion, adhering to Taiwan (ROC) linguistic standards. Powered by a native TypeScript implementation with embedded OpenCC dictionaries and zhtw-mcp spelling rules.
- **Separator Beautification**: Converts standard ASCII separators (e.g., `---` or `───`) into visually optimized placeholders for cleaner section breaks.
- **Kaomoji Integrity**: Intelligently sanitizes tokens containing Kaomoji (e.g., `(＞///＜)`) by neutralizing backticks and accents that might otherwise trigger accidental Markdown code block formatting.
- **Discord-Compatible Blockquotes**: Ensures blockquote syntax is correctly formatted for reliable rendering across all supported clients.

## ZHTW Conversion

The Simplified-to-Traditional Chinese conversion feature is implemented entirely in native TypeScript, eliminating the need for external binaries.

### How It Works

1. **S2T Conversion**: Uses OpenCC dictionaries (`STPhrases`, `STCharacters`, `TWVariants`) for longest-match phrase substitution, single-character fallback, and Taiwan variant normalization.
2. **Spelling Correction**: Applies 1,600+ cross-strait spelling rules with context-aware gating (e.g., "支持" becomes "支援" in IT contexts, but remains "支持" in political contexts).
3. **Smart Fixing**: Overlapping rules are automatically deduplicated, and fixes are applied from right-to-left to preserve string offsets.

### Dictionary Data

Dictionary files are stored in the `assets/` directory and loaded at runtime:

| File | Description |
|---|---|
| `assets/s2t-phrases.txt` | OpenCC STPhrases (49,263 entries) |
| `assets/s2t-chars.txt` | OpenCC STCharacters (3,980 entries) |
| `assets/s2t-tw-variants.txt` | OpenCC TWVariants (39 entries) |
| `assets/spelling-rules.json` | zhtw-mcp spelling rules (1,694 rules) |

To update dictionaries from upstream:

```bash
bun run scripts/generate-zhtw-data.ts
```

This script fetches the latest OpenCC dictionaries and zhtw-mcp ruleset and regenerates the `assets/` files.

## Configuration

Integrate the plugin into your `openclaw.json` (or specific plugin configuration block) as follows:

```json
{
  "plugins": {
    "message-linter": {
      "features": {
        "links": true,
        "headings": true,
        "separators": true,
        "kaomoji": true,
        "blockquotes": true,
        "zhtw": false
      }
    }
  }
}
```

> **Note**: The `zhtw` feature is disabled by default.

## Acknowledgments

The ZHTW conversion feature was inspired by [zhtw-mcp](https://github.com/sysprog21/zhtw-mcp), an excellent Rust-based MCP server for Traditional Chinese text processing. The spelling rules, linguistic standards, and architectural insights from the zhtw-mcp project were instrumental in building this native TypeScript implementation.

---

_🌸　Powered by Ａni | [OpenClaw Plugin] © 2026_
