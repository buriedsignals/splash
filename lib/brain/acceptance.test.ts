// The acceptance test for the proposal-brain tranche: a real journalist's path, driven
// through the actual loop (never a hand-built manifest) — data in, an offer that carries
// its discards, a faithful phrasing that clears verifyOffer's guard, a choice, and a
// produced artifact whose format is the one the offer promised.
//
// What this deliberately does NOT exercise: dw-chart / map-native / map-dw production
// (produce.ts only wires chart-native in this tranche — an option naming another engine
// is refused loud, not a silent no-op, per produce.ts's own guard) and delivery. Which
// nativeType ends up top-ranked is NOT pinned — the ranking has already changed twice
// during this tranche and will again the next time a sheet is edited; this test walks the
// ranked options and produces the first one this tranche can actually render, rather than
// assuming a fixed winner.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advance } from "../loop/driver";
import { freezeInput } from "../loop/freeze";
import {
  nextActions,
  type RunManifest,
  type FormOption,
} from "../loop/manifest";
import { verifyOffer, type PhrasedOption } from "./verify-offer";
import { assertFileMedia } from "../core/contract";

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
      schemaVersion: 4,
      route: "embed",
      channel,
      input: { data },
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

  // The phrasing seam: a faithful rendering of the WHOLE offer, in order, passes its guard —
  // this is what a real phrasing step must clear before a journalist ever sees the prose.
  const phrased = proposal.options.map(phrase);
  expect(() =>
    verifyOffer(phrased, {
      options: proposal.options.map((o) => ({
        id: o.id,
        nativeType: o.nativeType,
        engine: o.engine!,
        format: o.format!,
        intent: o.intent!,
        ...(o.readiness ? { readiness: o.readiness } : {}),
        whySource: o.whySource!,
      })),
      excluded: proposal.excluded ?? [],
    }),
  ).not.toThrow();

  expect(nextActions(m)).toEqual(["choose-form"]);

  // The choice, and a rendered artifact. Only chart-native is wired to produce in this
  // tranche (produce.ts refuses any other engine loud), and which nativeType ranks first is
  // not pinned here — so walk the ranked options and produce the first one this tranche can
  // actually build, exactly as a journalist choosing down the offer would.
  let produced: RunManifest | undefined;
  let chosen: FormOption | undefined;
  for (const o of proposal.options) {
    if (o.engine !== "chart-native") continue;
    const attempt: RunManifest = {
      ...m,
      elements: [
        { ...m.elements[0], proposal: { ...proposal, chosenId: o.id } },
        ...m.elements.slice(1),
      ],
    };
    const result = await advance(attempt, dir);
    if (result.elements[0].artifact) {
      produced = result;
      chosen = o;
      break;
    }
  }
  expect(chosen).toBeDefined();
  expect(produced).toBeDefined();

  const artifact = produced!.elements[0].artifact!;
  expect(artifact.provenanceHash).toBeTruthy();
  // The delivered file matches the format the offer promised — the same media-shape clause
  // produce.ts's own dispatcher enforces on every produced artifact (lib/core/contract.ts),
  // reused here rather than re-deriving the static/video/interactive/scrolly naming rule.
  expect(() => assertFileMedia(chosen!.format!, [artifact.path])).not.toThrow();
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
