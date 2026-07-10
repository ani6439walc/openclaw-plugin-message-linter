import { describe, expect, it } from "vitest";
import { applyQuoteRules } from "./quotes.js";

describe("zhtw quote rules", () => {
  it("normalizes ASCII and Chinese-style smart double quotes in Chinese context", () => {
    expect(applyQuoteRules('他說"你好"，然後說“世界”。')).toBe(
      "他說「你好」，然後說「世界」。",
    );
  });

  it("does not pair ASCII quotes across sentence boundaries", () => {
    expect(applyQuoteRules('6" monitor。他說"你好"。')).toBe(
      '6" monitor。他說「你好」。',
    );
    expect(applyQuoteRules('他說"你好!"。')).toBe("他說「你好!」。");
  });

  it("does not pair smart quotes across sentence boundaries", () => {
    expect(applyQuoteRules("6“ monitor。他說“你好”。")).toBe(
      "6“ monitor。他說「你好」。",
    );
    expect(applyQuoteRules("6‘ monitor。他說‘你好’。")).toBe(
      "6‘ monitor。他說『你好』。",
    );
  });

  it("recognizes supplementary-plane Han quote context", () => {
    expect(applyQuoteRules('𠀀 "Hello" next')).toBe("𠀀 「Hello」 next");
  });

  it("normalizes nested single quotes inside Taiwan double quotes", () => {
    expect(applyQuoteRules("他說“請看‘說明’”。")).toBe(
      "他說「請看『說明』」。",
    );
  });

  it("normalizes English words in smart quotes when the surrounding sentence is Chinese", () => {
    expect(applyQuoteRules("他說“Hello”，然後說‘Apple’。")).toBe(
      "他說「Hello」，然後說『Apple』。",
    );
  });

  it("does not rewrite quotes inside raw URLs", () => {
    const input = '請看 https://example.com/search?q="test"，他說"好"。';
    expect(applyQuoteRules(input)).toBe(
      '請看 https://example.com/search?q="test"，他說「好」。',
    );
  });

  it("normalizes quotes around protected URLs without absorbing closing quotes", () => {
    expect(applyQuoteRules('他說 "https://github.com" 呢。')).toBe(
      "他說 「https://github.com」 呢。",
    );
  });

  it("normalizes padded English quotes in Chinese context", () => {
    expect(applyQuoteRules('他說 "Hello" 呢。')).toBe("他說 「Hello」 呢。");
  });

  it("does not rewrite English quotes or apostrophes", () => {
    const input = 'He said "hello" and it\'s fine. 中文說"好"。';
    expect(applyQuoteRules(input)).toBe(
      'He said "hello" and it\'s fine. 中文說「好」。',
    );
  });
});
