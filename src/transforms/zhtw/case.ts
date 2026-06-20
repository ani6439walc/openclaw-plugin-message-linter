import { applyFixes, type Issue } from "./scanner.js";

export interface CaseRule {
  readonly term: string;
  readonly alternatives?: readonly string[];
}

type MaskEntry = {
  placeholder: string;
  segment: string;
};

const ASCII_WORD_RE = /[A-Za-z0-9_]/;
const PROTECTED_TEXT_RE =
  /https?:\/\/[^\s<>()\[\]{}"`]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CASE_PLACEHOLDER_PREFIX = "\uE000CASE_";

function isAsciiWordChar(value: string | undefined): boolean {
  return value !== undefined && ASCII_WORD_RE.test(value);
}

function hasAsciiWordBoundary(
  text: string,
  offset: number,
  length: number,
): boolean {
  return (
    !isAsciiWordChar(text[offset - 1]) &&
    !isAsciiWordChar(text[offset + length])
  );
}

function casePatterns(rule: CaseRule): string[] {
  const patterns = new Set([rule.term, ...(rule.alternatives ?? [])]);
  return [...patterns]
    .map((pattern) => pattern.toLowerCase())
    .filter((pattern) => pattern.length > 0);
}

function forEachCaseInsensitiveOccurrence(
  text: string,
  search: string,
  visit: (offset: number, found: string) => void,
): void {
  const lowerText = text.toLowerCase();
  let offset = lowerText.indexOf(search);
  while (offset !== -1) {
    visit(offset, text.slice(offset, offset + search.length));
    offset = lowerText.indexOf(search, offset + 1);
  }
}

function maskProtectedText(text: string): {
  maskedText: string;
  restore: (input: string) => string;
} {
  const entries: MaskEntry[] = [];
  const maskedText = text.replace(PROTECTED_TEXT_RE, (segment) => {
    const entry = {
      placeholder: `${CASE_PLACEHOLDER_PREFIX}${entries.length}\uE001`,
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

export function scanCaseRules(
  text: string,
  rules: readonly CaseRule[],
): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    for (const pattern of casePatterns(rule)) {
      forEachCaseInsensitiveOccurrence(text, pattern, (offset, found) => {
        if (found === rule.term) return;
        if (!hasAsciiWordBoundary(text, offset, found.length)) return;
        const key = `${offset}:${found.length}`;
        if (seen.has(key)) return;
        seen.add(key);
        issues.push({
          found,
          suggestions: [rule.term],
          offset,
        });
      });
    }
  }

  issues.sort((a, b) => a.offset - b.offset);
  return issues;
}

export function applyCaseRules(
  text: string,
  rules: readonly CaseRule[],
): string {
  const protectedMask = maskProtectedText(text);
  const fixed = applyFixes(
    protectedMask.maskedText,
    scanCaseRules(protectedMask.maskedText, rules),
  );
  return protectedMask.restore(fixed);
}
