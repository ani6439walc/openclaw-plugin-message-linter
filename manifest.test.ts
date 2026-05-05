import fs from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(
  fs.readFileSync(new URL("./openclaw.plugin.json", import.meta.url), "utf-8"),
);

describe("message-linter manifest", () => {
  it("has the correct basic structure", () => {
    expect(manifest.id).toBe("message-linter");
    expect(manifest.description).toContain("angle brackets");
  });
});
