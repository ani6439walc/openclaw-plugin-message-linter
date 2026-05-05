export type ZhtwIssue = {
  found?: unknown;
  suggestions?: unknown;
};

export type ZhtwToolPayload = {
  text?: unknown;
  issues?: unknown;
};

export type MarkdownCodeMask = {
  maskedText: string;
  restore: (input: string) => string;
};
