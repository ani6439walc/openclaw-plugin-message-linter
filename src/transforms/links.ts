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
