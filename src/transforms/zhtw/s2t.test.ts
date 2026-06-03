import { describe, it, expect } from "vitest";
import { S2TConverter } from "./s2t.js";
import { scanSpelling, applyFixes, type Issue } from "./scanner.js";

describe("S2TConverter", () => {
  describe("edge cases", () => {
    it("handles empty string", () => {
      const converter = new S2TConverter([], [], []);
      expect(converter.convert("")).toBe("");
    });

    it("passes through single latin character unchanged", () => {
      const converter = new S2TConverter([], [], []);
      expect(converter.convert("a")).toBe("a");
    });

    it("maps single CJK character when present in charMap", () => {
      const converter = new S2TConverter([], [["你", "妳"]], []);
      expect(converter.convert("你")).toBe("妳");
    });

    it("handles emoji (surrogate pairs) preserved with CJK conversion", () => {
      const converter = new S2TConverter([], [["你", "妳"]], []);
      expect(converter.convert("😀你好")).toBe("😀妳好");
    });

    it("handles mixed Latin + CJK correctly", () => {
      const converter = new S2TConverter(
        [],
        [
          ["你", "妳"],
          ["好", "佳"],
        ],
        [],
      );
      expect(converter.convert("Hello你好World世界")).toBe(
        "Hello妳佳World世界",
      );
    });

    it("handles very long repeated character text", () => {
      const converter = new S2TConverter([], [["你", "妳"]], []);
      const longInput = "你".repeat(10000);
      const result = converter.convert(longInput);
      expect(result).toBe("妳".repeat(10000));
      expect(result.length).toBe(10000);
    });

    it("handles text already in traditional form (no reverse conversion)", () => {
      const converter = new S2TConverter([], [["你", "妳"]], []);
      expect(converter.convert("中華人民共和國")).toBe("中華人民共和國");
    });

    it("longer phrase matches take priority over individual chars", () => {
      const converter = new S2TConverter(
        [["你好", "HELLO"]],
        [
          ["你", "N"],
          ["好", "G"],
        ],
        [],
      );
      const result = converter.convert("你好世界");
      expect(result).toBe("HELLO世界");
    });

    it("handles empty phrase/char arrays", () => {
      const converter = new S2TConverter([], [], []);
      expect(converter.convert("你好")).toBe("你好");
    });

    it("preserves whitespace (newlines, tabs)", () => {
      const converter = new S2TConverter(
        [],
        [
          ["你", "妳"],
          ["好", "佳"],
        ],
        [],
      );
      expect(converter.convert("你好\n你\t你好")).toBe("妳佳\n妳\t妳佳");
    });

    it("handles Unicode beyond BMP (surrogate pair chars)", () => {
      const converter = new S2TConverter(
        [],
        [
          ["你", "妳"],
          ["测", "測"],
          ["试", "試"],
        ],
        [],
      );
      expect(converter.convert("字符🎉测试")).toBe("字符🎉測試");
    });

    it("shorter phrase before longer phrase in array — longest-match wins", () => {
      const converter = new S2TConverter(
        [
          ["你", "N"],
          ["你好", "HELLO"],
        ],
        [
          ["你", "X"],
          ["好", "Y"],
        ],
        [],
      );
      expect(converter.convert("你好")).toBe("HELLO");
    });
  });
});

describe("scanSpelling edge cases", () => {
  it("returns empty array with no rules", () => {
    expect(scanSpelling("any text", [])).toEqual([]);
  });

  it("returns empty array with empty text", () => {
    const rules = [{ from: "test", to: ["TEST"], type: "test" }];
    expect(scanSpelling("", rules)).toEqual([]);
  });

  it("finds multiple occurrences of the same pattern", () => {
    const rules = [{ from: "test", to: ["TEST"], type: "test" }];
    const issues = scanSpelling("test abc test end test", rules);
    expect(issues).toHaveLength(3);
    expect(issues.map((i) => i.offset)).toEqual([0, 9, 18]);
  });

  it("honors context clues when scanning spelling rules", () => {
    const rules = [
      {
        from: "后台",
        to: ["後臺"],
        type: "cross_strait",
        contextClues: ["系統"],
      },
    ];

    expect(scanSpelling("系統后台", rules)).toEqual([
      { found: "后台", suggestions: ["後臺"], offset: 2 },
    ]);
    expect(scanSpelling("普通后台", rules)).toEqual([]);
  });

  it("honors negative context clues when scanning spelling rules", () => {
    const rules = [
      {
        from: "参数",
        to: ["參數"],
        type: "cross_strait",
        negativeContextClues: ["程式"],
      },
    ];

    expect(scanSpelling("設定参数", rules)).toEqual([
      { found: "参数", suggestions: ["參數"], offset: 2 },
    ]);
    expect(scanSpelling("程式参数", rules)).toEqual([]);
  });

  it("honors exceptions when scanning spelling rules", () => {
    const rules = [
      {
        from: "文件",
        to: ["檔案"],
        type: "cross_strait",
        exceptions: ["法律"],
      },
    ];

    expect(scanSpelling("一般文件", rules)).toEqual([
      { found: "文件", suggestions: ["檔案"], offset: 2 },
    ]);
    expect(scanSpelling("法律文件", rules)).toEqual([]);
  });

  it("honors positional clues when scanning spelling rules", () => {
    const rules = [
      {
        from: "消息",
        to: ["訊息"],
        type: "cross_strait",
        positionalClues: ["not_after:好", "not_before:來源"],
      },
    ];

    expect(scanSpelling("錯誤消息", rules)).toEqual([
      { found: "消息", suggestions: ["訊息"], offset: 2 },
    ]);
    expect(scanSpelling("好消息", rules)).toEqual([]);
    expect(scanSpelling("消息來源", rules)).toEqual([]);
  });
});

describe("applyFixes edge cases", () => {
  it("returns original text with no issues", () => {
    expect(applyFixes("你好世界", [])).toBe("你好世界");
  });

  it("handles overlapping issues correctly", () => {
    const issues: Issue[] = [
      { found: "你好", suggestions: ["HELLO"], offset: 0 },
      { found: "好世", suggestions: ["GOOD"], offset: 1 },
    ];
    const result = applyFixes("你好世界", issues);
    expect(result).toMatch(/HELLO/);
  });

  it("applies only the first suggestion per issue", () => {
    const issues: Issue[] = [
      { found: "你好", suggestions: ["HELLO", "HI"], offset: 0 },
    ];
    const result = applyFixes("你好世界", issues);
    expect(result).toBe("HELLO世界");
  });
});
