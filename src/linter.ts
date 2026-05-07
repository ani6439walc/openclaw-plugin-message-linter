import { DEFAULT_FEATURES, type LinterFeatures } from "./config.js";
import { maskMarkdownCode } from "./utils/mask.js";
import { formatLinks } from "./transforms/links.js";
import { replaceSeparators } from "./transforms/separators.js";
import { normalizeMarkdownHeadings } from "./transforms/headings.js";
import { sanitizeTokens } from "./transforms/kaomoji.js";
import { formatBlockquotes } from "./transforms/blockquotes.js";
import { convertZhTwViaMcp } from "./transforms/zhtw.js";

const HAS_CJK_RE = /[\u3400-\u9fff]/;

export async function lintMessageContent(
  content: string,
  converter: (text: string) => Promise<string | undefined> = convertZhTwViaMcp,
  features: LinterFeatures = {},
): Promise<string> {
  const cfg = { ...DEFAULT_FEATURES, ...features };

  let processed = content;
  let activeMask = maskMarkdownCode(processed);
  processed = activeMask.maskedText;

  if (cfg.zhtw && HAS_CJK_RE.test(content)) {
    const converted = await converter(content);
    if (typeof converted === "string" && converted.length > 0) {
      activeMask = maskMarkdownCode(converted);
      processed = activeMask.maskedText;
    }
  }

  if (cfg.links) {
    processed = formatLinks(processed);
  }

  let maskedText = processed;

  if (cfg.separators) {
    maskedText = replaceSeparators(maskedText);
  }

  if (cfg.kaomoji) {
    maskedText = sanitizeTokens(maskedText);
  }

  let inlineText = maskedText;

  if (cfg.headings) {
    inlineText = normalizeMarkdownHeadings(inlineText);
  }

  if (cfg.blockquotes) {
    inlineText = formatBlockquotes(inlineText);
  }

  return activeMask.restore(inlineText);
}

export async function lintMessageToolParams(
  params: Record<string, unknown>,
  converter: (text: string) => Promise<string | undefined> = convertZhTwViaMcp,
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
