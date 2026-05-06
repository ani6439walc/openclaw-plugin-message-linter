# Message Linter for OpenClaw

A robust message formatting and sanitization plugin for the OpenClaw platform, designed to ensure consistent, readable, and aesthetically pleasing message presentation across modern communication platforms.

## Overview

Message Linter automatically processes outgoing communications to normalize Markdown structure, suppress unwanted rich media embeds, and perform high-fidelity linguistic conversion. It is built to maintain professional communication standards while preserving expressive elements like Kaomoji.

## Key Features

- **Link Embed Suppression**: Automatically wraps Markdown link URLs in angle brackets (`<URL>`) to prevent cluttered automatic previews in clients like Discord.
- **Heading Normalization**: Dynamically adjusts Markdown heading levels (shifting to a minimum of H1 and capping at H3) to maintain a consistent visual hierarchy.
- **Advanced ZHTW Conversion**: Provides high-fidelity, context-aware Simplified-to-Traditional Chinese conversion via the `zhtw-mcp` engine, adhering to Taiwan (ROC) linguistic standards.
- **Separator Beautification**: Converts standard ASCII separators (e.g., `---` or `───`) into visually optimized placeholders for cleaner section breaks.
- **Kaomoji Integrity**: Intelligently sanitizes tokens containing Kaomoji (e.g., `(＞///＜)`) by neutralizing backticks and accents that might otherwise trigger accidental Markdown code block formatting.
- **Discord-Compatible Blockquotes**: Ensures blockquote syntax is correctly formatted for reliable rendering across all supported clients.

## Prerequisites

To utilize the **ZHTW Conversion** feature, the `zhtw-mcp` binary must be installed on your host system:

1. **Installation**: Refer to [wei840222/zhtw-mcp](https://github.com/wei840222/zhtw-mcp) for platform-specific instructions.
2. **Path Configuration**: Ensure the binary is available in your system `PATH` or located at `~/.local/bin/zhtw-mcp`.

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

> **Note**: The `zhtw` feature is disabled by default and requires `zhtw-mcp` to be correctly configured on the host.
