import { z, preprocess } from "openclaw/plugin-sdk/zod";

export type LinterFeatures = {
  zhtw?: boolean;
  kaomoji?: boolean;
  discord?: {
    headings?: boolean;
    separators?: boolean;
    links?: boolean;
    blockquotes?: boolean;
    boldInlineCode?: boolean;
  };
};

export type ResolvedLinterFeatures = {
  zhtw: boolean;
  kaomoji: boolean;
  discord: Required<NonNullable<LinterFeatures["discord"]>>;
};

export const DEFAULT_FEATURES: ResolvedLinterFeatures = {
  zhtw: false,
  kaomoji: true,
  discord: {
    headings: true,
    separators: true,
    links: true,
    blockquotes: true,
    boldInlineCode: true,
  },
};

export type MessageLinterConfig = {
  features: ResolvedLinterFeatures;
};

const asConfigObject = (value: unknown): Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const booleanFeature = (fallback: boolean) =>
  preprocess(
    (value) => (typeof value === "boolean" ? value : fallback),
    z.boolean(),
  );

const DiscordFeaturesSchema = preprocess(
  asConfigObject,
  z.object({
    headings: booleanFeature(DEFAULT_FEATURES.discord.headings),
    separators: booleanFeature(DEFAULT_FEATURES.discord.separators),
    links: booleanFeature(DEFAULT_FEATURES.discord.links),
    blockquotes: booleanFeature(DEFAULT_FEATURES.discord.blockquotes),
    boldInlineCode: booleanFeature(DEFAULT_FEATURES.discord.boldInlineCode),
  }),
);

const FeaturesSchema = preprocess(
  asConfigObject,
  z.object({
    zhtw: booleanFeature(DEFAULT_FEATURES.zhtw),
    kaomoji: booleanFeature(DEFAULT_FEATURES.kaomoji),
    discord: DiscordFeaturesSchema,
  }),
);

export function resolveFeatures(raw: unknown): ResolvedLinterFeatures {
  return FeaturesSchema.parse(raw) as ResolvedLinterFeatures;
}

export function resolveConfig(raw: unknown): MessageLinterConfig {
  return {
    features: resolveFeatures(asConfigObject(raw).features),
  };
}
