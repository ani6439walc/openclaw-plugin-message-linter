import { describe, expect, it } from "vitest";
import {
  formatLinks,
  replaceSeparators,
  normalizeMarkdownHeadings,
  formatBlockquotes,
  wrapBoldWithBackticks,
} from "./discord.js";

describe("message-linter discord formatters (formatLinks)", () => {
  it("wraps standard markdown links in angle brackets", () => {
    const input = "Check this [Google](https://google.com) link.";
    const expected = "Check this [Google](<https://google.com>) link.";
    expect(formatLinks(input)).toBe(expected);
  });

  it("handles URLs with parentheses", () => {
    const input = "Wiki: [Link](https://en.wikipedia.org/wiki/Link_(film))";
    const expected =
      "Wiki: [Link](<https://en.wikipedia.org/wiki/Link_(film)>)";
    expect(formatLinks(input)).toBe(expected);
  });

  it("preserves link titles outside angle brackets", () => {
    const input = '[Example](https://example.com "my title")';
    const expected = '[Example](<https://example.com> "my title")';
    expect(formatLinks(input)).toBe(expected);
  });

  it("does not wrap links that are already wrapped", () => {
    const input = "[Already](<https://example.com>)";
    const expected = "[Already](<https://example.com>)";
    expect(formatLinks(input)).toBe(expected);
  });

  it("works with multiple links in one string", () => {
    const input = "[A](https://a.com) and [B](https://b.com)";
    const expected = "[A](<https://a.com>) and [B](<https://b.com>)";
    expect(formatLinks(input)).toBe(expected);
  });

  it("strips scheme from URL-like link label text", () => {
    const input = "[https://example.com](https://example.com)";
    const expected = "[example.com](<https://example.com>)";
    expect(formatLinks(input)).toBe(expected);
  });

  it("keeps non-URL label text unchanged", () => {
    const input = "[Visit https://example.com](https://example.com)";
    const expected = "[Visit https://example.com](<https://example.com>)";
    expect(formatLinks(input)).toBe(expected);
  });

  it("strips scheme from URL-like label with path and query", () => {
    const input =
      "[http://example.com/path/to/page?q=1&x=y](http://example.com/path/to/page?q=1&x=y)";
    const expected =
      "[example.com/path/to/page?q=1&x=y](<http://example.com/path/to/page?q=1&x=y>)";
    expect(formatLinks(input)).toBe(expected);
  });

  it("URL-encodes query strings with spaces and CJK characters", () => {
    const input =
      "[肯德基 北投光明餐廳](https://www.google.com/maps/dir/?api=1&destination=肯德基 北投光明餐廳)";
    const expected =
      "[肯德基 北投光明餐廳](<https://www.google.com/maps/dir/?api=1&destination=%E8%82%AF%E5%BE%B7%E5%9F%BA%20%E5%8C%97%E6%8A%95%E5%85%89%E6%98%8E%E9%A4%90%E5%BB%B3>)";
    expect(formatLinks(input)).toBe(expected);
  });
});

describe("message-linter discord formatters (replaceSeparators)", () => {
  it("replaces ─── separators with ~~...~~", () => {
    const input = "Hello\n───\nWorld";
    const expected = "Hello\n~~　　　　　　　　　　　　　　　~~\nWorld";
    expect(replaceSeparators(input)).toBe(expected);
  });

  it("replaces --- separators with ~~...~~", () => {
    const input = "Hello\n---\nWorld";
    const expected = "Hello\n~~　　　　　　　　　　　　　　　~~\nWorld";
    expect(replaceSeparators(input)).toBe(expected);
  });

  it("replaces multiple separators", () => {
    const input = "A\n───\nB\n---\nC";
    const expected =
      "A\n~~　　　　　　　　　　　　　　　~~\nB\n~~　　　　　　　　　　　　　　　~~\nC";
    expect(replaceSeparators(input)).toBe(expected);
  });

  it("does not replace separators without newlines", () => {
    const input = "Hello ─── World";
    expect(replaceSeparators(input)).toBe(input);
  });

  it("does not replace at start without leading newline", () => {
    const input = "───\nWorld";
    expect(replaceSeparators(input)).toBe(input);
  });

  it("does not replace at end without trailing newline", () => {
    const input = "Hello\n───";
    expect(replaceSeparators(input)).toBe(input);
  });
});

describe("message-linter discord formatters (normalizeMarkdownHeadings)", () => {
  it("shifts down so min becomes H1 when minLevel is H2", () => {
    const input = "## Sub\n### H3\n#### H4";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# Sub\n## H3\n### H4");
  });

  it("only caps H4+ to H3 when minLevel is H1", () => {
    const input = "# Title\n## Sub\n#### H4";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# Title\n## Sub\n### H4");
  });

  it("shifts down by 2 and caps to H3 when minLevel is H3", () => {
    const input = "### H3\n#### H4\n##### H5";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# H3\n## H4\n### H5");
  });

  it("leaves H3 and below untouched when no H4+ exist", () => {
    const input = "# Title\n## Sub\n### H3";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# Title\n## Sub\n### H3");
  });
});

describe("message-linter discord formatters (formatBlockquotes)", () => {
  it("adds space after bare > on empty continuation lines", () => {
    const input = "> line 1\n>\n> line 2";
    const output = formatBlockquotes(input);
    expect(output).toBe("> line 1\n> \n> line 2");
  });

  it("adds space after > when content starts immediately", () => {
    const input = ">text";
    const output = formatBlockquotes(input);
    expect(output).toBe("> text");
  });

  it("leaves already-correct blockquotes alone", () => {
    const input = "> line 1\n> line 2\n> line 3";
    const output = formatBlockquotes(input);
    expect(output).toBe("> line 1\n> line 2\n> line 3");
  });

  it("does not touch > inside regular text", () => {
    const input = "5 > 3 and 2 < 4";
    const output = formatBlockquotes(input);
    expect(output).toBe("5 > 3 and 2 < 4");
  });
});

describe("message-linter discord formatters (wrapBoldWithBackticks)", () => {
  it("converts backtick-wrapped bold to bold-wrapped backticks", () => {
    const input = "`**文字**`";
    const expected = "**`文字`**";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("converts English backtick-wrapped bold", () => {
    const input = "`**hello world**`";
    const expected = "**`hello world`**";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("handles multiple backtick-wrapped bold segments", () => {
    const input = "`**foo**` and `**bar**`";
    const expected = "**`foo`** and **`bar`**";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("does not double-wrap when already correctly formatted", () => {
    const input = "**`文字`**";
    const expected = "**`文字`**";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("ignores non-wrapped bold text", () => {
    const input = "**bold**";
    const expected = "**bold**";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("ignores inline code without bold", () => {
    const input = "`just code`";
    const expected = "`just code`";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("handles mixed content on same line", () => {
    const input = "prefix `**bold**` suffix";
    const expected = "prefix **`bold`** suffix";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("handles CJK characters in backtick-wrapped bold", () => {
    const input = "`**這是粗體文字**`";
    const expected = "**`這是粗體文字`**";
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });

  it("does not affect placeholders", () => {
    const input = `\uE000CODE_0\uE000`;
    const expected = `\uE000CODE_0\uE000`;
    expect(wrapBoldWithBackticks(input)).toBe(expected);
  });
});
