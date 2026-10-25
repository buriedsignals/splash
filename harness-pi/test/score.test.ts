import { describe, expect, it } from "bun:test";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type RunScore, releaseDecision, scoreRun } from "../eval/score.ts";

const CHECKOUT = resolve(import.meta.dirname, "../..");
const STORY = "stress-p-transport-ridership";

const msg = (role: string, extra: object) => ({ type: "message", timestamp: "2026-10-25T12:00:00Z", message: { role, ...extra } });
const call = (name: string) => msg("assistant", { content: [{ type: "toolCall", id: "c", name, arguments: {} }] });
const result = (toolName: string, isError = false) => msg("toolResult", { toolName, isError, content: [{ type: "text", text: isError ? "refused" : "ok" }] });

async function runRoot(sessions: Record<string, object[]>) {
  const root = await mkdtemp(join(tmpdir(), "splash-score-"));
  cpSync(join(CHECKOUT, "stories", STORY, "source"), join(root, "stories", STORY, "source"), { recursive: true });
  for (const [owner, entries] of Object.entries(sessions)) {
    const dir = join(root, ".splash-harness", "sessions", STORY, owner, "1-1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "s.jsonl"), entries.map((e) => JSON.stringify(e)).join("\n"));
  }
  return root;
}

const score = (completed: boolean, gateRefusals: number): RunScore => ({
  story: "x", phase: completed ? "done" : "storyboard", completed, gateRefusals, toolErrors: 0, turns: 0, seconds: 0, craftWithoutLook: [], failures: [],
});

describe("run score", () => {
  it("should flag a craft session whose last write comes after its last look", async () => {
    const root = await runRoot({ "skill-chart-beat": [call("look"), result("look"), call("write_file"), result("write_file")] });
    expect((await scoreRun(root, STORY)).craftWithoutLook).toHaveLength(1);
  });

  it("should not flag a craft session that looked after writing", async () => {
    const root = await runRoot({ "skill-chart-beat": [call("write_file"), result("write_file"), call("look"), result("look")] });
    expect((await scoreRun(root, STORY)).craftWithoutLook).toHaveLength(0);
  });

  it("should count a refused record as a gate refusal and a failure point", async () => {
    const root = await runRoot({ "skill-storyboard": [call("record_takeaway"), result("record_takeaway", true), call("read_file"), result("read_file", true)] });
    const s = await scoreRun(root, STORY);
    expect([s.gateRefusals, s.toolErrors, s.failures[0].tool]).toEqual([1, 2, "record_takeaway"]);
  });

  it("should score a story that has not reached done as not completed", async () => {
    const root = await runRoot({});
    expect((await scoreRun(root, STORY)).completed).toBe(false);
  });
});

describe("release rule", () => {
  it("should ship stock when it completes more runs", () => {
    expect(releaseDecision([score(true, 5), score(true, 5)], [score(true, 0), score(false, 0)])).toBe("ship stock");
  });

  it("should ship the tune when it completes as many with fewer gate refusals", () => {
    expect(releaseDecision([score(true, 5)], [score(true, 2)])).toBe("ship tuned");
  });

  it("should ship stock on a tie", () => {
    expect(releaseDecision([score(true, 2)], [score(true, 2)])).toBe("ship stock");
  });
});
