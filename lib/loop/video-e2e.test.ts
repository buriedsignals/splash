// Opt-in end-to-end proof: a real Remotion render, minutes long, through the actual loop
// seam — not a mock, not a fixture that only proves the mechanism. This project's own
// lesson (docs/splash/CHANGELOG.md) is that a live proof on a fixture does not prove the
// real path: that is exactly what once let "every artifact served as HTML" ship unnoticed.
// Run it with SPLASH_VIDEO_E2E=1 bun test lib/loop/video-e2e.test.ts.
import { test, expect } from "bun:test";
import { existsSync, statSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "./engines";
import { propose } from "./propose";
import { produce } from "./produce";
import type { RunManifest } from "./manifest";
import { freezeInput } from "./freeze";
import { DELIVERABLE_KIND } from "../core/vocabulary";

const RUN = process.env.SPLASH_VIDEO_E2E === "1";

// The exact fixture lib/loop/driver.test.ts freezes for its full-loop test — reused
// verbatim, not a new dataset. (lib/loop/produce.test.ts's richer 3-row fixture with a
// different confirmedTakeaway was tried first and turned out to steer the brain's offer
// toward map-native-only candidates for this dataset — none buildable yet, per
// LOOP_BUILDABLE_ENGINES. This 2-row fixture is the one driver.test.ts already proves
// yields a buildable chart-native offer through propose().)
function makeProducibleRun(): {
  run: RunManifest;
  el: RunManifest["elements"][0];
  runDir: string;
} {
  const runDir = mkdtempSync(join(tmpdir(), "loop-video-e2e-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531");
  const run: RunManifest = {
    runId: "video-e2e",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
      },
    ],
    events: [],
  };
  return { run, el: run.elements[0]!, runDir };
}

test.skipIf(!RUN)(
  "a chosen motion row produces a real mp4 under the run dir",
  async () => {
    const { run, el, runDir } = makeProducibleRun();
    const { options } = propose(run);
    const motion = options.find(
      (o) => o.format != null && DELIVERABLE_KIND[o.format] === "motion",
    );
    expect(motion, "the offer must contain a motion row").toBeDefined();
    el.proposal = { options, excluded: [], chosenId: motion!.id };

    const res = await produce(run, el, runDir);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error(res.message);

    const artifact = join(runDir, res.value.artifact!.path);
    expect(existsSync(artifact)).toBe(true);
    expect(artifact.endsWith(".mp4")).toBe(true);
    expect(statSync(artifact).size).toBeGreaterThan(50_000);
    expect(res.value.artifact!.provenanceHash.length).toBeGreaterThan(0);
  },
  20 * 60 * 1000,
);
