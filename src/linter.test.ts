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
      links: false,
    });
    expect(output).toBe("[Example](https://example.com)");
  });

  it("disables separator replacement when separators is false", async () => {
    const input = "Hello\n───\nWorld";
    const output = await lintMessageContent(input, async (text) => text, {
      separators: false,
    });
    expect(output).toBe("Hello\n───\nWorld");
  });

  it("disables heading normalization when headings is false", async () => {
    const input = "## Sub\n#### H4";
    const output = await lintMessageContent(input, async (text) => text, {
      headings: false,
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
      links: true,
      separators: false,
      kaomoji: false,
      headings: true,
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
      blockquotes: false,
    });
    expect(output).toBe("> line 1\n>\n> line 2");
  });
});
