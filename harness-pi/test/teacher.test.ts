import { describe, expect, it } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPlan, sessionCost } from "../eval/teacher.ts";
import { record, spent } from "../eval/spend.ts";
import models from "../serve/models.teacher.json";

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

describe("spend ledger", () => {
  const ledger = async (rows: string[]) => {
    const file = join(await mkdtemp(join(tmpdir(), "splash-spend-")), "SPEND.md");
    writeFileSync(file, `# Spend ledger\n\n| date | step | service | quantity | usd | eur | total |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`);
    return file;
  };

  it("should price a cache-read token at the 31B's input rate, so 1.5M of them cost $0.30", () => {
    const m = models.providers["splash-teacher"].models.find((x: { id: string }) => x.id === "google/gemma-4-31b-it")!;
    expect((1_500_000 * m.cost.cacheRead) / 1_000_000).toBeCloseTo(0.3);
  });

  it("should refuse a paid batch whose projection crosses the $15 OpenRouter cap, before any call", async () => {
    process.env.SPLASH_SPEND_LEDGER = await ledger(["| 2026-10-28 | gold a | OpenRouter | x | 13.0000 | | 13.0000 |"]);
    try {
      expect(() => assertPlan({ ...plan, approvedBudget: 3 })).toThrow(/OpenRouter has spent \$13.00 of its \$15 cap/);
    } finally {
      delete process.env.SPLASH_SPEND_LEDGER;
    }
  });

  it("should append a line with the service's running total", async () => {
    const file = await ledger(["| 2026-10-28 | gold a | OpenRouter | x | 1.5000 | | 1.5000 |"]);
    record({ step: "gold b", service: "OpenRouter", quantity: "y", usd: 0.25 }, file);
    expect(spent("OpenRouter", file)).toBeCloseTo(1.75);
  });
});
