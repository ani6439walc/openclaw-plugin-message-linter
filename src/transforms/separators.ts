const SEPARATOR_RE = /\n(?:───|---)\n/g;
const SEPARATOR_REPLACEMENT = "\n~~　　　　　　　　　　　　　　　~~\n";

export function replaceSeparators(text: string): string {
  return text.replace(SEPARATOR_RE, SEPARATOR_REPLACEMENT);
}
