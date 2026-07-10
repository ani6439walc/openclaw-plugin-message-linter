import fs from "node:fs";
import { describe, expect, it } from "vitest";
import plugin from "./index.js";
import { DEFAULT_FEATURES } from "./src/config.js";

const manifest = JSON.parse(
  fs.readFileSync(new URL("./openclaw.plugin.json", import.meta.url), "utf-8"),
);
const packageJson = JSON.parse(
  fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

const featureProperties = manifest.configSchema.properties.features.properties;
const zhtwBooleanSchema = featureProperties.zhtw.anyOf.find(
  (schema: { type?: string }) => schema.type === "boolean",
);
const zhtwObjectSchema = featureProperties.zhtw.anyOf.find(
  (schema: { type?: string }) => schema.type === "object",
);

describe("message-linter manifest", () => {
  it("has the correct basic structure", () => {
    expect(manifest.id).toBe("message-linter");
    expect(manifest.description).toBe(plugin.description);
    expect(manifest.description).toContain("Markdown");
    expect(manifest.description).toContain("Taiwan Traditional Chinese");
  });

  it("cleans stale build output before compiling runtime sources", () => {
    expect(packageJson.scripts.clean).toContain("rmSync");
    expect(packageJson.scripts.build).toBe("pnpm run clean && tsc");
  });

  it("keeps feature defaults aligned with DEFAULT_FEATURES", () => {
    expect(featureProperties.zhtw.default).toBe(DEFAULT_FEATURES.zhtw.enabled);
    expect(featureProperties.kaomoji.default).toBe(DEFAULT_FEATURES.kaomoji);

    const zhtwProperties = zhtwObjectSchema.properties;
    expect(zhtwProperties.enabled.default).toBe(DEFAULT_FEATURES.zhtw.enabled);
    expect(zhtwProperties.case.default).toBe(DEFAULT_FEATURES.zhtw.case);
    expect(zhtwProperties.punctuation.default).toBe(
      DEFAULT_FEATURES.zhtw.punctuation,
    );
    expect(zhtwProperties.spacing.default).toBe(DEFAULT_FEATURES.zhtw.spacing);
    expect(zhtwProperties.quotes.default).toBe(DEFAULT_FEATURES.zhtw.quotes);

    const discordProperties = featureProperties.discord.properties;
    expect(discordProperties.headings.default).toBe(
      DEFAULT_FEATURES.discord.headings,
    );
    expect(discordProperties.separators.default).toBe(
      DEFAULT_FEATURES.discord.separators,
    );
    expect(discordProperties.links.default).toBe(
      DEFAULT_FEATURES.discord.links,
    );
    expect(discordProperties.blockquotes.default).toBe(
      DEFAULT_FEATURES.discord.blockquotes,
    );
    expect(discordProperties.boldInlineCode.default).toBe(
      DEFAULT_FEATURES.discord.boldInlineCode,
    );
  });

  it("documents backward-compatible boolean and object zhtw config shapes", () => {
    expect(featureProperties.zhtw.description).not.toContain("planned");
    expect(featureProperties.zhtw.anyOf).toHaveLength(2);
    expect(zhtwBooleanSchema).toEqual({ type: "boolean" });
    expect(zhtwObjectSchema.additionalProperties).toBe(false);
    expect(Object.keys(zhtwObjectSchema.properties)).toEqual([
      "enabled",
      "case",
      "punctuation",
      "spacing",
      "quotes",
    ]);
  });
});
