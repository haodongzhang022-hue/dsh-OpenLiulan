import { describe, it, expect } from "vitest";
import { parseOpenCodeEvents, extractJson, DEFAULT_OPENCODE_MODELS } from "../src/opencode.js";

describe("opencode fallback", () => {
  it("解析事件流：收集 text、tokens、error", () => {
    const raw = [
      '{"type":"step_start","part":{"type":"step-start"}}',
      '{"type":"text","part":{"type":"text","text":"{\\"ok\\": true}"}}',
      '{"type":"step_finish","part":{"tokens":{"total":10},"cost":0.001}}',
    ].join("\n");
    const ev = parseOpenCodeEvents(raw);
    expect(ev.texts.join("")).toContain('"ok"');
    expect(ev.tokens).toEqual({ total: 10 });
    expect(ev.error).toBeUndefined();
  });
  it("error 事件进入 error 字段", () => {
    const raw = '{"type":"error","error":{"data":{"message":"Insufficient balance"}}}';
    const ev = parseOpenCodeEvents(raw);
    expect(ev.error).toContain("Insufficient balance");
  });
  it("默认清单只含免费模型（成本优先，不含 vision-exp/付费通道）", () => {
    expect(DEFAULT_OPENCODE_MODELS).toEqual(["opencode/mimo-v2.5-free"]);
    expect(DEFAULT_OPENCODE_MODELS.join(" ")).not.toContain("vision-exp");
  });
  it("extractJson 容忍前后缀", () => {
    const j = extractJson('prefix {"a": 1} suffix');
    expect(j).toEqual({ a: 1 });
  });
  it("非法回答返回 null", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});
