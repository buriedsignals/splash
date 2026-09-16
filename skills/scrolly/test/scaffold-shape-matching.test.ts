import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  inferSubjectShape,
  pickWorkedExample,
  workedExamplesOf,
} from "../scripts/scaffold-scrolly-map-beat.mjs";

/**
 * THE SCAFFOLD PICKS A WORKED EXAMPLE MATCHING THE SUBJECT'S OWN DATA SHAPE, AND SAYS SO LOUDLY WHEN NONE MATCH.
 *
 * A cold run scaffolded dot-density (its one worked example built on per-station lon/lat) for a subject that was
 * per-country totals with no coordinates — none of the ~750 copied lines applied
 * (.superpowers/sdd/2026-09-16-scrolly-any-subject/final-cold-friction.md). This file proves: every map type
 * sheet records its worked example's own data shape and the scaffold parses it; `pickWorkedExample` prefers a
 * shape match among several candidates and never silently mismatches — it reports the gap; a real scaffold run
 * whose subject shape disagrees with the (single) worked example still writes working files, with a `SHAPE
 * MISMATCH` banner stamped at the exact regions that must change.
 */

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const MAP_SCRIPT = join(
  ROOT,
  "skills",
  "scrolly",
  "scripts",
  "scaffold-scrolly-map-beat.mjs",
);
const STAMP = `${process.pid}-${Date.now().toString(36)}`;

const run = (args: string[]) =>
  spawnSync("bun", [MAP_SCRIPT, ...args], { cwd: ROOT, encoding: "utf8" });

function removeProbe(dir: string, name: string) {
  if (
    dirname(dir) === PROOF &&
    basename(dir).startsWith(".scaffold-test-") &&
    basename(dir) === name &&
    existsSync(dir)
  )
    rmSync(dir, { recursive: true });
}

describe("every map type sheet records its worked example's own data shape", () => {
  const EXPECTED: Record<string, string> = {
    "dot-density": "points",
    choropleth: "per-area",
    cartogram: "per-area",
    "contour-isoline": "per-area",
    "flow-map": "per-area",
    "hex-grid": "per-area",
    locator: "points",
    "proportional-symbol": "points",
  };

  it("should parse a recorded shape for every map type's worked example", () => {
    for (const [type, shape] of Object.entries(EXPECTED)) {
      const examples = workedExamplesOf(ROOT, type);
      expect([type, examples.length]).toEqual([type, 1]);
      expect([type, examples[0].shape]).toEqual([type, shape]);
    }
  });
});

describe("pickWorkedExample", () => {
  const points = { beat: "proof/scrolly-a", shape: "points" };
  const perArea = { beat: "proof/scrolly-b", shape: "per-area" };

  it("should prefer the worked example whose recorded shape matches the subject's, among several", () => {
    const picked = pickWorkedExample({
      examples: [points, perArea],
      explicitFrom: null,
      subjectShape: "per-area",
    });
    expect(picked).toEqual({ beat: "proof/scrolly-b", mismatch: null });
  });

  it("should fall back to the first example and report the mismatch when none match", () => {
    const picked = pickWorkedExample({
      examples: [points],
      explicitFrom: null,
      subjectShape: "per-area",
    });
    expect(picked.beat).toBe("proof/scrolly-a");
    expect(picked.mismatch).toEqual({
      assumedShape: "points",
      subjectShape: "per-area",
    });
  });

  it("should report no mismatch when the subject's shape is unknown", () => {
    const picked = pickWorkedExample({
      examples: [points],
      explicitFrom: null,
      subjectShape: null,
    });
    expect(picked).toEqual({ beat: "proof/scrolly-a", mismatch: null });
  });

  it("should let an explicit --from win outright, but still report a mismatch against its own recorded shape", () => {
    const picked = pickWorkedExample({
      examples: [points, perArea],
      explicitFrom: "proof/scrolly-a",
      subjectShape: "per-area",
    });
    expect(picked.beat).toBe("proof/scrolly-a");
    expect(picked.mismatch).toEqual({
      assumedShape: "points",
      subjectShape: "per-area",
    });
  });

  it("should report no mismatch for an explicit --from the sheet does not itself name", () => {
    const picked = pickWorkedExample({
      examples: [points],
      explicitFrom: "proof/scrolly-elsewhere",
      subjectShape: "per-area",
    });
    expect(picked).toEqual({ beat: "proof/scrolly-elsewhere", mismatch: null });
  });
});

