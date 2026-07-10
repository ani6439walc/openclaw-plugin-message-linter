export interface SpellingRule {
  readonly from: string;
  readonly to: readonly string[];
  readonly type: string;
  readonly context?: string;
  readonly contextClues?: readonly string[];
  readonly negativeContextClues?: readonly string[];
  readonly positionalClues?: readonly string[];
  readonly exceptions?: readonly string[];
}

export interface Issue {
  found: string;
  suggestions: readonly string[];
  offset: number;
}

const CONTEXT_WINDOW_CHARS = 40;
const POSITIONAL_WINDOW_CHARS = 20;

function hasMatchAny(text: string, terms: readonly string[]): boolean {
  for (const term of terms) {
    if (text.includes(term)) return true;
  }
  return false;
}

function countNonOverlappingMatches(
  text: string,
  terms: readonly string[],
): number {
  const occupied: Array<{ start: number; end: number }> = [];
  const uniqueTerms = [...new Set(terms)].sort(
    (left, right) => right.length - left.length,
  );

  for (const term of uniqueTerms) {
    let offset = text.indexOf(term);
    while (offset !== -1) {
      const end = offset + term.length;
      if (!occupied.some((match) => offset < match.end && end > match.start)) {
        occupied.push({ start: offset, end });
        break;
      }
      offset = text.indexOf(term, offset + 1);
    }
  }

  return occupied.length;
}

function forEachOccurrence(
  text: string,
  search: string,
  visit: (offset: number) => void,
): void {
  if (!search) return;

  let offset = text.indexOf(search);
  while (offset !== -1) {
    visit(offset);
    offset = text.indexOf(search, offset + 1);
  }
}

function contextWindow(
  text: string,
  matchStart: number,
  matchEnd: number,
): string {
  const start = Math.max(0, matchStart - CONTEXT_WINDOW_CHARS);
  const end = Math.min(text.length, matchEnd + CONTEXT_WINDOW_CHARS);
  return text.slice(start, end);
}

function positionalWindowBefore(text: string, matchStart: number): string {
  return text.slice(
    Math.max(0, matchStart - POSITIONAL_WINDOW_CHARS),
    matchStart,
  );
}

function positionalWindowAfter(text: string, matchEnd: number): string {
  return text.slice(matchEnd, matchEnd + POSITIONAL_WINDOW_CHARS);
}

function checkPositionalClues(
  text: string,
  matchStart: number,
  matchEnd: number,
  clues: readonly string[],
): boolean {
  const before = positionalWindowBefore(text, matchStart);
  const after = positionalWindowAfter(text, matchEnd);

  for (const clue of clues) {
    const separator = clue.indexOf(":");
    if (separator <= 0) {
      return false;
    }

    const operator = clue.slice(0, separator);
    const term = clue.slice(separator + 1);
    if (!term) {
      return false;
    }

    switch (operator) {
      case "before":
        if (!after.includes(term)) return false;
        break;
      case "after":
        if (!before.includes(term)) return false;
        break;
      case "adjacent":
        if (!before.endsWith(term) && !after.startsWith(term)) return false;
        break;
      case "not_before":
        if (after.includes(term)) return false;
        break;
      case "not_after":
        if (before.includes(term)) return false;
        break;
      default:
        return false;
    }
  }

  return true;
}

function acceptsRuleAt(
  text: string,
  rule: SpellingRule,
  offset: number,
): boolean {
  const found = rule.from;
  const matchEnd = offset + found.length;
  const contextClues = rule.contextClues ?? [];
  const negativeContextClues = rule.negativeContextClues ?? [];
  const exceptions = rule.exceptions ?? [];
  const positionalClues = rule.positionalClues ?? [];
  const needsContext =
    exceptions.length > 0 ||
    contextClues.length > 0 ||
    negativeContextClues.length > 0;

  if (needsContext) {
    const window = contextWindow(text, offset, matchEnd);
    if (exceptions.length > 0 && hasMatchAny(window, exceptions)) {
      return false;
    }
    if (contextClues.length > 0) {
      const requiredMatches = rule.type === "confusable" ? 2 : 1;
      if (countNonOverlappingMatches(window, contextClues) < requiredMatches) {
        return false;
      }
    }
    if (
      negativeContextClues.length > 0 &&
      hasMatchAny(window, negativeContextClues)
    ) {
      return false;
    }
  }
  // Confusable rules require at least 2 context clues unconditionally
  if (rule.type === "confusable" && contextClues.length < 2) {
    return false;
  }

  if (
    positionalClues.length > 0 &&
    !checkPositionalClues(text, offset, matchEnd, positionalClues)
  ) {
    return false;
  }

  return true;
}

export function scanSpelling(
  text: string,
  rules: readonly SpellingRule[],
): Issue[] {
  const issues: Issue[] = [];

  for (const rule of rules) {
    const found = rule.from;
    forEachOccurrence(text, found, (offset) => {
      if (acceptsRuleAt(text, rule, offset)) {
        issues.push({ found, suggestions: rule.to, offset });
      }
    });
  }

  issues.sort((a, b) => a.offset - b.offset);
  return issues;
}

export function applyFixes(text: string, issues: readonly Issue[]): string {
  if (issues.length === 0) return text;

  const deduped: Issue[] = [];
  for (const issue of issues) {
    if (issue.suggestions.length !== 1) continue;
    let overlapped = false;
    for (const existing of deduped) {
      const aStart = issue.offset;
      const aEnd = issue.offset + issue.found.length;
      const bStart = existing.offset;
      const bEnd = existing.offset + existing.found.length;
      if (aStart < bEnd && aEnd > bStart) {
        overlapped = true;
        if (issue.found.length > existing.found.length) {
          existing.found = issue.found;
          existing.suggestions = issue.suggestions;
          existing.offset = issue.offset;
        }
        break;
      }
    }
    if (!overlapped) {
      deduped.push({ ...issue });
    }
  }

  deduped.sort((a, b) => b.offset - a.offset);

  let result = text;
  for (const issue of deduped) {
    const suggestion = issue.suggestions[0];
    if (!suggestion || suggestion === issue.found) continue;
    result =
      result.slice(0, issue.offset) +
      suggestion +
      result.slice(issue.offset + issue.found.length);
  }

  return result;
}
