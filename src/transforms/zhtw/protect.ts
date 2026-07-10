type MaskEntry = {
  placeholder: string;
  segment: string;
};

// Keep undelimited Han text inside IRIs as upstream zhtw-mcp does, while also
// stopping at this formatter's prose punctuation and Markdown delimiters.
const URL_PATTERN = String.raw`[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s<>【】「」『』《》（）“”‘’［］｛｝，。！？；：、]+`;
const EMAIL_LOCAL_PATTERN = String.raw`[\p{L}\p{M}\p{N}._%+\-]+`;
const ASCII_DOMAIN_LABEL_PATTERN = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?`;
const PUNYCODE_TLD_PATTERN = String.raw`xn--[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?`;
const ASCII_TLD_PATTERN = String.raw`(?:${PUNYCODE_TLD_PATTERN}|[A-Za-z]{2,})`;
const ASCII_EMAIL_PATTERN = String.raw`${EMAIL_LOCAL_PATTERN}@(?:${ASCII_DOMAIN_LABEL_PATTERN}\.)+${ASCII_TLD_PATTERN}(?![A-Za-z0-9-])`;
const UNICODE_DOMAIN_LABEL_PATTERN = String.raw`[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}-]*[\p{L}\p{M}\p{N}])?`;
const UNICODE_TLD_PATTERN = String.raw`(?![A-Za-z0-9])[\p{L}\p{M}\p{N}](?:[\p{L}\p{M}\p{N}-]*[\p{L}\p{M}\p{N}])?`;
const UNICODE_ASCII_TLD_EMAIL_PATTERN = String.raw`${EMAIL_LOCAL_PATTERN}@(?:${UNICODE_DOMAIN_LABEL_PATTERN}\.)+${ASCII_TLD_PATTERN}(?![A-Za-z0-9-])`;
const UNICODE_EMAIL_PATTERN = String.raw`${EMAIL_LOCAL_PATTERN}@(?:${UNICODE_DOMAIN_LABEL_PATTERN}\.)+${UNICODE_TLD_PATTERN}(?![\p{L}\p{M}\p{N}-])`;
const PROTECTED_TEXT_RE = new RegExp(
  `${URL_PATTERN}|${ASCII_EMAIL_PATTERN}|${UNICODE_ASCII_TLD_EMAIL_PATTERN}|${UNICODE_EMAIL_PATTERN}`,
  "gu",
);

const URL_TRAILING_PUNCTUATION_RE = /[.!?,;:]+$/u;
const URL_TRAILING_QUOTE_RE = /[”’]$/u;
const URL_DELIMITER_PAIRS = [
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
] as const;
const INLINE_PROSE_PUNCTUATION_RE = /[,;!]/u;
const HAN_RE = /\p{Script=Han}/u;

export const PROTECTED_PLACEHOLDER_START = "\uE000";
export const PROTECTED_PLACEHOLDER_END = "\uE001";

function createPlaceholderMarker(text: string): string {
  let nonce = 0;
  while (true) {
    const marker = `${PROTECTED_PLACEHOLDER_START}PROTECT_${nonce}_`;
    if (!text.includes(marker)) return marker;
    nonce += 1;
  }
}

function hasBalancedQuotes(text: string, quote: string): boolean {
  return text.split(quote).length % 2 === 1;
}

function countOccurrences(text: string, search: string): number {
  return text.split(search).length - 1;
}

function findInlineUrlBoundary(segment: string): number {
  const expectedClosers: string[] = [];
  const contentStart = segment.indexOf("://") + 3;

  for (let index = contentStart; index < segment.length;) {
    const char = String.fromCodePoint(segment.codePointAt(index)!);
    const pair = URL_DELIMITER_PAIRS.find(([open]) => open === char);
    if (pair !== undefined) {
      expectedClosers.push(pair[1]);
    } else {
      const closingPair = URL_DELIMITER_PAIRS.find(
        ([, close]) => close === char,
      );
      if (closingPair !== undefined) {
        if (expectedClosers.at(-1) !== char) return index;
        expectedClosers.pop();
      }
    }

    const nextIndex = index + char.length;
    const nextCodePoint = segment.codePointAt(nextIndex);
    const next =
      nextCodePoint === undefined
        ? undefined
        : String.fromCodePoint(nextCodePoint);
    if (
      INLINE_PROSE_PUNCTUATION_RE.test(char) &&
      next !== undefined &&
      HAN_RE.test(next)
    ) {
      return index;
    }
    index = nextIndex;
  }

  return -1;
}

function trimProtectedSegment(
  segment: string,
  surroundingQuote?: string,
): {
  protectedSegment: string;
  suffix: string;
} {
  if (!segment.includes("://")) {
    return { protectedSegment: segment, suffix: "" };
  }

  let protectedSegment = segment;
  let suffix = "";

  let boundary = findInlineUrlBoundary(protectedSegment);
  if (surroundingQuote !== undefined) {
    const quoteBoundary = protectedSegment.indexOf(
      surroundingQuote,
      protectedSegment.indexOf("://") + 3,
    );
    if (quoteBoundary >= 0 && (boundary < 0 || quoteBoundary < boundary)) {
      boundary = quoteBoundary;
    }
  }
  if (boundary >= 0) {
    suffix = protectedSegment.slice(boundary);
    protectedSegment = protectedSegment.slice(0, boundary);
  }

  let trimmed = true;
  while (trimmed) {
    trimmed = false;

    if (
      (protectedSegment.endsWith('"') &&
        !hasBalancedQuotes(protectedSegment, '"')) ||
      (protectedSegment.endsWith("'") &&
        !hasBalancedQuotes(protectedSegment, "'")) ||
      URL_TRAILING_QUOTE_RE.test(protectedSegment)
    ) {
      suffix = protectedSegment.at(-1)! + suffix;
      protectedSegment = protectedSegment.slice(0, -1);
      trimmed = true;
      continue;
    }

    const punctuation =
      protectedSegment.match(URL_TRAILING_PUNCTUATION_RE)?.[0] ?? "";
    if (punctuation.length > 0) {
      protectedSegment = protectedSegment.slice(0, -punctuation.length);
      suffix = punctuation + suffix;
      trimmed = true;
      continue;
    }

    for (const [open, close] of URL_DELIMITER_PAIRS) {
      if (
        protectedSegment.endsWith(close) &&
        countOccurrences(protectedSegment, close) >
          countOccurrences(protectedSegment, open)
      ) {
        suffix = close + suffix;
        protectedSegment = protectedSegment.slice(0, -1);
        trimmed = true;
        break;
      }
    }
  }

  return { protectedSegment, suffix };
}

export function maskProtectedText(text: string): {
  maskedText: string;
  placeholderMarker: string;
  restore: (input: string) => string;
} {
  const entries: MaskEntry[] = [];
  const marker = createPlaceholderMarker(text);
  const maskedText = text.replace(
    PROTECTED_TEXT_RE,
    (segment, offset: number) => {
      const previous = text[offset - 1];
      const surroundingQuote =
        previous === '"' || previous === "'" ? previous : undefined;
      const { protectedSegment, suffix } = trimProtectedSegment(
        segment,
        surroundingQuote,
      );
      const entry = {
        placeholder: `${marker}${entries.length}${PROTECTED_PLACEHOLDER_END}`,
        segment: protectedSegment,
      };
      entries.push(entry);
      return entry.placeholder + suffix;
    },
  );

  return {
    maskedText,
    placeholderMarker: marker,
    restore(input: string): string {
      return entries.reduce(
        (output, entry) => output.split(entry.placeholder).join(entry.segment),
        input,
      );
    },
  };
}
