import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error The Node-run generator intentionally has no declaration file.
import {
  AMBIGUOUS_CHARS,
  buildProvenance,
  fetchVerifiedText,
  filterSafeChars,
  formatJson,
  generateZhTwData,
  isAutoFixRule,
  parseOpenCCCharTsv,
  parseOpenCCTsv,
  parseProtectedPhrases,
  SOURCE_SHA256,
} from "./scripts/generate-zhtw-data.mjs";

describe("ZH-TW data generator", () => {
  it("parses primary OpenCC mappings and optionally keeps identity rows", () => {
    const input = "# comment\n后\t後 后\n天后\t天后\ninvalid\n";

    expect(parseOpenCCTsv(input)).toEqual([["后", "後"]]);
    expect(parseOpenCCTsv(input, { keepIdentity: true })).toEqual([
      ["后", "後"],
      ["天后", "天后"],
    ]);
  });

  it("retains only identity phrases that protect ambiguous characters", () => {
    const input = ["天后\t天后", "普通\t普通", "重复\t重複", "天后\t天後"].join(
      "\n",
    );

    expect(parseProtectedPhrases(input)).toEqual([
      ["天后", "天后"],
      ["重复", "重複"],
    ]);
  });

  it("removes curated ambiguous characters from fallback mappings", () => {
    const chars = parseOpenCCCharTsv("后\t後 后\n个\t個\n𠀾\t𠁞\n");

    expect(filterSafeChars(chars)).toEqual([
      ["个", "個"],
      ["𠀾", "𠁞"],
    ]);
    expect(AMBIGUOUS_CHARS.size).toBe(15);
  });

  it("accepts only deterministic non-political auto-fix rules", () => {
    expect(isAutoFixRule({ type: "cross_strait", to: ["軟體"] })).toBe(true);
    expect(isAutoFixRule({ type: "cross_strait", to: ["權杖", "令牌"] })).toBe(
      false,
    );
    expect(isAutoFixRule({ type: "political_coloring", to: ["中國"] })).toBe(
      false,
    );
    expect(isAutoFixRule({ type: "ai_filler", to: ["因此"] })).toBe(false);
    expect(
      isAutoFixRule({ type: "variant", to: ["正體"], disabled: true }),
    ).toBe(false);
  });

  it("builds deterministic provenance without a wall-clock timestamp", () => {
    const sourceTexts = {
      stPhrases: "phrases",
      stChars: "chars",
      twVariants: "variants",
      ruleset: "rules",
    };
    const counts = {
      phrases: 1,
      chars: 2,
      variants: 3,
      spellingRules: 4,
      caseRules: 5,
    };

    const provenance = buildProvenance(sourceTexts, counts);
    expect(provenance).toEqual(buildProvenance(sourceTexts, counts));
    expect(provenance).not.toHaveProperty("generatedAt");
    expect(provenance.sources.opencc.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(provenance.sources.opencc.files["STPhrases.txt"]).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it("verifies pinned source content and rejects redirects", async () => {
    const payload = "pinned source\n";
    const expectedSha256 = createHash("sha256").update(payload).digest("hex");
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      redirected: false,
      status: 200,
      text: async () => payload,
    }));

    await expect(
      fetchVerifiedText(
        "https://example.test/source",
        expectedSha256,
        fetchImpl as unknown as typeof fetch,
      ),
    ).resolves.toBe(payload);
    expect(fetchImpl).toHaveBeenCalledWith("https://example.test/source", {
      redirect: "error",
    });

    await expect(
      fetchVerifiedText(
        "https://example.test/source",
        "0".repeat(64),
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow("SHA-256 mismatch");

    const redirectingFetch = vi.fn(async () => ({
      ok: true,
      redirected: true,
      status: 200,
      text: async () => payload,
    }));
    await expect(
      fetchVerifiedText(
        "https://example.test/source",
        expectedSha256,
        redirectingFetch as unknown as typeof fetch,
      ),
    ).rejects.toThrow("redirected response");
  });

  it("rejects HTTP failures without reading the response body", async () => {
    const text = vi.fn(async () => "untrusted payload");
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      redirected: false,
      status: 503,
      text,
    }));

    await expect(
      fetchVerifiedText(
        "https://example.test/source",
        "0".repeat(64),
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow("Failed to fetch https://example.test/source: 503");
    expect(text).not.toHaveBeenCalled();
  });

  it("does not create the output directory when source verification fails", async () => {
    const parentDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "message-linter-zhtw-test-"),
    );
    const outDir = path.join(parentDir, "assets");
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      redirected: false,
      status: 503,
      text: async () => "untrusted payload",
    }));

    try {
      await expect(
        generateZhTwData({
          outDir,
          fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
      ).rejects.toThrow("Failed to fetch");
      expect(fs.existsSync(outDir)).toBe(false);
    } finally {
      fs.rmSync(parentDir, { recursive: true, force: true });
    }
  });

  it("formats generated JSON deterministically", async () => {
    const input = [{ short: ["a", "b"] }];
    const output = await formatJson(input);

    expect(output).toBe(await formatJson(input));
    expect(JSON.parse(output)).toEqual(input);
    expect(output.endsWith("\n")).toBe(true);
  });

  it("keeps bundled assets aligned with the pinned snapshot", () => {
    const readAsset = (name: string): string =>
      fs.readFileSync(new URL(`./assets/${name}`, import.meta.url), "utf8");
    const lineCount = (name: string): number =>
      readAsset(name).trimEnd().split("\n").length;
    const provenance = JSON.parse(readAsset("zhtw-sources.json"));

    const counts = {
      phrases: lineCount("s2t-phrases.txt"),
      chars: lineCount("s2t-chars.txt"),
      variants: lineCount("s2t-tw-variants.txt"),
      spellingRules: JSON.parse(readAsset("spelling-rules.json")).length,
      caseRules: JSON.parse(readAsset("case-rules.json")).length,
    };

    expect(counts).toEqual({
      phrases: 39751,
      chars: 3871,
      variants: 38,
      spellingRules: 1543,
      caseRules: 15,
    });
    expect(provenance.counts).toEqual(counts);
    expect(provenance.sources.opencc.files).toEqual({
      "STPhrases.txt": SOURCE_SHA256.stPhrases,
      "STCharacters.txt": SOURCE_SHA256.stChars,
      "TWVariants.txt": SOURCE_SHA256.twVariants,
    });
    expect(provenance.sources.zhtwMcp.files).toEqual({
      "assets/ruleset.json": SOURCE_SHA256.ruleset,
    });
  });
});
