import { describe, expect, it } from "vitest";
import { applyQuoteRules } from "./quotes.js";

describe("zhtw quote rules", () => {
  it("normalizes ASCII and Chinese-style smart double quotes in Chinese context", () => {
    expect(applyQuoteRules('他說"你好"，然後說“世界”。')).toBe(
      "他說「你好」，然後說「世界」。",
    );
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

  it("does not rewrite English quotes or apostrophes", () => {
    const input = 'He said "hello" and it\'s fine. 中文說"好"。';
    expect(applyQuoteRules(input)).toBe(
      'He said "hello" and it\'s fine. 中文說「好」。',
    );
  });
});
