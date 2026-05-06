import { definePluginEntry } from "./api.js";
import { registerMessageLinterPlugin } from "./src/plugin.js";

export default definePluginEntry({
  id: "message-linter",
  name: "Message Linter",
  description:
    "Suppresses automatic URL embeds in Discord messages by wrapping Markdown link URLs in angle brackets.",
  register: registerMessageLinterPlugin,
});

export { formatLinks } from "./src/transforms/links.js";
export { replaceSeparators } from "./src/transforms/separators.js";
export { normalizeMarkdownHeadings } from "./src/transforms/headings.js";
export { sanitizeTokens } from "./src/transforms/kaomoji.js";
export { formatBlockquotes } from "./src/transforms/blockquotes.js";
export { convertZhTwViaMcp, resolveZhtwMcpBin } from "./src/transforms/zhtw.js";
export { lintMessageContent, lintMessageToolParams } from "./src/linter.js";
export type { LinterFeatures } from "./src/config.js";
export { DEFAULT_FEATURES } from "./src/config.js";
