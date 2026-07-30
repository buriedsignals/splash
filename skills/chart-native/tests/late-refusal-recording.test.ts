// task 23's own headline claim — a late contrast refusal is DEVIATED **and RECORDED**
// (skills/splash/src/late-refusal.ts) — shipped with the second half silently dead: neither
// `produce.mjs`'s "static" nor "interactive" case threaded `OUTDIR` to its contrast snap, so
// `recordLateRefusal`'s `if (process.env.OUTDIR)` gate was always false on a real run (found by
// review, task-23-review.md §1). Fixed by adding `OUTDIR: outDir` to both `snap()` calls.
//
// Two layers, matching this repo's convention (see snap-interactive-contrast.test.ts):
//   1. STRUCTURAL — both call sites in produce.mjs really do carry OUTDIR (cheap, deterministic,
//      exactly what regresses silently if someone edits the extraEnv object again).
//   2. BEHAVIORAL — the real, unmodified CLI scripts, pointed at a genuinely-failing fixture
//      dist with OUTDIR set, actually write late-refusals.jsonl (not just print the sentence).
import { describe, it, expect, afterAll } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const PRODUCE_SRC = readFileSync(join(root, "scripts", "produce.mjs"), "utf8");
const SNAP_STATIC = join(root, "scripts", "snap-contrast.mjs");
const SNAP_INTERACTIVE = join(root, "scripts", "snap-interactive-contrast.mjs");

const fixtureCharts: string[] = [];

function writeFixtureDist(
  chart: string,
  sub: "static" | "interactive",
  textFill: string,
): void {
  fixtureCharts.push(chart);
  const dir = join(root, "dist", chart, sub);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><html><body>
<svg width="300" height="150" viewBox="0 0 300 150">
  <rect x="0" y="0" width="300" height="150" fill="#ffffff"></rect>
  <text x="20" y="40" fill="${textFill}">Sample label</text>
</svg>
</body></html>
`,
  );
}

afterAll(() => {
  for (const chart of fixtureCharts) {
    rmSync(join(root, "dist", chart), { recursive: true, force: true });
  }
});

describe("produce.mjs wiring — OUTDIR reaches both contrast snaps", () => {
  it('the "static" case threads OUTDIR to snap-contrast.mjs', () => {
    const caseStart = PRODUCE_SRC.indexOf('case "static": {');
    const caseEnd = PRODUCE_SRC.indexOf('case "interactive": {');
    expect(caseStart).toBeGreaterThan(-1);
    expect(caseEnd).toBeGreaterThan(caseStart);
    const block = PRODUCE_SRC.slice(caseStart, caseEnd);
    const callLine = block
      .split("\n")
      .find((l) => l.includes('snap("scripts/snap-contrast.mjs"'));
    expect(callLine).toBeDefined();
    expect(callLine).toContain("OUTDIR: outDir");
  });

  it('the "interactive" case threads OUTDIR to snap-interactive-contrast.mjs', () => {
    const caseStart = PRODUCE_SRC.indexOf('case "interactive": {');
    const caseEnd = PRODUCE_SRC.indexOf('case "video": {');
    expect(caseStart).toBeGreaterThan(-1);
    expect(caseEnd).toBeGreaterThan(caseStart);
    const block = PRODUCE_SRC.slice(caseStart, caseEnd);
    const callLine = block
      .split("\n")
      .find((l) => l.includes('snap("scripts/snap-interactive-contrast.mjs"'));
    expect(callLine).toBeDefined();
    expect(callLine).toContain("OUTDIR: outDir");
  });
});

describe("snap-contrast.mjs / snap-interactive-contrast.mjs — a late refusal is actually recorded (real script, fixture dist)", () => {
  it("snap-contrast.mjs (static) writes late-refusals.jsonl when OUTDIR is set", () => {
    const chart = "late-refusal-record-static";
    writeFixtureDist(chart, "static", "#E69F00"); // OKABE_ITO orange, 2.25:1 on white
    const outDir = mkdtempSync(join(tmpdir(), "late-record-static-"));
    let threw = false;
    try {
      execFileSync("bun", [SNAP_STATIC], {
        cwd: root,
        env: {
          ...process.env,
          CHART: chart,
          OUTDIR: outDir,
          BRAND_EXPLICIT_COLORS: "",
        },
        stdio: "pipe",
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const jsonlPath = join(outDir, "late-refusals.jsonl");
    expect(existsSync(jsonlPath)).toBe(true);
    const rows = readFileSync(jsonlPath, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(rows).toHaveLength(1);
    expect(rows[0].guard).toBe("snap-contrast");
    expect(rows[0].subject).toBe(`${chart}/static`);
    expect(rows[0].deviation).toContain("produce again");
    rmSync(outDir, { recursive: true, force: true });
  }, 30_000);

  it("snap-interactive-contrast.mjs writes late-refusals.jsonl when OUTDIR is set", () => {
    const chart = "late-refusal-record-interactive";
    writeFixtureDist(chart, "interactive", "#E69F00");
    const outDir = mkdtempSync(join(tmpdir(), "late-record-interactive-"));
    let threw = false;
    try {
      execFileSync("bun", [SNAP_INTERACTIVE], {
        cwd: root,
        env: {
          ...process.env,
          CHART: chart,
          OUTDIR: outDir,
          BRAND_EXPLICIT_COLORS: "",
        },
        stdio: "pipe",
      });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const jsonlPath = join(outDir, "late-refusals.jsonl");
    expect(existsSync(jsonlPath)).toBe(true);
    const rows = readFileSync(jsonlPath, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(rows).toHaveLength(1);
    expect(rows[0].guard).toBe("snap-interactive-contrast");
    expect(rows[0].subject).toBe(`${chart}/interactive`);
    expect(rows[0].deviation).toContain("produce again");
    rmSync(outDir, { recursive: true, force: true });
  }, 30_000);
});
