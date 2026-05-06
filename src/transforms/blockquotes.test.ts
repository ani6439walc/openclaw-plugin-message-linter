import { describe, expect, it } from "vitest";
import { formatBlockquotes } from "./blockquotes.js";

describe("message-linter blockquote formatting", () => {
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
