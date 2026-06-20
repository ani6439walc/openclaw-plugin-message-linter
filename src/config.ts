import { z } from "zod";

export type ZhTwProfile = "base" | "strict";

export type ZhTwFeatures = {
  enabled?: boolean;
  profile?: ZhTwProfile;
  relaxed?: boolean;
  case?: boolean;
  punctuation?: boolean;
  spacing?: boolean;
  quotes?: boolean;
};

export type ResolvedZhTwFeatures = Required<ZhTwFeatures>;

export type LinterFeatures = {
  zhtw?: boolean | ZhTwFeatures;
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
  zhtw: ResolvedZhTwFeatures;
  kaomoji: boolean;
  discord: Required<NonNullable<LinterFeatures["discord"]>>;
};

export const DEFAULT_FEATURES: ResolvedLinterFeatures = {
  zhtw: {
    enabled: false,
    profile: "base",
    relaxed: false,
    case: false,
    punctuation: false,
    spacing: false,
    quotes: false,
  },
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

const ZhTwObjectSchema = z
  .object({
    enabled: z.boolean().catch(DEFAULT_FEATURES.zhtw.enabled),
    profile: z.enum(["base", "strict"]).catch(DEFAULT_FEATURES.zhtw.profile),
    relaxed: z.boolean().catch(DEFAULT_FEATURES.zhtw.relaxed),
    case: z.boolean().catch(DEFAULT_FEATURES.zhtw.case),
    punctuation: z.boolean().catch(DEFAULT_FEATURES.zhtw.punctuation),
    spacing: z.boolean().catch(DEFAULT_FEATURES.zhtw.spacing),
    quotes: z.boolean().catch(DEFAULT_FEATURES.zhtw.quotes),
  })
  .catch(DEFAULT_FEATURES.zhtw);

const ZhTwFeaturesSchema = z
  .union([z.boolean(), ZhTwObjectSchema])
  .catch(DEFAULT_FEATURES.zhtw)
  .transform((value): ResolvedZhTwFeatures => {
    if (typeof value === "boolean") {
      return {
        ...DEFAULT_FEATURES.zhtw,
        enabled: value,
      };
    }
    return value;
  });

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
    zhtw: ZhTwFeaturesSchema,
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
