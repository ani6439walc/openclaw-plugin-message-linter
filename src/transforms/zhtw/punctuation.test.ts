import { describe, expect, it } from "vitest";
import { applyPunctuationRules } from "./punctuation.js";

describe("zhtw punctuation rules", () => {
  it("normalizes common half-width punctuation in Chinese context", () => {
    const input = "你好,世界!真的嗎?版本:測試;請看(說明).";
    expect(applyPunctuationRules(input)).toBe(
      "你好，世界！真的嗎？版本：測試；請看（說明）。",
    );
  });

  it("recognizes supplementary-plane Han punctuation context", () => {
    expect(applyPunctuationRules("𠀀, next 𠀀. next 𠀀! next")).toBe(
      "𠀀， next 𠀀。 next 𠀀！ next",
    );
    expect(applyPunctuationRules("𠀀 text, next")).toBe("𠀀 text， next");
    expect(applyPunctuationRules("𠀀(foo)")).toBe("𠀀（foo）");
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

  it("normalizes sentence-ending periods after protected URLs", () => {
    expect(applyPunctuationRules("請看 https://example.com.")).toBe(
      "請看 https://example.com。",
    );
  });

  it("preserves numeric thousands separators", () => {
    expect(applyPunctuationRules("共有 1,000 筆資料")).toBe(
      "共有 1,000 筆資料",
    );
  });

  it("normalizes Chinese parenthetical pairs without mixing widths", () => {
    expect(applyPunctuationRules("請看(說明).")).toBe("請看（說明）。");
    expect(applyPunctuationRules("中文(foo)範例")).toBe("中文（foo）範例");
  });

  it("preserves function-call-like ASCII parentheses", () => {
    expect(applyPunctuationRules("呼叫 foo(中文) 取得結果.")).toBe(
      "呼叫 foo(中文) 取得結果。",
    );
  });
});
