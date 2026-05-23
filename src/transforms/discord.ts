const MARKDOWN_LINK_RE =
  /\[([^\]]+)\]\((<[^>]+>|https?:\/\/(?:[^)\s()]|\((?:[^)]*)\)|\s)+)\)/g;

const URL_LABEL_WITH_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\/\S+$/i;

function normalizeLinkLabel(text: string): string {
  const trimmed = text.trim();
  if (!URL_LABEL_WITH_SCHEME_RE.test(trimmed)) {
    return text;
  }
  return trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
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
