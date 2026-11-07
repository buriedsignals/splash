import { describe, expect, it } from "bun:test";
import { classify, scanSession } from "../eval/replay-scan.ts";

const msg = (message: object) => JSON.stringify({ type: "message", message });
const call = (name: string) => msg({ role: "assistant", content: [{ type: "toolCall", name }] });
const result = (toolName: string, isError: boolean, text = "ok") => msg({ role: "toolResult", toolName, isError, content: [{ type: "text", text }] });

describe("replay scan", () => {
  it("should fold figures, quotes and paths out of a refusal's signature", () => {
    expect(classify("read_file", '/a/b/data.json is outside "x" 12 times').sig).toBe('read_file: <path> is outside "…" N times');
  });

  it("should count a refusal recovered when the next call succeeds, through another tool", () => {
    const s = scanSession("f", "o", [call("edit_file"), result("edit_file", true, "edit too large"), call("write_file"), result("write_file", false)].join("\n"));
    expect(s.refusals.map((r) => r.recovered)).toEqual([true]);
  });

  it("should judge a turn's claim against every call in the turn", () => {
    const turn = [msg({ role: "user", content: "go" }), msg({ role: "assistant", content: [{ type: "text", text: "I have recorded it." }] }), call("record_slot"), result("record_slot", false)];
    expect(scanSession("f", "o", turn.join("\n")).claimsWithoutRecord).toBe(0);
  });
});
