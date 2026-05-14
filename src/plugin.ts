import { createSubsystemLogger, type OpenClawPluginApi } from "../api.js";
import { lintMessageContent, lintMessageToolParams } from "./linter.js";
import { convertZhTw } from "./transforms/zhtw.js";
import type { LinterFeatures } from "./config.js";

const logger = createSubsystemLogger("plugins");

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

    logger.debug(
      `message-linter: before_tool_call event: ${JSON.stringify(event)}`,
      {
        subsystem: "plugins",
        ctx,
      },
    );

    const lintedParams = await lintMessageToolParams(
      event.params as Record<string, unknown>,
      convertZhTw,
      features,
    );
    if (lintedParams === event.params) {
      return undefined;
    }

    logger.debug(
      "message-linter: before_tool_call (formatted/normalized) message tool payload.",
      {
        subsystem: "plugins",
      },
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
      "message-linter: message_sending (formatted/normalized) message.",
      {
        subsystem: "plugins",
      },
    );
    return { content: linted };
  });
}
