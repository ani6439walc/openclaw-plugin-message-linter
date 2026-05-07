import { describe, expect, it } from "vitest";
import { maskMarkdownCode } from "./mask.js";

describe("message-linter markdown masking", () => {
  it("masks inline code spans and restores them losslessly", () => {
    const input = "Use `console.log()` to debug";
    const mask = maskMarkdownCode(input);

    expect(mask.maskedText).toBe("Use \uE000CODE_0\uE001 to debug");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("masks multi-backtick inline code spans", () => {
    const input = "Use ``value with `inner` tick`` safely";
    const mask = maskMarkdownCode(input);

    expect(mask.maskedText).toBe("Use \uE000CODE_0\uE001 safely");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("masks fenced code blocks including unclosed fences", () => {
    const input = "```ts\nconst x = 1;\n";
    const mask = maskMarkdownCode(input);

    expect(mask.maskedText).toBe("\uE000CODE_0\uE001\n\n");
    expect(mask.restore(mask.maskedText)).toBe(input);
  });

  it("does not treat kaomoji backticks as inline code openers", () => {
    const input = "主人最喜歡了！(๑´ㅂ`๑) and `console.log()`";
    const mask = maskMarkdownCode(input);

    expect(mask.maskedText).toBe(
      "主人最喜歡了！(๑´ㅂ`๑) and \uE000CODE_0\uE001",
    );
    expect(mask.restore(mask.maskedText)).toBe(input);
  });
});
