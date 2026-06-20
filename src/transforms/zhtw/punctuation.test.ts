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

  it("does not rewrite English sentences ending with parenthesized text", () => {
    expect(applyPunctuationRules("This is a test (English). 中文結束.")).toBe(
      "This is a test (English). 中文結束。",
    );
  });

  it("normalizes periods after English terms in Chinese sentences", () => {
    expect(applyPunctuationRules("我買了 iPhone. 版本是 iOS 18.")).toBe(
      "我買了 iPhone。 版本是 iOS 18。",
    );
  });

  it("normalizes repeated ASCII periods into a full-width ellipsis", () => {
    expect(applyPunctuationRules("等等......真的嗎...好吧.")).toBe(
      "等等……真的嗎……好吧。",
    );
  });
});
