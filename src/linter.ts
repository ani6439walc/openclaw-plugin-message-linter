import {
  resolveFeatures,
  type LinterFeatures,
  type ResolvedZhTwFeatures,
} from "./config.js";
import { maskMarkdownCode } from "./utils/mask.js";
import {
  formatLinks,
  replaceSeparators,
  normalizeMarkdownHeadings,
  formatBlockquotes,
  stripInlineCodeInMarkdownTables,
  wrapBoldWithBackticks,
} from "./transforms/discord.js";
import { sanitizeTokens } from "./transforms/kaomoji.js";
import { convertZhTw } from "./transforms/zhtw.js";

const HAS_CJK_RE = /[\u3400-\u9fff]/;

export async function lintMessageContent(
  content: string,
  converter: (
    text: string,
    zhtw: ResolvedZhTwFeatures,
  ) => Promise<string | undefined> = convertZhTw,
  features: LinterFeatures = {},
): Promise<string> {
  const cfg = resolveFeatures(features);
  const { discord } = cfg;

  let processed = content;
  // Strip a hallucinated single leading backtick only when the first line stays unbalanced.
  const leadingBacktick = processed.match(/^([ \t]*)`(?!`)([^\r\n]*)/);
  if (leadingBacktick) {
    const [, prefix, firstLineRest] = leadingBacktick;
    const separatedRest = firstLineRest.replace(/^[ \t]+/, "");
    const hasSeparator = separatedRest.length !== firstLineRest.length;
    const backticksInRest = separatedRest.match(/`/g)?.length ?? 0;
    const firstClosingBacktick = separatedRest.indexOf("`");
    const charAfterFirstClosing = separatedRest[firstClosingBacktick + 1];
    const closesDirectToken =
      !hasSeparator &&
      firstClosingBacktick > 0 &&
      (charAfterFirstClosing === undefined || /\s/.test(charAfterFirstClosing));
    const isClosed = closesDirectToken || backticksInRest % 2 === 1;

    if (!isClosed) {
      processed =
        `${prefix}${separatedRest}` +
        processed.slice(leadingBacktick[0].length);
      processed = processed.replace(/^[ \t]*\r?\n/, "");
    }
  }

  if (cfg.zhtw.enabled && HAS_CJK_RE.test(processed)) {
    const converted = await converter(processed, cfg.zhtw);
    if (typeof converted === "string" && converted.length > 0) {
      processed = converted;
    }
  }

  if (discord.boldInlineCode) {
    processed = stripInlineCodeInMarkdownTables(processed);
    processed = wrapBoldWithBackticks(processed);
  }

  const codeMask = maskMarkdownCode(processed);
  processed = codeMask.maskedText;

  if (discord.links) {
    processed = formatLinks(processed);
  }

  if (discord.separators) {
    processed = replaceSeparators(processed);
  }
  if (cfg.kaomoji) {
    processed = sanitizeTokens(processed);
  }

  if (discord.headings) {
    processed = normalizeMarkdownHeadings(processed);
  }

  if (discord.blockquotes) {
    processed = formatBlockquotes(processed);
  }

  return codeMask.restore(processed);
}

export async function lintMessageToolParams(
  params: Record<string, unknown>,
  converter: (
    text: string,
    zhtw: ResolvedZhTwFeatures,
  ) => Promise<string | undefined> = convertZhTw,
  features: LinterFeatures = {},
): Promise<Record<string, unknown>> {
  if (params.action !== "send" || typeof params.message !== "string") {
    return params;
  }

  const lintedMessage = await lintMessageContent(
    params.message,
    converter,
    features,
  );
  if (lintedMessage === params.message) {
    return params;
  }

  return {
    ...params,
    message: lintedMessage,
  };
}
