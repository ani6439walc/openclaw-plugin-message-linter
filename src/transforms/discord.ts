const MARKDOWN_LINK_RE =
  /\[([^\]]+)\]\((<[^>]+>|https?:\/\/(?:[^)\s()]|\((?:[^)]*)\)|\s)+)\)/g;

const URL_LABEL_WITH_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\/\S+$/i;

// Emoji Unicode ranges: emoticons, symbols, transport, flags, dingbats, supplemental pictographs
const EMOJI_RE =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{20E3}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}]/gu;

function normalizeLinkLabel(text: string): string {
  let trimmed = text.trim();

  // Repeatedly strip: angle brackets → scheme → emoji → trim
  // This handles cases like "🎉 <https://example.com>" where emoji must go first,
  // then angle brackets reveal the scheme, etc.
  let prev = "";
  while (trimmed !== prev && trimmed.length > 0) {
    prev = trimmed;
    // Strip surrounding angle brackets
    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
      trimmed = trimmed.slice(1, -1).trim();
    }
    // Strip URL scheme
    if (URL_LABEL_WITH_SCHEME_RE.test(trimmed)) {
      trimmed = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    }
    // Strip emoji characters
    trimmed = trimmed.replace(EMOJI_RE, "");
    // Collapse whitespace and trim
    trimmed = trimmed.replace(/\s+/g, " ").trim();
  }

  return trimmed;
}

function encodeUrlForDiscord(url: string): string {
  return Array.from(url)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code === 32) return "%20";
      if (code > 127) return encodeURIComponent(char);
      return char;
    })
    .join("");
}

export function formatLinks(content: string): string {
  return content.replace(MARKDOWN_LINK_RE, (_match, text, inner) => {
    let url = inner.trim();
    let title: string | undefined;

    if (url.startsWith("<") && url.endsWith(">")) {
      url = url.slice(1, -1);
      const encodedUrl = encodeUrlForDiscord(url);
      return `[${normalizeLinkLabel(text)}](<${encodedUrl}>)`;
    }

    const titleMatch = url.match(/^(.*?)\s+["']([^"']*)["']$/);
    if (titleMatch) {
      url = titleMatch[1];
      title = titleMatch[2];
    }

    const normalizedText = normalizeLinkLabel(text);
    const encodedUrl = encodeUrlForDiscord(url);
    const titlePart = title ? ` "${title}"` : "";
    return `[${normalizedText}](<${encodedUrl}>${titlePart})`;
  });
}

const SEPARATOR_RE = /\n(?:───|---)\n/g;
const SEPARATOR_REPLACEMENT = "\n~~　　　　　　　　　　　　　　　~~\n";

export function replaceSeparators(text: string): string {
  return text.replace(SEPARATOR_RE, SEPARATOR_REPLACEMENT);
}

const HEADING_RE = /^(#{1,6})\s+/gm;

export function normalizeMarkdownHeadings(text: string): string {
  const matches = Array.from(text.matchAll(HEADING_RE));
  if (matches.length === 0) return text;

  const levels = matches.map((m) => m[1].length);
  const hasOverH3 = levels.some((l) => l > 3);
  if (!hasOverH3) return text;

  const minLevel = Math.min(...levels);
  const offset = minLevel - 1;

  const replacements = matches.map((match) => {
    let newLevel = match[1].length - offset;
    if (newLevel > 3) {
      newLevel = 3;
    }
    return {
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      newHeading: "#".repeat(newLevel) + " ",
    };
  });

  let result = text;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, newHeading } = replacements[i];
    result = result.slice(0, start) + newHeading + result.slice(end);
  }

  return result;
}

const BOLD_INLINE_RE = /\`\*\*([^`]+?)\*\*\`/g;

export function wrapBoldWithBackticks(text: string): string {
  return text.replace(BOLD_INLINE_RE, "**`$1`**");
}

export function formatBlockquotes(text: string): string {
  return text.replace(/^>(?![ \t])/gm, "> ");
}
