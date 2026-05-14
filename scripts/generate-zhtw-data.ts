#!/usr/bin/env bun
/**
 * Generate zhtw data files from upstream sources.
 *
 * Sources:
 *   - OpenCC dictionaries: https://github.com/ByVoid/OpenCC
 *   - zhtw-mcp ruleset:    https://github.com/sysprog21/zhtw-mcp
 *
 * Run: bun run scripts/generate-zhtw-data.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

const OPENCC_BASE =
  "https://raw.githubusercontent.com/ByVoid/OpenCC/master/data/dictionary";
const ZHTW_MCP_RULESET =
  "https://raw.githubusercontent.com/sysprog21/zhtw-mcp/main/assets/ruleset.json";

const OUT_DIR = path.resolve(import.meta.dirname, "../assets");

const ALLOWED_RULE_TYPES = new Set([
  "cross_strait",
  "political_coloring",
  "variant",
  "typo",
  "confusable",
]);

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function parseOpenCCTsv(text: string): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 2) continue;
    const key = parts[0];
    const values = parts[1].split(" ");
    entries.push([key, values[0]]);
  }
  return entries;
}

function formatTsv(entries: Array<[string, string]>): string {
  return entries.map(([k, v]) => `${k}\t${v}`).join("\n") + "\n";
}

interface RawRule {
  from: string;
  to: string[];
  type: string;
  context?: string;
  english?: string;
  context_clues?: string[];
  negative_context_clues?: string[];
  exceptions?: string[];
}

interface CleanRule {
  from: string;
  to: string[];
  type: string;
  context?: string;
  contextClues?: string[];
  negativeContextClues?: string[];
  exceptions?: string[];
}

function cleanRules(rules: RawRule[]): CleanRule[] {
  return rules.map((r) => {
    const clean: CleanRule = {
      from: r.from,
      to: r.to,
      type: r.type,
    };
    if (r.context) clean.context = r.context;
    if (r.context_clues?.length) clean.contextClues = r.context_clues;
    if (r.negative_context_clues?.length)
      clean.negativeContextClues = r.negative_context_clues;
    if (r.exceptions?.length) clean.exceptions = r.exceptions;
    return clean;
  });
}

async function main() {
  console.log("Fetching OpenCC dictionaries...");
  const [stPhrasesText, stCharsText, twVariantsText] = await Promise.all([
    fetchText(`${OPENCC_BASE}/STPhrases.txt`),
    fetchText(`${OPENCC_BASE}/STCharacters.txt`),
    fetchText(`${OPENCC_BASE}/TWVariants.txt`),
  ]);

  console.log("Fetching zhtw-mcp ruleset...");
  const ruleset = (await fetchJson(ZHTW_MCP_RULESET)) as {
    spelling_rules: RawRule[];
  };

  console.log("Parsing data...");
  const stPhrases = parseOpenCCTsv(stPhrasesText);
  const stChars = parseOpenCCTsv(stCharsText);
  const twVariants = parseOpenCCTsv(twVariantsText);

  // Sort phrases by longest key first for leftmost-longest matching
  stPhrases.sort((a, b) => b[0].length - a[0].length);

  const filteredRules = ruleset.spelling_rules.filter((r) =>
    ALLOWED_RULE_TYPES.has(r.type),
  );

  console.log("Writing assets...");
  await mkdir(OUT_DIR, { recursive: true });

  await writeFile(path.join(OUT_DIR, "s2t-phrases.txt"), formatTsv(stPhrases));

  await writeFile(path.join(OUT_DIR, "s2t-chars.txt"), formatTsv(stChars));

  await writeFile(
    path.join(OUT_DIR, "s2t-tw-variants.txt"),
    formatTsv(twVariants),
  );

  await writeFile(
    path.join(OUT_DIR, "spelling-rules.json"),
    JSON.stringify(cleanRules(filteredRules), null, 2) + "\n",
  );

  console.log("Done!");
  console.log(`  s2t-phrases.txt    : ${stPhrases.length} entries`);
  console.log(`  s2t-chars.txt      : ${stChars.length} entries`);
  console.log(`  s2t-tw-variants.txt: ${twVariants.length} entries`);
  console.log(`  spelling-rules.json: ${filteredRules.length} rules`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
