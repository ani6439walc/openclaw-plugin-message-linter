import { definePluginEntry } from "./api.js";
import { registerMessageLinterPlugin } from "./src/plugin.js";

export default definePluginEntry({
  id: "message-linter",
  name: "Message Linter",
  description:
    "Suppresses automatic URL embeds in Discord messages by wrapping Markdown link URLs in angle brackets.",
  register: registerMessageLinterPlugin,
});

export {
  formatLinks,
  replaceSeparators,
  normalizeMarkdownHeadings,
  formatBlockquotes,
} from "./src/transforms/discord.js";
export { sanitizeTokens } from "./src/transforms/kaomoji.js";
export { convertZhTw } from "./src/transforms/zhtw.js";
export { lintMessageContent, lintMessageToolParams } from "./src/linter.js";
export type { LinterFeatures } from "./src/config.js";
export { DEFAULT_FEATURES } from "./src/config.js";
