import { maskProtectedText } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;

function hasCjk(text: string): boolean {
  return CJK_RE.test(text);
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
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!/\s/u.test(text[cursor])) return text[cursor];
  }
  return undefined;
}

function nextNonWhitespace(text: string, index: number): string | undefined {
  for (let cursor = index; cursor < text.length; cursor += 1) {
    if (!/\s/u.test(text[cursor])) return text[cursor];
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

    output += text.slice(cursor, start);
    const inner = text.slice(start + open.length, end);
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
