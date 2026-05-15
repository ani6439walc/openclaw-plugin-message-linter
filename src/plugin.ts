import { logger, type OpenClawPluginApi } from "../api.js";
import { lintMessageContent, lintMessageToolParams } from "./linter.js";
import { convertZhTw } from "./transforms/zhtw.js";
import type { LinterFeatures } from "./config.js";

export function registerMessageLinterPlugin(api: OpenClawPluginApi): void {
  const pluginConfig = (api.pluginConfig ?? {}) as Record<string, unknown>;
  const features = (pluginConfig.features ?? {}) as LinterFeatures;

  api.on("before_tool_call", async (event, ctx) => {
    if (
      event.toolName !== "message" ||
      !event.params ||
      typeof event.params !== "object"
    ) {
      return undefined;
    }

    const lintedParams = await lintMessageToolParams(
      event.params as Record<string, unknown>,
      convertZhTw,
      features,
    );
    if (lintedParams === event.params) {
      return undefined;
    }

    logger.debug(
      `before_tool_call ctx: ${JSON.stringify(ctx)}, event: ${JSON.stringify(event)}`,
    );
    return {
      params: lintedParams,
    };
  });

  api.on("message_sending", async (event, ctx) => {
    if (typeof event.content !== "string") {
      return undefined;
    }
    const linted = await lintMessageContent(
      event.content,
      convertZhTw,
      features,
    );
    if (linted === event.content) {
      return undefined;
    }
    logger.debug(
      `message_sending (formatted/normalized) message, ctx: ${JSON.stringify(ctx)}`,
    );
    return { content: linted };
  });
}
