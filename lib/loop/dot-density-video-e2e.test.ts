// THE RENDER THAT DECIDES THE SCOPE — a us-states dot-density VIDEO, built through the loop's
// own produce() with a real Remotion render, because the loop's dot-density refusal used to be
// format-blind and narrowing it ADMITS a pairing that was refused. That is a capability decision,
// and this project's rule for one is a rendered proof, not an argument from the source.
//
// WHAT IS AT STAKE, precisely. DotDensityMap.tsx — static and interactive — pins the join key
// (`const JOIN_KEY = "iso_a3"`, :41), so a us-states dot-density in those formats draws a world
// map with a legend and no dots. DotDensityStory (:199), DotDensityReveal (:134) and
// DotDensityScrolly (:140) resolve it through resolveVideoGeometry (core/video-geometry.ts),
// which prefers `config.geography.joinKey` — "postal" here. If that preference works end to end,
// the blanket refusal was deleting a working capability; if it does not, the blanket refusal was
// right and this file is what says so.
//
// OPT-IN (SPLASH_DOT_DENSITY_VIDEO_E2E=1), like lib/loop/video-e2e.test.ts and map-e2e.test.ts:
// a Remotion map render is minutes long and needs network tiles. The ALWAYS-ON half below is the
// discipline those two files already carry — the parts of the fixture that are decidable without
// a browser are checked on every `bun test`, so this proof cannot rot in silence.
import { test, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { freezeInput } from "./freeze";
import { assembleMapNative } from "./assemble/map-native";
import { mapNativeConfigErrors } from "../../skills/map-native/src/validate-config";
import { resolveGeographyRef } from "../geo/ref";
import { fileArtifact } from "./manifest";
import type { RunManifest } from "./manifest";
import type { ProductionBrief } from "../core/production-brief";

const RUN_IT = process.env.SPLASH_DOT_DENSITY_VIDEO_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// Four US states, one numeric column (no takeaway-matching ambiguity). Postal codes, which is
// the point: they match the us-states basemap's own `postal` property and match NOTHING in the
// world basemap's iso_a3, so a render that joins is a render that read the right key.
const POP_CSV =
  "state,population\nCA,39000000\nTX,30000000\nNY,19000000\nWY,580000";

const US_STATES = resolveGeographyRef("us-states");

const GEO = {
  column: "state",
  geography: US_STATES,
  matched: 4,
  total: 4,
  unmatched: [] as string[],
};

const ANGLE = {
  confirmedTakeaway:
    "California and Texas hold most of the four states' people",
  altInsight:
    "A dot map of four US states where California and Texas carry the densest scatter",
  unit: "people",
};

const BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "dot-density",
  format: "video",
  angle: ANGLE,
  dataCsv: POP_CSV,
  attribution: "US Census Bureau",
  sourceUrl:
    "https://www.census.gov/data/tables/time-series/demo/popest/2020s-state-total.html",
  geo: GEO,
};

// ALWAYS ON — the milliseconds half, and the half that proves the ASSEMBLER's new scope rather
// than only the renderer's behaviour. Without it a future widening of the refusal back to every
// format would leave this file green (the proof below is opt-in and does not run in the gate)
// while the capability it measured was deleted again.
test("the fixture assembles into a config the engine accepts, and names the postal join key the video path reads", () => {
  const r = assembleMapNative(BRIEF);
  expect(r.ok ? mapNativeConfigErrors(r.value) : [r.message]).toEqual([]);
  if (!r.ok) return;
  const cfg = r.value as Record<string, unknown>;
  expect(cfg.type).toBe("dot-density");
  expect(cfg.basemap).toBe("us-states");
  // The field resolveVideoGeometry prefers. An assembled config that omitted it would leave the
  // components on their pinned "iso_a3" default, and the render below would be measuring the
  // wrong thing.
  expect((cfg.geography as { joinKey?: string } | undefined)?.joinKey).toBe(
    "postal",
  );
});

