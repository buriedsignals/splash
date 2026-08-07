import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest, writeManifest, type RunManifest } from "./manifest";
import { freezeInput } from "./freeze";
import { orient } from "./orient";

function freshRun(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "loop-io-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583");
  const run: RunManifest = {
    runId: "r1",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  return { run, runDir };
}

test("writeManifest then readManifest round-trips", () => {
  const { run } = freshRun();
  const p = join(mkdtempSync(join(tmpdir(), "loop-io-out-")), "run.json");
  writeManifest(p, run);
  expect(readManifest(p)).toEqual(run);
});

// The round-trip above uses a hand-built manifest, and every geographic fixture in this suite
// hand-builds its GeoMatch too — which is how a shipped-basemap match came to be UNREADABLE for
// a week without a red test. `orient` stores whatever matchGeography returns, and since
// 2026-07-30 (9bfbcf46) that is a GeographyRef carrying `fileExtension`; the manifest's
// hand-mirrored GeographyRefSchema is a z.strictObject that never learned the field. writeManifest
// does not validate (only assertInvariants), so orient WROTE the run and every later verb —
// confirm-angle, state, produce — died on "Unrecognized key: fileExtension" reading it back.
// Driven by orient's REAL output, for both shipped extensions, so the mirror cannot silently
// fall behind the type again.
test("a run whose orient matched a shipped basemap can be read back", () => {
  for (const csv of [
    "country,access\nCHE,100\nFRA,100", // world → geojson
    "state,rent\nNY,3200\nCA,2900", // us-states → geojson
  ]) {
    const { run, runDir } = freshRun();
    const oriented: RunManifest = { ...run, orient: orient(csv) };
    expect(oriented.orient!.geo!.geography.fileExtension).toBeDefined();
    const p = join(runDir, "run.json");
    writeManifest(p, oriented);
    expect(readManifest(p)).toEqual(oriented);
  }
});
