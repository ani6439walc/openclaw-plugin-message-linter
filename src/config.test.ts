import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURES, resolveConfig, resolveFeatures } from "./config.js";

describe("resolveConfig", () => {
  it("returns default features when raw config is empty", () => {
    expect(resolveConfig({}).features).toEqual(DEFAULT_FEATURES);
  });

  it("returns default features when raw features is not an object", () => {
    expect(resolveConfig({ features: true }).features).toEqual(
      DEFAULT_FEATURES,
    );
    expect(resolveConfig({ features: null }).features).toEqual(
      DEFAULT_FEATURES,
    );
  });

  it("keeps valid top-level feature toggles", () => {
    const config = resolveConfig({
      features: {
        zhtw: true,
        kaomoji: false,
      },
    });

    expect(config.features.zhtw).toEqual({
      ...DEFAULT_FEATURES.zhtw,
      enabled: true,
    });
    expect(config.features.kaomoji).toBe(false);
    expect(config.features.discord).toEqual(DEFAULT_FEATURES.discord);
  });

  it("keeps boolean zhtw config backward-compatible", () => {
    expect(resolveFeatures({ zhtw: true }).zhtw).toEqual({
      ...DEFAULT_FEATURES.zhtw,
      enabled: true,
    });
    expect(resolveFeatures({ zhtw: false }).zhtw).toEqual({
      ...DEFAULT_FEATURES.zhtw,
      enabled: false,
    });
  });

  it("keeps valid object zhtw feature toggles", () => {
    const config = resolveConfig({
      features: {
        zhtw: {
          enabled: true,
          profile: "strict",
          relaxed: true,
          case: true,
          punctuation: true,
          spacing: true,
          quotes: true,
        },
      },
    });

    expect(config.features.zhtw).toEqual({
      enabled: true,
      profile: "strict",
      relaxed: true,
      case: true,
      punctuation: true,
      spacing: true,
      quotes: true,
    });
  });

  it("keeps valid nested Discord feature toggles", () => {
    const config = resolveConfig({
      features: {
        discord: {
          headings: false,
          separators: false,
          links: false,
          blockquotes: false,
          boldInlineCode: false,
        },
      },
    });

    expect(config.features.discord).toEqual({
      headings: false,
      separators: false,
      links: false,
      blockquotes: false,
      boldInlineCode: false,
    });
  });

  it("resolves feature defaults directly for linter callers", () => {
    expect(resolveFeatures({ discord: { links: false } })).toEqual({
      ...DEFAULT_FEATURES,
      discord: {
        ...DEFAULT_FEATURES.discord,
        links: false,
      },
    });
  });

  it("falls back to defaults for invalid nested values", () => {
    const config = resolveConfig({
      features: {
        zhtw: {
          enabled: "yes",
          profile: "full",
          relaxed: 1,
          case: true,
          punctuation: null,
          spacing: false,
          quotes: "true",
        },
        kaomoji: 0,
        discord: {
          headings: "false",
          separators: null,
          links: true,
          blockquotes: 1,
          boldInlineCode: false,
        },
      },
    });

    expect(config.features).toEqual({
      zhtw: {
        ...DEFAULT_FEATURES.zhtw,
        case: true,
        spacing: false,
      },
      kaomoji: DEFAULT_FEATURES.kaomoji,
      discord: {
        headings: DEFAULT_FEATURES.discord.headings,
        separators: DEFAULT_FEATURES.discord.separators,
        links: true,
        blockquotes: DEFAULT_FEATURES.discord.blockquotes,
        boldInlineCode: false,
      },
    });
  });

  it("falls back to the default zhtw contract for invalid zhtw values", () => {
    expect(resolveFeatures({ zhtw: "yes" }).zhtw).toEqual(
      DEFAULT_FEATURES.zhtw,
    );
    expect(resolveFeatures({ zhtw: null }).zhtw).toEqual(DEFAULT_FEATURES.zhtw);
  });
});
