import { describe, expect, it } from "vitest";
import { sanitizeTokens } from "./kaomoji.js";

describe("message-linter kaomoji backtick sanitization", () => {
  it("replaces backticks around kaomoji with safe quotes", () => {
    const input = "喔喔！(`・ω・´):sparkles:";
    const output = sanitizeTokens(input);
    expect(output).toBe("喔喔！(ˋ・ω・ˊ):sparkles:");
  });

  it("sanitizes multiple kaomoji in one message", () => {
    const input = "(`・ω・´) and (`・ω・´)";
    const output = sanitizeTokens(input);
    expect(output).toBe("(ˋ・ω・ˊ) and (ˋ・ω・ˊ)");
  });

  it("sanitizes kaomoji even without CJK", () => {
    const input = "Hello (`・ω・´) world";
    const output = sanitizeTokens(input);
    expect(output).toBe("Hello (ˋ・ω・ˊ) world");
  });

  it("sanitizes kaomoji with Greek sigma and universal quantifier", () => {
    const input = "(σ`∀´)σ";
    const output = sanitizeTokens(input);
    expect(output).toBe("(σˋ∀ˊ)σ");
  });

  it("sanitizes kaomoji with acute accent and backtick", () => {
    const input = "(๑´ڡ`๑)";
    const output = sanitizeTokens(input);
    expect(output).toBe("(๑ˊڡˋ๑)");
  });

  it("sanitizes kaomoji attached directly after sentence punctuation", () => {
    const input = "主人，這題真的是在考架構師的基建基本功呢！(๑´ㅂ`๑)";
    const output = sanitizeTokens(input);
    expect(output).toBe("主人，這題真的是在考架構師的基建基本功呢！(๑ˊㅂˋ๑)");
  });
});
