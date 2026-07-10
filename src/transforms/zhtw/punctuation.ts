import { maskProtectedText } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;
const ASCII_ALNUM_RE = /[A-Za-z0-9]/;
const ASCII_DIGIT_RE = /[0-9]/;
const CONTEXT_BOUNDARY_RE = /[\n\r。！？!?；;：:]/;

function isCjk(value: string | undefined): boolean {
  return value !== undefined && CJK_RE.test(value);
}

function isAsciiAlnum(value: string | undefined): boolean {
  return value !== undefined && ASCII_ALNUM_RE.test(value);
}

function isAsciiDigit(value: string | undefined): boolean {
  return value !== undefined && ASCII_DIGIT_RE.test(value);
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

function shouldNormalize(text: string, index: number): boolean {
  return (
    isCjk(previousCharacter(text, index)?.char) ||
    isCjk(characterAt(text, index + 1))
  );
}

function hasCjkBefore(text: string, index: number): boolean {
  let sawSpace = false;
  let cursor = index;

  for (let scanned = 0; scanned < 16; scanned += 1) {
    const previous = previousCharacter(text, cursor);
    if (previous === undefined) break;
    const char = previous.char;
    cursor = previous.index;
    if (isCjk(char)) return true;
    if (CONTEXT_BOUNDARY_RE.test(char)) return false;
    if (char === " ") {
      if (sawSpace) return false;
      sawSpace = true;
    } else {
      sawSpace = false;
    }
  }

  return false;
}

function hasCjkAround(text: string, index: number, length: number): boolean {
  return CJK_RE.test(
    text.slice(
      Math.max(0, index - 16),
      Math.min(text.length, index + length + 16),
    ),
  );
}

function shouldNormalizePeriod(text: string, index: number): boolean {
  if (isAsciiAlnum(characterAt(text, index + 1))) return false;
  if (shouldNormalize(text, index)) return true;
  return hasCjkBefore(text, index);
}

function findChineseParenthesisIndices(text: string): Set<number> {
  const indices = new Set<number>();
  const stack: number[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "(") {
      stack.push(index);
      continue;
    }
    if (text[index] !== ")" || stack.length === 0) continue;

    const open = stack.pop()!;
    if (isAsciiAlnum(previousCharacter(text, open)?.char)) continue;
    // Check if content inside parentheses contains CJK
    const content = text.slice(open + 1, index);
    const hasCjkInside = CJK_RE.test(content);
    if (
      !isCjk(previousCharacter(text, open)?.char) &&
      !isCjk(characterAt(text, index + 1)) &&
      !hasCjkInside
    )
      continue;
    indices.add(open);
    indices.add(index);
  }

  return indices;
}

function normalizePunctuation(text: string): string {
  let output = "";
  const chineseParentheses = findChineseParenthesisIndices(text);

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === ".") {
      let end = index + 1;
      while (text[end] === ".") end += 1;
      const length = end - index;
      if (length >= 3 && hasCjkAround(text, index, length)) {
        output += "……";
        index = end - 1;
        continue;
      }
    }

    switch (char) {
      case ",":
        output +=
          isAsciiDigit(previousCharacter(text, index)?.char) &&
          isAsciiDigit(characterAt(text, index + 1))
            ? char
            : shouldNormalize(text, index) || hasCjkBefore(text, index)
              ? "，"
              : char;
        break;
      case ".":
        output += shouldNormalizePeriod(text, index) ? "。" : char;
        break;
      case "!":
        output +=
          shouldNormalize(text, index) || hasCjkBefore(text, index)
            ? "！"
            : char;
        break;
      case "?":
        output +=
          shouldNormalize(text, index) || hasCjkBefore(text, index)
            ? "？"
            : char;
        break;
      case ";":
        output += shouldNormalize(text, index) ? "；" : char;
        break;
      case ":":
        output += shouldNormalize(text, index) ? "：" : char;
        break;
      case "(":
        output += chineseParentheses.has(index) ? "（" : char;
        break;
      case ")":
        output += chineseParentheses.has(index) ? "）" : char;
        break;
      default:
        output += char;
        break;
    }
  }

  return output;
}

export function applyPunctuationRules(text: string): string {
  const protectedMask = maskProtectedText(text);
  return protectedMask.restore(normalizePunctuation(protectedMask.maskedText));
}
