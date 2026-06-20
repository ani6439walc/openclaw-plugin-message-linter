import { describe, expect, it } from "vitest";
import { applyCaseRules, scanCaseRules, type CaseRule } from "./case.js";

const rules: CaseRule[] = [
  { term: "GitHub" },
  { term: "TypeScript" },
  { term: "API", alternatives: ["Api", "api", "APIs"] },
  { term: "macOS" },
];

describe("zhtw case rules", () => {
  it("detects known casing alternatives", () => {
    const issues = scanCaseRules("github api typescript macos", rules);
    expect(issues.map((issue) => [issue.found, issue.suggestions[0]])).toEqual([
      ["github", "GitHub"],
      ["api", "API"],
      ["typescript", "TypeScript"],
      ["macos", "macOS"],
    ]);
  });

  it("applies case fixes without changing already-correct terms", () => {
    const output = applyCaseRules("github uses API and typescript", rules);
    expect(output).toBe("GitHub uses API and TypeScript");
  });

  it("does not rewrite terms embedded inside larger ASCII words", () => {
    const output = applyCaseRules("mygithub apiserver javascriptcore", rules);
    expect(output).toBe("mygithub apiserver javascriptcore");
  });
});
