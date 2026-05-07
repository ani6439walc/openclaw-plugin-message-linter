const TOKEN_SEPARATOR_RE = /[\s，。！？；：,.!?]/u;
const FACE_WRAPPER_RE = /[()（）\[\]{}「」『』【】]/u;
const ASCII_CODEISH_RE = /[A-Za-z0-9_$.\[\]<>!=+\-*/%&|^~:?]/;
const LETTER_OR_NUMBER_RE = /[\p{L}\p{N}]/u;

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
  const normalized = token.trim().replace(/[`´]/g, "");
  const chars = Array.from(normalized);

  if (chars.length < 3 || chars.length > 32) return false;

  let asciiCodeishChars = 0;
  let nonAsciiChars = 0;
  let decorativeChars = 0;

  for (const char of chars) {
    if (ASCII_CODEISH_RE.test(char)) asciiCodeishChars += 1;
    if (char.charCodeAt(0) > 0x7f) nonAsciiChars += 1;
    if (!LETTER_OR_NUMBER_RE.test(char) && !ASCII_CODEISH_RE.test(char)) {
      decorativeChars += 1;
    }
  }

  const compactLength = chars.length;
  const hasFaceWrapper = FACE_WRAPPER_RE.test(normalized);
  const mostlyAsciiCode =
    asciiCodeishChars >= Math.ceil(compactLength * 0.65) && nonAsciiChars === 0;
  const denseNonCode =
    nonAsciiChars + decorativeChars >= Math.ceil(compactLength / 2);

  if (mostlyAsciiCode) return false;
  if (nonAsciiChars === 0 && !hasFaceWrapper) return false;

  return (
    (hasFaceWrapper && (nonAsciiChars >= 2 || decorativeChars >= 2)) ||
    denseNonCode ||
    (nonAsciiChars >= 3 && asciiCodeishChars <= 1)
  );
}
