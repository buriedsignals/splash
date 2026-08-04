import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { freezeInput } from "./freeze";
import { draftBeats, applyBeats } from "./beats";
import { produce } from "./produce";
import { unauthoredBeats, type RunManifest, fileArtifact } from "./manifest";
import type { AuthoredBeat } from "../brain/verify-beats";

// THE PROOF that the beats a reader sees are the journalist's, not the machine's.
//
// TWO HALVES, as every other proof in this roster has: the RENDER below is opt-in, and the
// grounding guard at the foot of the file is ALWAYS ON. Both used to be gated, which made this
// the only one of the eleven proofs with nothing running under `bun run check` — dark on every
// commit, on the proof that earned scrolly its key in the assembler table.
//
// OPT-IN (SPLASH_PROVE_BEATS=1), and out of `bun run check` on purpose: it drives a real Vite
// single-file build plus the scrolly producer's own Playwright reduced-motion snap, then opens the
// built page in a third browser to read it. Same discipline as
// skills/splash/scripts/verify-source-bundle.mjs, deliberately kept out of the gate for the same
// reason — a real network-and-browser build has no business running on every commit. It IS in
// scripts/proofs.mjs's roster (added at the branch's close-out, having been absent since it was
// written, which meant nothing ran it).
//
// COST — 3.3 s for the whole file, both tests, reproduced three times on an M-series Mac.
// Broken down, measured: `bunx vite build` 0.35-0.5 s (vite resolves from
// skills/scrolly/node_modules, so nothing is fetched), produce() end to end 2.2 s (that build plus
// the reduced-motion snap), and the remaining ~1 s is this file's own browser read.
//
// This header said "~25 s" until 2026-07-28 and that number could NOT be reproduced — it is off by
// an order of magnitude, and a wrong cost in a header is how the next person mis-plans a run. What
// a slow run's time goes into, if you meet one: snap-reduced-motion.mjs waits up to 30 s for
// `[data-step-index]` to become visible, and a standalone run of it was observed spending 15 s in
// exactly that wait. So ~25 s is consistent with a cold browser or a page slow to paint, and not
// with the steady state. Cause NOT established — only the steady-state figures above are measured.
//
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

// Opens the built page and returns the text of its narrative steps, in order. A scrolly derives
// its captions in the browser, so the DOM is the only place the shipped walk can be read.
async function readRenderedSteps(pagePath: string): Promise<string[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    await tab.goto(`file://${pagePath}`, { waitUntil: "networkidle" });
    await tab.waitForSelector("[data-step-index]", { timeout: 30_000 });
    return await tab.$$eval("[data-step-index]", (nodes) =>
      nodes.map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim()),
    );
  } finally {
    await browser.close();
  }
}

function proofRun() {
  const runDir = mkdtempSync(join(tmpdir(), "beats-render-proof-"));
  const src = join(runDir, "sea-ice.csv");
  writeFileSync(src, SEA_ICE);
  const run: RunManifest = {
    runId: "beats-proof",
    schemaVersion: 7,
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

    // 3. THE RENDER — production's own verb, exactly as the driver calls it: assembles the
    // spec (assembleScrolly, resolved through the assembler table) and renders it, with no
    // parallel path of this test's own.
    const result = await produce(ready, ready.elements[0]!, runDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const page = join(runDir, fileArtifact(result.value.artifact)!.path);

    // 4. THE MEASUREMENT — in a browser, off the rendered step nodes.
    //
    // It used to read the built file as a STRING. Half of that was vacuous, measured: the
    // derived captions are produced at RUNTIME by deriveChartStory, so they are never in the
    // bundle at all — `expect(html).not.toContain(caption)` passed whether the beats were
    // authored or not. This codebase already wrote that rule down after a false alarm on a
    // palette: grepping a single-file bundle is not evidence, because what the page SHOWS is
    // computed after it loads. So the page is opened and the steps are read from the DOM.
    // Six cards, not four: the scrolly frames the narrative walk with its own intro and
    // takeaway cards (the "intro must not equal the takeaway" rule this project already
    // pinned). The authored beats are the walk BETWEEN them, so they are matched by content
    // rather than by count.
    const steps = await readRenderedSteps(page);
    const walk = steps.join(" \u2022 ");
    expect(steps.length).toBeGreaterThanOrEqual(CLAIMS.length);
    for (const claim of CLAIMS) expect(walk).toContain(claim);
    // …and not one of the derived captions survives on the rendered page. THIS one can now
    // fail: the derived run really does paint these strings (verified on the same fixture
    // without beats), so their absence here is the authored walk having replaced them.
    for (const caption of draftCaptions) expect(walk).not.toContain(caption);

    rmSync(runDir, { recursive: true, force: true });
  },
  600_000,
);

// ALWAYS ON — the half that needs neither browser nor network. This file was the ONLY one of the
// eleven proofs with no always-on half: both tests sat behind SPLASH_PROVE_BEATS, so nothing here
// ran under `bun run check` on any commit — the exact rot mode the other proof headers cite, on
// the proof that earned scrolly its key in the assembler table. This test drafts from a CSV the
// test itself writes and calls the guard synchronously; there is nothing in it a gate cannot run.
test("the guard refuses a beat asserting a number the data does not contain", () => {
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
});
