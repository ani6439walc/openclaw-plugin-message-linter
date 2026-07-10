#!/usr/bin/env node
/**
 * Generate ZH-TW data files from pinned upstream sources.
 *
 * Sources:
 *   - OpenCC dictionaries: https://github.com/BYVoid/OpenCC
 *   - zhtw-mcp ruleset:    https://github.com/sysprog21/zhtw-mcp
 *
 * Run: pnpm run generate:zhtw
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

export const OPENCC_COMMIT = "72965542721b5d0c171cda80016342aed3bd5a89";
export const ZHTW_MCP_COMMIT = "2e0f4e4912a8ffdacf7fa3a155cb20c29cba043b";
export const SOURCE_SHA256 = Object.freeze({
  stPhrases: "7f121e46abc71c1055ebee0445be4a98290023124657b24557f1a36bd2dc144d",
  stChars: "81c27e6364fd164181276197b9215cf95f7f12a050aa207375248a5badf8d6fc",
  twVariants:
    "48e694ad1ac43fd5927285e4fb3aa8a8dc9d9c065d6d3d314527c021a12839e2",
  ruleset: "2d43bf2f84a0a842911b216dc61b63d1f194509f396c64dc11a56748de9b657a",
});

const OPENCC_REPOSITORY = "https://github.com/BYVoid/OpenCC";
const ZHTW_MCP_REPOSITORY = "https://github.com/sysprog21/zhtw-mcp";
const OPENCC_BASE = `https://raw.githubusercontent.com/BYVoid/OpenCC/${OPENCC_COMMIT}/data/dictionary`;
const ZHTW_MCP_RULESET = `https://raw.githubusercontent.com/sysprog21/zhtw-mcp/${ZHTW_MCP_COMMIT}/assets/ruleset.json`;
const OUT_DIR = path.resolve(import.meta.dirname, "../assets");

const AUTO_FIX_RULE_TYPES = new Set([
  "cross_strait",
  "variant",
  "typo",
  "confusable",
]);

export const AMBIGUOUS_CHARS = new Set([
  "干",
  "复",
  "咸",
  "范",
  "丑",
  "佣",
  "伙",
  "舍",
  "症",
  "姜",
  "沈",
  "克",
  "后",
  "里",
  "余",
]);

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export async function fetchVerifiedText(
  url,
  expectedSha256,
  fetchImpl = fetch,
) {
  const response = await fetchImpl(url, { redirect: "error" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  if (response.redirected === true) {
    throw new Error(`Failed to fetch ${url}: redirected response`);
  }

  const text = await response.text();
  const actualSha256 = sha256(text);
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `SHA-256 mismatch for ${url}: expected ${expectedSha256}, got ${actualSha256}`,
    );
  }
  return text;
}

export function parseOpenCCTsv(text, { keepIdentity = false } = {}) {
  const entries = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("\t");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .split(/\s+/)[0];
    if (!value || (!keepIdentity && key === value)) continue;
    entries.push([key, value]);
  }
  return entries;
}

function charLength(text) {
  return Array.from(text).length;
}

export function parseOpenCCCharTsv(text) {
  return parseOpenCCTsv(text).filter(
    ([key, value]) => charLength(key) === 1 && charLength(value) === 1,
  );
}

export function filterSafeChars(chars, ambiguousChars = AMBIGUOUS_CHARS) {
  return chars.filter(([key]) => !ambiguousChars.has(key));
}

export function parseProtectedPhrases(text, ambiguousChars = AMBIGUOUS_CHARS) {
  const phrases = [];
  const seen = new Set();
  for (const [key, value] of parseOpenCCTsv(text, { keepIdentity: true })) {
    if (
      key === value &&
      !Array.from(key).some((char) => ambiguousChars.has(char))
    ) {
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    phrases.push([key, value]);
  }
  return phrases.sort(
    (left, right) => charLength(right[0]) - charLength(left[0]),
  );
}

export function isAutoFixRule(rule) {
  return (
    AUTO_FIX_RULE_TYPES.has(rule?.type) &&
    rule.disabled !== true &&
    Array.isArray(rule.to) &&
    rule.to.length === 1 &&
    typeof rule.to[0] === "string" &&
    rule.to[0].length > 0
  );
}

export function cleanRules(rules) {
  return rules.map((rule) => {
    const clean = {
      from: rule.from,
      to: rule.to,
      type: rule.type,
    };
    if (rule.context) clean.context = rule.context;
    if (rule.context_clues?.length) clean.contextClues = rule.context_clues;
    if (rule.negative_context_clues?.length) {
      clean.negativeContextClues = rule.negative_context_clues;
    }
    if (rule.positional_clues?.length) {
      clean.positionalClues = rule.positional_clues;
    }
    if (rule.exceptions?.length) clean.exceptions = rule.exceptions;
    return clean;
  });
}

export function cleanCaseRules(rules) {
  return rules
    .filter(
      (rule) => rule && rule.disabled !== true && typeof rule.term === "string",
    )
    .map((rule) => {
      const clean = { term: rule.term };
      if (Array.isArray(rule.alternatives) && rule.alternatives.length > 0) {
        clean.alternatives = rule.alternatives.filter(
          (value) => typeof value === "string" && value.length > 0,
        );
      }
      return clean;
    });
}

export function formatTsv(entries) {
  return entries.map(([key, value]) => `${key}\t${value}`).join("\n") + "\n";
}

export function formatJson(value) {
  return format(JSON.stringify(value), { parser: "json" });
}

export function buildProvenance(sourceTexts, counts) {
  return {
    schemaVersion: 1,
    sources: {
      opencc: {
        repository: OPENCC_REPOSITORY,
        commit: OPENCC_COMMIT,
        files: {
          "STPhrases.txt": sha256(sourceTexts.stPhrases),
          "STCharacters.txt": sha256(sourceTexts.stChars),
          "TWVariants.txt": sha256(sourceTexts.twVariants),
        },
      },
      zhtwMcp: {
        repository: ZHTW_MCP_REPOSITORY,
        commit: ZHTW_MCP_COMMIT,
        files: {
          "assets/ruleset.json": sha256(sourceTexts.ruleset),
        },
      },
    },
    counts,
  };
}

export async function generateZhTwData({
  outDir = OUT_DIR,
  fetchImpl = fetch,
} = {}) {
  console.log("Fetching pinned OpenCC dictionaries...");
  const [stPhrasesText, stCharsText, twVariantsText, rulesetText] =
    await Promise.all([
      fetchVerifiedText(
        `${OPENCC_BASE}/STPhrases.txt`,
        SOURCE_SHA256.stPhrases,
        fetchImpl,
      ),
      fetchVerifiedText(
        `${OPENCC_BASE}/STCharacters.txt`,
        SOURCE_SHA256.stChars,
        fetchImpl,
      ),
      fetchVerifiedText(
        `${OPENCC_BASE}/TWVariants.txt`,
        SOURCE_SHA256.twVariants,
        fetchImpl,
      ),
      fetchVerifiedText(ZHTW_MCP_RULESET, SOURCE_SHA256.ruleset, fetchImpl),
    ]);

  const ruleset = JSON.parse(rulesetText);
  if (!Array.isArray(ruleset.spelling_rules)) {
    throw new Error(
      "Invalid zhtw-mcp ruleset: spelling_rules must be an array",
    );
  }

  const phrases = parseProtectedPhrases(stPhrasesText);
  const chars = filterSafeChars(parseOpenCCCharTsv(stCharsText));
  const variants = parseOpenCCCharTsv(twVariantsText);
  const spellingRules = cleanRules(
    ruleset.spelling_rules.filter(isAutoFixRule),
  );
  const caseRules = cleanCaseRules(ruleset.case_rules ?? []);
  const counts = {
    phrases: phrases.length,
    chars: chars.length,
    variants: variants.length,
    spellingRules: spellingRules.length,
    caseRules: caseRules.length,
  };
  const sourceTexts = {
    stPhrases: stPhrasesText,
    stChars: stCharsText,
    twVariants: twVariantsText,
    ruleset: rulesetText,
  };
  const [spellingJson, caseJson, provenanceJson] = await Promise.all([
    formatJson(spellingRules),
    formatJson(caseRules),
    formatJson(buildProvenance(sourceTexts, counts)),
  ]);

  console.log("Writing assets...");
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outDir, "s2t-phrases.txt"), formatTsv(phrases)),
    writeFile(path.join(outDir, "s2t-chars.txt"), formatTsv(chars)),
    writeFile(path.join(outDir, "s2t-tw-variants.txt"), formatTsv(variants)),
    writeFile(path.join(outDir, "spelling-rules.json"), spellingJson),
    writeFile(path.join(outDir, "case-rules.json"), caseJson),
    writeFile(path.join(outDir, "zhtw-sources.json"), provenanceJson),
  ]);

  console.log("Done!");
  console.log(`  s2t-phrases.txt    : ${counts.phrases} entries`);
  console.log(`  s2t-chars.txt      : ${counts.chars} entries`);
  console.log(`  s2t-tw-variants.txt: ${counts.variants} entries`);
  console.log(`  spelling-rules.json: ${counts.spellingRules} rules`);
  console.log(`  case-rules.json    : ${counts.caseRules} rules`);
  return counts;
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  generateZhTwData().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
