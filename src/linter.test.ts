import { describe, expect, it } from "vitest";
import { lintMessageContent, lintMessageToolParams } from "./linter.js";

describe("message-linter logic (lintMessageContent)", () => {
  it("replaces separators outside code blocks", async () => {
    const input = "Hello\n───\nWorld";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("Hello\n~~　　　　　　　　　　　　　　　~~\nWorld");
  });

  it("preserves separators inside fenced code blocks", async () => {
    const input = "```\n───\n```\nHello\n---\nWorld";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe(
      "```\n───\n```\nHello\n~~　　　　　　　　　　　　　　　~~\nWorld",
    );
  });

  it("preserves separators inside inline code", async () => {
    const input = "Use `---` separator\n───\nDone";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe(
      "Use `---` separator\n~~　　　　　　　　　　　　　　　~~\nDone",
    );
  });

  it("applies zh-TW conversion when enabled", async () => {
    const input = "中国软件和视频";
    const output = await lintMessageContent(
      input,
      async () => "中國軟體和影片",
      { zhtw: true },
    );
    expect(output).toBe("中國軟體和影片");
  });

  it("passes resolved zhtw feature flags to the converter", async () => {
    let caseEnabled = false;
    const input = "github 和中国软件";
    const output = await lintMessageContent(
      input,
      async (text, zhtw) => {
        caseEnabled = zhtw.case;
        return text.replace("github", "GitHub").replace("中国", "中國");
      },
      { zhtw: { enabled: true, case: true } },
    );

    expect(caseEnabled).toBe(true);
    expect(output).toBe("GitHub 和中國软件");
  });

  it("skips zh-TW conversion by default", async () => {
    const input = "中国软件和视频";
    const output = await lintMessageContent(
      input,
      async () => "中國軟體和影片",
    );
    expect(output).toBe("中国软件和视频");
  });

  it("passes text to converter first, then applies formatting", async () => {
    let received = "";
    const input =
      "[https://example.com](https://example.com) 中国政治立场要中立，支持后台视频。";
    const output = await lintMessageContent(
      input,
      async (text) => {
        received = text;
        return text
          .replace("中国", "中國")
          .replace("政治立场", "政治立場")
          .replace("支持", "支援")
          .replace("后台", "後臺")
          .replace("视频", "影片");
      },
      { zhtw: true },
    );
    expect(received).toBe(input);
    expect(output).toBe(
      "[example.com](<https://example.com>) 中國政治立場要中立，支援後臺影片。",
    );
  });

  it("keeps Discord formatting fixes after zh-TW conversion", async () => {
    const input = [
      "本次跳過之檔案",
      "",
      "`**projects/ai/harness-engineering.md**`",
      "• 原因: 已有 [[syntheses/harness-engineering-方法論與實踐模式]] 完整覆蓋",
    ].join("\n");
    const output = await lintMessageContent(input, async (text) => text, {
      zhtw: true,
    });

    expect(output).toBe(
      [
        "本次跳過之檔案",
        "",
        "**`projects/ai/harness-engineering.md`**",
        "• 原因: 已有 [[syntheses/harness-engineering-方法論與實踐模式]] 完整覆蓋",
      ].join("\n"),
    );
  });

  it("converts bold-wrapped memory skill names in multi-line status lists", async () => {
    const input = [
      "`**memory-lookup**`",
      "• 狀態: ✅ 完整",
      "• 對應技能: 內建 memory_search/memory_get",
      "",
      "`**memory-recent**`",
      "• 狀態: ✅ 完整",
      "• 對應技能: 內建",
    ].join("\n");

    const output = await lintMessageContent(input);

    expect(output).toBe(
      [
        "**`memory-lookup`**",
        "• 狀態: ✅ 完整",
        "• 對應技能: 內建 memory_search/memory_get",
        "",
        "**`memory-recent`**",
        "• 狀態: ✅ 完整",
        "• 對應技能: 內建",
      ].join("\n"),
    );
  });

  it("strips inline code markers from table cells before OpenClaw bullet table rendering", async () => {
    const input = [
      "| 幽靈技能 | 被引用的意圖檔案 |",
      "|---|---|",
      "| `api-and-interface-design` | `architecture-design.md` |",
      "| `clawscan` | `skill-lifecycle.md` |",
    ].join("\n");

    const output = await lintMessageContent(input);

    expect(output).toBe(
      [
        "| 幽靈技能 | 被引用的意圖檔案 |",
        "|---|---|",
        "| api-and-interface-design | architecture-design.md |",
        "| clawscan | skill-lifecycle.md |",
      ].join("\n"),
    );
  });

  it("preserves a skill list with multiple bold inline-code segments", async () => {
    const input = [
      "主人～根據這篇文章的特性，Ani 推薦以下技能組合：",
      "",
      "**🎯 核心潤色技能**",
      "",
      "- **`edit-article`** — 把現有的技術文件改寫成 blog 格式（加入 lead hook、subheadings、短段落）",
      "- **`humanizer`** — 移除 AI 寫作痕跡（第一人稱、感官細節、句子節奏變化、真實反應）",
      "- **`article`** — 如果需要從頭重寫成新聞學標準的文章",
      "",
      "**💡 輔助技能**",
      "",
      "- **`treemd`** — 先預覽大綱結構，決定哪些段落要保留/重組",
      "- **`humor`** — 加入主人的幽默風格（SRE 式的乾式幽默）",
      "- **`markdown`** — 最後的格式潤色",
    ].join("\n");

    const output = await lintMessageContent(input, async (text) => text, {
      zhtw: true,
    });

    expect(output).toBe(input);
  });

  it("removes a stray leading backtick before normal prose", async () => {
    const input = [
      "` 把 USB 5V 降到電池工作電壓，再接到主機板的電池接點。",
      "",
      "- **注意極性**：電池接點通常有 `+` / `-` 標示，接反會燒板子。",
      "- **電流容量**：RG476H 的 T820 晶片負載時可能拉到 1.5-2A，DC-DC 模組要選夠力的（建議 3A 以上）。",
      "",
      "---",
      "",
      "## ⚠️ 風險提醒",
    ].join("\n");

    const output = await lintMessageContent(input, async (text) => text, {
      zhtw: true,
    });

    expect(output).toBe(
      [
        "把 USB 5V 降到電池工作電壓，再接到主機板的電池接點。",
        "",
        "- **注意極性**：電池接點通常有 `+` / `-` 標示，接反會燒板子。",
        "- **電流容量**：RG476H 的 T820 晶片負載時可能拉到 1.5-2A，DC-DC 模組要選夠力的（建議 3A 以上）。",
        "",
        "~~　　　　　　　　　　　　　　　~~",
        "",
        "## ⚠️ 風險提醒",
      ].join("\n"),
    );
  });

  it("preserves leading inline code when the first line closes the backtick", async () => {
    const input = "` USB 5V ` should stay inline code\n---\nDone";
    const output = await lintMessageContent(input);

    expect(output).toBe(
      "` USB 5V ` should stay inline code\n~~　　　　　　　　　　　　　　　~~\nDone",
    );
  });

  it("removes a stray leading backtick followed by a tab or newline", async () => {
    await expect(lintMessageContent("`\tTabbed prose")).resolves.toBe(
      "Tabbed prose",
    );
    await expect(lintMessageContent("`\nNext line prose")).resolves.toBe(
      "Next line prose",
    );
  });

  it("removes a stray leading backtick followed directly by text", async () => {
    await expect(
      lintMessageContent("`把 USB 5V 降到電池工作電壓"),
    ).resolves.toBe("把 USB 5V 降到電池工作電壓");
  });

  it("removes a direct-text stray leading backtick before later inline code", async () => {
    await expect(
      lintMessageContent("`Note: use `config` properly"),
    ).resolves.toBe("Note: use `config` properly");
  });

  it("preserves the newline after stripping a direct-text leading backtick", async () => {
    await expect(lintMessageContent("`Hello\nWorld")).resolves.toBe(
      "Hello\nWorld",
    );
  });

  it("removes an empty first line left by a stray leading backtick", async () => {
    await expect(lintMessageContent("`  \nNext line")).resolves.toBe(
      "Next line",
    );
  });

  it("removes a stray leading backtick before a later inline code span", async () => {
    await expect(lintMessageContent("` Use `code` normally")).resolves.toBe(
      "Use `code` normally",
    );
  });

  it("preserves multi-backtick code that starts the message", async () => {
    const input = "``value with `inner` tick``";
    await expect(lintMessageContent(input)).resolves.toBe(input);
  });

  it("falls back to formatted text when converter has no output", async () => {
    const input = "[https://example.com](https://example.com) 中国";
    const output = await lintMessageContent(input, async () => undefined, {
      zhtw: true,
    });
    expect(output).toBe("[example.com](<https://example.com>) 中国");
  });

  it("preserves code regions after zh-TW conversion remasks the converted text", async () => {
    const input = "中国 `字节`\n```txt\n视频\n```\n[連結](https://a.com)";
    const output = await lintMessageContent(
      input,
      async () => "中國 `字节`\n```txt\n影片\n```\n[連結](https://a.com)",
      { zhtw: true },
    );

    expect(output).toBe(
      "中國 `字节`\n```txt\n影片\n```\n[連結](<https://a.com>)",
    );
  });

  it("skips converter for non-CJK content", async () => {
    let called = false;
    const input = "Hello [https://example.com](https://example.com)";
    const output = await lintMessageContent(input, async () => {
      called = true;
      return "should-not-be-used";
    });
    expect(called).toBe(false);
    expect(output).toBe("Hello [example.com](<https://example.com>)");
  });

  it("lints message tool send payloads", async () => {
    const output = await lintMessageToolParams(
      {
        action: "send",
        message: "中国软件和视频。",
        target: "123",
      },
      async () => "中國軟體和影片。",
      { zhtw: true },
    );

    expect(output).toEqual({
      action: "send",
      message: "中國軟體和影片。",
      target: "123",
    });
  });

  it("leaves non-send message tool payloads unchanged", async () => {
    const params = {
      action: "member-info",
      userId: "123",
    };

    const output = await lintMessageToolParams(params, async () => {
      throw new Error("converter should not run");
    });

    expect(output).toBe(params);
  });
});

