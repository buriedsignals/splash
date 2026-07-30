// The acceptance test for the proposal-brain tranche: a real journalist's path, driven
// through the actual loop (never a hand-built manifest) — data in, an offer that carries
// its discards, a faithful phrasing that clears verifyOffer's guard, a choice, and a
// produced artifact whose format is the one the offer promised.
//
// What this deliberately does NOT exercise: dw-chart / map-native / map-dw production
// (lib/loop/buildable.ts names the engines production can build through — anything else is
// MARKED in the offer and refused loud at produce, and this test asserts that pairing rather
// than stepping around it) and delivery. Which nativeType ends up top-ranked is NOT pinned —
// the ranking has already changed twice during this tranche and will again the next time a
// sheet is edited; this test walks the ranked options and produces the first one production
// can actually render, rather than assuming a fixed winner.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance, advanceStep } from "../loop/driver";
import { freezeInput } from "../loop/freeze";
import {
  fileArtifact,
  isHostedArtifact,
  nextActions,
  type RunManifest,
  type FormOption,
} from "../loop/manifest";
import { type PhrasedOption } from "./verify-offer";
import { applyPhrasing } from "../loop/phrase";
import { assertFileMedia, isHostedUrl } from "../core/contract";
import { isLoopBuildable } from "../loop/buildable";

const CSV = `canton,2019,2024
Genève,1200,1850
Vaud,980,1410
Valais,760,1120
Fribourg,700,1010
Jura,640,900
Neuchâtel,610,880
Berne,590,870
Zurich,1500,2100
`;

function newRun(channel: RunManifest["channel"] = "article-web"): {
  run: RunManifest;
  dir: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "brain-e2e-"));
  const src = join(dir, "src.csv");
  writeFileSync(src, CSV);
  const data = freezeInput(dir, src, "data");
  return {
    dir,
    run: {
      runId: "e2e",
      schemaVersion: 5,
      route: "embed",
      channel,
      input: { data },
      // A CSV this test wrote into its own run dir: a `local` source (lib/source) — the file
      // the journalist brought. produce() refuses an undeclared run rather than crediting a
      // placeholder, so a fixture that reaches a render says what its data is.
      sources: {
        mode: "real" as const,
        data: { kind: "local" as const, label: "Relevés cantonaux 2024" },
      },
      elements: [{ id: "e1" }],
      events: [],
    },
  };
}

// A faithful phrasing of one offered option: the grounding facts + fragment it is entitled
// to cite, and — only when the option is marked — the structural acknowledgement verifyOffer
// requires. This is the seam a real phrasing step (the model, in production) stands behind.
function phrase(o: FormOption): PhrasedOption {
  const why =
    `${o.whySource!.fragments[0]} (${o.whySource!.facts.rows} lignes, ${o.whySource!.facts.points} points)` +
    (o.readiness ? ` — ${o.readiness.reason}` : "");
  return {
    id: o.id,
    why,
    ...(o.readiness ? { markAcknowledged: true as const } : {}),
  };
}

