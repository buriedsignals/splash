// Opt-in end-to-end proof of the source WIRING: the declared source is what a reader ends up
// looking at, and correcting it makes the artifact stale.
//
// Run it with:  SPLASH_SOURCE_PROOF=1 bun test lib/source/wiring-proof.test.ts
// Opt-in because it renders twice through the engine and packages a real zip (tens of seconds)
// — the convention lib/verify/real-artifact-proof.test.ts:22 and lib/loop/video-e2e.test.ts:17
// already follow. It was run once on the branch that introduced it; the numbers are in
// docs/superpowers/plans/2026-07-26-source-wiring.md.
//
// What each half MEASURES, rather than asserts from the code:
//
//   1. Two runs identical except for the declared source label produce PNGs with DIFFERENT
//      BYTES. Nothing else in the two runs differs — same CSV, same angle, same channel, same
//      chart type — so the only thing that can have moved a pixel is the credit line. That is
//      the credit reaching the raster, measured without OCR. (The complementary measurement,
//      reading the rendered credit back out of a real browser's DOM, is
//      lib/verify/real-artifact-proof.test.ts, whose FURNITURE check now reads the declared
//      label.)
//   2. Changing the label on an ALREADY PRODUCED element flips stalenessOf to true and puts
//      the run back on "produce". Before provenanceHash covered the ledger this stayed false:
//      a stale credit on an artifact reporting itself fresh.
//   3. The delivered package's README credits the declared source, and the placeholder string
//      appears nowhere in it. Reaching a delivery means walking the whole verification chain
//      (capture → review → preview → approve) on the real artifact, because deliver() refuses
//      unapproved bytes — see the second test.
import { test, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "../loop/produce";
import { deliver } from "../loop/deliver";
import { captureStep, reviewStep } from "../loop/verify";
import { previewStep } from "../loop/preview";
import { approve } from "../loop/approve";
import { freezeInput } from "../loop/freeze";
import {
  nextActions,
  provenanceHash,
  stalenessOf,
  type RunManifest,
  fileArtifact,
} from "../loop/manifest";
import { neutralDecor } from "../newsroom/decor";
import { DEFAULT_NEWSROOM_STATE } from "../newsroom/state";
import { registerAllPublishers } from "../delivery";
import { readmeCopy } from "../delivery/readme-copy";
import { validateSourcePolicy } from "./policy";

const RUN = process.env.SPLASH_SOURCE_PROOF === "1";

const PLACEHOLDER = "Provided by the newsroom";
const DECLARED = "Office cantonal de la statistique GE";
const CORRECTED = "Office fédéral de la statistique";

function makeRun(
  runDir: string,
  label: string,
  format = "static",
): RunManifest {
  const src = join(runDir, "src.csv");
  writeFileSync(
    src,
    "canton,2015,2024\nGenève,449,583\nVaud,412,531\nAppenzell RI,289,352",
  );
  return {
    runId: "source-proof",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: { mode: "real", data: { kind: "local", label } },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 3,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Health premiums rose in every canton shown",
          altInsight:
            "Between 2015 and 2024 the adult premium rose in all three cantons shown; Geneva stays the most expensive.",
          unit: "Monthly adult premium (CHF)",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: format as "static",
              why: "two points in time",
            },
          ],
          excluded: [],
          chosenId: "slope",
        },
      },
    ],
    events: [],
  };
}

