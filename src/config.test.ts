import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURES, resolveConfig } from "./config.js";

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

    expect(config.features.zhtw).toBe(true);
    expect(config.features.kaomoji).toBe(false);
    expect(config.features.discord).toEqual(DEFAULT_FEATURES.discord);
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

  it("falls back to defaults for invalid nested values", () => {
    const config = resolveConfig({
      features: {
        zhtw: "yes",
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
      zhtw: DEFAULT_FEATURES.zhtw,
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
});
