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
});
