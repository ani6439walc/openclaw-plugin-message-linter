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

function containsClue(text: string, clues: readonly string[]): boolean {
  for (const clue of clues) {
    if (text.includes(clue)) return true;
  }
  return false;
}

function containsException(text: string, exceptions: readonly string[]): boolean {
  for (const exc of exceptions) {
    if (text.includes(exc)) return true;
  }
  return false;
}

export function scanSpelling(text: string, rules: readonly SpellingRule[]): Issue[] {
  const issues: Issue[] = [];

  for (const rule of rules) {
    const found = rule.from;
    let pos = text.indexOf(found);

    while (pos !== -1) {
      let accepted = true;

      if (rule.exceptions) {
        const window = text.slice(
          Math.max(0, pos - CONTEXT_WINDOW_CHARS),
          Math.min(text.length, pos + found.length + CONTEXT_WINDOW_CHARS),
        );
        if (containsException(window, rule.exceptions)) {
          accepted = false;
        }
      }

      if (accepted && rule.contextClues) {
        const window = text.slice(
          Math.max(0, pos - CONTEXT_WINDOW_CHARS),
          Math.min(text.length, pos + found.length + CONTEXT_WINDOW_CHARS),
        );
        if (!containsClue(window, rule.contextClues)) {
          accepted = false;
        }
      }

      if (accepted && rule.negativeContextClues) {
        const window = text.slice(
          Math.max(0, pos - CONTEXT_WINDOW_CHARS),
          Math.min(text.length, pos + found.length + CONTEXT_WINDOW_CHARS),
        );
        if (containsClue(window, rule.negativeContextClues)) {
          accepted = false;
        }
      }

      if (accepted) {
        issues.push({
          found,
          suggestions: rule.to,
          offset: pos,
        });
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
