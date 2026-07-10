import { definePluginEntry, type OpenClawPluginDefinition } from "./api.js";
import { registerMessageLinterPlugin } from "./src/plugin.js";

const plugin: OpenClawPluginDefinition = definePluginEntry({
  id: "message-linter",
  name: "Message Linter",
  description:
    "Normalizes outgoing messages with Discord-oriented Markdown cleanup, kaomoji-safe formatting, and optional Simplified Chinese to Taiwan Traditional Chinese conversion.",
  register: registerMessageLinterPlugin,
});

export default plugin;

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
