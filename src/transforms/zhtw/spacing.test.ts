import { describe, expect, it } from "vitest";
import { applySpacingRules } from "./spacing.js";

describe("zhtw spacing rules", () => {
  it("adds spaces between CJK text and ASCII words or numbers", () => {
    expect(applySpacingRules("在LeanCloud上花了5000元買iPhone15。")).toBe(
      "在 LeanCloud 上花了 5000 元買 iPhone15。",
    );
  });

  it("removes spaces adjacent to full-width punctuation", () => {
    expect(applySpacingRules("iPhone ，好開心。共有， 2項。")).toBe(
      "iPhone，好開心。共有，2 項。",
    );
  });

  it("deduplicates repeated full-width punctuation conservatively", () => {
    expect(
      applySpacingRules("太厲害了！！他說………算了，他———就是那個人。"),
    ).toBe("太厲害了！他說……算了，他——就是那個人。");
  });

  it("does not rewrite raw URLs or email addresses", () => {
    const input = "請看https://example.com/a/b和 admin@test.com。";
    expect(applySpacingRules(input)).toBe(
      "請看 https://example.com/a/b 和 admin@test.com。",
    );
  });
});
