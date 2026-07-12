// e2e for the render-time label-fit guard (scripts/snap-label-fit.mjs): real
// Vite builds + real Playwright loads — no mocks, per this repo's testing
// convention. Three angles:
//   1. RED: a crafted page reproducing the shipped clip class (an svg text
//      overflowing its svg viewport — the stacked-area right-gutter bug) MUST
//      fail the snap, and the fix-era build of the SAME long-label config MUST
//      pass. (The pre-fix component itself was proven mechanically during
//      development: cb0cd22^'s hardcoded right:116 gutter + this exact config
//      → "Renouvelables 280" overflowed the svg by 15.4px, snap exit 1.)
//   2. Vacuity: zero text nodes / no chart card must FAIL, never pass silently.
//   3. Healthy representative types (the historically bitten classes: rotated
//      waterfall category ticks, stacked-area right-gutter band labels, bar
//      furniture) pass on both the static and interactive paths.
import { describe, it, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SNAP = join(root, "scripts", "snap-label-fit.mjs");

// Real-browser/build steps under gate contention need generous headroom.
const BUILD_AND_SNAP_TIMEOUT = 240_000;

function buildStatic(chart: string, configPath: string) {
  execFileSync("bunx", ["vite", "build"], {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, CHART: chart, CONFIG: configPath, INTERACTIVE: "" },
  });
}

function buildInteractive(chart: string, configPath: string) {
  execFileSync("bunx", ["vite", "build"], {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, CHART: chart, CONFIG: configPath, INTERACTIVE: "1" },
  });
}

/** run the snap; returns {code, out} instead of throwing, so RED cases can
 *  assert on the exit code AND the report. */
function runSnap(env: Record<string, string>): { code: number; out: string } {
  try {
    const out = execFileSync("bun", [SNAP], {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, ...env },
    });
    return { code: 0, out: out.toString("utf8") };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      code: err.status ?? 1,
      out:
        (err.stdout?.toString("utf8") ?? "") +
        (err.stderr?.toString("utf8") ?? ""),
    };
  }
}

