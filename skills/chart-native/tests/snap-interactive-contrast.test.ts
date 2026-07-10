// snap-interactive-contrast.mjs is the fast-follow closing an a11y coverage gap: the
// single-format-produce-export redesign made produce.mjs build ONLY the requested
// format, so an "interactive" produce no longer builds the static dist and
// snap-contrast.mjs (which only reads the static dist) silently stopped running.
// Article-web interactive is the most common delivery path, so a mark-coloured
// label there would have shipped with zero render-time WCAG contrast checking.
//
// Three layers, matching this repo's testing convention (real subprocess runs, no
// mocks — see produce-single-format.test.ts / channel-gated-interactive.test.ts):
//   1. STRUCTURAL — produce.mjs's `case "interactive"` block really does call the
//      new script (a strip-free source check; cheap, deterministic).
//   2. DETECTION — the shared WCAG-sampling engine (./lib/sample-text-contrast.mjs,
//      reused from snap-contrast.mjs) genuinely fails on a low-contrast label and
//      genuinely passes on a conformant one. Every chart-native component today
//      routes its rendered text through COLORS.ink / a contrast-aware picker (the
//      prior a11y hardening lots fixed every raw-config→text-fill path), so there is
//      no live component bug left to reproduce through a real chart config — this
//      exercises the REAL CLI script against a hand-written fixture dist matching
//      the exact shape (svg + fill-attributed <text>) sample-text-contrast.mjs reads,
//      the honest way to red/green-prove the mechanism without a currently-nonexistent
//      bug to point it at.
//   3. REAL PIPELINE — an actual `produce.mjs bar ... interactive` run (real Vite
//      build, real Playwright) shows the new step's own log line and passes on the
//      shipped sample.
import { describe, it, expect, afterAll } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const PRODUCE = join(root, "scripts", "produce.mjs");
const SNAP = join(root, "scripts", "snap-interactive-contrast.mjs");

const fixtureCharts: string[] = [];

// Writes a minimal, self-contained interactive-dist-shaped fixture (an <svg> with a
// single fill-attributed <text>, on an explicit white plot rect) at the exact path
// chartDistSub(chart, "interactive") resolves to, so the real CLI script — unmodified
// — can be pointed at it via CHART=<chart>.
function writeFixtureDist(chart: string, textFill: string): void {
  fixtureCharts.push(chart);
  const dir = join(root, "dist", chart, "interactive");
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

describe("snap-interactive-contrast.mjs — wiring", () => {
  it('produce.mjs\'s `case "interactive"` block calls snap-interactive-contrast.mjs', () => {
    const src = readFileSync(PRODUCE, "utf8");
    const caseStart = src.indexOf('case "interactive": {');
    const caseEnd = src.indexOf('case "video":');
    expect(caseStart).toBeGreaterThan(-1);
    expect(caseEnd).toBeGreaterThan(caseStart);
    const block = src.slice(caseStart, caseEnd);
    expect(block).toContain("scripts/snap-interactive-contrast.mjs");
    // wired through the platform-neutral snap() helper, not a hardcoded runner
    // (mirrors platform-runners.test.ts's guard for the static-side snap-contrast).
    expect(block).not.toContain(
      'run("bun", ["scripts/snap-interactive-contrast.mjs"]',
    );
  });
});

describe("snap-interactive-contrast.mjs — detection (real script, fixture dist)", () => {
  it("fails hard on a real low-contrast label (OKABE_ITO orange, 2.25:1 on white)", () => {
    const chart = "contrast-fixture-bad";
    writeFixtureDist(chart, "#E69F00");
    let threw = false;
    let stderr = "";
    try {
      execFileSync("bun", [SNAP], {
        cwd: root,
        env: { ...process.env, CHART: chart, BRAND_EXPLICIT_COLORS: "" },
        stdio: "pipe",
      });
    } catch (e) {
      threw = true;
      stderr = (e as { stderr?: Buffer }).stderr?.toString("utf8") ?? "";
    }
    expect(threw).toBe(true);
    expect(stderr).toContain("WCAG contrast");
  }, 30_000);

  it("passes on a conformant label (COLORS.ink on white, ≥4.5:1)", () => {
    const chart = "contrast-fixture-good";
    writeFixtureDist(chart, "#1A1A1A");
    const out = execFileSync("bun", [SNAP], {
      cwd: root,
      env: { ...process.env, CHART: chart, BRAND_EXPLICIT_COLORS: "" },
      stdio: "pipe",
    }).toString("utf8");
    expect(out).toContain(`[snap-interactive-contrast ${chart}] OK`);
  }, 30_000);
});

describe("snap-interactive-contrast.mjs — real produce pipeline", () => {
  it("a real `produce.mjs bar ... interactive` run invokes and passes the new step", () => {
    const configPath = join(root, "assets/sample-data/bars.json");
    const outDir = mkdtempSync(
      join(tmpdir(), "chart-native-produce-bar-interactive-contrast-"),
    );
    const stdout = execFileSync(
      "bun",
      [PRODUCE, "bar", configPath, outDir, "interactive"],
      {
        cwd: root,
        stdio: "pipe",
      },
    ).toString("utf8");
    expect(stdout).toContain(
      "checking text contrast (snap-interactive-contrast)",
    );
    expect(stdout).toContain("[snap-interactive-contrast bar] OK");
  }, 120_000);
});
