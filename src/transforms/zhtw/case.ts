import { applyFixes, type Issue } from "./scanner.js";

export interface CaseRule {
  readonly term: string;
  readonly alternatives?: readonly string[];
}

const ASCII_WORD_RE = /[A-Za-z0-9]/;

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

function caseAlternatives(rule: CaseRule): string[] {
  const alternatives = new Set(rule.alternatives ?? []);
  const lower = rule.term.toLowerCase();
  if (lower !== rule.term) {
    alternatives.add(lower);
  }
  return [...alternatives].filter(
    (alternative) => alternative.length > 0 && alternative !== rule.term,
  );
}

function forEachOccurrence(
  text: string,
  search: string,
  visit: (offset: number) => void,
): void {
  let offset = text.indexOf(search);
  while (offset !== -1) {
    visit(offset);
    offset = text.indexOf(search, offset + 1);
  }
}

export function scanCaseRules(
  text: string,
  rules: readonly CaseRule[],
): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    for (const alternative of caseAlternatives(rule)) {
      forEachOccurrence(text, alternative, (offset) => {
        if (!hasAsciiWordBoundary(text, offset, alternative.length)) return;
        const key = `${offset}:${alternative.length}`;
        if (seen.has(key)) return;
        seen.add(key);
        issues.push({
          found: alternative,
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
  return applyFixes(text, scanCaseRules(text, rules));
}
