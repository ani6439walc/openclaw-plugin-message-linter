import { describe, expect, it } from "vitest";
import { convertZhTw } from "./zhtw.js";

describe("message-linter integration (convertZhTw)", () => {
  it("converts simplified text and Mainland/political wording", async () => {
    const input = "中华人民共和国的软件后台支持视频，政治立场必须中立。";
    const output = await convertZhTw(input);

    expect(typeof output).toBe("string");
    expect(output).toContain("中華人民共和國");
    expect(output).toContain("軟體");
    expect(output).toContain("後臺");
    expect(output).toContain("視頻");
    expect(output).toContain("政治立場");

    expect(output).not.toContain("中华人民共和国");
    expect(output).not.toContain("软件");
    expect(output).not.toContain("后台");

    expect(output).not.toContain("政治立场");
  }, 10000);

  it("preserves plain-text formatting while converting general text", async () => {
    const input = "中国软件和视频。";
    const output = await convertZhTw(input);

    expect(output).toBe("中國軟體和視頻。");
  }, 10000);

  it("preserves multiline plain-text formatting while converting", async () => {
    const input = "第一行：中国软件。\n第二行：支持视频。";
    const output = await convertZhTw(input);

    expect(output).toBe("第一行：中國軟體。\n第二行：支援視頻。");
  }, 10000);

  it("preserves indented emoji plain-text formatting while converting", async () => {
    const input = "  😀 中国软件和视频。\n    😺 支持后台。";
    const output = await convertZhTw(input);

    expect(output).toBe("  😀 中國軟體和視頻。\n    😺 支援後臺。");
  }, 10000);

  it("preserves indented emoji markdown formatting while converting", async () => {
    const input = "  - 😀 中国软件和视频。\n    - 😺 支持后台。";
    const output = await convertZhTw(input);

    expect(output).toBe("  - 😀 中國軟體和視頻。\n    - 😺 支援後臺。");
  }, 10000);

  it("forces S2T for mixed-script baobei example under markdown content type", async () => {
    const input = "可以喔，寶貝的簡體寫作：宝贝。";
    const output = await convertZhTw(input);

    expect(output).toBe("可以喔，寶貝的簡體寫作：寶貝。");
  }, 10000);

  it("forces S2T for mixed-script multiline indented markdown without breaking formatting", async () => {
    const input = "  - 😀 寶貝的簡體寫作：宝贝。\n    - 😺 支持后台。";
    const output = await convertZhTw(input);

    expect(output).toBe("  - 😀 寶貝的簡體寫作：寶貝。\n    - 😺 支持後臺。");
  }, 10000);

  it("uses upstream-safe contact phrases without rewriting broad valid wording", async () => {
    const input =
      "如需協助請聯繫客服，留下聯繫電話，但也可以保持聯繫。參數與文件照原意保留。";
    const output = await convertZhTw(input);

    expect(output).toBe(
      "如需協助請聯絡客服，留下聯絡電話，但也可以保持聯繫。參數與文件照原意保留。",
    );
  }, 10000);

  it.each([
    ["范先生", "范先生"],
    ["辛丑", "辛丑"],
    ["佣金", "佣金"],
    ["天后宫", "天后宮"],
    ["邻里", "鄰里"],
    ["巧克力", "巧克力"],
    ["头发", "頭髮"],
    ["面条", "麵條"],
    ["女佣", "女傭"],
    ["咸菜", "鹹菜"],
    ["芒果干", "芒果乾"],
    ["个", "個"],
    ["万", "萬"],
    ["当", "當"],
    ["并附上", "並附上"],
    ["以后", "以後"],
    ["雨后", "雨後"],
    ["心里", "心裡"],
  ])(
    "matches the upstream S2T golden corpus: %s",
    async (input, expected) => {
      await expect(convertZhTw(input)).resolves.toBe(expected);
    },
    10000,
  );

  it("does not auto-fix ambiguous lexical rules", async () => {
    await expect(convertZhTw("區塊鏈令牌與 NLP 令牌")).resolves.toBe(
      "區塊鏈令牌與 NLP 令牌",
    );
  }, 10000);

  it.each([
    ["行列式初等矩陣", "行列式基本矩陣"],
    ["電腦系統盤", "電腦系統磁碟"],
    ["軟體過程式", "軟體程序式"],
    ["結帳購物籃", "結帳購物車"],
  ])(
    "applies synchronized contextual clues: %s",
    async (input, expected) => {
      await expect(convertZhTw(input)).resolves.toBe(expected);
    },
    10000,
  );

  it.each(["初等矩陣", "系統盤", "過程式", "購物籃"])(
    "does not apply synchronized contextual rules without a clue: %s",
    async (input) => {
      await expect(convertZhTw(input)).resolves.toBe(input);
    },
    10000,
  );

  it("protects URLs and email addresses from base S2T and spelling passes", async () => {
    const input = "https://example.com/軟件 軟件@example.com";
    await expect(convertZhTw(input)).resolves.toBe(input);
  }, 10000);

  it("preserves inline code spans while converting surrounding markdown text", async () => {
    const input = "Ani 會用 `字節`、`字节` 說明差異，外面是中国软件。";
    const output = await convertZhTw(input);

    expect(output).toBe("Ani 會用 `字節`、`字节` 說明差異，外面是中國軟體。");
  }, 10000);

  it("preserves fenced code blocks while converting surrounding markdown text", async () => {
    const input = "```txt\n字节\n中国软件\n```\n外面是中国软件。";
    const output = await convertZhTw(input);

    expect(output).toBe("```txt\n字节\n中国软件\n```\n外面是中國軟體。");
  }, 10000);

  it("applies case rules only when explicitly enabled", async () => {
    const input = "github 和 typescript 支持中国软件。";

    await expect(convertZhTw(input)).resolves.toBe(
      "github 和 typescript 支援中國軟體。",
    );
    await expect(convertZhTw(input, { case: true })).resolves.toBe(
      "GitHub 和 TypeScript 支援中國軟體。",
    );
  }, 10000);

  it("preserves case rule matches inside markdown code regions", async () => {
    const input = "github `github`\n```txt\ntypescript\n```";
    const output = await convertZhTw(input, { case: true });

    expect(output).toBe("GitHub `github`\n```txt\ntypescript\n```");
  }, 10000);

  it("applies punctuation, spacing, and quote rules only when explicitly enabled", async () => {
    const input = 'github說"你好",花了5000元買iPhone15!';

    await expect(convertZhTw(input, { case: true })).resolves.toBe(
      'GitHub說"你好",花了5000元買iPhone15!',
    );
    await expect(
      convertZhTw(input, {
        case: true,
        punctuation: true,
        spacing: true,
        quotes: true,
      }),
    ).resolves.toBe("GitHub 說「你好」，花了 5000 元買 iPhone15！");
  }, 10000);

  it("preserves urls and markdown code regions across phase 2 rules", async () => {
    const input =
      '請看https://api.github.com/v1, `中文,api`\n```txt\n中文,api\n```\n他說"好"。';
    const output = await convertZhTw(input, {
      case: true,
      punctuation: true,
      spacing: true,
      quotes: true,
    });

    expect(output).toBe(
      "請看 https://api.github.com/v1， `中文,api`\n```txt\n中文,api\n```\n他說「好」。",
    );
  }, 10000);
});
