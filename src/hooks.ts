import { logger } from "../api.js";
import type { LinterFeatures } from "./config.js";
import { lintMessageContent, lintMessageToolParams } from "./linter.js";
import { convertZhTw } from "./transforms/zhtw.js";

interface PluginHookBeforeToolCallEvent {
  readonly toolName: string;
  readonly params: Record<string, unknown>;
}

interface PluginHookBeforeToolCallResult {
  readonly params?: Record<string, unknown>;
  readonly block?: boolean;
  readonly blockReason?: string;
}

interface PluginHookToolContext {
  readonly sessionKey?: string;
}

interface PluginHookMessageSendingEvent {
  readonly content: string;
}

interface PluginHookMessageSendingResult {
  readonly content?: string;
  readonly cancel?: boolean;
  readonly cancelReason?: string;
  readonly metadata?: Record<string, unknown>;
}

interface PluginHookMessageContext {
  readonly sessionKey?: string;
}

export function createHookHandlers(features: LinterFeatures) {
  async function onBeforeToolCall(
    event: PluginHookBeforeToolCallEvent,
    ctx: PluginHookToolContext,
  ): Promise<PluginHookBeforeToolCallResult | undefined> {
    if (event.toolName !== "message" || !isRecord(event.params)) {
      return undefined;
    }

    const lintedParams = await lintMessageToolParams(
      event.params,
      convertZhTw,
      features,
    );
    if (lintedParams === event.params) {
      return undefined;
    }

    logger.debug(
      `before_tool_call (formatted/normalized) message for session ${ctx.sessionKey}`,
    );
    return {
      params: lintedParams,
    };
  }

  async function onMessageSending(
    event: PluginHookMessageSendingEvent,
    ctx: PluginHookMessageContext,
  ): Promise<PluginHookMessageSendingResult | undefined> {
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
      `message_sending (formatted/normalized) message for session ${ctx.sessionKey}`,
    );
    return { content: linted };
  }

  return {
    onBeforeToolCall,
    onMessageSending,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
