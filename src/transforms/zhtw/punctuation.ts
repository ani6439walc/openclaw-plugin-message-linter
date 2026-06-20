import { maskProtectedText } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;
const ASCII_ALNUM_RE = /[A-Za-z0-9]/;
const CONTEXT_BOUNDARY_RE = /[\n\r。！？!?；;：:]/;

function isCjk(value: string | undefined): boolean {
  return value !== undefined && CJK_RE.test(value);
}

function isAsciiAlnum(value: string | undefined): boolean {
  return value !== undefined && ASCII_ALNUM_RE.test(value);
}

function shouldNormalize(text: string, index: number): boolean {
  return isCjk(text[index - 1]) || isCjk(text[index + 1]);
}

function hasCjkBefore(text: string, index: number): boolean {
  let sawSpace = false;
  const start = Math.max(0, index - 16);

  for (let cursor = index - 1; cursor >= start; cursor -= 1) {
    const char = text[cursor];
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
  if (isAsciiAlnum(text[index + 1])) return false;
  if (shouldNormalize(text, index)) return true;
  return hasCjkBefore(text, index);
}

function normalizePunctuation(text: string): string {
  let output = "";

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
          shouldNormalize(text, index) || hasCjkBefore(text, index)
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
        output += shouldNormalize(text, index) ? "（" : char;
        break;
      case ")":
        output += shouldNormalize(text, index) ? "）" : char;
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
