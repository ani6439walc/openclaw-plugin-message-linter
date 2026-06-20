type MaskEntry = {
  placeholder: string;
  segment: string;
};

const PROTECTED_TEXT_RE =
  /https?:\/\/[A-Za-z0-9._~:/?#@!$&'()*+;=%\-"']+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_TRAILING_PUNCTUATION_RE = /[.!?,;:]+$/;

export const PROTECTED_PLACEHOLDER_START = "\uE000";
export const PROTECTED_PLACEHOLDER_END = "\uE001";

function hasBalancedQuotes(text: string, quote: string): boolean {
  return text.split(quote).length % 2 === 1;
}

function trimProtectedSegment(segment: string): {
  protectedSegment: string;
  suffix: string;
} {
  if (!segment.startsWith("http://") && !segment.startsWith("https://")) {
    return { protectedSegment: segment, suffix: "" };
  }

  let protectedSegment = segment;
  let suffix = "";

  while (
    (protectedSegment.endsWith('"') &&
      !hasBalancedQuotes(protectedSegment, '"')) ||
    (protectedSegment.endsWith("'") &&
      !hasBalancedQuotes(protectedSegment, "'"))
  ) {
    suffix = protectedSegment.at(-1) + suffix;
    protectedSegment = protectedSegment.slice(0, -1);
  }

  const punctuation =
    protectedSegment.match(URL_TRAILING_PUNCTUATION_RE)?.[0] ?? "";
  if (punctuation.length > 0) {
    protectedSegment = protectedSegment.slice(0, -punctuation.length);
    suffix = punctuation + suffix;
  }

  return { protectedSegment, suffix };
}

export function maskProtectedText(text: string): {
  maskedText: string;
  restore: (input: string) => string;
} {
  const entries: MaskEntry[] = [];
  const maskedText = text.replace(PROTECTED_TEXT_RE, (segment) => {
    const { protectedSegment, suffix } = trimProtectedSegment(segment);
    const entry = {
      placeholder: `${PROTECTED_PLACEHOLDER_START}PROTECT_${entries.length}${PROTECTED_PLACEHOLDER_END}`,
      segment: protectedSegment,
    };
    entries.push(entry);
    return entry.placeholder + suffix;
  });

  return {
    maskedText,
    restore(input: string): string {
      return entries.reduce(
        (output, entry) => output.split(entry.placeholder).join(entry.segment),
        input,
      );
    },
  };
}
