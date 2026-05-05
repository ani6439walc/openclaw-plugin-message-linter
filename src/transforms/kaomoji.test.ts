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
});
