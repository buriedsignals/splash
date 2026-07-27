import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { render } from "../core/verbs";
import { freezeInput } from "./freeze";
import { draftBeats, applyBeats } from "./beats";
import { assembleNativeSpec } from "./produce";
import { unauthoredBeats, type RunManifest } from "./manifest";
import type { AuthoredBeat } from "../brain/verify-beats";

// THE PROOF that the beats a reader sees are the journalist's, not the machine's.
//
// OPT-IN (SPLASH_PROVE_BEATS=1), and out of `bun run check` on purpose: it drives a real Vite
// single-file build plus the scrolly producer's own Playwright reduced-motion snap (~25 s). Same
// discipline as skills/splash/scripts/verify-source-bundle.mjs, deliberately kept out of the gate
// for the same reason — a real network-and-browser build has no business running on every commit.
//
// WHY IT CALLS render() AND NOT produce(). scrolly is not in LOOP_BUILDABLE_ENGINES yet (the
// whole-article branch is its own sub-project — see the design spec §5), so produce() refuses a
// scrolly form by design. What this test must not become is a PARALLEL path: it therefore builds
// its spec with the very function produce() uses (assembleNativeSpec) and hands it to the very
// verb produce() dispatches through (render), with the same arguments. What gets rendered here is
// literally what production will render on the day the branch is wired.
// MEASURED, 2026-07-27, on a real build of both pages. The four narrative steps of a chart
// scrolly, same series, same anchors, same six-card structure:
//
//   DERIVED (skills/scrolly/assets/sample-data/line-scrolly.json, no `beats`):
//     "1979 — 7" · "1995 — 6.1" · "2007 — 4.3" · "2025 — 4.3"
//   AUTHORED (this test):
//     "En 1979, la banquise d'été tenait encore sur 7 millions de kilomètres carrés." · …
//
// Read out of the two built pages in a browser, from their [data-step-index] nodes — not from
// the config, and not from the producer's own report. Verifying the DELIVERED artifact rather
// than the proof of it is a rule this codebase learned the hard way.
const RUN_IT = process.env.SPLASH_PROVE_BEATS === "1";
const proof = RUN_IT ? test : test.skip;

const SEA_ICE =
  "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3";

// The journalist's own sentences — the thing the seam exists to put on the page. Deliberately
// prose no derivation would produce: the point is that they cannot be confused with a caption
// the machine wrote.
const CLAIMS = [
  "En 1979, la banquise d'été tenait encore sur 7 millions de kilomètres carrés.",
  "Seize ans plus tard, le recul est engagé et personne n'y prête attention.",
  "2007 est l'année où le doute cesse : la surface s'effondre.",
  "Un demi-siècle après, rien n'est revenu — et c'est cela, l'histoire.",
];

function proofRun() {
  const runDir = mkdtempSync(join(tmpdir(), "beats-render-proof-"));
  const src = join(runDir, "sea-ice.csv");
  writeFileSync(src, SEA_ICE);
  const run: RunManifest = {
    runId: "beats-proof",
    schemaVersion: 4,
    route: "article",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "NSIDC Sea Ice Index",
        url: "https://nsidc.org/data/seaice_index",
      },
    },
    orient: {
      profile: {
        columns: ["year", "extent"],
        numericColumns: ["year", "extent"],
        rowCount: 7,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway:
            "La banquise arctique de septembre ne s'est jamais reconstituée",
          altInsight:
            "L'étendue minimale de septembre est passée de 7 à 4,3 millions de km² entre 1979 et 2025.",
          unit: "million km²",
        },
        proposal: {
          options: [
            {
              id: "line-scrolly",
              nativeType: "line",
              engine: "chart-native",
              format: "scrolly",
              why: "une série dont la forme se raconte au fil du défilement",
            },
          ],
          excluded: [],
          chosenId: "line-scrolly",
        },
      },
    ],
    events: [],
  };
  return { run, runDir };
}

proof(
  "a real chart-scrolly ships the journalist's beats, and not the derived draft",
  async () => {
    const { run, runDir } = proofRun();

    // 1. THE DRAFT — derived, and every claim deliberately unwritten.
    const drafted = draftBeats(run, run.elements[0]!, runDir);
    expect(drafted.ok).toBe(true);
    if (!drafted.ok) return;
    const plan = drafted.value.narrative!.beats;
    expect(plan.length).toBe(CLAIMS.length);
    expect(unauthoredBeats(drafted.value)).toHaveLength(plan.length);
    const draftCaptions = plan.map((b) => b.draftText);

    // 2. THE AUTHORING — the journalist validates the walk and writes each claim.
    const withPlan: RunManifest = { ...run, elements: [drafted.value] };
    const authored: AuthoredBeat[] = plan.map((b, i) => ({
      id: b.id,
      role: b.role,
      text: CLAIMS[i]!,
    }));
    const ready = applyBeats(withPlan, "e1", authored);
    expect(unauthoredBeats(ready.elements[0]!)).toEqual([]);

    // 3. THE RENDER — production's own spec assembly, production's own verb.
    const spec = assembleNativeSpec(
      ready,
      ready.elements[0]!,
      SEA_ICE,
      "NSIDC Sea Ice Index",
      "https://nsidc.org/data/seaice_index",
      "scrolly",
    );
    const out = join(runDir, "elements", "e1");
    const result = await render({
      engine: "scrolly",
      spec,
      format: "scrolly",
      channel: "article-web",
      outDir: out,
      id: "e1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const page = result.value.files.find((f) => f.endsWith("scrolly.html"))!;
    const html = readFileSync(page, "utf8");

    // 4. THE MEASUREMENT. Every authored claim is on the page…
    for (const claim of CLAIMS) expect(html).toContain(claim);
    // …and not one of the derived captions is.
    for (const caption of draftCaptions) expect(html).not.toContain(caption);

    rmSync(runDir, { recursive: true, force: true });
  },
  600_000,
);

proof(
  "the guard refuses a beat asserting a number the data does not contain",
  () => {
    const { run, runDir } = proofRun();
    const drafted = draftBeats(run, run.elements[0]!, runDir);
    if (!drafted.ok) throw new Error(drafted.message);
    const withPlan: RunManifest = { ...run, elements: [drafted.value] };
    const plan = drafted.value.narrative!.beats;

    const invented: AuthoredBeat[] = plan.map((b, i) => ({
      id: b.id,
      role: b.role,
      // The last beat asserts a collapse to 1.8 million km². The series never goes below 3.6.
      text: i === plan.length - 1 ? "La surface est tombée à 1,8." : CLAIMS[i]!,
    }));
    expect(() => applyBeats(withPlan, "e1", invented)).toThrow(/1\.8/);
    // …and nothing was written: the manifest is unchanged, so a refusal is safe to retry.
    expect(unauthoredBeats(withPlan.elements[0]!)).toHaveLength(plan.length);
    rmSync(runDir, { recursive: true, force: true });
  },
);
