// sweep-carrier.ts — WHAT MAKES A MAP STORY ADVANCE.
//
// The device this generalises is Buried Signals' map-explainer (the water-wars Fig. 4): a river
// draws on, and as it reaches each country that country animates in — border draws, fill blooms,
// label rises. It reads as "a river lighting up countries". It is not.
//
//   ★ A CONTINUOUS SCALAR ADVANCES, AND EACH MARK LIGHTS UP WHEN IT REACHES IT.
//
// The river is only a CARRIER of that scalar. In Tom's code the one river-specific line is the
// computation of `stop`, the arrival fraction; ours is the same — `stagedEntrance()` is already
// generic and only `trigger = RIVER_START + t.stop * (RIVER_END - RIVER_START)` (RouteReveal) is
// about water.
//
// So the defect was never a missing device. It was a device with ONE carrier, and that carrier
// demands a route. Rémy, 2026-08-06: « si on n'a pas de route ça ne marche plus, et nous on doit
// pouvoir adapter nos outils à tous les sujets. » A subject with no route had nothing.
//
// Five carriers, one device. They differ ONLY in how each mark's `stop` is computed — never in
// what happens once it fires, which stays `stagedEntrance`'s border → fill → label.
//
// ★ AND `stepped` IS ONE OF THEM. The rigid kind is the `order` carrier: the scalar is a counter
// walking the journalist's own walk. That is the proof this decomposition is the right one — the
// two narrative kinds stop being two engines and become one engine with a choice of carrier, the
// most rigid of which advances on nothing but rank.

/** The five carriers, as a runtime list — so a config's declared carrier can be checked against
 *  the same set the type is built from, rather than a second list typed out in a validator. */
export const CARRIER_KINDS = [
  "route",
  "time",
  "threshold",
  "space",
  "order",
] as const;

export type CarrierKind = (typeof CARRIER_KINDS)[number];

/** One mark, as any carrier needs to see it. Deliberately not a map type's own row shape: the
 *  carriers are pure and testable, and each component adapts its own marks to this. */
export type SweepMark = {
  /** The mark's own name — what a beat anchors on. */
  name: string;
  /** Its numeric value, when the type has one (choropleth, symbol). */
  value?: number;
  /** Its position, when the type has coordinates (locator, symbol, dot-density). */
  lon?: number;
  lat?: number;
  /** Its date as a sortable number (a year, or ms since epoch), when the data carries one. */
  time?: number;
  /** Its arrival fraction along a route, when the config carries one — the only carrier whose
   *  stop cannot be derived here, because it is computed from the line at produce time. */
  routeStop?: number;
};

export type CarrierOffer = {
  kind: CarrierKind;
  /** What advances, said to a journalist as-is. */
  why: string;
};

/** Where a mark sits on the sweep: 0 = lights up first, 1 = last. */
export type SweepStops = Record<string, number>;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * WHICH CARRIERS THESE MARKS CAN ACTUALLY DRIVE — read from the data, never recited.
 *
 * Same discipline as the narrative kinds: a capability asserted from memory is wrong eventually,
 * and a refusal is credible, so it dies unnoticed. A map with no temporal field is not offered
 * `time`, and the absence is EXPLAINED rather than silently missing.
 *
 * Ordered by how much of the story they carry: the ones driven by the subject matter first, the
 * bare counter last — reading `order` first would invite picking it by default, which is how the
 * rigid kind became the only kind.
 */
export function carriersFor(marks: readonly SweepMark[]): CarrierOffer[] {
  const offers: CarrierOffer[] = [];
  if (marks.some((m) => typeof m.routeStop === "number"))
    offers.push({
      kind: "route",
      why: "the line draws on, and each place lights up as it is reached — the route itself tells the story",
    });
  if (marks.filter((m) => typeof m.time === "number").length >= 2)
    offers.push({
      kind: "time",
      why: "the clock advances, and each place lights up at its own date — the story is when things happened",
    });
  if (marks.filter((m) => typeof m.value === "number").length >= 2)
    offers.push({
      kind: "threshold",
      why:
        "a threshold falls from the highest value to the lowest, and each place lights up as it " +
        "is passed — the story is who is worst hit, then who follows",
    });
  if (
    marks.filter((m) => typeof m.lon === "number" && typeof m.lat === "number")
      .length >= 2
  )
    offers.push({
      kind: "space",
      why:
        "a line sweeps across the territory, and each place lights up as it is crossed — the " +
        "story is geographic: one side, then the other",
    });
  // Always available, and always last: it needs nothing from the data because it advances on
  // nothing but the walk's own order. This is what a `stepped` video already is.
  offers.push({
    kind: "order",
    why: "the steps advance one by one, in the order you wrote them — even, predictable, no reading of the data itself",
  });
  return offers;
}

