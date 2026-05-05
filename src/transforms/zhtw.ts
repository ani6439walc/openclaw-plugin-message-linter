import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { maskMarkdownCode } from "../utils/mask.js";
import type { ZhtwIssue, ZhtwToolPayload } from "../types.js";

const HAS_CJK_RE = /[\u3400-\u9fff]/;
const ZHTW_MCP_BIN_NAME = "zhtw-mcp";
const ZHTW_TIMEOUT_MS = 2500;

export function resolveZhtwMcpBin(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const homeDir = env.HOME?.trim() || os.homedir();
  const xdgBinHome = env.XDG_BIN_HOME?.trim();

  const candidateDirs = [
    xdgBinHome,
    path.join(homeDir, ".local", "bin"),
  ].filter((dir): dir is string => typeof dir === "string" && dir.length > 0);

  const candidateBins = Array.from(
    new Set(candidateDirs.map((dir) => path.join(dir, ZHTW_MCP_BIN_NAME))),
  );

  return (
    candidateBins.find((candidate) => fs.existsSync(candidate)) ??
    candidateBins[0] ??
    ZHTW_MCP_BIN_NAME
  );
}

function applyFirstSuggestionFallback(text: string, issues: unknown): string {
  if (!Array.isArray(issues)) {
    return text;
  }

  let output = text;
  for (const issue of issues as ZhtwIssue[]) {
    const found = typeof issue?.found === "string" ? issue.found : "";
    const firstSuggestion = Array.isArray(issue?.suggestions)
      ? issue.suggestions.find(
          (candidate): candidate is string =>
            typeof candidate === "string" && candidate.length > 0,
        )
      : undefined;

    if (!found || !firstSuggestion || found === firstSuggestion) {
      continue;
    }

    if (output.includes(found)) {
      output = output.replace(found, firstSuggestion);
    }
  }

  return output;
}

function extractZhtwToolText(stdout: string): string | undefined {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as any;
      if (parsed?.id !== 2) {
        continue;
      }

      const raw = parsed?.result?.content?.[0]?.text;
      if (typeof raw !== "string") {
        continue;
      }

      try {
        const nested = JSON.parse(raw) as ZhtwToolPayload;
        if (typeof nested?.text === "string") {
          return applyFirstSuggestionFallback(nested.text, nested.issues);
        }
      } catch {}

      return raw;
    } catch {}
  }

  return undefined;
}

async function forceS2TViaCli(text: string): Promise<string | undefined> {
  return await new Promise<string | undefined>((resolve) => {
    const zhtwMcpBin = resolveZhtwMcpBin();
    const child = spawn(
      zhtwMcpBin,
      ["convert", "--content-type", "markdown", "--"],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let settled = false;
    const settle = (value: string | undefined) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill();
      settle(undefined);
    }, ZHTW_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.on("error", () => {
      clearTimeout(timer);
      settle(undefined);
    });

    child.on("close", () => {
      clearTimeout(timer);
      settle(stdout.length > 0 ? stdout : undefined);
    });

    child.stdin.write(text);
    child.stdin.end();
  });
}

export async function convertZhTwViaMcp(
  text: string,
): Promise<string | undefined> {
  const codeMask = maskMarkdownCode(text);
  const basicConverted = await forceS2TViaCli(codeMask.maskedText);
  const normalizedText = basicConverted ?? codeMask.maskedText;

  const mcpResult = await new Promise<string | undefined>((resolve) => {
    const zhtwMcpBin = resolveZhtwMcpBin();
    const child = spawn(zhtwMcpBin, [], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let settled = false;
    const settle = (value: string | undefined) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      child.kill();
      settle(undefined);
    }, ZHTW_TIMEOUT_MS);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.on("error", () => {
      clearTimeout(timer);
      settle(undefined);
    });

    child.on("close", () => {
      clearTimeout(timer);
      const converted = extractZhtwToolText(stdout);
      settle(typeof converted === "string" ? converted : undefined);
    });

    const initReq = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "message-linter", version: "1.0.0" },
      },
    };
    const initializedNotif = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    };
    const callReq = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "zhtw",
        arguments: {
          text: normalizedText,
          fix_mode: "lexical_contextual",
          content_type: "markdown",
          political_stance: "roc_centric",
          detect_translationese: true,
          output: "full",
        },
      },
    };

    child.stdin.write(JSON.stringify(initReq) + "\n");
    child.stdin.write(JSON.stringify(initializedNotif) + "\n");
    child.stdin.write(JSON.stringify(callReq) + "\n");
    child.stdin.end();
  });

  const finalContent = mcpResult ?? basicConverted;
  return typeof finalContent === "string"
    ? codeMask.restore(finalContent)
    : undefined;
}
