import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { maskMarkdownCode } from "../../utils/mask.js";
import { S2TConverter } from "./s2t.js";
import { scanSpelling, applyFixes } from "./scanner.js";
import type { SpellingRule } from "./scanner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function findAssetsDir(): Promise<string> {
  const candidates = [
    join(__dirname, "..", "..", "..", "..", "assets"),
    join(__dirname, "..", "..", "..", "assets"),
    join(__dirname, "..", "assets"),
  ];
  for (const dir of candidates) {
    try {
      const s = await stat(dir);
      if (s.isDirectory()) return dir;
    } catch {}
  }
  throw new Error("Could not find assets directory");
}

async function loadTsvPairs(
  filename: string,
): Promise<Array<[string, string]>> {
  const assetsDir = await findAssetsDir();
  const text = await readFile(join(assetsDir, filename), "utf-8");
  const pairs: Array<[string, string]> = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length >= 2) {
      pairs.push([parts[0], parts[1]]);
    }
  }
  return pairs;
}

let converter: S2TConverter | null = null;
let spellingRules: SpellingRule[] | null = null;

async function ensureLoaded(): Promise<void> {
  if (converter && spellingRules) return;

  const [phrases, chars, variants, rulesText] = await Promise.all([
    loadTsvPairs("s2t-phrases.txt"),
    loadTsvPairs("s2t-chars.txt"),
    loadTsvPairs("s2t-tw-variants.txt"),
    readFile(join(await findAssetsDir(), "spelling-rules.json"), "utf-8"),
  ]);

  converter = new S2TConverter(phrases, chars, variants);
  spellingRules = JSON.parse(rulesText) as SpellingRule[];
}

export async function convertZhTw(text: string): Promise<string | undefined> {
  await ensureLoaded();
  const codeMask = maskMarkdownCode(text);
  const s2tResult = converter!.convert(codeMask.maskedText);
  const issues = scanSpelling(s2tResult, spellingRules!);
  const fixed = applyFixes(s2tResult, issues);
  return codeMask.restore(fixed);
}
