import { describe, expect, it } from "vitest";
import { maskProtectedText } from "./protect.js";

describe("zhtw protected text masking", () => {
  it("does not collide with user-authored placeholder-like text", () => {
    const mask = maskProtectedText(
      "保留 __Z0__ 並保護 https://example.com/api。 ",
    );

    expect(mask.maskedText).toContain("__Z0__");
    expect(mask.maskedText).not.toContain("https://example.com/api");
    expect(mask.restore(mask.maskedText)).toBe(
      "保留 __Z0__ 並保護 https://example.com/api。 ",
    );
  });

  it("does not collide with existing PUA markers in user text", () => {
    const input = "\uE000PROTECT_0\uE001 https://example.com";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toContain("\uE000PROTECT_0\uE001");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("selects a placeholder prefix that is absent from the input", () => {
    const input = "保留 \uE000PROTECT_0_ 並保護 https://example.com";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toContain("\uE000PROTECT_0_");
    expect(mask.maskedText).toContain("\uE000PROTECT_1_0\uE001");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("protects CJK IRI paths and internationalized email text", () => {
    const input =
      "https://example.com/軟件 https://example.com?q=軟件 https://例子.公司/軟件 https://example.com/foo軟件 軟件@example.com admin@test.com和後續";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).not.toContain("軟件");
    expect(mask.maskedText).toMatch(/\uE001和後續$/u);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("treats undelimited Han text as part of an IRI", () => {
    const input = "https://example.com/a中「後續」";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).not.toContain("中");
    expect(mask.maskedText).toMatch(/\uE001「後續」$/u);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("protects balanced URL delimiters and quotes", () => {
    const input =
      'https://en.wikipedia.org/wiki/Foo_(bar) https://example.com/search?q="軟件"';
    const mask = maskProtectedText(input);

    expect(mask.maskedText).not.toContain("(bar)");
    expect(mask.maskedText).not.toContain("軟件");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("leaves closing ASCII quotes around URLs outside protection", () => {
    const input = "\"https://example.com/a\"軟件 'https://example.com/b'軟件";
    const mask = maskProtectedText(input);

    expect(mask.maskedText.match(/["']軟件/gu)).toHaveLength(2);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("stops at crossed URL delimiters", () => {
    const input = "https://example.com/a([)]軟件";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toContain(")]軟件");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("leaves CJK prose after URL punctuation outside protection", () => {
    const input = "https://example.com/api，軟件";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toMatch(/\uE001，軟件$/u);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("protects Unicode email domains and complete punycode labels", () => {
    const input =
      "用戶@例子.公司 δοκιμή@παράδειγμα.δοκιμή a@example.xn--fiqs8s";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).not.toContain("用戶");
    expect(mask.maskedText).not.toContain("δοκιμή");
    expect(mask.maskedText).not.toContain("xn--fiqs8s");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("does not partially protect malformed domain labels", () => {
    const input = "a@example.xn-- a@example.xn--fiqs8s- broken@例子.公司-";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toBe(input);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("leaves prose after ASCII TLDs on Unicode email domains", () => {
    const input = "admin@測試.com和後續 admin@測試.xn--fiqs8s和後續";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).not.toContain("admin@");
    expect(mask.maskedText.match(/和後續/gu)).toHaveLength(2);
    expect(mask.maskedText.endsWith("\uE001和後續")).toBe(true);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("treats undelimited Unicode text before @ as the email local-part", () => {
    const input = "請寄信給軟件@example.com";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).not.toContain("請寄信給軟件");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("leaves prose punctuation and unmatched delimiters outside URLs", () => {
    const input =
      "（https://example.com/路徑）。ftp://example.com/file。 https://x.test/path。]";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toMatch(/\uE001）。.*\uE001。.*\uE001。/u);
    expect(mask.maskedText.endsWith("\uE001。]")).toBe(true);
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("stops before inline prose delimiters after a URL", () => {
    const input =
      "https://example.com/a,軟件 https://example.com/a)軟件 https://example.com/a）軟件 https://example.com/a”軟件 https://example.com/a］軟件";
    const mask = maskProtectedText(input);

    expect(mask.maskedText).toContain(",軟件");
    expect(mask.maskedText).toContain(")軟件");
    expect(mask.maskedText).toContain("）軟件");
    expect(mask.maskedText).toContain("”軟件");
    expect(mask.maskedText).toContain("］軟件");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });
});
