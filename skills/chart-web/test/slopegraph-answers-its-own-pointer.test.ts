// FINDING 19 (stress round four): NO SLOPEGRAPH COULD PASS `verify-web`.
//
// The hover check aimed at every mark's bounding-box CENTRE. For a diagonal that pixel is the
// line's own midpoint, and the box is the whole plot — so two crossing lines share it exactly, and
// `document.elementFromPoint` there names whichever was painted last. On this format's own
// committed slopegraph that produced ELEVEN failures, and every one of them was the checker being
// wrong about a sound beat: the tooltip named the country the reader was pointing at, and the
// expectation named the country crossing it.
//
// The fix has two halves, and this test exercises both against the real committed file rather than
// a fixture built to fail: a stroked, open mark is now probed at 15% and 85% ALONG ITS OWN LENGTH,
// and the expectation at a pixel is every mark whose hit area covers it rather than only the
// topmost. A unit test on a synthetic page would have proved neither — the defect is a fact about
// twelve real lines with 24px hit strokes, several of them within a few pixels of each other over
// their whole length.
//
// This drives the format's OWN verification script end to end, which is the only thing that can go
// red if the probe regresses: a test that re-implemented the probe would go green beside a broken
// verifier.
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

setDefaultTimeout(180000);

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const SLOPEGRAPH = join(ROOT, "proof", "web-co2-decline-slope", "co2-decline-slope.html");

async function verify(file: string) {
  const child = Bun.spawn(
    [process.execPath, join(ROOT, "skills", "chart-web", "scripts", "verify-web.mjs"), "--file", file],
    { cwd: ROOT, stdout: "pipe", stderr: "pipe" },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, out: `${stdout}\n${stderr}` };
}

describe("a slopegraph's crossing lines each answer a real pointer", () => {
  it("should verify the committed slopegraph with no failures", async () => {
    expect(existsSync(SLOPEGRAPH)).toBe(true);
    const { exitCode, out } = await verify(SLOPEGRAPH);
    const summary = /(\d+) checks passed, (\d+) failed/.exec(out);
    expect(summary ? summary[0] : out).toMatch(/0 failed/);
    expect(exitCode).toBe(0);
  });

  // The other half of the guard: the fix must not have bought the slopegraph's twelve lines by
  // loosening the probe for every other shape. A heatmap's marks are `<rect>`s, whose own
  // `getTotalLength` is a PERIMETER — sampling along it walks the cell's border and lands on the
  // row boundary above it, which is exactly the regression the first draft of this fix shipped
  // (twelve "tooltip never appeared" on this beat and on `webx-world-population`).
  it("should still verify a beat whose marks are closed shapes, not strokes", async () => {
    const heatmap = join(
      ROOT, "proof", "more-heatmap-co2-per-capita-decades",
      "co2-heatmap.html",
    );
    expect(existsSync(heatmap)).toBe(true);
    const { exitCode, out } = await verify(heatmap);
    const summary = /(\d+) checks passed, (\d+) failed/.exec(out);
    expect(summary ? summary[0] : out).toMatch(/0 failed/);
    expect(exitCode).toBe(0);
  });
});
