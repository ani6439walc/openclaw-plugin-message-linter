import { describe, expect, it } from "vitest";
import { replaceSeparators } from "./separators.js";

describe("message-linter logic (replaceSeparators)", () => {
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
