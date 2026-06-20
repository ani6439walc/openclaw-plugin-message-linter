#!/usr/bin/env node
/**
 * Generate zhtw data files from upstream sources.
 *
 * Sources:
 *   - OpenCC dictionaries: https://github.com/ByVoid/OpenCC
 *   - zhtw-mcp ruleset:    https://github.com/sysprog21/zhtw-mcp
 *
 * Run: pnpm run generate:zhtw
 */

import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

const OPENCC_BASE =
  "https://raw.githubusercontent.com/ByVoid/OpenCC/master/data/dictionary";
const ZHTW_MCP_RULESET =
  "https://raw.githubusercontent.com/sysprog21/zhtw-mcp/main/assets/ruleset.json";

const OUT_DIR = path.resolve(import.meta.dirname, "../assets");

const AUTO_FIX_RULE_TYPES = new Set([
  "cross_strait",
  "political_coloring",
  "variant",
  "typo",
  "confusable",
]);

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function parseOpenCCTsv(text) {
  const entries = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 2) continue;
    const key = parts[0];
    const values = parts[1].split(" ");
    const value = values[0];
    if (key === value) continue;
    entries.push([key, value]);
  }
  return entries;
}

function parseOpenCCCharTsv(text) {
  return parseOpenCCTsv(text).filter(
    ([key, value]) => charLength(key) === 1 && charLength(value) === 1,
  );
}

function charLength(text) {
  return Array.from(text).length;
}

function formatTsv(entries) {
  return entries.map(([k, v]) => `${k}\t${v}`).join("\n") + "\n";
}

function cleanRules(rules) {
  return rules.map((r) => {
    const clean = {
      from: r.from,
      to: r.to,
      type: r.type,
    };
    if (r.context) clean.context = r.context;
    if (r.context_clues?.length) clean.contextClues = r.context_clues;
    if (r.negative_context_clues?.length)
      clean.negativeContextClues = r.negative_context_clues;
    if (r.positional_clues?.length) clean.positionalClues = r.positional_clues;
    if (r.exceptions?.length) clean.exceptions = r.exceptions;
    return clean;
  });
}

function isAutoFixRule(rule) {
  return (
    AUTO_FIX_RULE_TYPES.has(rule.type) &&
    rule.disabled !== true &&
    Array.isArray(rule.to) &&
    rule.to.length > 0 &&
    typeof rule.to[0] === "string" &&
    rule.to[0].length > 0
  );
}

async function main() {
  console.log("Fetching OpenCC dictionaries...");
  const [stPhrasesText, stCharsText, twVariantsText] = await Promise.all([
    fetchText(`${OPENCC_BASE}/STPhrases.txt`),
    fetchText(`${OPENCC_BASE}/STCharacters.txt`),
    fetchText(`${OPENCC_BASE}/TWVariants.txt`),
  ]);

  console.log("Fetching zhtw-mcp ruleset...");
  const ruleset = await fetchJson(ZHTW_MCP_RULESET);

  console.log("Parsing data...");
  const stPhrases = parseOpenCCTsv(stPhrasesText);
  const stChars = parseOpenCCCharTsv(stCharsText);
  const twVariants = parseOpenCCCharTsv(twVariantsText);

  // Sort phrases by longest key first for leftmost-longest matching.
  stPhrases.sort((a, b) => b[0].length - a[0].length);

  const filteredRules = ruleset.spelling_rules.filter(isAutoFixRule);

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
