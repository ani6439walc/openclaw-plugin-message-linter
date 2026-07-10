export type MarkdownCodeMask = {
  maskedText: string;
  restore: (input: string) => string;
};
