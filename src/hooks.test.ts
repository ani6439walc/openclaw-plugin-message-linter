import { describe, expect, it } from "vitest";
import { createHookHandlers } from "./hooks.js";

describe("message-linter hook handlers", () => {
  it("formats message tool send payloads during before_tool_call", async () => {
    const handlers = createHookHandlers({});

    const result = await handlers.onBeforeToolCall(
      {
        toolName: "message",
        params: {
          action: "send",
          target: "123",
          message: "[https://example.com](https://example.com)",
        },
      },
      { toolName: "message", sessionKey: "session-a" },
    );

    expect(result).toEqual({
      params: {
        action: "send",
        target: "123",
        message: "[example.com](<https://example.com>)",
      },
    });
  });

  it("returns undefined for non-message tools during before_tool_call", async () => {
    const handlers = createHookHandlers({});

    const result = await handlers.onBeforeToolCall(
      {
        toolName: "other",
        params: {
          action: "send",
          message: "[https://example.com](https://example.com)",
        },
      },
      { toolName: "other" },
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined for missing params during before_tool_call", async () => {
    const handlers = createHookHandlers({});

    const result = await handlers.onBeforeToolCall(
      {
        toolName: "message",
        params: undefined,
      } as any,
      { toolName: "message" },
    );

    expect(result).toBeUndefined();
  });

  it("returns undefined for non-send message actions during before_tool_call", async () => {
    const handlers = createHookHandlers({});

    const result = await handlers.onBeforeToolCall(
      {
        toolName: "message",
        params: {
          action: "member-info",
          message: "[https://example.com](https://example.com)",
        },
      },
      { toolName: "message" },
    );

    expect(result).toBeUndefined();
  });

  it("formats string content during message_sending", async () => {
    const handlers = createHookHandlers({});

    const result = await handlers.onMessageSending(
      {
        to: "123",
        content: "[https://example.com](https://example.com)",
      },
      { channelId: "discord", sessionKey: "session-a" },
    );

    expect(result).toEqual({
      content: "[example.com](<https://example.com>)",
    });
  });

  it("returns undefined when message_sending content is unchanged", async () => {
    const handlers = createHookHandlers({});

    const result = await handlers.onMessageSending(
      {
        to: "123",
        content: "plain text",
      },
      { channelId: "discord", sessionKey: "session-a" },
    );

    expect(result).toBeUndefined();
  });
});
