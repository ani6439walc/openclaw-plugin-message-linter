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

  if (cfg.zhtw.enabled && HAS_CJK_RE.test(content)) {
    const converted = await converter(content, cfg.zhtw);
    if (typeof converted === "string" && converted.length > 0) {
      processed = converted;
    }
  }

  if (discord.boldInlineCode) {
    processed = wrapBoldWithBackticks(processed);
  }

  const activeMask = maskMarkdownCode(processed);
  processed = activeMask.maskedText;

  if (discord.links) {
    processed = formatLinks(processed);
  }

  let maskedText = processed;

  if (discord.separators) {
    maskedText = replaceSeparators(maskedText);
  }

  if (cfg.kaomoji) {
    maskedText = sanitizeTokens(maskedText);
  }

  let inlineText = maskedText;

  if (discord.headings) {
    inlineText = normalizeMarkdownHeadings(inlineText);
  }

  if (discord.blockquotes) {
    inlineText = formatBlockquotes(inlineText);
  }

  return activeMask.restore(inlineText);
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