/** Why a carrier is NOT offered — said to a journalist, never "unsupported". */
export function whyNotOffered(kind: CarrierKind): string {
  switch (kind) {
    case "route":
      return "this map carries no route or path, so there is no line to draw and nothing to arrive anywhere";
    case "time":
      return "this data carries no date on its places, so there is no clock to advance";
    case "threshold":
      return "this data carries no number on its places, so there is no threshold to lower";
    case "space":
      return "this data carries no coordinates, so there is nothing for a sweep to cross";
    case "order":
      return "the order carrier is always available — it advances on the walk itself";
  }
}

/**
 * WHERE EACH MARK SITS ON THE SWEEP, for the chosen carrier.
 *
 * Pure, and the whole point of the abstraction: everything downstream — the staged entrance, the
 * caption, the camera — reads these numbers and never asks what produced them.
 *
 * Marks the carrier cannot place (no value under `threshold`, no date under `time`) land at the
 * END, together, rather than at 0: a mark that cannot be placed has not been shown to belong
 * anywhere, and putting it first would assert a rank the data never gave.
 */
export function sweepStops(
  kind: CarrierKind,
  marks: readonly SweepMark[],
  opts: {
    /** Sweep bearing in degrees for `space` — 90 = west→east, 180 = north→south. Default 90. */
    bearingDeg?: number;
    /** `threshold` descends from the highest value by default. Set false to climb from the lowest. */
    descending?: boolean;
  } = {},
): SweepStops {
  const stops: SweepStops = {};
  const n = Math.max(1, marks.length - 1);

  if (kind === "order") {
    marks.forEach((m, i) => {
      stops[m.name] = marks.length === 1 ? 0 : i / n;
    });
    return stops;
  }

  if (kind === "route") {
    marks.forEach((m) => {
      stops[m.name] =
        typeof m.routeStop === "number" ? clamp01(m.routeStop) : 1;
    });
    return stops;
  }

  // The three DERIVED carriers share one shape: read a scalar off each mark, then normalise it
  // across the set. Written once — three copies of a min/max normalisation is three places for
  // an off-by-one to hide.
  const scalarOf = (m: SweepMark): number | undefined => {
    if (kind === "time") return m.time;
    if (kind === "threshold") return m.value;
    // `space`: the mark's position projected onto the sweep bearing. A bearing of 90° sweeps
    // west→east, so the projection is simply the longitude; 0° sweeps south→north. Latitude is
    // NOT cosine-corrected: this orders marks, it does not measure distance, and a correction
    // would change the order only for sets spanning both hemispheres at extreme latitudes.
    if (kind === "space") {
      if (typeof m.lon !== "number" || typeof m.lat !== "number")
        return undefined;
      const rad = ((opts.bearingDeg ?? 90) * Math.PI) / 180;
      return m.lon * Math.sin(rad) + m.lat * Math.cos(rad);
    }
    return undefined;
  };

  const placed = marks
    .map((m) => ({ m, s: scalarOf(m) }))
    .filter((e): e is { m: SweepMark; s: number } => typeof e.s === "number");

  if (!placed.length) {
    // Nothing the carrier can read — every mark lands at the end rather than at 0, so a
    // misconfigured sweep shows an empty map that fills at the close, never a full one that
    // pretends the sweep ran.
    marks.forEach((m) => {
      stops[m.name] = 1;
    });
    return stops;
  }

  const values = placed.map((e) => e.s);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  // `threshold` descends by default: the HIGHEST value is reached first.
  const descending = kind === "threshold" ? (opts.descending ?? true) : false;

  marks.forEach((m) => {
    const s = scalarOf(m);
    if (typeof s !== "number") {
      stops[m.name] = 1;
      return;
    }
    if (span === 0) {
      // Every mark shares one value — they light together, at the start, because nothing
      // separates them and staggering them would invent an order.
      stops[m.name] = 0;
      return;
    }
    const t = (s - min) / span;
    stops[m.name] = clamp01(descending ? 1 - t : t);
  });
  return stops;
}
