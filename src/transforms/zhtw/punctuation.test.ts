import { describe, expect, it } from "vitest";
import { applyPunctuationRules } from "./punctuation.js";

describe("zhtw punctuation rules", () => {
  it("normalizes common half-width punctuation in Chinese context", () => {
    const input = "你好,世界!真的嗎?版本:測試;請看(說明).";
    expect(applyPunctuationRules(input)).toBe(
      "你好，世界！真的嗎？版本：測試；請看（說明）。",
    );
  });

  it("does not rewrite raw URLs, email addresses, or English sentences", () => {
    const input =
      "URL https://example.com/api?v=1.2, email admin@test.com, English: Hello, world! 中文,測試。";
    expect(applyPunctuationRules(input)).toBe(
      "URL https://example.com/api?v=1.2, email admin@test.com, English: Hello, world! 中文，測試。",
    );
  });
});