describe("inferSubjectShape", () => {
  const DIR = join(PROOF, `.scaffold-test-scrolly-infer-shape-${STAMP}`);

  afterAll(() => removeProbe(DIR, basename(DIR)));

  it("should read points off a data.json carrying lon/lat columns", () => {
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    writeFileSync(
      join(DIR, "data.json"),
      JSON.stringify({
        columns: [{ name: "station" }, { name: "lon" }, { name: "lat" }],
      }),
    );
    expect(inferSubjectShape(DIR)).toBe("points");
  });

  it("should read per-area off a data.json carrying an entity column and no coordinates", () => {
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    writeFileSync(
      join(DIR, "data.json"),
      JSON.stringify({ columns: [{ name: "entity" }, { name: "value" }] }),
    );
    expect(inferSubjectShape(DIR)).toBe("per-area");
  });

  it("should read per-area off a data.csv header row when there is no data.json", () => {
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    writeFileSync(join(DIR, "data.csv"), "entity,code,year,value\n");
    expect(inferSubjectShape(DIR)).toBe("per-area");
  });

  it("should return null when neither file exists", () => {
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    expect(inferSubjectShape(DIR)).toBe(null);
  });
});

describe("scaffold-scrolly-map-beat — an honest shape mismatch, end to end", () => {
  const MISMATCH_NAME = `.scaffold-test-scrolly-shape-mismatch-${STAMP}`;
  const MISMATCH_BEAT = join(PROOF, MISMATCH_NAME);
  const MATCH_NAME = `.scaffold-test-scrolly-shape-match-${STAMP}`;
  const MATCH_BEAT = join(PROOF, MATCH_NAME);

  const PALETTE_FIXTURE =
    '---\nground: "#16191B"\naccent: "#D4A853"\naccents: "#5B8A8A"\norigin: "newsroom"\n---\n';
  beforeAll(() => {
    removeProbe(MISMATCH_BEAT, MISMATCH_NAME);
    removeProbe(MATCH_BEAT, MATCH_NAME);
    // Both scaffolds below adapt dot-density-europe-stations, whose runner reads "stations.csv" beside the
    // beat, and both now also require a reachable PALETTE.md — see depth-independent.mjs.
    for (const dir of [MISMATCH_BEAT, MATCH_BEAT]) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "PALETTE.md"), PALETTE_FIXTURE);
      writeFileSync(join(dir, "stations.csv"), "x\n1\n");
    }
  });
  afterAll(() => {
    removeProbe(MISMATCH_BEAT, MISMATCH_NAME);
    removeProbe(MATCH_BEAT, MATCH_NAME);
  });

  it("should still scaffold a working beat, with a loud SHAPE MISMATCH banner, when the subject's shape disagrees with the only worked example", () => {
    const result = run([
      "--type",
      "dot-density",
      "--beat",
      `proof/${MISMATCH_NAME}`,
      "--component",
      "ShapeProbe",
      "--shape",
      "per-area",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SHAPE MISMATCH");
    expect(result.stdout).toContain('"points"');
    expect(result.stdout).toContain('"per-area"');

    const runner = readFileSync(
      join(MISMATCH_BEAT, "render-directions-scrolly.mjs"),
      "utf8",
    );
    expect(runner).toContain("SHAPE MISMATCH");
    expect(runner).toContain("SCAFFOLD: data loading");

    const plan = readFileSync(join(MISMATCH_BEAT, "plan.mjs"), "utf8");
    expect(plan).toContain("SHAPE MISMATCH");
    expect(plan).toContain("SCAFFOLD: marks");

    const brief = readFileSync(join(MISMATCH_BEAT, "BRIEF.md"), "utf8");
    expect(brief).toContain("SHAPE MISMATCH");
  });

  it("should carry no SHAPE MISMATCH banner when the subject's declared shape matches the worked example", () => {
    const result = run([
      "--type",
      "dot-density",
      "--beat",
      `proof/${MATCH_NAME}`,
      "--component",
      "ShapeProbe",
      "--shape",
      "points",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("SHAPE MISMATCH");

    const runner = readFileSync(
      join(MATCH_BEAT, "render-directions-scrolly.mjs"),
      "utf8",
    );
    expect(runner).not.toContain("SHAPE MISMATCH");
    const brief = readFileSync(join(MATCH_BEAT, "BRIEF.md"), "utf8");
    expect(brief).not.toContain("SHAPE MISMATCH");
  });
});
