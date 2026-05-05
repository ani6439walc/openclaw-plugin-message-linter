import type { MarkdownCodeMask } from "../types.js";

const FENCED_CODE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const MARKDOWN_CODE_RE = /```[\s\S]*?```|`[^`\n]+`/g;

export function maskFencedCode(text: string): MarkdownCodeMask {
  const segments: string[] = [];
  const maskedText = text.replace(FENCED_CODE_RE, (segment) => {
    const index = segments.push(segment) - 1;
    return `\uE000FENCED_${index}\uE001`;
  });

  return {
    maskedText,
    restore(input: string) {
      return segments.reduce(
        (output, segment, index) =>
          output.split(`\uE000FENCED_${index}\uE001`).join(segment),
        input,
      );
    },
  };
}

export function maskInlineCode(text: string): MarkdownCodeMask {
  const segments: string[] = [];
  const maskedText = text.replace(INLINE_CODE_RE, (match) => {
    const index = segments.push(match) - 1;
    return `\uE000INLINE_${index}\uE001`;
  });

  return {
    maskedText,
    restore(input: string) {
      return segments.reduce(
        (output, segment, index) =>
          output.split(`\uE000INLINE_${index}\uE001`).join(segment),
        input,
      );
    },
  };
}

export function maskMarkdownCode(text: string): MarkdownCodeMask {
  const segments: string[] = [];
  const maskedText = text.replace(MARKDOWN_CODE_RE, (segment) => {
    const index = segments.push(segment) - 1;
    return `\uE000ZHTW_CODE_${index}\uE001`;
  });

  return {
    maskedText,
    restore(input: string) {
      return segments.reduce(
        (output, segment, index) =>
          output.split(`\uE000ZHTW_CODE_${index}\uE001`).join(segment),
        input,
      );
    },
  };
}
