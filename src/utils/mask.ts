import type { MarkdownCodeMask } from "../types.js";
import {
  extractTokenAround,
  extractTokenBounds,
  isLikelyKaomojiToken,
} from "./kaomoji.js";

const CODE_PLACEHOLDER_PREFIX = "\uE000CODE_";

type MaskEntry = {
  placeholder: string;
  segment: string;
};

function countLineBreaks(segment: string): string {
  return (segment.match(/\r\n|\r|\n/g) ?? []).join("");
}

function createMask(
  entries: MaskEntry[],
  maskedText: string,
): MarkdownCodeMask {
  return {
    maskedText,
    restore(input: string) {
      return entries.reduce(
        (output, entry) => output.split(entry.placeholder).join(entry.segment),
        input,
      );
    },
  };
}

function createMaskEntry(
  index: number,
  segment: string,
  preserveLines = false,
): MaskEntry {
  const marker = `${CODE_PLACEHOLDER_PREFIX}${index}\uE001`;
  return {
    placeholder: preserveLines
      ? `${marker}${countLineBreaks(segment)}`
      : marker,
    segment,
  };
}

function countBackticks(text: string, index: number): number {
  let end = index;
  while (end < text.length && text[end] === "`") {
    end += 1;
  }
  return end - index;
}

function findLineStart(text: string, index: number): number {
  let cursor = index;
  while (cursor > 0 && text[cursor - 1] !== "\n" && text[cursor - 1] !== "\r") {
    cursor -= 1;
  }
  return cursor;
}

function skipLine(text: string, index: number): number {
  let cursor = index;
  while (
    cursor < text.length &&
    text[cursor] !== "\n" &&
    text[cursor] !== "\r"
  ) {
    cursor += 1;
  }

  if (text[cursor] === "\r" && text[cursor + 1] === "\n") {
    return cursor + 2;
  }

  if (text[cursor] === "\n" || text[cursor] === "\r") {
    return cursor + 1;
  }

  return cursor;
}

function isFenceOpenerAt(
  text: string,
  index: number,
  backtickCount: number,
): boolean {
  if (backtickCount < 3) return false;

  const lineStart = findLineStart(text, index);
  const indent = text.slice(lineStart, index);
  return indent.length <= 3 && /^[ ]*$/.test(indent);
}

function isFenceCloserAt(
  text: string,
  index: number,
  openerLength: number,
): boolean {
  const lineStart = findLineStart(text, index);
  if (lineStart !== index) return false;

  let cursor = index;
  let indent = 0;
  while (cursor < text.length && text[cursor] === " " && indent < 4) {
    cursor += 1;
    indent += 1;
  }

  const backtickCount = countBackticks(text, cursor);
  if (backtickCount < openerLength) return false;

  const lineEnd = skipLine(text, index);
  return /^[ \t]*$/.test(
    text.slice(cursor + backtickCount, lineEnd).replace(/[\r\n]+$/g, ""),
  );
}

function findFenceEnd(
  text: string,
  index: number,
  openerLength: number,
): number {
  let cursor = skipLine(text, index);

  while (cursor < text.length) {
    if (isFenceCloserAt(text, cursor, openerLength)) {
      return skipLine(text, cursor);
    }
    cursor = skipLine(text, cursor);
  }

  return text.length;
}

function isLikelyKaomojiOpener(
  text: string,
  index: number,
  backtickCount: number,
): boolean {
  if (backtickCount !== 1) return false;
  const { start, end } = extractTokenBounds(text, index);
  if (index <= start || index >= end - 1) return false;
  return isLikelyKaomojiToken(extractTokenAround(text, index));
}

function findInlineCodeEnd(
  text: string,
  index: number,
  openerLength: number,
): number {
  let cursor = index + openerLength;

  while (cursor < text.length) {
    if (text[cursor] !== "`") {
      cursor += 1;
      continue;
    }

    const backtickCount = countBackticks(text, cursor);
    if (isFenceOpenerAt(text, cursor, backtickCount)) {
      return -1;
    }

    if (backtickCount === openerLength) {
      return cursor + backtickCount;
    }

    cursor += backtickCount;
  }

  return -1;
}

export function maskMarkdownCode(text: string): MarkdownCodeMask {
  const entries: MaskEntry[] = [];
  let maskedText = "";
  let cursor = 0;

  while (cursor < text.length) {
    if (text[cursor] !== "`") {
      maskedText += text[cursor];
      cursor += 1;
      continue;
    }

    const backtickCount = countBackticks(text, cursor);

    if (isFenceOpenerAt(text, cursor, backtickCount)) {
      const fenceEnd = findFenceEnd(text, cursor, backtickCount);
      const entry = createMaskEntry(
        entries.length,
        text.slice(cursor, fenceEnd),
        true,
      );
      entries.push(entry);
      maskedText += entry.placeholder;
      cursor = fenceEnd;
      continue;
    }

    if (isLikelyKaomojiOpener(text, cursor, backtickCount)) {
      maskedText += text.slice(cursor, cursor + backtickCount);
      cursor += backtickCount;
      continue;
    }

    const inlineEnd = findInlineCodeEnd(text, cursor, backtickCount);
    if (inlineEnd === -1) {
      maskedText += text.slice(cursor, cursor + backtickCount);
      cursor += backtickCount;
      continue;
    }

    const entry = createMaskEntry(
      entries.length,
      text.slice(cursor, inlineEnd),
      true,
    );
    entries.push(entry);
    maskedText += entry.placeholder;
    cursor = inlineEnd;
  }

  return createMask(entries, maskedText);
}
