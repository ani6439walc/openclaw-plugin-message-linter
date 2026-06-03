import { z } from "zod";

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

const DiscordFeaturesSchema = z
  .object({
    headings: z.boolean().catch(DEFAULT_FEATURES.discord.headings),
    separators: z.boolean().catch(DEFAULT_FEATURES.discord.separators),
    links: z.boolean().catch(DEFAULT_FEATURES.discord.links),
    blockquotes: z.boolean().catch(DEFAULT_FEATURES.discord.blockquotes),
    boldInlineCode: z.boolean().catch(DEFAULT_FEATURES.discord.boldInlineCode),
  })
  .catch(DEFAULT_FEATURES.discord);

const FeaturesSchema = z
  .object({
    zhtw: z.boolean().catch(DEFAULT_FEATURES.zhtw),
    kaomoji: z.boolean().catch(DEFAULT_FEATURES.kaomoji),
    discord: DiscordFeaturesSchema,
  })
  .catch(DEFAULT_FEATURES);

const ConfigSchema = z
  .object({
    features: FeaturesSchema,
  })
  .catch({ features: DEFAULT_FEATURES });

export function resolveFeatures(raw: unknown): ResolvedLinterFeatures {
  return FeaturesSchema.parse(raw);
}

export function resolveConfig(raw: unknown): MessageLinterConfig {
  return ConfigSchema.parse(raw);
}
