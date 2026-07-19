import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regression guard for the interactive Gate-3 review still (snap-proof.mjs). The responsive
// ChartFrame renders the mandatory source citation in a FLOW footer BELOW the plot, so the
// component's real height exceeds the snapshot viewport (560). A PAGE screenshot
// (`ip.screenshot(...)`) is clipped to the viewport and CROPS that footer — which made the
// review still (and the judge/orchestrator reading it) falsely report "interactive drops the
// source" while the delivered interactive.html renders it correctly (a false-positive class
// across the whole interactive family). The fix: capture the whole component as an ELEMENT
// screenshot (`.locator("#root > div").screenshot(...)`), like the static path, so the still
// shows the full flowed height, source footer included.
const snapProof = readFileSync(
  join(import.meta.dir, "..", "scripts", "snap-proof.mjs"),
  "utf8",
);

describe("snap-proof interactive review still — full-height capture", () => {
  it("captures interactive.png as an ELEMENT screenshot of #root > div (not a viewport-clipped page screenshot)", () => {
    expect(snapProof).toContain(
      '.locator("#root > div").screenshot({ path: join(outDir, "interactive.png") })',
    );
  });

  it("does NOT use a bare page screenshot for interactive.png (that clips the source footer)", () => {
    expect(snapProof).not.toContain(
      'ip.screenshot({ path: join(outDir, "interactive.png") })',
    );
  });
});
