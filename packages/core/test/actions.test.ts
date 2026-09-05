import { describe, it, expect } from "vitest";
import { UnifiedActionSchema } from "@openliulan/core";

describe("统一动作模型", () => {
  it("校验合法的 navigate 动作", () => {
    const action = UnifiedActionSchema.parse({ type: "navigate", url: "https://example.com" });
    expect(action.type).toBe("navigate");
    expect(action.waitUntil).toBe("networkidle");
  });

  it("校验 click 动作的 ref 精确定位", () => {
    const action = UnifiedActionSchema.parse({ type: "click", ref: "r3", description: "点击登录" });
    expect(action.ref).toBe("r3");
    expect(action.button).toBe("left");
  });

  it("拒绝未知动作类型", () => {
    expect(() => UnifiedActionSchema.parse({ type: "explode" })).toThrow();
  });

  it("校验 fill 动作", () => {
    const action = UnifiedActionSchema.parse({ type: "fill", selector: "#email", value: "a@b.com" });
    expect(action.value).toBe("a@b.com");
  });
});

  it("校验无 DOM 基元动作：坐标点击 clickAt", () => {
    const a = UnifiedActionSchema.parse({ type: "clickAt", x: 640, y: 420, holdMs: 120 });
    expect(a.type).toBe("clickAt");
    expect(a.x).toBe(640);
    expect(a.y).toBe(420);
    expect(a.holdMs).toBe(120);
    expect(a.button).toBe("left");
  });

  it("校验无 DOM 基元动作：按键按住 keyHold / keyDown / keyUp", () => {
    const down = UnifiedActionSchema.parse({ type: "keyDown", key: "KeyW" });
    const up = UnifiedActionSchema.parse({ type: "keyUp", key: "KeyW" });
    const hold = UnifiedActionSchema.parse({ type: "keyHold", key: "KeyW", ms: 300 });
    expect(down.key).toBe("KeyW");
    expect(up.key).toBe("KeyW");
    expect(hold.ms).toBe(300);
  });
