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
