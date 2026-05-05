import { describe, expect, it } from "vitest";
import { normalizeMarkdownHeadings } from "./headings.js";

describe("message-linter heading normalization", () => {
  it("shifts down so min becomes H1 when minLevel is H2", () => {
    const input = "## Sub\n### H3\n#### H4";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# Sub\n## H3\n### H4");
  });

  it("only caps H4+ to H3 when minLevel is H1", () => {
    const input = "# Title\n## Sub\n#### H4";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# Title\n## Sub\n### H4");
  });

  it("shifts down by 2 and caps to H3 when minLevel is H3", () => {
    const input = "### H3\n#### H4\n##### H5";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# H3\n## H4\n### H5");
  });

  it("leaves H3 and below untouched when no H4+ exist", () => {
    const input = "# Title\n## Sub\n### H3";
    const output = normalizeMarkdownHeadings(input);
    expect(output).toBe("# Title\n## Sub\n### H3");
  });
});