test("a real run reaches an offer that carries its discards and can be phrased", async () => {
  const { run, dir } = newRun();
  let m = await advance(run, dir); // orient
  expect(m.orient!.supportsPoint).toBe(true);

  m = {
    ...m,
    elements: [
      {
        ...m.elements[0],
        angle: {
          confirmedTakeaway:
            "L'écart entre cantons se creuse entre 2019 et 2024",
          altInsight: "Tous les cantons montent, Zurich le plus fort",
          unit: "CHF",
        },
      },
    ],
  };
  expect(nextActions(m)).toEqual(["propose"]);

  m = await advance(m, dir); // propose
  const proposal = m.elements[0].proposal!;

  // The offer's shape: at most 3 forms, every one grounded, every discard reasoned.
  expect(proposal.options.length).toBeGreaterThan(0);
  expect(proposal.options.length).toBeLessThanOrEqual(3);
  for (const o of proposal.options) expect(o.whySource).toBeDefined();
  for (const e of proposal.excluded) expect(e.reason.length).toBeGreaterThan(0);

  // Un-phrased, an option carries NO why: the sheet's fragments are English and the journalist
  // reads French — an offer arrives as grounding, never as prose.
  for (const o of proposal.options) expect(o.why).toBe("");

  // The phrasing seam, driven through its real production path: applyPhrasing runs verifyOffer
  // (spec §7, "non optionnelle") and only then writes the desk's prose onto the manifest. This
  // is what a phrasing step must clear before a journalist ever sees the offer.
  m = applyPhrasing(m, "e1", proposal.options.map(phrase));
  for (const o of m.elements[0].proposal!.options)
    expect(o.why.length).toBeGreaterThan(0);

  expect(nextActions(m)).toEqual(["choose-form"]);

  // THE RULE, asserted rather than routed around: nothing is offered that production cannot
  // build — and a form it cannot build is MARKED, never offered clean. An earlier version of
  // this test walked past every non-chart-native option to find something buildable, which
  // stepped over the very rule the acceptance test exists to prove: the offer could rank an
  // unbuildable form FIRST, unmarked, and this test would still pass.
  for (const o of proposal.options) {
    if (isLoopBuildable(o.engine)) continue;
    expect(o.readiness?.status).toBe("missing");
    expect(o.readiness!.reason).toContain(o.engine!);
  }
  // Rank 1 in particular — what a journalist reads first is buildable, or says it is not.
  const top = proposal.options[0]!;
  expect(isLoopBuildable(top.engine) || top.readiness != null).toBe(true);

  // The choice, and a rendered artifact. Which nativeType ranks first is not pinned here — so
  // walk the ranked options and produce the first one production can actually build, exactly
  // as a journalist choosing down the offer would.
  //
  // Every refusal along the way is KEPT, not swallowed. An earlier version of this walk dropped
  // each failed attempt on the floor and asserted `expect(chosen).toBeDefined()` at the end, so a
  // walk where all three candidates were refused reported itself as `undefined` — a value, not a
  // reason. Diagnosing that meant re-instrumenting the loop by hand to recover what the run had
  // already recorded. `advanceStep` hands back the refusal the ledger got (lib/loop/driver.ts),
  // so when nothing renders this test says which forms were tried and why each one said no.
  let produced: RunManifest | undefined;
  let chosen: FormOption | undefined;
  const refusals: string[] = [];
  const phrasedProposal = m.elements[0].proposal!;
  for (const o of phrasedProposal.options) {
    if (!isLoopBuildable(o.engine)) continue;
    const attempt: RunManifest = {
      ...m,
      elements: [
        { ...m.elements[0], proposal: { ...phrasedProposal, chosenId: o.id } },
        ...m.elements.slice(1),
      ],
    };
    const step = await advanceStep(attempt, dir);
    if (step.run.elements[0].artifact) {
      produced = step.run;
      chosen = o;
      break;
    }
    refusals.push(
      `${o.id} (${o.engine}/${o.format}): ${step.failure?.message ?? "produced no artifact and recorded no refusal"}`,
    );
  }
  if (!chosen)
    throw new Error(
      `no offered form produced an artifact — every buildable candidate was refused:\n${refusals.join("\n\n")}`,
    );
  expect(produced).toBeDefined();

  // The record itself, not a branch of it: `provenanceHash` is on both the file and the hosted
  // shape (lib/loop/manifest.ts's ArtifactRecordSchema), and this assertion is a liveness check
  // that production actually happened — narrowing to `fileArtifact` first would make it silently
  // pass-by-`undefined` the moment a hosted form ranks first, which is exactly the regression this
  // union was built to catch.
  const artifact = produced!.elements[0].artifact!;
  expect(artifact.provenanceHash).toBeTruthy();
  // The delivered form matches the format the offer promised. A file delivery is checked with the
  // same media-shape clause produce.ts's own dispatcher enforces on every produced artifact
  // (lib/core/contract.ts) rather than re-deriving the static/video/interactive/scrolly naming
  // rule; a hosted delivery (dw-chart/map-dw "interactive") has no bytes to shape-check, so it is
  // held to the sibling clause the dispatcher applies to that form instead — a resolvable URL.
  if (isHostedArtifact(artifact)) {
    expect(isHostedUrl(artifact.url)).toBe(true);
  } else {
    const file = fileArtifact(artifact)!;
    expect(() => assertFileMedia(chosen!.format!, [file.path])).not.toThrow();
  }
  expect(nextActions(produced!)).not.toEqual(["produce"]);
}, 60000);

test("a run whose channel forbids interactive is never offered one", async () => {
  const { run, dir } = newRun("social-vertical");
  let m = await advance(run, dir);
  m = {
    ...m,
    elements: [
      {
        ...m.elements[0],
        angle: {
          confirmedTakeaway: "L'écart se creuse entre 2019 et 2024",
          altInsight: "…",
          unit: "CHF",
        },
      },
    ],
  };
  m = await advance(m, dir);
  for (const o of m.elements[0].proposal!.options)
    expect(["static", "video"]).toContain(o.format);
});
