import { DEFAULT_FEATURES, type LinterFeatures } from "./config.js";
import { maskFencedCode, maskInlineCode } from "./utils/mask.js";
import { formatLinks } from "./transforms/links.js";
import { replaceSeparators } from "./transforms/separators.js";
import { normalizeMarkdownHeadings } from "./transforms/headings.js";
import { sanitizeTokens } from "./transforms/kaomoji.js";
import { convertZhTwViaMcp } from "./transforms/zhtw.js";

const HAS_CJK_RE = /[\u3400-\u9fff]/;

export async function lintMessageContent(
  content: string,
  converter: (text: string) => Promise<string | undefined> = convertZhTwViaMcp,
  features: LinterFeatures = {},
): Promise<string> {
  const cfg = { ...DEFAULT_FEATURES, ...features };

  let processed = content;

  if (cfg.zhtw && HAS_CJK_RE.test(content)) {
    const converted = await converter(content);
    if (typeof converted === "string" && converted.length > 0) {
      processed = converted;
    }
  }

  if (cfg.links) {
    processed = formatLinks(processed);
  }

  const fencedMask = maskFencedCode(processed);
  let maskedText = fencedMask.maskedText;

  if (cfg.separators) {
    maskedText = replaceSeparators(maskedText);
  }

  if (cfg.kaomoji) {
    maskedText = sanitizeTokens(maskedText);
  }

  const inlineMask = maskInlineCode(maskedText);
  let inlineText = inlineMask.maskedText;

  if (cfg.headings) {
    inlineText = normalizeMarkdownHeadings(inlineText);
  }

  const withInline = inlineMask.restore(inlineText);
  return fencedMask.restore(withInline);
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