describe("message-linter feature toggles", () => {
  it("disables link formatting when links is false", async () => {
    const input = "[Example](https://example.com)";
    const output = await lintMessageContent(input, async (text) => text, {
      discord: { links: false },
    });
    expect(output).toBe("[Example](https://example.com)");
  });

  it("disables separator replacement when separators is false", async () => {
    const input = "Hello\n───\nWorld";
    const output = await lintMessageContent(input, async (text) => text, {
      discord: { separators: false },
    });
    expect(output).toBe("Hello\n───\nWorld");
  });

  it("disables heading normalization when headings is false", async () => {
    const input = "## Sub\n#### H4";
    const output = await lintMessageContent(input, async (text) => text, {
      discord: { headings: false },
    });
    expect(output).toBe("## Sub\n#### H4");
  });

  it("disables kaomoji sanitization when kaomoji is false", async () => {
    const input = "(`・ω・´)";
    const output = await lintMessageContent(input, async (text) => text, {
      kaomoji: false,
    });
    expect(output).toBe("(`・ω・´)");
  });

  it("only applies enabled features", async () => {
    const input = "[A](https://a.com)\n───\n(`・ω・´)\n#### H4";
    const output = await lintMessageContent(input, async (text) => text, {
      discord: { links: true, separators: false, headings: true },
      kaomoji: false,
    });
    expect(output).toBe("[A](<https://a.com>)\n───\n(`・ω・´)\n# H4");
  });

  it("preserves real inline code spans", async () => {
    const input = "Use `console.log` to debug";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("Use `console.log` to debug");
  });

  it("preserves fenced code blocks", async () => {
    const input = "```js\nconst x = 1;\n```\n(`・ω・´)";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("```js\nconst x = 1;\n```\n(ˋ・ω・ˊ)");
  });

  it("preserves inline code while sanitizing kaomoji", async () => {
    const input = "Use `console.log` and (`・ω・´)";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("Use `console.log` and (ˋ・ω・ˊ)");
  });

  it("sanitizes kaomoji before a later inline code span without cross-matching backticks", async () => {
    const input =
      "主人，這題真的是在考架構師的基建基本功呢！(๑´ㅂ`๑)\nUse `console.log`";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe(
      "主人，這題真的是在考架構師的基建基本功呢！(๑ˊㅂˋ๑)\nUse `console.log`",
    );
  });

  it("sanitizes kaomoji attached directly after sentence punctuation", async () => {
    const input = "主人，這題真的是在考架構師的基建基本功呢！(๑´ㅂ`๑)";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("主人，這題真的是在考架構師的基建基本功呢！(๑ˊㅂˋ๑)");
  });

  it("preserves links inside inline code and fenced code blocks", async () => {
    const input = [
      "`[A](https://a.com)`",
      "```md",
      "[B](https://b.com)",
      "```",
      "[C](https://c.com)",
    ].join("\n");
    const output = await lintMessageContent(input, async (text) => text);

    expect(output).toBe(
      [
        "`[A](https://a.com)`",
        "```md",
        "[B](https://b.com)",
        "```",
        "[C](<https://c.com>)",
      ].join("\n"),
    );
  });

  it("preserves multi-backtick inline code spans", async () => {
    const input = "Use ``value with `inner` tick`` and (ʘ`ʘ)";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("Use ``value with `inner` tick`` and (ʘˋʘ)");
  });

  it("does not treat a token-leading backtick as a kaomoji opener", async () => {
    const input = "`(ʘʘ)` and (ʘ`ʘ)";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("`(ʘʘ)` and (ʘˋʘ)");
  });

  it("preserves inline code spans with common operators", async () => {
    const input = "Use `a + b` and `x == y`";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("Use `a + b` and `x == y`");
  });

  it("does not treat mixed safe/raw accent file-like tokens as kaomoji", async () => {
    const input = "（ˋdist` 檔案）";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("（ˋdist` 檔案）");
  });

  it("does not touch headings inside fenced code blocks", async () => {
    const input = "## Sub\n```\n# Code\n#### Block\n```\n#### H4";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("# Sub\n```\n# Code\n#### Block\n```\n### H4");
  });

  it("does not touch headings inside inline code and skips normalization when no real H4+", async () => {
    const input = "## Sub and `#### inline` heading";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("## Sub and `#### inline` heading");
  });

  it("fixes blockquote continuation lines for Discord", async () => {
    const input = "> line 1\n>\n> line 2";
    const output = await lintMessageContent(input, async (text) => text);
    expect(output).toBe("> line 1\n> \n> line 2");
  });

  it("does not fix blockquotes when blockquotes feature is disabled", async () => {
    const input = "> line 1\n>\n> line 2";
    const output = await lintMessageContent(input, async (text) => text, {
      discord: { blockquotes: false },
    });
    expect(output).toBe("> line 1\n>\n> line 2");
  });
});
