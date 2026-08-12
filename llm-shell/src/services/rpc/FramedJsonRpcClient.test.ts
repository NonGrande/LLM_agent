import { describe, expect, it } from "vitest";
import { FramedJsonRpcClient } from "./FramedJsonRpcClient";

describe("FramedJsonRpcClient", () => {
  it("constructs with channel", () => {
    const c = new FramedJsonRpcClient("test-ch");
    expect(c.channel).toBe("test-ch");
  });

  it("request before start throws", async () => {
    const c = new FramedJsonRpcClient("x");
    await expect(c.request("initialize")).rejects.toThrow(/not started/i);
  });
});
