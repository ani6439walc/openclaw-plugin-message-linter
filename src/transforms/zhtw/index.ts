import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { maskMarkdownCode } from "../../utils/mask.js";
import { S2TConverter } from "./s2t.js";
import { scanSpelling, applyFixes } from "./scanner.js";
import type { SpellingRule } from "./scanner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

class ZhTwManager {
  private converter: S2TConverter | null = null;
  private spellingRules: SpellingRule[] | null = null;
  private promise: Promise<void> | null = null;

  private async findAssetsDir(): Promise<string> {
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

  private async loadTsvPairs(filename: string): Promise<[string, string][]> {
    const assetsDir = await this.findAssetsDir();
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

  private ensure(): Promise<void> {
    if (!this.promise) {
      this.promise = (async () => {
        const [phrases, chars, variants, rulesText] = await Promise.all([
          this.loadTsvPairs("s2t-phrases.txt"),
          this.loadTsvPairs("s2t-chars.txt"),
          this.loadTsvPairs("s2t-tw-variants.txt"),
          readFile(
            join(await this.findAssetsDir(), "spelling-rules.json"),
            "utf-8",
          ),
        ]);
        const rules = JSON.parse(rulesText) as SpellingRule[];
        this.converter = new S2TConverter(phrases, chars, variants);
        this.spellingRules = rules;
      })();
    }
    return this.promise;
  }

  async convertZhTw(text: string): Promise<string | undefined> {
    await this.ensure();
    const codeMask = maskMarkdownCode(text);
    const s2tResult = this.converter!.convert(codeMask.maskedText);
    const issues = scanSpelling(s2tResult, this.spellingRules!);
    const fixed = applyFixes(s2tResult, issues);
    return codeMask.restore(fixed);
  }
}

export const zhTwManager = new ZhTwManager();

export const convertZhTw = zhTwManager.convertZhTw.bind(zhTwManager);
