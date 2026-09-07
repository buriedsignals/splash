// twin/shared/chart-beat/registers.mjs
//
// THE ONE INTERFACE BETWEEN THE DESIGN BASE'S TWO AXES.
//
// A TREATMENT is conditional and plural: it applies when the data has a shape, several apply to one
// beat, and an arbiter resolves them. A DIRECTION is global and exclusive: exactly one governs a
// beat, and directions never compose. They meet here and only here — a treatment names the REGISTER
// it writes into, a direction says what that register LOOKS like, and neither knows the other's
// internals.
//
// That is what lets a treatment compose across every direction and a direction apply across every
// treatment. The probes that produced this design proved the alternative by doing it wrong: they
// hard-coded `.toUpperCase()` at four call sites and an italic ternary at six, so each treatment
// silently knew whether its direction shouted. Adding a seventh direction would have meant editing
// every treatment.
//
// See `docs/splash/2026-09-07-design-base-treatments-and-directions-spec.md` §4, and the filed
// directions under `docs/design-base/directions/`.

/**
 * THE CORE: the voices every graphic has, whatever it draws. Closed, and a sixth core voice is a
 * decision across the whole system, not a convenience.
 *
 * These are about VOICE, never about apparatus. A title, a category line, running text, an
 * annotation, a number attached to a mark — a chart has all five, and so does a map, a video frame
 * and a scrollytelling step.
 */
export const CORE_REGISTERS = Object.freeze(["display", "eyebrow", "body", "annot", "value"]);

/**
 * THE APPARATUS: what a family uses to name its own measuring furniture, and it is NOT the same
 * from family to family.
 *
 * A chart has an axis. A map has a legend and it has place names, and it has no axis at all —
 * `proof/map-quake-symbol/QuakeSymbolStill.tsx` declares `LEGEND_LABEL` and `CAPTION` where a chart
 * declares `AXIS`. A first version of this file froze SIX registers with `axis` among them, which
 * was a chart's vocabulary imposed on every family; the map beat found it within minutes.
 *
 * Each family names its own, and says which core voice it DERIVES FROM when a direction — measured
 * on a piece that had no such apparatus — does not define it. That derivation is what keeps a
 * direction portable.
 *
 * THIS TABLE IS EVIDENCED, NOT DECLARED. Every entry has a record under
 * `docs/design-base/registers/` citing the published pieces that show it, and
 * `an-apparatus-register-is-evidenced.test.ts` holds the two equal in both directions — the same
 * discipline `treatments.mjs` is under.
 *
 * A first version held `map: { legend, place }` and `scrolly: { step }`, read off THIS
 * REPOSITORY'S OWN map component rather than off any published piece. The corpus holds no map
 * reference at all — fifteen references, not one a map — so nothing evidenced what a published map
 * calls its apparatus. They are gone until a map family is harvested and the references say. A
 * vocabulary invented ahead of its evidence is the parochialism this table was created to fix,
 * moved one level up.
 */
export const FAMILY_REGISTERS = Object.freeze({
  chart: Object.freeze({ axis: "body" }),
  video: Object.freeze({ axis: "body" }),
  map: Object.freeze({ place: "annot" }),
});

/** How much smaller a derived apparatus register is than the core voice it comes from: quiet enough
 *  to recede, large enough to read. */
const DERIVED_SIZE_RATIO = 0.88;

/** Every register a beat of this family may write into: the core, plus the family's own. */
export function registersFor(family = "chart") {
  return Object.freeze([...CORE_REGISTERS, ...Object.keys(FAMILY_REGISTERS[family] ?? {})]);
}

/**
 * Kept for callers that predate families, and equal to a chart's set. New code names its family.
 */
export const REGISTERS = registersFor("chart");

/**
 * INK IS A ROLE, NEVER A COLOUR, and this is the rule that keeps a dark direction legible.
 *
 * `doctrine/references/visual-system.md`: every visible non-data layer is computed from the
 * newsroom's own ground, never written as a literal — "a component that hard-codes `#FFFFFF` for
 * its background or `#1A1A1A` for its ink will render correctly for exactly one newsroom and
 * silently break for every other one." A direction that named a literal here would reintroduce
 * exactly that. `deriveFurniture` resolves these three against the real ground at draw time.
 */
const INK_ROLES = Object.freeze(["ink", "muted", "accent"]);

/**
 * A register resolved into the attributes an SVG `<text>` element actually takes.
 *
 * @param {{id?: string, registers: Record<string, object>}} direction
 * @param {string} name  one of `REGISTERS`
 * @returns {{fontFamily: string, fontSize: number, fontWeight: number, fontStyle: "normal"|"italic", letterSpacing: number, transform: string, ink: "ink"|"muted"|"accent"}}
 */
export function resolveRegister(direction, name, { family = "chart" } = {}) {
  const known = registersFor(family);
  if (!known.includes(name))
    throw new Error(
      `no such register for a ${family}: ${name} — it has ${known.join(", ")}`,
    );

  let spec = direction?.registers?.[name];
  let derivedFrom = null;

  // An apparatus register the direction never recorded is DERIVED from the core voice its family
  // names, rather than invented or refused. A direction measured on a piece with no axis still
  // governs a chart; a direction measured on a chart still governs a map's legend.
  if (!spec && FAMILY_REGISTERS[family]?.[name]) {
    derivedFrom = FAMILY_REGISTERS[family][name];
    const source = direction?.registers?.[derivedFrom];
    if (!source)
      throw new Error(
        `direction ${direction?.id ?? "(unnamed)"} defines neither ${name} nor the ${derivedFrom} ` +
          `register a ${family} derives it from`,
      );
    spec = { ...source, size: Math.round(source.size * DERIVED_SIZE_RATIO * 10) / 10 };
  }

  if (!spec)
    throw new Error(
      `direction ${direction?.id ?? "(unnamed)"} defines no ${name} register, and a treatment is asking to write into it`,
    );

  if (!INK_ROLES.includes(spec.ink))
    throw new Error(
      `register ${name} asks for ink role "${spec.ink}", not one of ${INK_ROLES.join(", ")} — ` +
        `ink is a role resolved against the newsroom's ground, never a literal`,
    );

  return {
    fontFamily: spec.family,
    fontSize: spec.size,
    fontWeight: spec.weight,
    fontStyle: spec.italic ? "italic" : "normal",
    // `letterSpacing` reads back as the word "normal" when unset in CSS; a direction records the
    // number, so zero tracking compares against zero tracking.
    letterSpacing: spec.tracking ?? 0,
    transform: spec.transform ?? "none",
    ink: spec.ink,
    /** Null when the direction recorded this register itself; the core voice it came from when the
     *  family derived it. A report says which, so nothing looks measured that was inferred. */
    derivedFrom,
  };
}

/**
 * The register's own case, applied here rather than at every call site.
 *
 * A treatment writes the words it means — "sous le niveau dès 2023" — and never learns whether the
 * direction governing this beat sets its annotations in capitals.
 */
export function applyCase(text, transform) {
  if (transform === "uppercase") return String(text).toUpperCase();
  if (transform === "lowercase") return String(text).toLowerCase();
  return text;
}