// ALWAYS ON — outside the gate, and the only part of this file `bun run check` runs. It checks
// what is decidable from the fixture alone; the refusal that actually rotted this proof
// (deliver() wanting an approval) is NOT of that kind, and no cheap guard sees it. See
// docs/superpowers/specs/2026-07-27-proofs-run-design.md.
test("the fixture declares a source the loop will accept, before any render", () => {
  const run = makeRun(
    mkdtempSync(join(tmpdir(), "source-proof-fixture-")),
    DECLARED,
  );
  const verdict = validateSourcePolicy(run.sources?.data, {
    mode: run.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

/**
 * Take a produced element all the way to `approved`, through the real steps — nothing here
 * writes `approved` by hand, because approveElement is the manifest's only sanctioned writer and
 * a fixture that forged the record would prove the archive credits a source it never gated.
 * SPLASH_NO_VIEWER keeps `preview` from opening a window on a test machine.
 */
async function walkToApproval(
  run: RunManifest,
  runDir: string,
): Promise<RunManifest["elements"][number]> {
  const el = run.elements[0]!;
  const captured = await captureStep(run, el, runDir);
  if (!captured.ok) throw new Error(`capture: ${captured.message}`);
  const reviewed = await reviewStep(
    { ...run, elements: [captured.value] },
    captured.value,
    runDir,
  );
  if (!reviewed.ok) throw new Error(`review: ${reviewed.message}`);
  const previewed = previewStep(
    { ...run, elements: [reviewed.value] },
    reviewed.value,
    runDir,
    { env: { SPLASH_NO_VIEWER: "1" } },
  );
  if (!previewed.ok) throw new Error(`preview: ${previewed.message}`);
  const decided = approve(
    { ...run, elements: [previewed.value] },
    previewed.value,
    runDir,
    { actorLabel: "source-wiring-proof" },
    { signers: [], requiredSigners: [] },
  );
  if (!decided.ok) throw new Error(`approve: ${decided.message}`);
  return decided.value;
}

test.skipIf(!RUN)(
  "the declared source is painted into the raster, and correcting it makes the artifact stale",
  async () => {
    // ---- 1. two runs, one label apart, produce different pixels ---------------------
    const dirA = mkdtempSync(join(tmpdir(), "source-proof-a-"));
    const runA = makeRun(dirA, DECLARED);
    const a = await produce(runA, runA.elements[0]!, dirA);
    if (!a.ok) throw new Error(a.message);
    const pngA = readFileSync(join(dirA, fileArtifact(a.value.artifact)!.path));

    const dirB = mkdtempSync(join(tmpdir(), "source-proof-b-"));
    const runB = makeRun(dirB, CORRECTED);
    const b = await produce(runB, runB.elements[0]!, dirB);
    if (!b.ok) throw new Error(b.message);
    const pngB = readFileSync(join(dirB, fileArtifact(b.value.artifact)!.path));

    expect(fileArtifact(a.value.artifact)!.path).toBe(
      join("elements", "e1", "static.png"),
    );
    expect(pngA.length).toBeGreaterThan(5000);
    // The ONLY difference between the two runs is the declared label. Different bytes ⇒ the
    // credit is in the image, not merely in the config beside it.
    expect(pngA.equals(pngB)).toBe(false);
    expect(fileArtifact(a.value.artifact)!.sha256).not.toBe(
      fileArtifact(b.value.artifact)!.sha256,
    );

    // ---- 2. correcting the label on a produced element makes it stale ---------------
    const produced = { ...runA, elements: [a.value] };
    expect(stalenessOf(produced, produced.elements[0]!)).toBe(false);
    expect(nextActions(produced)).toEqual(["show"]);

    const corrected: RunManifest = {
      ...produced,
      sources: { mode: "real", data: { kind: "local", label: CORRECTED } },
    };
    expect(stalenessOf(corrected, corrected.elements[0]!)).toBe(true);
    expect(nextActions(corrected)).toEqual(["produce"]);
    expect(provenanceHash(corrected, corrected.elements[0]!)).not.toBe(
      a.value.artifact!.provenanceHash,
    );

    // Re-producing at the corrected label lands on the OTHER run's bytes: same inputs, same
    // credit, same image. The staleness was pointing at a real difference.
    const reproduced = await produce(
      corrected,
      { ...corrected.elements[0]!, artifact: undefined },
      dirA,
    );
    if (!reproduced.ok) throw new Error(reproduced.message);
    expect(fileArtifact(reproduced.value.artifact)!.sha256).toBe(
      fileArtifact(b.value.artifact)!.sha256,
    );
    expect(stalenessOf(corrected, reproduced.value)).toBe(false);
  },
  240_000,
);

test.skipIf(!RUN)(
  "the delivered package credits the declared source, and never the placeholder",
  async () => {
    registerAllPublishers();
    const runDir = mkdtempSync(join(tmpdir(), "source-proof-zip-"));
    const run = makeRun(runDir, DECLARED);
    const p = await produce(run, run.elements[0]!, runDir);
    if (!p.ok) throw new Error(p.message);

    // The verification chain, walked on the REAL artifact. deliver() refuses bytes nobody
    // approved ("capture it, review it, preview it and approve it before it is published"), and
    // that refusal is the product working: an attribution proof that published without the gate
    // would be describing a loop that no longer exists. Same sequence lib/loop/approve.test.ts
    // drives, run here so the zip below comes out of a real delivery rather than around one.
    const approved = await walkToApproval(
      { ...run, elements: [p.value] },
      runDir,
    );

    const withDelivery = {
      ...run,
      elements: [
        { ...approved, delivery: { requested: ["zip"], delivered: [] } },
      ],
    };
    const decor = {
      ...neutralDecor(),
      state: {
        ...DEFAULT_NEWSROOM_STATE,
        capabilities: { zip: { enabled: true } },
      },
    };
    // The newsroom profile names an OUTLET on purpose: before this wiring it was
    // `profile.source` that became the delivered attribution, so the outlet's own name shipped
    // as the origin of the figures.
    const d = await deliver(
      withDelivery,
      withDelivery.elements[0]!,
      runDir,
      decor,
      { source: "Heidi.news", credit: "Rédaction", lang: "fr" },
    );
    if (!d.ok) throw new Error(d.message);

    const record = d.value.delivery!.delivered[0]!;
    const zipPath = join(runDir, record.artifact!.path);
    // Read back out of the DELIVERED archive, not out of the metadata object that built it —
    // the entries are deflated, so this really unzips.
    const readme = execFileSync("unzip", ["-p", zipPath, "README.md"], {
      encoding: "utf8",
    });
    // The LABEL is read from the same table the package writes with, the VALUE is not: the
    // delivery is asked for `lang: "fr"` above, and a French package spaces its colon
    // ("Source : X", lib/delivery/readme-copy.ts). Hard-coding the English label here made all
    // three of these assertions rot at once when the owned package learned the newsroom's
    // language — the positive one failed loudly, but both NEGATIVE ones went vacuous, passing
    // on a string the README could no longer contain in any case. What this proof is about —
    // that the DECLARED source, and never the placeholder or the outlet, is what a reader ends
    // up looking at — is carried by the values, so only the labels are derived.
    const copy = readmeCopy("fr");
    expect(readme).toContain(`${copy.source} ${DECLARED}`);
    expect(readme).not.toContain(PLACEHOLDER);
    // The newsroom profile stays the AUTHOR line, and never becomes the origin of the figures.
    expect(readme).not.toContain(`${copy.source} Heidi.news`);
    expect(readme).toContain(`${copy.credit} Rédaction`);
  },
  240_000,
);
