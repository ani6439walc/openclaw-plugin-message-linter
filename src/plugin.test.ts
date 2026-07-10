import { describe, expect, it } from "vitest";
import { registerMessageLinterPlugin } from "./plugin.js";

type Handler = (event: any, ctx: any) => Promise<any>;

function createApiMock(pluginConfig?: Record<string, unknown>) {
  const handlers = new Map<string, Handler>();
  const api = {
    on(name: string, handler: Handler) {
      handlers.set(name, handler);
    },
    pluginConfig,
  } as any;

  registerMessageLinterPlugin(api);

  async function emit(name: string, event: any, ctx: any) {
    const handler = handlers.get(name);
    if (!handler) throw new Error(`Handler not found: ${name}`);
    return handler(event, ctx);
  }

  return { emit };
}

describe("message-linter plugin hooks", () => {
  it("formats message tool send action during before_tool_call (zhtw enabled)", async () => {
    const { emit } = createApiMock({ features: { zhtw: true } });

    const result = await emit(
      "before_tool_call",
      {
        toolName: "message",
        params: {
          action: "send",
          target: "1391660338470060055",
          message:
            "[https://example.com](https://example.com) 中国软件和视频。",
        },
      },
      { channelId: "discord", sessionKey: "agent:main:discord:direct:1" },
    );

    expect(result).toBeDefined();
    expect(result.params.message).toBe(
      "[example.com](<https://example.com>) 中國軟體和視頻。",
    );
    expect(result.params.target).toBe("1391660338470060055");
  });

  it("formats message tool send action during before_tool_call (defaults, zhtw off)", async () => {
    const { emit } = createApiMock();

    const result = await emit(
      "before_tool_call",
      {
        toolName: "message",
        params: {
          action: "send",
          target: "1391660338470060055",
          message:
            "[https://example.com](https://example.com) 中国软件和视频。",
        },
      },
      { channelId: "discord", sessionKey: "agent:main:discord:direct:1" },
    );

    expect(result).toBeDefined();
    expect(result.params.message).toBe(
      "[example.com](<https://example.com>) 中国软件和视频。",
    );
    expect(result.params.target).toBe("1391660338470060055");
  });

  it("does not format message tool actions other than send during before_tool_call", async () => {
    const { emit } = createApiMock();

    const result = await emit(
      "before_tool_call",
      {
        toolName: "message",
        params: {
          action: "member-info",
          target: "1391660338470060055",
          message: "中国软件和视频。",
        },
      },
      { channelId: "discord", sessionKey: "agent:main:discord:direct:1" },
    );

    expect(result).toBeUndefined();
  });
});