// The other side of the same scope, stated where the render is: the formats whose component pins
// the key must STILL be refused, or this file would read as "us-states dot-density works" when
// what was measured is "us-states dot-density works in video".
for (const format of ["static", "interactive"] as const) {
  test(`the same fixture is still refused in ${format}, whose component pins the key`, () => {
    const r = assembleMapNative({ ...BRIEF, format });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("us-states");
    expect(r.message).toContain("world");
  });
}

proof(
  "a us-states dot-density VIDEO produces a real mp4 whose frames pass the engine's own video check",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-dotdensity-video-e2e-"));
    try {
      const src = join(runDir, "data.csv");
      writeFileSync(src, POP_CSV);

      const run: RunManifest = {
        runId: "dot-density-video-e2e",
        schemaVersion: 7,
        route: "embed",
        channel: "article-web",
        input: { data: freezeInput(runDir, src, "data") },
        // Declared, because produce() refuses an undeclared run outright and the credit is
        // rendered into the frames this proof measures.
        sources: {
          mode: "real",
          data: {
            kind: "public",
            label: "US Census Bureau",
            url: "https://www.census.gov/data/tables/time-series/demo/popest/2020s-state-total.html",
          },
        },
        orient: {
          profile: {
            columns: ["state", "population"],
            numericColumns: ["population"],
            rowCount: 4,
          },
          supportsPoint: false,
          geo: GEO,
        },
        elements: [
          {
            id: "e1",
            angle: ANGLE,
            proposal: {
              options: [
                {
                  id: "dot-density",
                  nativeType: "dot-density",
                  engine: "map-native",
                  format: "video",
                  why: "one dot per slice of people, scattered inside each state",
                },
              ],
              excluded: [],
              chosenId: "dot-density",
            },
          },
        ],
        events: [],
      };

      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      const artifactPath = join(
        runDir,
        fileArtifact(result.value.artifact)!.path,
      );
      expect(artifactPath.endsWith(".mp4")).toBe(true);
      const mp4 = readFileSync(artifactPath);
      expect(mp4.length).toBeGreaterThan(50_000);
      // The mp4 container's own signature, not the producer's report — the "verify the delivered,
      // not the proof" rule this project keeps re-learning.
      expect(mp4.subarray(4, 8).toString("ascii")).toBe("ftyp");

      // THE ENGINE'S OWN FRAME CHECK, read off the file it writes rather than trusted: produce
      // runs snap-video.mjs fail-hard, and it measures that the frames actually MOVE (a map that
      // joined nothing renders an empty basemap, which is a still). Zero violations is what makes
      // this a proof about the join rather than about ffmpeg.
      const report = JSON.parse(
        readFileSync(join(dirname(artifactPath), "video-verify.json"), "utf8"),
      ) as {
        violations?: unknown[];
        measurements?: { revealMeanDiff?: number };
      };

      // WHAT A HUMAN HAS TO LOOK AT, captured BEFORE the assertions rather than after them. Zero
      // violations proves the frames move; it does not prove they show four JOINED states rather
      // than a wandering empty basemap, and the eye check this project requires for a capability
      // decision cannot be made on a report. Capturing after an assertion would delete the
      // evidence in exactly the case someone needs it — a failure.
      const keep = process.env.SPLASH_KEEP_PROOF;
      if (keep) {
        mkdirSync(keep, { recursive: true });
        for (const f of readdirSync(dirname(artifactPath)))
          if (/\.(mp4|png|json)$/.test(f))
            copyFileSync(join(dirname(artifactPath), f), join(keep, f));
      }
      console.log(
        `[dot-density us-states video] ${mp4.length} bytes · ` +
          `violations ${JSON.stringify(report.violations)} · ` +
          `revealMeanDiff ${report.measurements?.revealMeanDiff}`,
      );

      expect(report.violations ?? ["missing"]).toEqual([]);
      // `measurements`, not the report root — the engine nests them (snap-video.mjs:216). Read off
      // the wrong path this silently answered `undefined`, which is exactly the "the proof can
      // lie" failure the assertion exists to prevent.
      expect(report.measurements?.revealMeanDiff ?? 0).toBeGreaterThan(0.5);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  25 * 60 * 1000,
);
