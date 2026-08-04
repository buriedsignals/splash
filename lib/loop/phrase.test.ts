import { test, expect } from "bun:test";
// The KB's renderableSheets() filters through lib/core/registry, empty until an engine
// self-registers on import — the same side-effect import propose.test.ts uses.
import "./engines";
import { propose } from "./propose";
import { applyPhrasing } from "./phrase";
import { parseManifest, type RunManifest, type FormOption } from "./manifest";

function run(): RunManifest {
  return {
    runId: "r",
    schemaVersion: 7,
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
  // Before task 7, a spatial takeaway reliably ranked a map form to the top of the offer with
  // no map engine buildable at all, which made a real propose() call the natural fixture for
  // "this offer really does carry a mark". Now that map-native is wired, its unmarked
  // candidates outrank map-dw's marked ones for the very same sheet (rank.ts: an unmarked
  // candidate always beats a marked one at the same intent tier) and dedup by id drops the
  // marked row — so a real propose() call can no longer be trusted to surface one
  // deterministically. The guard under test is applyPhrasing's, not propose()'s marking logic
  // (eligibility.test.ts covers that), so a hand-authored offer carrying the SAME shape
  // propose() would have produced — full grounding, one marked option — exercises it exactly
  // as directly, without depending on which engine happens to still be unbuildable today.
  const m = makeRunWithProposal([
    {
      id: "map-dw-choropleth",
      nativeType: "choropleth",
      engine: "map-dw",
      format: "static",
      intent: ["spatial"],
      why: "",
      whySource: {
        sheet: "map/types/choropleth.md",
        fragments: ["one value per region, shaded"],
        facts: { rows: "8", series: "8", points: "8" },
      },
      readiness: {
        status: "missing",
        reason: "nothing can build a map-dw form yet",
      },
    },
  ]);
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

// A DECLARED RENDER LIMIT HAS TO SURVIVE THE WHOLE PRODUCTION HOP, not just lib/brain.
//
// buildOffer put `limits` on its OfferOption and offer.test.ts proved it there — but the offer a
// journalist is actually shown is the one propose() persists into run.json and phrase.ts rebuilds
// for the guard, and both rebuilt the option field by field without carrying `limits` (and
// FormOptionSchema had no key for it, so zod stripped it on persist even when copied). The effect
// was threefold: the keyboard limit was never shown; verifyOffer's limitsAcknowledged guard could
// not fire in production, `option.limits` being always undefined there; and a desk that followed
// SKILL.md's rule 5 and DID set limitsAcknowledged got hard-refused for acknowledging a limit the
// persist had just deleted.
//
// So this test walks the real path — propose() → the manifest's own zod parse → applyPhrasing —
// and each of the three carries is load-bearing: remove any one and it reddens.
//
// The shape is offer.test.ts's `inputForMapSymbolInteractive()` fixture expressed as a run: a
// spatial+magnitude dataset with a declared `spatial` intent ranks map-native's own sheets ahead
// of every chart-native one, so an interactive map-native row lands in the offer carrying the
// keyboard limit map-native declares (skills/map-native/src/feature-limits.ts).
function proposedMapRun(): RunManifest {
  const m: RunManifest = {
    runId: "r",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["city", "population"],
        numericColumns: ["population"],
        rowCount: 10,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Les grandes villes concentrent la population",
          altInsight: "…",
          unit: "hab.",
          intent: "spatial",
        },
      },
    ],
    events: [],
  };
  const { options, excluded } = propose(m, m.elements[0]!);
  // Through the SCHEMA, not just the object: run.json is written and read back, and a key the
  // schema does not declare is dropped there rather than in propose().
  return parseManifest(
    JSON.parse(
      JSON.stringify({
        ...m,
        elements: [{ ...m.elements[0], proposal: { options, excluded } }],
      }),
    ),
  );
}

test("a declared render limit survives propose() and the manifest's own parse", () => {
  const options = proposedMapRun().elements[0]!.proposal!.options;
  const limited = options.filter((o) => o.limits?.length);
  expect(limited.length).toBeGreaterThan(0);
  expect(limited.some((o) => o.engine === "map-native")).toBe(true);
  expect(limited[0]!.limits!.join(" ")).toContain("keyboard");
});

test("the persisted limit makes verifyOffer's limitsAcknowledged guard reachable in production", () => {
  const m = proposedMapRun();
  const options = m.elements[0]!.proposal!.options;
  expect(options.some((o) => o.limits?.length)).toBe(true); // the offer really does carry one
  const unacknowledged = options.map((o) => ({
    id: o.id,
    why: "Une forme qui tient la comparaison.",
    ...(o.readiness ? { markAcknowledged: true as const } : {}),
  }));
  expect(() => applyPhrasing(m, "e1", unacknowledged)).toThrow(
    /declares a render limit/,
  );
  // …and acknowledging it — what SKILL.md rule 5 tells the desk to do — passes.
  const acknowledged = options.map((o) => ({
    id: o.id,
    why: "Une forme qui tient la comparaison.",
    ...(o.readiness ? { markAcknowledged: true as const } : {}),
    ...(o.limits?.length ? { limitsAcknowledged: true as const } : {}),
  }));
  expect(() => applyPhrasing(m, "e1", acknowledged)).not.toThrow();
});
