import { describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPlan, sessionCost } from "../eval/teacher.ts";

const plan = { arm: "teacher", stories: ["stress-p-transport-ridership"], runCeiling: 1, batchCeiling: 3 };

describe("teacher batch guards", () => {
  it("should refuse the paid arm without an approved budget", () => {
    expect(() => assertPlan(plan)).toThrow(/approved-budget/);
  });

  it("should refuse a batch ceiling above the approved budget", () => {
    expect(() => assertPlan({ ...plan, approvedBudget: 2 })).toThrow(/exceeds the approved budget/);
  });

  it("should refuse a held-out story whatever the arm", () => {
    expect(() => assertPlan({ ...plan, arm: "teacher-free", stories: ["r8-chart-static-german-road-deaths-by-mode"] })).toThrow(/held-out/);
  });

  it("should let the free arm run without a budget", () => {
    expect(() => assertPlan({ ...plan, arm: "teacher-free" })).not.toThrow();
  });
});

describe("session cost", () => {
  it("should add up the cost Pi recorded on every assistant message", async () => {
    const root = await mkdtemp(join(tmpdir(), "splash-teacher-"));
    const dir = join(root, ".splash-harness", "sessions", "s", "skill-storyboard", "story-1");
    mkdirSync(dir, { recursive: true });
    const m = (total: number) => JSON.stringify({ type: "message", message: { role: "assistant", usage: { cost: { total } } } });
    writeFileSync(join(dir, "a.jsonl"), [m(0.25), m(0.5)].join("\n"));
    expect(sessionCost(root)).toBe(0.75);
  });
});
