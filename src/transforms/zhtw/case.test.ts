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

  it("does not rewrite terms inside snake_case identifiers", () => {
    const output = applyCaseRules("my_api_key uses api", rules);
    expect(output).toBe("my_api_key uses API");
  });

  it("does not rewrite terms inside URLs or email addresses", () => {
    const output = applyCaseRules(
      "Use https://api.github.com/v1 and admin@api.com, not github docs.",
      rules,
    );
    expect(output).toBe(
      "Use https://api.github.com/v1 and admin@api.com, not GitHub docs.",
    );
  });

  it("fixes common casing variants without requiring exhaustive alternatives", () => {
    const output = applyCaseRules("Github and TYPESCRIPT call api", rules);
    expect(output).toBe("GitHub and TypeScript call API");
  });
});
