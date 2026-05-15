import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { maskMarkdownCode } from "../../utils/mask.js";
import { S2TConverter } from "./s2t.js";
import { scanSpelling, applyFixes } from "./scanner.js";
import type { SpellingRule } from "./scanner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

class ZhTwManager {
  private readonly converter: S2TConverter;
  private readonly spellingRules: SpellingRule[];

  constructor(
    phrases: Array<[string, string]>,
    chars: Array<[string, string]>,
    variants: Array<[string, string]>,
    rules: SpellingRule[],
  ) {
    this.converter = new S2TConverter(phrases, chars, variants);
    this.spellingRules = rules;
  }

  async convertZhTw(text: string): Promise<string | undefined> {
    const codeMask = maskMarkdownCode(text);
    const s2tResult = this.converter.convert(codeMask.maskedText);
    const issues = scanSpelling(s2tResult, this.spellingRules);
    const fixed = applyFixes(s2tResult, issues);
    return codeMask.restore(fixed);
  }
}

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

const [phrases, chars, variants, rulesText] = await Promise.all([
  loadTsvPairs("s2t-phrases.txt"),
  loadTsvPairs("s2t-chars.txt"),
  loadTsvPairs("s2t-tw-variants.txt"),
  readFile(join(await findAssetsDir(), "spelling-rules.json"), "utf-8"),
]);

const rules = JSON.parse(rulesText) as SpellingRule[];
export const zhTwManager = new ZhTwManager(phrases, chars, variants, rules);

export const convertZhTw = zhTwManager.convertZhTw.bind(zhTwManager);
