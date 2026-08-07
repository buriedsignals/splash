import { test, expect } from "bun:test";
// The same side-effect import lib/brain/eligibility.test.ts and lib/brain/offer.test.ts use:
// the KB's `renderableSheets()` filters through lib/core/registry, empty until an engine
// self-registers on import.
import "./engines";
import { orderingIntents, propose } from "./propose";
import type { RunManifest } from "./manifest";
import { isoA3PinnedJoinRefusal } from "../../skills/map-native/src/region-join-support";

function run(numericColumns: string[], rowCount = 8): RunManifest {
  return {
    runId: "r",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: {
        columns: ["label", ...numericColumns],
        numericColumns,
        rowCount,
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

test("it offers forms with an engine, a format and their grounding", () => {
  const m = run(["2019", "2024"]);
  const { options } = propose(m, m.elements[0]!);
  expect(options.length).toBeGreaterThan(0);
  expect(options.length).toBeLessThanOrEqual(3);
  for (const o of options) {
    expect(o.engine).toBeTruthy();
    expect(o.format).toBeTruthy();
    expect(o.whySource!.fragments.length).toBeGreaterThan(0);
  }
});

test("it reports what it discarded", () => {
  const m = run(["2019", "2024"], 400);
  const { excluded } = propose(m, m.elements[0]!);
  expect(excluded.length).toBeGreaterThan(0);
});

test("nothing before orient has run", () => {
  const m = run(["2019", "2024"]);
  const { options, excluded } = propose(
    { ...m, orient: undefined },
    m.elements[0]!,
  );
  expect(options).toEqual([]);
  expect(excluded).toEqual([]);
});

test("the channel constrains the offer", () => {
  const m = run(["2019", "2024"]);
  const { options } = propose(
    { ...m, channel: "social-vertical" },
    m.elements[0]!,
  );
  expect(options.every((o) => o.format !== "interactive")).toBe(true);
});

test("the element's requested format reaches the brain — every option honours it", () => {
  const m = run(["2019", "2024"]);
  m.elements[0]!.requestedFormat = "video";
  const { options } = propose(m, m.elements[0]!);
  expect(options.length).toBeGreaterThan(0);
  expect(options.every((o) => o.format === "video")).toBe(true);
});

// lib/loop/propose.ts used to drop `offer.refusal` on the floor — the brain names the exact
// reason a requested format was refused, and this layer's return type simply had no slot for
// it, so a refused offer arrived at the caller looking identical to "nothing to offer" (empty
// options, no sentence). This is the silent degradation the whole slice exists to remove.
test("a refusal computed by the brain arrives at propose()'s caller, with its sentence", () => {
  const m = run(["2019", "2024"]);
  m.elements[0]!.requestedFormat = "scrolly";
  const { options, refusal } = propose(
    { ...m, channel: "social-vertical" },
    m.elements[0]!,
  );
  expect(options).toEqual([]);
  expect(refusal).toBeTruthy();
  expect(refusal).toContain("social-vertical");
  expect(refusal).toContain("scrolly");
});

test("a print deliverable is offered static forms only, and never through Datawrapper", () => {
  const m = run(["2019", "2024"]);
  const withPrint: RunManifest = {
    ...m,
    elements: [
      {
        ...m.elements[0]!,
        deliverable: { destination: "print" },
        requestedFormat: "static",
      },
    ],
  };
  const { options, excluded } = propose(withPrint, withPrint.elements[0]!);
  expect(options.length).toBeGreaterThan(0);
  for (const o of options) {
    expect(o.format).toBe("static");
    expect(o.engine).not.toBe("dw-chart");
    expect(o.engine).not.toBe("map-dw");
  }
  expect(excluded.map((e) => e.reason).join(" | ")).toMatch(/print/i);
});

// --- the DECLARED intent orders the offer ----------------------------------------------------
//
// This is the whole point of the slice. Before it, the semantic input came from a keyword pass
// over the takeaway's prose, which answered nothing on ordinary French claims — so the offer was
// ordered by fit and readiness alone, and nothing said so.
function angled(intent: string | undefined, takeaway: string): RunManifest {
  const m = run(["prime"]);
  return {
    ...m,
    elements: [
      {
        ...m.elements[0]!,
        angle: {
          confirmedTakeaway: takeaway,
          altInsight: "…",
          unit: "CHF",
          ...(intent ? { intent: intent as never } : {}),
        },
      },
    ],
  };
}

const SPREAD_CLAIM =
  "La prime varie de 115 francs entre le canton le plus cher et le moins cher";

test("two intents declared on the same facts give two different offers", () => {
  const spread = angled("distribution", SPREAD_CLAIM);
  const places = angled("spatial", SPREAD_CLAIM);
  const asSpread = propose(spread, spread.elements[0]!);
  const asPlaces = propose(places, places.elements[0]!);
  expect(asSpread.options.length).toBeGreaterThan(0);
  expect(asPlaces.options.length).toBeGreaterThan(0);
  expect(asSpread.options.map((o) => o.id)).not.toEqual(
    asPlaces.options.map((o) => o.id),
  );
  // Not merely a different order: what leads is a form that SERVES the declared point.
  expect(asSpread.options[0]!.intent).toContain("distribution");
  expect(asPlaces.options[0]!.intent).toContain("spatial");
});

// The mis-fire of spec §1, closed. "canton" made the keyword pass answer `spatial` on a claim
// about spread, and the journalist was offered three maps. A declaration must not have the guess
// bolted onto it — a union would put the wrong reading straight back into the ranking.
test("the declaration wins whole: no guess is merged into it", () => {
  const m = angled("distribution", SPREAD_CLAIM);
  // The exact input the brain is handed: one intent, the declared one. `spatial` — which the
  // keyword pass reads in this very sentence — is nowhere near it.
  expect(orderingIntents(m.elements[0])).toEqual({
    intents: ["distribution"],
    basis: "declared",
  });
  // Same facts, same sentence, nothing declared: the guess reads geography instead, and the
  // offer that comes back is a different one.
  expect(orderingIntents(angled(undefined, SPREAD_CLAIM).elements[0])).toEqual({
    intents: ["spatial"],
    basis: "guessed",
  });
  const undeclared = angled(undefined, SPREAD_CLAIM);
  expect(
    propose(undeclared, undeclared.elements[0]!).options.map((o) => o.id),
  ).not.toEqual(propose(m, m.elements[0]!).options.map((o) => o.id));
});

// The state this slice exists to make visible: nothing declared AND nothing read. Before, the
// offer degraded into an unranked one with the run saying nothing at all.
test("nothing declared and nothing read is reported as such, never rounded up", () => {
  expect(
    orderingIntents(
      angled(undefined, "Les chats aiment le fromage").elements[0],
    ),
  ).toEqual({ intents: [], basis: "none" });
});

// An angle recorded before the declaration existed keeps working: the suggestion is the fallback,
// never a refusal that would strand a run written under the previous rule.
test("an angle with no declared intent falls back on the suggestion", () => {
  const m = angled(undefined, SPREAD_CLAIM);
  const legacy = propose(m, m.elements[0]!);
  expect(legacy.options.length).toBeGreaterThan(0);
  expect(legacy.options[0]!.intent).toContain("spatial");
});

// The wiring task 5 exists to land: task 4's refusal (lib/core/language-coverage.ts) is inert
// until the run's OWN declared language actually reaches buildOffer. Before this wiring,
// `m.lang` was read by nothing here, so a run recorded in an uncovered language sailed through
// to a normal offer — the exact "green for nothing" shape this whole plan is about.
test("a run recorded in an uncovered language reaches the offer as a refusal", () => {
  const m = run(["2019", "2024"]);
  const uncovered: RunManifest = { ...m, lang: "es" };
  const { options, refusal } = propose(uncovered, uncovered.elements[0]!);
  expect(options).toEqual([]);
  expect(refusal).toBeTruthy();
  expect(refusal).toContain("es");
});

// The complement: a run in a COVERED language (or none at all) is untouched by this wiring.
test("a run recorded in a covered language is offered normally", () => {
  const m = run(["2019", "2024"]);
  const covered: RunManifest = { ...m, lang: "fr" };
  const { options, refusal } = propose(covered, covered.elements[0]!);
  expect(options.length).toBeGreaterThan(0);
  expect(refusal).toBeUndefined();
});

test("two deliverables of one run are offered at their own channels", () => {
  const m = run(["2019", "2024"]);
  const web = {
    ...m.elements[0]!,
    deliverable: { destination: "article-web" as const },
  };
  const social = {
    ...m.elements[0]!,
    id: "e2",
    deliverableOf: "e1",
    deliverable: {
      destination: "social" as const,
      aspect: "portrait" as const,
    },
  };
  const two: RunManifest = { ...m, elements: [web, social] };
  const webOffer = propose(two, web);
  const socialOffer = propose(two, social);
  // article-web is the only channel that carries an interactive; a Stories post cannot.
  expect(socialOffer.options.every((o) => o.format !== "interactive")).toBe(
    true,
  );
  expect(socialOffer.options.every((o) => o.format !== "scrolly")).toBe(true);
  expect(webOffer.options.length).toBeGreaterThan(0);
});

// ── the run's matched basemap reaches the brain ───────────────────────────────────────────────
//
// The brain refuses a (type, basemap, format) triple two map-native components cannot join
// (lib/brain/eligibility.ts), and it can only do that if THIS DOOR hands it the basemap. Tested
// here rather than only in the brain because the defect was never in the brain's rule — it was
// that nobody told it, so a journalist was offered a us-states cartogram in static, chose it,
// waited for a build, and met the refusal at produce.
//
// The element asks for `static` explicitly, and that is what makes this a probe rather than a
// coincidence: the offer is capped at three rows, so with every format legal the pinned pairings
// rank below hex-grid and choropleth anyway and a broken door would look identical. Narrowed to
// the one format their components cannot join, the difference is visible in the menu itself.
function runWithGeography(set: string, joinKey: string): RunManifest {
  const m = run(["population"], 4);
  m.orient!.geo = {
    column: "state",
    geography: {
      origin: "shipped",
      set,
      level: set === "natural-earth-admin-0" ? "country" : "state",
      joinKey,
      joinKeyFamily: joinKey,
    },
    matched: 4,
    total: 4,
    unmatched: [],
  };
  m.elements[0]!.requestedFormat = "static";
  m.elements[0]!.angle!.intent = "spatial";
  return m;
}

function offeredTypes(m: RunManifest): string[] {
  return propose(m, m.elements[0]!).options.map(
    (o) => `${o.nativeType}/${o.format}`,
  );
}

test("a non-world geography keeps the pinned pairings out of the offer entirely", () => {
  const m = runWithGeography("us-states", "postal");
  const { options, excluded } = propose(m, m.elements[0]!);
  expect(
    options.filter(
      (o) => o.nativeType === "cartogram" || o.nativeType === "dot-density",
    ),
  ).toEqual([]);
  // and the journalist is TOLD, in the produce guard's own sentence rather than a second one —
  // the row is gone, not silently gone.
  for (const id of ["cartogram", "dot-density"])
    expect(
      `${id}: ${excluded.find((e) => e.id === id)?.reason ?? "no reason"}`,
    ).toBe(`${id}: ${isoA3PinnedJoinRefusal(id, "us-states")}`);
});

// Judged on the RENDERER's registry key: "world"'s own `set` is "natural-earth-admin-0"
// (lib/geo/ref.ts), so a door that threaded `geography.set` raw would refuse the ordinary world
// path too — and this assertion, not the one above, is what catches that.
test("the world geography is threaded by its REGISTRY key, so the ordinary path is untouched", () => {
  expect(
    offeredTypes(runWithGeography("natural-earth-admin-0", "iso_a3")),
  ).toContain("cartogram/static");
});

// A run that has not matched a geography yet has no pairing to refuse, and the door must not
// invent one — produce's own guard stays the backstop for that gap.
test("a run with no geography match threads nothing, and nothing is refused", () => {
  const m = runWithGeography("us-states", "postal");
  m.orient!.geo = undefined;
  expect(offeredTypes(m)).toContain("cartogram/static");
});
