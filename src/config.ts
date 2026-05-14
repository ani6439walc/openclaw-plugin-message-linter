export type LinterFeatures = {
  zhtw?: boolean;
  kaomoji?: boolean;
  discord?: {
    headings?: boolean;
    separators?: boolean;
    links?: boolean;
    blockquotes?: boolean;
  };
};

export const DEFAULT_FEATURES: Required<LinterFeatures> = {
  zhtw: false,
  kaomoji: true,
  discord: {
    headings: true,
    separators: true,
    links: true,
    blockquotes: true,
  },
};
