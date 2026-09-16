import { describe, expect, it } from "vitest";
import { scanSpelling, applyFixes, type SpellingRule } from "./scanner.js";

describe("zhtw spelling scanner", () => {
  const rules: SpellingRule[] = [
    {
      from: "軟件",
      to: ["軟體"],
      type: "cross_strait",
    },
    {
      from: "網絡",
      to: ["網路"],
      type: "cross_strait",
    },
    {
      from: "代碼",
      to: ["程式碼"],
      type: "cross_strait",
    },
  ];

  it("replaces terms in ordinary usage", () => {
    const issues = scanSpelling("我們用軟件開發網絡服務。", rules);
    expect(issues).toHaveLength(2);
    expect(applyFixes("我們用軟件開發網絡服務。", issues)).toBe(
      "我們用軟體開發網路服務。",
    );
  });

  it("protects terms under metalinguistic discussion with corner quotes", () => {
    const text = "「軟件」是中國用語，我們用軟件開發。";
    const issues = scanSpelling(text, rules);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.found).toBe("軟件");
    expect(issues[0]?.offset).toBe(13);
    expect(applyFixes(text, issues)).toBe(
      "「軟件」是中國用語，我們用軟體開發。",
    );
  });

  it("protects terms under metalinguistic discussion with white corner quotes", () => {
    const text = "『網絡』這個詞在台灣寫作網路。";
    const issues = scanSpelling(text, rules);
    expect(issues).toHaveLength(0);
    expect(applyFixes(text, issues)).toBe(text);
  });

  it("protects terms under metalinguistic discussion with curly and ASCII quotes", () => {
    const curly = "“代碼”是一詞，代表程式碼。";
    const curlyIssues = scanSpelling(curly, rules);
    expect(curlyIssues).toHaveLength(0);

    const ascii = '"軟件"是大陸說法。';
    const asciiIssues = scanSpelling(ascii, rules);
    expect(asciiIssues).toHaveLength(0);
  });

  it("does not exclude quoted terms without a metalinguistic marker", () => {
    const text = "我們用「軟件」開發服務。";
    const issues = scanSpelling(text, rules);
    expect(issues).toHaveLength(1);
    expect(applyFixes(text, issues)).toBe("我們用「軟體」開發服務。");
  });

  it("does not exclude quoted terms when separated by sentence boundaries", () => {
    const text = "「軟件」。這個詞是中國用語。";
    const issues = scanSpelling(text, rules);
    expect(issues).toHaveLength(1);
    expect(applyFixes(text, issues)).toBe("「軟體」。這個詞是中國用語。");
  });

  it("does not exclude quoted phrases longer than 12 characters", () => {
    const text = "「安裝此軟件後請按下確定按鈕」這個詞需要說明。";
    const issues = scanSpelling(text, rules);
    expect(issues).toHaveLength(1);
    expect(applyFixes(text, issues)).toBe(
      "「安裝此軟體後請按下確定按鈕」這個詞需要說明。",
    );
  });
});
