const CJK_RE = /[\u3400-\u9fff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/u;
const TOKEN_SEPARATOR_RE = /[\s，。！？；：,.!?]/u;
const FACE_WRAPPER_RE = /[()（）\[\]{}「」『』【】]/u;
const ASCII_CODEISH_RE = /[A-Za-z0-9_$\.\[\]<>!=+\-*/%&|^~:?]/;
const LETTER_OR_NUMBER_RE = /[\p{L}\p{N}]/u;
const KAOMOJI_ACCENT_RE = /[`´ˋˊ]/g;

export function extractTokenAround(text: string, index: number): string {
  const { start, end } = extractTokenBounds(text, index);
  return text.slice(start, end);
}

export function extractTokenBounds(
  text: string,
  index: number,
): {
  start: number;
  end: number;
} {
  let start = index;
  while (start > 0 && !TOKEN_SEPARATOR_RE.test(text[start - 1]!)) {
    start -= 1;
  }

  let end = index;
  while (end < text.length && !TOKEN_SEPARATOR_RE.test(text[end]!)) {
    end += 1;
  }

  return { start, end };
}

export function isLikelyKaomojiToken(token: string): boolean {
  const normalized = token.trim().replace(KAOMOJI_ACCENT_RE, "");
  const chars = Array.from(normalized);

  if (chars.length < 3 || chars.length > 32) return false;

  let asciiCodeishChars = 0;
  let nonAsciiChars = 0;
  let decorativeChars = 0;
  let cjkChars = 0;

  for (const char of chars) {
    if (ASCII_CODEISH_RE.test(char)) asciiCodeishChars += 1;
    if (char.charCodeAt(0) > 0x7f) nonAsciiChars += 1;
    if (!LETTER_OR_NUMBER_RE.test(char) && !ASCII_CODEISH_RE.test(char)) {
      decorativeChars += 1;
    }
    if (CJK_RE.test(char)) cjkChars += 1;
  }

  const compactLength = chars.length;
  const hasFaceWrapper = FACE_WRAPPER_RE.test(normalized);
  const mostlyAsciiCode =
    asciiCodeishChars >= Math.ceil(compactLength * 0.65) && nonAsciiChars === 0;
  const realNonAsciiChars = nonAsciiChars - cjkChars;
  const realDecorativeChars = decorativeChars - cjkChars;
  const denseNonCode =
    realNonAsciiChars + realDecorativeChars >= Math.ceil(compactLength / 2);

  if (mostlyAsciiCode) return false;
  if (nonAsciiChars === 0 && !hasFaceWrapper) return false;

  return (
    (hasFaceWrapper && (realNonAsciiChars >= 2 || realDecorativeChars >= 2)) ||
    denseNonCode ||
    (realNonAsciiChars >= 3 && asciiCodeishChars <= 1)
  );
}