/** a minimal static-dist lookalike (plain html — no module scripts needed) */
function fixtureDist(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "chart-native-labelfit-fixture-"));
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><html><body>${body}</body></html>`,
  );
  return dir;
}

describe("snap-label-fit — RED: the crafted clip case fails", () => {
  it(
    "should exit 1 and name the label when an svg text overflows its svg viewport (the stacked-area class)",
    () => {
      // svg overflow is hidden by default: a start-anchored right-gutter label
      // whose glyphs run past the svg width ships visibly truncated.
      const dist = fixtureDist(
        `<div id="root"><div style="width:600px;height:338px;position:relative;background:#fff">
        <svg width="600" height="338" style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg">
          <text x="16" y="30" font-size="13" fill="#333">TWh generated</text>
          <text x="520" y="150" font-size="13" font-weight="700" fill="#111">Renouvelables 280</text>
        </svg>
      </div></div>`,
      );
      const { code, out } = runSnap({
        CHART: "fixture",
        TARGET: "static",
        DIST: dist,
      });
      expect(code).toBe(1);
      expect(out).toContain("Renouvelables 280");
      expect(out).toContain("clipped");
      // the healthy sibling label is checked too, but not flagged
      expect(out).toContain('"checked": 2');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should catch HTML furniture text escaping the card (absolute overflow), not just svg text",
    () => {
      const dist = fixtureDist(
        `<div id="root"><div style="width:600px;height:338px;position:relative;background:#fff">
        <svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
          <text x="16" y="30" font-size="13" fill="#333">In bounds</text>
        </svg>
        <div style="position:absolute;left:480px;bottom:-4px;white-space:nowrap;font-size:12px">A source line pushed out of the card</div>
      </div></div>`,
      );
      const { code, out } = runSnap({
        CHART: "fixture",
        TARGET: "static",
        DIST: dist,
      });
      expect(code).toBe(1);
      expect(out).toContain("A source line pushed out of the card");
    },
    BUILD_AND_SNAP_TIMEOUT,
  );
});

describe("snap-label-fit — interactive target asserts a narrow AND a wide width", () => {
  it(
    "should exit 1 when a responsive re-layout clips text ONLY at the narrow delivery width",
    () => {
      // A width-dependent clip: the card tracks the viewport (width:100%), the
      // caption is a fixed ~700px nowrap run. At 1100px it fits; at 360px it
      // overflows the card by ~300px — the responsive stacked-area/dumbbell
      // class a single 900px viewport measurement ships green.
      const caption =
        "A fixed-width caption of about seven hundred pixels that fits a desktop embed but clips badly on a phone";
      const dist = fixtureDist(
        `<div id="root"><div style="width:100%;position:relative;background:#fff;overflow:hidden">
        <svg width="100%" height="200" xmlns="http://www.w3.org/2000/svg">
          <text x="16" y="30" font-size="13" fill="#333">In bounds</text>
        </svg>
        <div style="position:absolute;top:60px;left:0;white-space:nowrap;font-size:13px">${caption}</div>
      </div></div>`,
      );
      const { code, out } = runSnap({
        CHART: "fixture",
        TARGET: "interactive",
        DIST: dist,
      });
      expect(code).toBe(1);
      expect(out).toContain(caption.slice(0, 80));
      // the report names the width pair (narrow+wide, as snap-tooltip-viewport)
      // and the violation carries the width it was measured at
      expect(out).toContain("360");
      expect(out).toContain("1100");
      expect(out).toContain('"width": 360');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );
});

describe("snap-label-fit — vacuity guards", () => {
  it(
    "should fail when the page renders ZERO text nodes",
    () => {
      const dist = fixtureDist(
        `<div id="root"><div style="width:600px;height:338px"><svg width="600" height="338" xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg></div></div>`,
      );
      const { code, out } = runSnap({
        CHART: "fixture",
        TARGET: "static",
        DIST: dist,
      });
      expect(code).toBe(1);
      expect(out).toContain("ZERO text nodes");
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should fail when no chart card matches the canvas selector",
    () => {
      const dist = fixtureDist(
        `<svg width="600" height="338" xmlns="http://www.w3.org/2000/svg"><text x="10" y="20">orphan</text></svg>`,
      );
      const { code, out } = runSnap({
        CHART: "fixture",
        TARGET: "static",
        DIST: dist,
      });
      expect(code).toBe(1);
      expect(out).toContain("no chart card");
    },
    BUILD_AND_SNAP_TIMEOUT,
  );
});

describe("snap-label-fit — healthy renders pass as-is (calibration invariant)", () => {
  it(
    "should pass the fixed stacked-area on the long band labels that shipped clipped pre-fix",
    () => {
      buildStatic(
        "stacked-area",
        join(here, "fixtures", "stacked-area-longlabels.json"),
      );
      const { code, out } = runSnap({
        CHART: "stacked-area",
        TARGET: "static",
      });
      expect(code).toBe(0);
      expect(out).toContain('"violations": []');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should pass waterfall with long ROTATED category labels (AABB of the rotated text fits)",
    () => {
      buildStatic(
        "waterfall",
        join(here, "fixtures", "waterfall-longlabels.json"),
      );
      const { code, out } = runSnap({ CHART: "waterfall", TARGET: "static" });
      expect(code).toBe(0);
      expect(out).toContain('"violations": []');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should pass the bar sample on the static path",
    () => {
      buildStatic("bar", join(root, "assets", "sample-data", "bars.json"));
      const { code, out } = runSnap({ CHART: "bar", TARGET: "static" });
      expect(code).toBe(0);
      expect(out).toContain('"violations": []');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should pass the bar sample on the interactive path (post-reveal boxes)",
    () => {
      buildInteractive("bar", join(root, "assets", "sample-data", "bars.json"));
      const { code, out } = runSnap({ CHART: "bar", TARGET: "interactive" });
      expect(code).toBe(0);
      expect(out).toContain('"violations": []');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should pass the stacked-area interactive embed at 360px AND 1100px (the narrow band-label clip class)",
    () => {
      // Pre-fix RED (measured through this snap): at a 360px viewport the page's
      // doubled 48px/side inset left the container at 264px < the 280px minWidth
      // floor — the svg painted 16px past the card and the right-gutter band
      // labels shipped clipped ("Renouvel… 280" +7.32px, "Conventi… 250" +5.09px).
      buildInteractive(
        "stacked-area",
        join(here, "fixtures", "stacked-area-longlabels.json"),
      );
      const { code, out } = runSnap({
        CHART: "stacked-area",
        TARGET: "interactive",
      });
      expect(code).toBe(0);
      expect(out).toContain('"violations": []');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );

  it(
    "should pass the dumbbell sample interactive embed at 360px AND 1100px (the wrapped-legend bottom clip class)",
    () => {
      // Pre-fix RED (measured through this snap): the wrapped second legend row
      // ("Men") painted 11.16px past the card bottom at a 360px viewport.
      buildInteractive(
        "dumbbell",
        join(root, "assets", "sample-data", "dumbbell.json"),
      );
      const { code, out } = runSnap({ CHART: "dumbbell", TARGET: "interactive" });
      expect(code).toBe(0);
      expect(out).toContain('"violations": []');
    },
    BUILD_AND_SNAP_TIMEOUT,
  );
});
