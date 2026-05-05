import { describe, expect, it } from "vitest";
import { formatLinks } from "./links.js";

describe("message-linter logic (formatLinks)", () => {
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
