const CJK_RE = /\p{Script=Han}/u;

function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}

function hasChineseContext(text: string, start: number, end: number): boolean {
  return (
    hasCjk(text.slice(start + 1, end)) ||
    hasCjk(text[start - 1] ?? "") ||
    hasCjk(text[end + 1] ?? "")
  );
}

function normalizeAsciiDoubleQuotes(text: string): string {
  let output = "";
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf('"', cursor);
    if (start === -1) {
      output += text.slice(cursor);
      break;
    }

    const end = text.indexOf('"', start + 1);
    if (end === -1) {
      output += text.slice(cursor);
      break;
    }

    output += text.slice(cursor, start);
    const inner = text.slice(start + 1, end);
    if (hasChineseContext(text, start, end)) {
      output += `「${inner}」`;
    } else {
      output += `"${inner}"`;
    }
    cursor = end + 1;
  }

  return output;
}

function normalizeSmartDoubleQuotes(text: string): string {
  return text.replace(/“([^”]*\p{Script=Han}[^”]*)”/gu, "「$1」");
}

function normalizeSmartSingleQuotes(text: string): string {
  return text.replace(/‘([^’]*\p{Script=Han}[^’]*)’/gu, "『$1』");
}

export function applyQuoteRules(text: string): string {
  let output = normalizeSmartSingleQuotes(text);
  output = normalizeSmartDoubleQuotes(output);
  output = normalizeAsciiDoubleQuotes(output);
  return output;
}
