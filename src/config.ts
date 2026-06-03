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

type ResolvedLinterFeatures = {
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
  features: LinterFeatures;
};

export function resolveConfig(
  raw: Record<string, unknown>,
): MessageLinterConfig {
  const features = isRecord(raw.features) ? raw.features : {};
  const discord = isRecord(features.discord) ? features.discord : {};

  return {
    features: {
      zhtw: readBoolean(features.zhtw, DEFAULT_FEATURES.zhtw),
      kaomoji: readBoolean(features.kaomoji, DEFAULT_FEATURES.kaomoji),
      discord: {
        headings: readBoolean(
          discord.headings,
          DEFAULT_FEATURES.discord.headings,
        ),
        separators: readBoolean(
          discord.separators,
          DEFAULT_FEATURES.discord.separators,
        ),
        links: readBoolean(discord.links, DEFAULT_FEATURES.discord.links),
        blockquotes: readBoolean(
          discord.blockquotes,
          DEFAULT_FEATURES.discord.blockquotes,
        ),
        boldInlineCode: readBoolean(
          discord.boldInlineCode,
          DEFAULT_FEATURES.discord.boldInlineCode,
        ),
      },
    },
  };
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
