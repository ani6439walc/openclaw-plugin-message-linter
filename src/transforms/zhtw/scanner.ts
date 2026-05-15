export interface SpellingRule {
  readonly from: string;
  readonly to: readonly string[];
  readonly type: string;
  readonly context?: string;
  readonly contextClues?: readonly string[];
  readonly negativeContextClues?: readonly string[];
  readonly exceptions?: readonly string[];
}

export interface Issue {
  found: string;
  suggestions: readonly string[];
  offset: number;
}

const CONTEXT_WINDOW_CHARS = 40;

function hasMatchAny(text: string, terms: readonly string[]): boolean {
  for (const term of terms) {
    if (text.includes(term)) return true;
  }
  return false;
}

export function scanSpelling(
  text: string,
  rules: readonly SpellingRule[],
): Issue[] {
  const issues: Issue[] = [];

  for (const rule of rules) {
    const found = rule.from;
    const hasClue = rule.contextClues != null && rule.contextClues.length > 0;
    const hasNeg =
      rule.negativeContextClues != null && rule.negativeContextClues.length > 0;
    const hasExcept = rule.exceptions != null && rule.exceptions.length > 0;

    if (!hasClue && !hasNeg && !hasExcept) {
      let pos = text.indexOf(found);
      while (pos !== -1) {
        issues.push({ found, suggestions: rule.to, offset: pos });
        pos = text.indexOf(found, pos + 1);
      }
      continue;
    }

    let pos = text.indexOf(found);
    while (pos !== -1) {
      let accepted = true;

      let window: string | undefined;
      const needWindow = hasExcept || hasClue || hasNeg;
      if (needWindow) {
        const start = Math.max(0, pos - CONTEXT_WINDOW_CHARS);
        const end = Math.min(
          text.length,
          pos + found.length + CONTEXT_WINDOW_CHARS,
        );
        window = text.slice(start, end);
      }

      if (hasExcept && window && hasMatchAny(window, rule.exceptions!)) {
        accepted = false;
      }

      if (
        accepted &&
        hasClue &&
        window &&
        !hasMatchAny(window, rule.contextClues!)
      ) {
        accepted = false;
      }

      if (
        accepted &&
        hasNeg &&
        window &&
        hasMatchAny(window, rule.negativeContextClues!)
      ) {
        accepted = false;
      }

      if (accepted) {
        issues.push({ found, suggestions: rule.to, offset: pos });
      }

      pos = text.indexOf(found, pos + 1);
    }
  }

  issues.sort((a, b) => a.offset - b.offset);
  return issues;
}

export function applyFixes(text: string, issues: readonly Issue[]): string {
  if (issues.length === 0) return text;

  const deduped: Issue[] = [];
  for (const issue of issues) {
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
