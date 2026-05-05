import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveZhtwMcpBin, convertZhTwViaMcp } from "./zhtw.js";

describe("message-linter binary resolution", () => {
  it("prefers XDG_BIN_HOME when the binary exists there", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zhtw-xdg-"));
    const xdgBinHome = path.join(tempRoot, "xdg-bin");
    const homeDir = path.join(tempRoot, "home");
    fs.mkdirSync(xdgBinHome, { recursive: true });
    fs.mkdirSync(path.join(homeDir, ".local", "bin"), { recursive: true });
    fs.writeFileSync(path.join(xdgBinHome, "zhtw-mcp"), "");

    const resolved = resolveZhtwMcpBin({
      ...process.env,
      XDG_BIN_HOME: xdgBinHome,
      HOME: homeDir,
    });

    expect(resolved).toBe(path.join(xdgBinHome, "zhtw-mcp"));
  });

  it("falls back to HOME/.local/bin when XDG binary is missing", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zhtw-home-"));
    const xdgBinHome = path.join(tempRoot, "xdg-bin");
    const homeDir = path.join(tempRoot, "home");
    const homeBinDir = path.join(homeDir, ".local", "bin");
    fs.mkdirSync(xdgBinHome, { recursive: true });
    fs.mkdirSync(homeBinDir, { recursive: true });
    fs.writeFileSync(path.join(homeBinDir, "zhtw-mcp"), "");

    const resolved = resolveZhtwMcpBin({
      ...process.env,
      XDG_BIN_HOME: xdgBinHome,
      HOME: homeDir,
    });

    expect(resolved).toBe(path.join(homeBinDir, "zhtw-mcp"));
  });

  it("returns HOME/.local/bin candidate when neither path has the binary", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zhtw-missing-"));
    const homeDir = path.join(tempRoot, "home");
    const homeBinDir = path.join(homeDir, ".local", "bin");

    const resolved = resolveZhtwMcpBin({
      ...process.env,
      XDG_BIN_HOME: "",
      HOME: homeDir,
    });

    expect(resolved).toBe(path.join(homeBinDir, "zhtw-mcp"));
  });
});

describe("message-linter integration (convertZhTwViaMcp)", () => {
  it("converts simplified text and Mainland/political wording via local zhtw-mcp", async () => {
    const input = "中华人民共和国的软件后台支持视频，政治立场必须中立。";
    const output = await convertZhTwViaMcp(input);

    expect(typeof output).toBe("string");
    expect(output).toContain("中華人民共和國");
    expect(output).toContain("軟體");
    expect(output).toContain("後臺");
    expect(output).toContain("影片");
    expect(output).toContain("政治立場");

    expect(output).not.toContain("中华人民共和国");
    expect(output).not.toContain("软件");
    expect(output).not.toContain("后台");
    expect(output).not.toContain("視頻");
    expect(output).not.toContain("政治立场");
  }, 10000);

  it("preserves plain-text formatting while converting general text", async () => {
    const input = "中国软件和视频。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("中國軟體和影片。");
  }, 10000);

  it("preserves multiline plain-text formatting while converting", async () => {
    const input = "第一行：中国软件。\n第二行：支持视频。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("第一行：中國軟體。\n第二行：支援影片。");
  }, 10000);

  it("preserves indented emoji plain-text formatting while converting", async () => {
    const input = "  😀 中国软件和视频。\n    😺 支持后台。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("  😀 中國軟體和影片。\n    😺 支援後臺。");
  }, 10000);

  it("preserves indented emoji markdown formatting while converting", async () => {
    const input = "  - 😀 中国软件和视频。\n    - 😺 支持后台。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("  - 😀 中國軟體和影片。\n    - 😺 支援後臺。");
  }, 10000);

  it("forces S2T for mixed-script baobei example under markdown content type", async () => {
    const input = "可以喔，寶貝的簡體寫作：宝贝。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("可以喔，寶貝的簡體寫作：寶貝。");
  }, 10000);

  it("forces S2T for mixed-script multiline indented markdown without breaking formatting", async () => {
    const input = "  - 😀 寶貝的簡體寫作：宝贝。\n    - 😺 支持后台。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("  - 😀 寶貝的簡體寫作：寶貝。\n    - 😺 支持後臺。");
  }, 10000);

  it("preserves inline code spans while converting surrounding markdown text", async () => {
    const input = "Ani 會用 `字節`、`字节` 說明差異，外面是中国软件。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("Ani 會用 `字節`、`字节` 說明差異，外面是中國軟體。");
  }, 10000);

  it("preserves fenced code blocks while converting surrounding markdown text", async () => {
    const input = "```txt\n字节\n中国软件\n```\n外面是中国软件。";
    const output = await convertZhTwViaMcp(input);

    expect(output).toBe("```txt\n字节\n中国软件\n```\n外面是中國軟體。");
  }, 10000);
});
