type MaskEntry = {
  placeholder: string;
  segment: string;
};

const PROTECTED_TEXT_RE =
  /https?:\/\/[A-Za-z0-9._~:/?#@!$&'()*+;=%-]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PROTECTED_PLACEHOLDER_PREFIX = "__Z";

export function maskProtectedText(text: string): {
  maskedText: string;
  restore: (input: string) => string;
} {
  const entries: MaskEntry[] = [];
  const maskedText = text.replace(PROTECTED_TEXT_RE, (segment) => {
    const entry = {
      placeholder: `${PROTECTED_PLACEHOLDER_PREFIX}${entries.length}__`,
      segment,
    };
    entries.push(entry);
    return entry.placeholder;
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
