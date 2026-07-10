import { maskProtectedText, PROTECTED_PLACEHOLDER_END } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;
const ASCII_WORD_RE = /[A-Za-z0-9_]/;

function isCjk(value: string | undefined): boolean {
  return value !== undefined && CJK_RE.test(value);
}

function isAsciiWord(value: string | undefined): boolean {
  return value !== undefined && ASCII_WORD_RE.test(value);
}

function characterAt(text: string, index: number): string | undefined {
  const codePoint = text.codePointAt(index);
  return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

function lastCharacter(text: string): string | undefined {
  return Array.from(text.slice(-2)).at(-1);
}

function readProtectedPlaceholder(
  text: string,
  index: number,
  marker: string,
): string | undefined {
  if (!text.startsWith(marker, index)) return undefined;

  const end = text.indexOf(PROTECTED_PLACEHOLDER_END, index + marker.length);
  if (end < 0) return undefined;

  const entryIndex = text.slice(index + marker.length, end);
  if (!/^\d+$/u.test(entryIndex)) return undefined;

  return text.slice(index, end + PROTECTED_PLACEHOLDER_END.length);
}

function addCjkAsciiSpacing(text: string, marker: string): string {
  let output = "";

  for (let index = 0; index < text.length; index += 1) {
    const placeholder = readProtectedPlaceholder(text, index, marker);
    if (placeholder !== undefined) {
      const prev = lastCharacter(output);
      if (output.length > 0 && prev !== " " && isCjk(prev)) output += " ";
      output += placeholder;
      if (isCjk(characterAt(text, index + placeholder.length))) output += " ";
      index += placeholder.length - 1;
      continue;
    }

    const char = characterAt(text, index)!;
    const prev = lastCharacter(output);
    if (
      output.length > 0 &&
      prev !== " " &&
      ((isCjk(prev) && isAsciiWord(char)) || (isAsciiWord(prev) && isCjk(char)))
    ) {
      output += " ";
    }

    output += char;
    index += char.length - 1;
  }

  return output;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeFullWidthPunctuationSpacing(
  text: string,
  marker: string,
): string {
  let output = text.replace(/\s+([，。！？；：、])/g, "$1");
  output = output.replace(
    /([，。！？；：、])\s+(?=[\p{Script=Han}A-Za-z0-9_])/gu,
    "$1",
  );
  output = output.replace(
    new RegExp(`([，。！？；：、])\\s+(?=${escapeRegExp(marker)})`, "gu"),
    "$1",
  );
  return output;
}

function dedupeRepeatedPunctuation(text: string): string {
  return text
    .replace(/！！+/g, "！")
    .replace(/？？+/g, "？")
    .replace(/，，+/g, "，")
    .replace(/。。+/g, "。")
    .replace(/；；+/g, "；")
    .replace(/：：+/g, "：")
    .replace(/、、+/g, "、")
    .replace(/……+/g, "……")
    .replace(/———+/g, "——");
}

export function applySpacingRules(text: string): string {
  const protectedMask = maskProtectedText(text);
  let output = protectedMask.maskedText;
  output = addCjkAsciiSpacing(output, protectedMask.placeholderMarker);
  output = removeFullWidthPunctuationSpacing(
    output,
    protectedMask.placeholderMarker,
  );
  output = dedupeRepeatedPunctuation(output);
  return protectedMask.restore(output);
}
