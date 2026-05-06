export type LinterFeatures = {
  zhtw?: boolean;
  links?: boolean;
  separators?: boolean;
  headings?: boolean;
  kaomoji?: boolean;
  blockquotes?: boolean;
};

export const DEFAULT_FEATURES: Required<LinterFeatures> = {
  zhtw: false,
  links: true,
  separators: true,
  headings: true,
  kaomoji: true,
  blockquotes: true,
};
