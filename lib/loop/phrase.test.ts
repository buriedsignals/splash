import { test, expect } from "bun:test";
// The KB's renderableSheets() filters through lib/core/registry, empty until an engine
// self-registers on import — the same side-effect import propose.test.ts uses.
import "./engines";
import { propose } from "./propose";
import { applyPhrasing } from "./phrase";
import type { RunManifest, FormOption } from "./manifest";

function run(): RunManifest {
  return {
    runId: "r",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["canton", "2019", "2024"],
        numericColumns: ["2019", "2024"],
        rowCount: 8,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Les écarts se creusent entre 2019 et 2024",
          altInsight: "…",
          unit: "CHF",
        },
      },
    ],
    events: [],
  };
}

function proposed(): RunManifest {
  const m = run();
  const { options, excluded } = propose(m, m.elements[0]!);
  return {
    ...m,
    elements: [{ ...m.elements[0], proposal: { options, excluded } }],
  };
}

// A run whose element already carries a proposal — e.g. a channel-format refusal, which leaves
// `options` empty by design (eligibility.ts's requestedFormat refusal, task 8). Distinct from
// `run()` (no proposal at all): this is the "offered, and the offer says no" shape, not the
// "never proposed" shape — the two must throw the same guard for different reasons.
function makeRunWithProposal(options: FormOption[]): RunManifest {
  const m = run();
  return {
    ...m,
    elements: [{ ...m.elements[0], proposal: { options, excluded: [] } }],
  };
}

// The sheet fragments are the KB's ENGLISH sentences, and the product ships French, German and
// Italian. An un-phrased option must not present one of them as if it were the journalist's
// reason — so it carries no `why` at all until a phrasing step writes one.
test("an option the desk has not phrased carries an EMPTY why, never the sheet's English", () => {
  const m = run();
  const { options } = propose(m, m.elements[0]!);
  expect(options.length).toBeGreaterThan(0);
  for (const o of options) {
    expect(o.why).toBe("");
    // …and the material a why is written FROM is right there, untouched.
    expect(o.whySource!.fragments.length).toBeGreaterThan(0);
  }
});

test("applyPhrasing writes the desk's prose onto the manifest, in the journalist's language", () => {
  const m = proposed();
  const options = m.elements[0].proposal!.options;
  const phrased = options.map((o) => ({
    id: o.id,
    why: `Une forme qui tient ${o.whySource!.facts.rows} lignes.`,
    ...(o.readiness ? { markAcknowledged: true as const } : {}),
  }));
  const after = applyPhrasing(m, "e1", phrased);
  for (const o of after.elements[0].proposal!.options)
    expect(o.why).toMatch(/^Une forme qui tient \d+ lignes\.$/);
  // The offer itself is untouched — phrasing writes prose, it never re-decides.
  expect(after.elements[0].proposal!.options.map((o) => o.id)).toEqual(
    options.map((o) => o.id),
  );
  expect(m.elements[0].proposal!.options[0].why).toBe(""); // and it does not mutate
});

test("applyPhrasing runs the guard: a phrasing that drops an option throws", () => {
  const m = proposed();
  const options = m.elements[0].proposal!.options;
  const short = options
    .slice(0, options.length - 1)
    .map((o) => ({ id: o.id, why: "…" }));
  expect(() => applyPhrasing(m, "e1", short)).toThrow(/order changed/);
});

test("applyPhrasing runs the guard: a marked option must be acknowledged", () => {
  // A spatial takeaway ranks the map forms first, and no map engine can be produced yet — so
  // this offer really does carry marks, which is the case the guard exists for.
  const spatial = run();
  spatial.elements[0].angle!.confirmedTakeaway =
    "La carte des cantons montre où l'écart se creuse";
  const { options: opts, excluded } = propose(spatial, spatial.elements[0]!);
  const m: RunManifest = {
    ...spatial,
    elements: [
      { ...spatial.elements[0], proposal: { options: opts, excluded } },
    ],
  };
  const options = m.elements[0].proposal!.options;
  const marked = options.find((o) => o.readiness);
  expect(marked).toBeDefined(); // this offer really does carry a mark
  const phrased = options.map((o) => ({ id: o.id, why: "…" })); // none acknowledged
  expect(() => applyPhrasing(m, "e1", phrased)).toThrow(/did not acknowledge/);
});

test("applyPhrasing refuses an empty why — an option nobody phrased is not shown", () => {
  const m = proposed();
  const options = m.elements[0].proposal!.options;
  const phrased = options.map((o) => ({
    id: o.id,
    why: o.id === options[0].id ? "" : "…",
    ...(o.readiness ? { markAcknowledged: true as const } : {}),
  }));
  expect(() => applyPhrasing(m, "e1", phrased)).toThrow(/no why/);
});

test("applyPhrasing refuses an element that has no offer to phrase", () => {
  expect(() => applyPhrasing(run(), "e1", [])).toThrow(/no offer/);
  expect(() => applyPhrasing(proposed(), "nope", [])).toThrow(/nope/);
});

test("a refused offer is refused LOUD by phrasing — a refusal never travels as a why", () => {
  const run = makeRunWithProposal([]); // reuse the file's own fixture helper
  expect(() => applyPhrasing(run, "e1", [])).toThrow(/no offer to phrase/);
});
