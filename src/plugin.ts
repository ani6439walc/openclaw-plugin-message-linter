import { type OpenClawPluginApi } from "../api.js";
import { resolveConfig } from "./config.js";
import { createHookHandlers } from "./hooks.js";

export function registerMessageLinterPlugin(api: OpenClawPluginApi): void {
  const config = resolveConfig(api.pluginConfig ?? {});
  const handlers = createHookHandlers({
    features: config.features,
  });

  api.on("before_tool_call", handlers.onBeforeToolCall);
  api.on("message_sending", handlers.onMessageSending);
}
