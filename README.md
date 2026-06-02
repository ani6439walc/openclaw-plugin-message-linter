# Message Linter for OpenClaw

[![OpenClaw](https://img.shields.io/badge/Platform-OpenClaw-blue.svg)](https://github.com/openclaw/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A robust message formatting and sanitization plugin for the OpenClaw platform, designed to ensure consistent, readable, and aesthetically pleasing message presentation across modern communication platforms.

## Overview

Message Linter automatically processes outgoing communications to normalize Markdown structure, suppress unwanted rich media embeds, and perform high-fidelity linguistic conversion. It is built to maintain professional communication standards while preserving expressive elements like Kaomoji.

## Use with X/Twitter automation

Message Linter is useful when an OpenClaw agent prepares visible public messages through another plugin. For X/Twitter workflows, install [TweetClaw](https://github.com/Xquik-dev/tweetclaw) separately:

```bash
openclaw plugins install @xquik/tweetclaw
```

Use TweetClaw to search tweets, search tweet replies, draft post tweet or post tweet reply actions, look up users, monitor tweets, and receive webhooks. Keep Message Linter enabled so outgoing text is normalized before the agent asks for approval or sends a visible action through TweetClaw.

Ask the agent to keep these fields in review notes before posting: target account or tweet, draft text, link preview risk, language conversion result, reply context, approval decision, and final action. Do not store API keys, cookies, direct messages, or private account material in message-lint notes.

## Key Features

- **Discord Formatters**: A suite of Discord-specific formatters that run before message dispatch:
  - **Link Embed Suppression**: Wraps Markdown link URLs in angle brackets (`<URL>`) to prevent cluttered automatic previews.
  - **Heading Normalization**: Dynamically adjusts Markdown heading levels (shifting to a minimum of H1 and capping at H3) to maintain a consistent visual hierarchy.
  - **Separator Beautification**: Converts standard ASCII separators (e.g., `---` or `───`) into visually optimized placeholders for cleaner section breaks.
  - **Blockquote Compatibility**: Ensures blockquote syntax is correctly formatted for reliable rendering across all supported clients.
  - **Inline Bold to Bold Code**: Converts `` `**text**` `` to ``**`text`**`` for better inline bold rendering.
- **Advanced ZHTW Conversion**: Provides high-fidelity, context-aware Simplified-to-Traditional Chinese conversion, adhering to Taiwan (ROC) linguistic standards. Powered by a native TypeScript trie-based converter with embedded OpenCC dictionaries and contextual spelling rules.
- **Kaomoji Integrity**: Intelligently sanitizes tokens containing Kaomoji (e.g., `(＞///＜)`) by neutralizing backticks and accents that might otherwise trigger accidental Markdown code block formatting.

## ZHTW Conversion

The Simplified-to-Traditional Chinese conversion feature is implemented entirely in native TypeScript, eliminating the need for external binaries.

### Architecture

The conversion pipeline uses a **Trie-based longest-match phrase matcher** with lazy initialization:

1. **Module Singleton**: `ZhTwManager` is a class-based singleton with lazy async init. Assets are loaded on first `convertZhTw()` call via a cached Promise — no module-level top-level await, ensuring bundler compatibility.
2. **Trie Matching**: All ~49K phrases are stored in a Trie tree keyed by character, giving O(max_phrase_length) lookup per input position instead of scanning candidate arrays. Longest-match priority is guaranteed by deeper traversal.
3. **Protected Zones**: Phrase mappings create protected zones where Taiwan variant normalization is suppressed, ensuring phrase output characters aren't overwritten by the TW variants pass.

### How It Works

1. **S2T Conversion**: Uses a Trie built from OpenCC dictionaries (`STPhrases`, `STCharacters`) for longest-match phrase substitution and single-character fallback. Taiwan variant normalization (`TWVariants`) applies after phrase matching while preserving protected zone integrity.
2. **Spelling Correction**: Applies 1,600+ cross-strait spelling rules with context-aware gating (e.g., "支持" becomes "支援" in IT contexts, but remains "支持" in political contexts). Optimized to avoid redundant string slicing for rules without context conditions.
3. **Smart Fixing**: Overlapping rules are automatically deduplicated, and fixes are applied from right-to-left to preserve string offsets.

### Performance

| Metric                    | Value                                    |
| ------------------------- | ---------------------------------------- |
| Phrase lookup complexity  | O(max_phrase_length) per position (Trie) |
| Hot conversion (4K chars) | ~0.39ms/call                             |
| Dictionary phrases        | 49,263 entries                           |
| Total tests               | 98 passing (8 suites)                    |

### Dictionary Data

Dictionary files are stored in the `assets/` directory and loaded at runtime:

| File                         | Description                               |
| ---------------------------- | ----------------------------------------- |
| `assets/s2t-phrases.txt`     | OpenCC STPhrases (49,263 entries)         |
| `assets/s2t-chars.txt`       | OpenCC STCharacters (3,980 entries)       |
| `assets/s2t-tw-variants.txt` | OpenCC TWVariants (39 entries)            |
| `assets/spelling-rules.json` | Cross-strait spelling rules (1,694 rules) |

To update dictionaries from upstream:

```bash
pnpm exec tsx scripts/generate-zhtw-data.ts
```

This script fetches the latest OpenCC dictionaries and spelling ruleset and regenerates the `assets/` files.

## Configuration

Integrate the plugin into your `openclaw.json` (or specific plugin configuration block) as follows:

```json
{
  "plugins": {
    "message-linter": {
      "features": {
        "discord": {
          "links": true,
          "headings": true,
          "separators": true,
          "blockquotes": true
        },
        "kaomoji": true,
        "zhtw": false
      }
    }
  }
}
```

> **Note**: The `zhtw` feature is disabled by default.

## Acknowledgments

The ZHTW conversion feature was inspired by [zhtw-mcp](https://github.com/sysprog21/zhtw-mcp), an excellent Rust-based text processing server for Traditional Chinese. The spelling rules, linguistic standards, and architectural insights from the zhtw-mcp project were instrumental in building this native TypeScript implementation.

---

_🌸　Powered by Ａni | [OpenClaw Plugin] © 2026_
