import { maskProtectedText } from "./protect.js";

const CJK_RE = /\p{Script=Han}/u;
const ASCII_WORD_RE = /[A-Za-z0-9_]/;

function isCjk(value: string | undefined): boolean {
  return value !== undefined && CJK_RE.test(value);
}

function isAsciiWord(value: string | undefined): boolean {
  return value !== undefined && ASCII_WORD_RE.test(value);
}

function addCjkAsciiSpacing(text: string): string {
  let output = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const prev = output[output.length - 1];

    if (
      output.length > 0 &&
      prev !== " " &&
      ((isCjk(prev) && isAsciiWord(char)) || (isAsciiWord(prev) && isCjk(char)))
    ) {
      output += " ";
    }

    output += char;
  }

  return output;
}

function removeFullWidthPunctuationSpacing(text: string): string {
  let output = text.replace(/\s+([，。！？；：、])/g, "$1");
  output = output.replace(
    /([，。！？；：、])\s+(?=[\p{Script=Han}A-Za-z0-9_])/gu,
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
  output = addCjkAsciiSpacing(output);
  output = removeFullWidthPunctuationSpacing(output);
  output = dedupeRepeatedPunctuation(output);
  return protectedMask.restore(output);
}
