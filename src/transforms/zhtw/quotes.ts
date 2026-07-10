import { maskProtectedText } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;
const QUOTE_PAIR_BOUNDARY_RE = /[\n\r。！？!?]/u;

function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
}

function crossesSentenceBoundary(text: string): boolean {
  const match = text.match(QUOTE_PAIR_BOUNDARY_RE);
  return (
    match?.index !== undefined &&
    text.slice(match.index + match[0].length).trim().length > 0
  );
}

function characterAt(text: string, index: number): string | undefined {
  const codePoint = text.codePointAt(index);
  return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

function previousCharacter(
  text: string,
  index: number,
): { char: string; index: number } | undefined {
  if (index <= 0) return undefined;
  let start = index - 1;
  const last = text.charCodeAt(start);
  if (last >= 0xdc00 && last <= 0xdfff && start > 0) {
    const first = text.charCodeAt(start - 1);
    if (first >= 0xd800 && first <= 0xdbff) start -= 1;
  }
  return { char: text.slice(start, index), index: start };
}

function hasChineseContext(text: string, start: number, end: number): boolean {
  const before = previousNonWhitespace(text, start);
  const after = nextNonWhitespace(text, end + 1);
  return (
    hasCjk(text.slice(start + 1, end)) ||
    hasCjk(before ?? "") ||
    hasCjk(after ?? "")
  );
}

function previousNonWhitespace(
  text: string,
  index: number,
): string | undefined {
  let cursor = index;
  while (cursor > 0) {
    const previous = previousCharacter(text, cursor);
    if (previous === undefined) return undefined;
    cursor = previous.index;
    if (!/\s/u.test(previous.char)) return previous.char;
  }
  return undefined;
}

function nextNonWhitespace(text: string, index: number): string | undefined {
  for (let cursor = index; cursor < text.length;) {
    const char = characterAt(text, cursor)!;
    if (!/\s/u.test(char)) return char;
    cursor += char.length;
  }
  return undefined;
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

    const inner = text.slice(start + 1, end);
    if (crossesSentenceBoundary(inner)) {
      output += text.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }

    output += text.slice(cursor, start);
    if (hasChineseContext(text, start, end)) {
      output += `「${inner}」`;
    } else {
      output += `"${inner}"`;
    }
    cursor = end + 1;
  }

  return output;
}

function normalizeSmartPair(
  text: string,
  open: string,
  close: string,
  replacementOpen: string,
  replacementClose: string,
): string {
  let output = "";
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf(open, cursor);
    if (start === -1) {
      output += text.slice(cursor);
      break;
    }

    const end = text.indexOf(close, start + open.length);
    if (end === -1) {
      output += text.slice(cursor);
      break;
    }

    const inner = text.slice(start + open.length, end);
    if (crossesSentenceBoundary(inner)) {
      output += text.slice(cursor, start + open.length);
      cursor = start + open.length;
      continue;
    }

    output += text.slice(cursor, start);
    if (hasChineseContext(text, start, end)) {
      output += `${replacementOpen}${inner}${replacementClose}`;
    } else {
      output += `${open}${inner}${close}`;
    }
    cursor = end + close.length;
  }

  return output;
}

function normalizeSmartDoubleQuotes(text: string): string {
  return normalizeSmartPair(text, "“", "”", "「", "」");
}

function normalizeSmartSingleQuotes(text: string): string {
  return normalizeSmartPair(text, "‘", "’", "『", "』");
}

export function applyQuoteRules(text: string): string {
  const protectedMask = maskProtectedText(text);
  let output = normalizeSmartSingleQuotes(protectedMask.maskedText);
  output = normalizeSmartDoubleQuotes(output);
  output = normalizeAsciiDoubleQuotes(output);
  return protectedMask.restore(output);
}
