import { maskProtectedText } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;
const ASCII_ALNUM_RE = /[A-Za-z0-9]/;

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
  return CJK_RE.test(text.slice(Math.max(0, index - 16), index));
}

function shouldNormalizePeriod(text: string, index: number): boolean {
  return (
    (isCjk(text[index - 1]) ||
      text[index - 1] === ")" ||
      text[index - 1] === "）") &&
    !isAsciiAlnum(text[index + 1])
  );
}

function normalizePunctuation(text: string): string {
  let output = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
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
