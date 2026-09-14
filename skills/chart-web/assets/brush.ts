// twin/skills/chart-web/assets/brush.ts
//
// THE FOURTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what may be LAID ACROSS it. `withdraw.ts` says what may be TAKEN OUT OF A SUM. This file says
// WHAT MAY BE SELECTED ON AN AXIS — a named band between two bounds, drawn on the rail it cuts, and
// the set of data whose value falls inside it. All five are native radio inputs plus CSS generated
// at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state, not one
// byte of JavaScript), because that is the only kind of control this format can promise still works
// with the script absent.
//
// WHY A BRUSH IS NOT A FILTER, WHICH IS THE WHOLE REASON THIS IS A FIFTH FILE AND NOT A FIFTH KIND
// OF FILTER OPTION.
//
// `directed-interaction.md`'s repertoire states the filter's own precondition in one line: reach for
// it "when the reader wants a part, and the part is ORTHOGONAL to the encoded variable, so narrowing
// can never hide the claim". A brush is the exact opposite case. It selects ON the encoded variable
// — the band is a span of the axis the marks are measured against — so:
//
//   - **nothing may leave.** The reading a brush gives is *these, against all of them*: the selected
//     set's shape on the OTHER axes is only legible while the unselected set is still drawn beside
//     it. A brush that removed would delete its own comparison. `filter.ts` overturned dimming for
//     removal on the record, and the second of its two reasons is decisive here: "two formats cannot
//     mean two things by one word". So this is a different word, a different file, and a different
//     attribute.
//   - **the control must say WHERE it cut.** A filter's chips name a category a reader already
//     holds; a band is a number on a rail, and a reader who cannot see which rail and between which
//     bounds is being shown a subset with no stated rule. So a band is DRAWN, on its own axis,
//     revealed by the same `:checked` that selects the set.
//   - **the sentence it owes is a CROSS-AXIS reading**, not a count. A count of what is inside a
//     band the reader just chose tells them what they already asked for. What they cannot see is
//     what that same set does on an axis the plate could not put next to this one.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     brush: {
//       label: "Selectionner une bande",     // the <legend> — the beat's own words
//       noneLabel: "Toutes les lignes",      // the untouched option's words. Always first, always
//                                            // the default, and it IS the picture the page ships in.
//       held: ["FIN", "SWE"],                // the data whose colour is ALREADY carrying the
//                                            // argument: they take the weight step, never the value
//                                            // step. See `tone` below.
//       options: [
//         {
//           key: "nuclear-high",             // slugs to the radio id and to the `data-brush` token
//           axis: "nuclear_generation__twh", // the rail this band cuts — must be one the beat draws
//           label: "Nucleaire >= 25 %",
//           announce: "Nucleaire >= 25 % — 5 pays sur 16",  // must CONTAIN `label` (WCAG 2.5.3)
//           note: "Nucleaire >= 25 % — 5 pays sur 16. …",   // the sentence revealed under the control
//           keys: ["BEL", "CZE", "FIN", "FRA", "SWE"],      // what falls inside the band
//           band: { x: 0, width: 12, top: 0, height: 218.6 },  // geometry units, never CSS pixels
//         },
//         …
//       ],
//     }
//
// `x`, `width`, `top` AND `height` ARE IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, for the
// reason `stack.ts` and `withdraw.ts` both state at length: a `chart-web` `<svg>` carries
// `preserveAspectRatio="none"`, so a `viewBox` unit is a different number of reader pixels at every
// width, while an SVG rect drawn in user units tracks the geometry at 320 px and at 1600 px with
// nothing re-measuring it. The beat owns the scale; this file owns the frame refusal.
//
// THE INSIDE STEPS FORWARD, AND THE OUTSIDE DOES NOT STEP BACK. The repertoire's own words for this
// gesture are "a span of one axis is chosen and everything outside it steps back", and the
// implementation here does the opposite relation on purpose. The reason is a FLOOR, not a
// preference: a beat that draws its context marks at the non-text contrast floor against the
// direction's ground has no step back available that leaves them legible, and a mark receding must
// still be measurable where it is drawn. Reaching for `opacity` to get one is the defect this
// codebase has already shipped twice — a colour measured before the opacity was applied, reaching
// readers at 1,75:1 and 2,19:1 on two beats. So NOTHING IN THIS FILE EMITS AN OPACITY ON A MARK.
// What it emits is a step FORWARD on the selected set, and `assertBrushDeclaration` refuses a
// declaration whose two states do not clear a measured contrast step against each other.
//
// TWO CHANNELS, AND ONLY ONE OF THEM IS ALWAYS FREE. Weight moves on every selected mark. Value
// moves only on the marks whose colour is not already carrying the argument — a beat names those in
// `held`, and they take the weight step alone. That is `the-subject-is-ringed-not-recoloured` one
// vocabulary over: on any plate that needs a brush, colour is usually already carrying the subject,
// and a control that repainted the subject would take away the one thing `web-discipline.md` says no
// control on the page may take away.
//
// WHAT THIS FILE DOES NOT DO: MEASURE A COLOUR. It cannot — `splash/test/no-cross-skill-imports.test.ts`
// refuses any import leaving the skill directory, and re-deriving the contrast arithmetic here would
// be a second derivation of one number, which is how a whole map once emptied with nothing red
// (`filter.ts`'s own header). So the beat measures, with the same `colour.mjs` its marks are drawn
// through, and hands the readings over in `tone`; what this file refuses is a declaration whose own
// stated measurements do not clear the floors. The trust is the same one `withdraw.ts` places in a
// beat for `top` and `height`, and it is stated rather than assumed.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";

/** Where one band is drawn, in the geometry's own units. A rail is vertical here, so the band is a
 *  span of `top`/`height` on it; `x`/`width` are the rail's own position and the band's thickness. */
export type BrushBand = { x: number; width: number; top: number; height: number };

/** One band: the rail it cuts, the words for it, and what falls inside. */
export type BrushOption = {
  /** This option's identity. Slugs to the radio id and to the `data-brush` token a mark carries. */
  key: string;
  /** The axis this band cuts — one of the axes the beat actually draws. */
  axis: string;
  /** The visible words on the pill. */
  label: string;
  /** What a screen reader hears. Must CONTAIN `label` — WCAG 2.5.3. */
  announce: string;
  /** The sentence revealed under the control. Where the CROSS-AXIS reading lives. */
  note: string;
  /** The data keys whose value on `axis` falls inside the band. */
  keys: string[];
  /** Where the band is drawn, in the geometry's own units. */
  band: BrushBand;
};

/** What a beat declares when it wants a brush. Absent/`null` means it wants none. */
export type BrushDeclaration = {
  /** The `<legend>` — what this selects on, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first and always the default. */
  noneLabel: string;
  /** The data whose colour is already carrying the argument. They take the weight step, not the
   *  value step. An empty array is a legitimate declaration: a plate drawn in one neutral has no
   *  colour to protect. */
  held: string[];
  options: BrushOption[];
};

/** What the beat measured, with its own `colour.mjs`, about the two states a selected mark has —
 *  and about the four states of the CONTROL that selects them. This file may not import a colour
 *  module and will not pretend to measure; every number here is handed in. */
export type BrushTone = {
  /** The context mark's own contrast against the direction's ground, at rest. */
  baseOnGround: number;
  /** The selected mark's contrast against the same ground. */
  deepOnGround: number;
  /** The step BETWEEN the two states. The one measurement a floor check cannot stand in for: two
   *  colours can each clear 3:1 against the ground and be indistinguishable from each other. */
  deepOnBase: number;
  /** AN OPTION AT REST: its words against the ground. Held to the TEXT floor — this is prose a
   *  reader reads, not a mark they glance at. */
  pillRestOnGround: number;
  /** AN OPTION AT REST: the outline that says it can be pressed, against the same ground. Held to
   *  the non-text floor. A control whose options carry no measured edge reaches the reader as a row
   *  of grey words, which is the defect this reading exists to refuse. */
  pillOutlineOnGround: number;
  /** THE ACTIVE INK — what the hovered option's words, the focus ring and the chosen option's fill
   *  are all painted in, against the ground. Held to the TEXT floor, because one of its three uses
   *  is text. */
  pillActiveOnGround: number;
  /** THE CHOSEN OPTION: its words against the fill they sit on, which is NOT the ground. The one
   *  reading a floor check against the ground cannot stand in for. */
  pillSelectedTextOnFill: number;
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const BRUSH_NONE_SLUG = "none";

/** The floor a mark is held to against the ground — the same WCAG non-text floor `colour.mjs`
 *  carries, restated as a number here because this file may not import it. */
export const BRUSH_GROUND_MIN = 3;

/** The floor WORDS are held to against what they sit on — the same WCAG text floor, restated here
 *  for the same reason. The control's own labels are prose: an option a reader has to squint at is
 *  not an option they have. */
export const BRUSH_TEXT_MIN = 4.5;

/** The floor the two STATES of one mark are held to against each other. Not a WCAG number: a brush
 *  is read by seeing which lines came forward, and 1,6:1 is the step below which the answer to that
 *  question stops being visible on a thin stroke crossing a tangle. Stated as a default a beat may
 *  raise and never silently lower. */
export const BRUSH_STEP_MIN = 1.6;

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label — the same choice
 * `stackSlugOf`, `levelSlugOf` and `withdrawSlugOf` make, and for the same reason: the key is
 * already this option's identity (it is the string `data-brush` carries and the string the generated
 * selector quotes), so slugging from the words would be a second derivation of one identity.
 *
 *  @parity */
export function brushSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function brushOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * Refuses every declaration that would render a band the picture cannot honour, before anything is
 * drawn.
 *
 * @param drawnKeys  the data the beat actually draws — every option's `keys` are checked against it,
 *                   so a reader cannot select a line that is not on the plate.
 * @param drawnAxes  the rails the beat actually draws. A band cutting an axis that is not there is a
 *                   cut with no visible rule.
 * @param frame      the geometry's own extents. A band drawn outside them is a cut the reader is
 *                   told about and cannot see — the same refusal `assertLevelDeclaration` makes for
 *                   a reference laid off the plot.
 * @param tone       what the beat measured about the two states. See `BrushTone`.
 * @param stepMin    the floor the two states are held to against each other. Defaults to
 *                   `BRUSH_STEP_MIN`; a beat may raise it.
 */
export function assertBrushDeclaration(
  declaration: BrushDeclaration,
  drawnKeys: string[],
  drawnAxes: string[],
  {
    frame,
    tone,
    stepMin = BRUSH_STEP_MIN,
  }: {
    frame: { width: number; height: number };
    tone: BrushTone;
    stepMin?: number;
  },
): void {
  const where = "brush declaration";
  if (
    !declaration ||
    typeof declaration !== "object" ||
    Array.isArray(declaration)
  )
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  for (const field of ["label", "noneLabel"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a control with no ${field} renders unnamed`,
      );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two bands to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a brush declares none.",
    );
  for (const extent of ["width", "height"] as const)
    if (!Number.isFinite(frame?.[extent]) || !(frame[extent] > 0))
      throw new Error(
        `${where}: \`frame.${extent}\` is the plot's own ${extent} in geometry units and must be a ` +
          `positive number, got ${JSON.stringify(frame?.[extent])}`,
      );

  // ── the two states of a selected mark ────────────────────────────────────────────────────────
  for (const reading of [
    "baseOnGround",
    "deepOnGround",
    "deepOnBase",
    "pillRestOnGround",
    "pillOutlineOnGround",
    "pillActiveOnGround",
    "pillSelectedTextOnFill",
  ] as const)
    if (!Number.isFinite(tone?.[reading]))
      throw new Error(
        `${where}: \`tone.${reading}\` must be a contrast the beat MEASURED with its own colour ` +
          `module, got ${JSON.stringify(tone?.[reading])}. This file cannot measure a colour and ` +
          "will not pretend to.",
      );
  for (const reading of ["baseOnGround", "deepOnGround"] as const)
    if (tone[reading] < BRUSH_GROUND_MIN)
      throw new Error(
        `${where}: the beat measured \`${reading}\` at ${tone[reading].toFixed(2)}:1, under the ` +
          `${BRUSH_GROUND_MIN}:1 non-text floor. A brush may not paint a mark below the floor its ` +
          "plate was measured at — the selected set and the set it is read against are both still " +
          "being read.",
      );
  if (tone.deepOnBase < stepMin)
    throw new Error(
      `${where}: the selected state reads ${tone.deepOnBase.toFixed(2)}:1 against the state at rest, ` +
        `under the ${stepMin}:1 step this vocabulary holds. Two colours can each clear the floor ` +
        "against the ground and be indistinguishable from EACH OTHER, which is the only comparison " +
        "a reader operating this control is making.",
    );

  // ── the four states of the CONTROL, which is the only part of the page a reader operates ─────
  //
  // The picture above was measured from the first line of this file; the pills under it were not,
  // and shipped at 13 px in the direction's `--muted` with no border and no fill — six options
  // reaching the reader as a row of grey words rather than as things that can be pressed. A control
  // is not legible because its words clear a floor; it is legible because its EDGE does, and that
  // edge had never been measured because there had never been one. So every state is a reading, and
  // the two that carry words are held to the text floor rather than to the mark's.
  for (const [reading, floor, what] of [
    ["pillRestOnGround", BRUSH_TEXT_MIN, "an option's words at rest, on the ground"],
    ["pillOutlineOnGround", BRUSH_GROUND_MIN, "the outline that says an option can be pressed"],
    ["pillActiveOnGround", BRUSH_TEXT_MIN, "the hovered words, the focus ring and the chosen fill"],
    ["pillSelectedTextOnFill", BRUSH_TEXT_MIN, "the chosen option's words, on the fill under them"],
  ] as const)
    if (tone[reading] < floor)
      throw new Error(
        `${where}: ${what} reads ${tone[reading].toFixed(2)}:1, under the ${floor}:1 floor ` +
          `(\`tone.${reading}\`). A reader who cannot tell an option from a caption cannot operate ` +
          "this control, and every reading the picture clears is worth nothing to them.",
      );

  const drawn = new Set(drawnKeys);
  if (drawn.size !== drawnKeys.length)
    throw new Error(
      `${where}: the drawn keys are not unique — ${JSON.stringify(drawnKeys)}`,
    );
  const axes = new Set(drawnAxes);
  if (axes.size !== drawnAxes.length)
    throw new Error(
      `${where}: the drawn axes are not unique — ${JSON.stringify(drawnAxes)}`,
    );

  if (!Array.isArray(declaration.held))
    throw new Error(
      `${where}: \`held\` must be an array — declare an EMPTY one for a plate drawn in a single ` +
        "neutral, so the absence is a decision rather than a forgotten field",
    );
  for (const key of declaration.held)
    if (!drawn.has(key))
      throw new Error(
        `${where}: \`held\` names ${JSON.stringify(key)}, which the beat does not draw — a mark ` +
          "exempted from the value step must exist to be exempted",
      );

  const seen = new Map<string, string>();
  const selections = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every band needs a label — got ${JSON.stringify(option)}`,
      );
    const slug = brushSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === BRUSH_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${BRUSH_NONE_SLUG}", the ` +
          "reserved id of the untouched option — rename it",
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    for (const field of ["announce", "note"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: band ${JSON.stringify(option.label)} has no \`${field}\` — a selection whose ` +
            "answer is only a picture leaves the reader to re-read the whole tangle to recover the " +
            "one reading it exists to give them",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );

    // ── the rail it cuts ─────────────────────────────────────────────────────────────────────
    if (typeof option.axis !== "string" || !axes.has(option.axis))
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} cuts ${JSON.stringify(option.axis)}, which ` +
          "is not one of the rails this beat draws — a band with no visible rail is a subset with " +
          "no stated rule",
      );

    // ── what falls inside it ─────────────────────────────────────────────────────────────────
    if (!Array.isArray(option.keys) || option.keys.length === 0)
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} selects nothing — an empty band is a reader ` +
          "choosing an option and being shown the plate with a rectangle on it",
      );
    const selected = new Set(option.keys);
    if (selected.size !== option.keys.length)
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} names a key twice — ${JSON.stringify(option.keys)}`,
      );
    for (const key of option.keys)
      if (!drawn.has(key))
        throw new Error(
          `${where}: band ${JSON.stringify(option.label)} selects ${JSON.stringify(key)}, which the ` +
            "beat does not draw — the reader would be told a count the picture cannot show",
        );
    // EVERY CONTROL CHANGES THE PICTURE, refused at the declaration rather than found by choosing an
    // option and looking. `assertFilterDeclaration` has refused the same shape since the filter
    // vocabulary was written: a band holding every drawn datum "is the unfiltered view under a
    // second name", and here it is worse — a band is a claim about a THRESHOLD, and one that keeps
    // everything says the threshold does nothing while drawing a rectangle that says it does.
    if (option.keys.length >= drawnKeys.length)
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} keeps all ${drawnKeys.length} drawn data — ` +
          "that is the untouched view under a second name, with a rectangle drawn on a rail to " +
          "suggest otherwise",
      );
    const fingerprint = [...option.keys].sort().join(" ");
    if (selections.has(fingerprint))
      throw new Error(
        `${where}: ${JSON.stringify(selections.get(fingerprint))} and ${JSON.stringify(option.label)} ` +
          "select exactly the same data — two names over one reading, and a reader who moves " +
          "between them watches nothing happen",
      );
    selections.set(fingerprint, option.label);

    // ── where the band is drawn ──────────────────────────────────────────────────────────────
    const band = option.band;
    if (!band || typeof band !== "object")
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} declares no \`band\` geometry — a brush the ` +
          "reader cannot see the bounds of is a subset with no stated rule",
      );
    for (const side of ["x", "width", "top", "height"] as const)
      if (!Number.isFinite(band[side]))
        throw new Error(
          `${where}: band ${JSON.stringify(option.label)} has a non-finite ${side} (${band[side]})`,
        );
    for (const extent of ["width", "height"] as const)
      if (!(band[extent] > 0))
        throw new Error(
          `${where}: band ${JSON.stringify(option.label)} is drawn ${band[extent]} units ${extent} — ` +
            "a band of no extent is a rule the reader is told about and cannot see",
        );
    // THE FRAME IS NOT NEGOTIABLE, and it is the same refusal `assertLevelDeclaration` makes for a
    // reference laid off the plot: a band the reader can only see part of is a threshold they cannot
    // read against the axis. The remedy is the beat's scale, not a clipped rectangle.
    if (band.top < 0 || band.top + band.height > frame.height)
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} spans ${band.top.toFixed(1)}-` +
          `${(band.top + band.height).toFixed(1)} on a ${frame.height}-unit plot, so it would be cut ` +
          "off by the viewBox. Raise the ceiling this rail carries, or stop offering the band.",
      );
    if (band.x < 0 || band.x + band.width > frame.width)
      throw new Error(
        `${where}: band ${JSON.stringify(option.label)} spans ${band.x.toFixed(1)}-` +
          `${(band.x + band.width).toFixed(1)} across a ${frame.width}-unit plot, so it would be cut ` +
          "off at the edge. A rail at the frame's own edge carries its band inside it.",
      );
  }
}

/**
 * The index a component tags its markup from: for each drawn key, the slugs of every band it falls
 * inside. A key inside no band gets an EMPTY list rather than no entry, so `brushAttrsFor` can tell
 * "outside every band" from "not drawn", and the vocabulary check below can tell a half-tagged datum
 * from an untagged one.
 *
 * With no declaration it returns an empty map — no attribute, no residue, nothing for a stylesheet
 * to find, exactly as `buildFilterIndex` does.
 */
export function buildBrushIndex(
  declaration: BrushDeclaration | null | undefined,
  drawnKeys: string[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  if (!declaration) return index;
  for (const key of drawnKeys) index.set(key, []);
  for (const option of declaration.options)
    for (const key of option.keys)
      index.get(key)?.push(brushSlugOf(option.key));
  return index;
}

/**
 * THE ONE THING A COMPONENT CALLS. Spread it onto EVERY element drawn from a datum — its line, each
 * of its vertices, its label. Two elements from one datum that do not both carry this are the defect
 * `filter.ts` was written to make impossible, and `assertOneBrushVocabulary` reads the rendered
 * markup back to say so.
 *
 * `role` is what the generated stylesheet keys the two channels off: a `"line"` takes the weight
 * step and, unless it is held, the value step; a `"vertex"` takes a ring. They are separate because
 * the format's own `.pt:hover { fill: … }` owns a vertex's fill, and a brush rule setting `fill`
 * there would score (1,3,0) against that rule's (0,1,0) and silently kill hover on exactly the marks
 * the reader had just selected.
 */
export function brushAttrsFor(
  index: Map<string, string[]>,
  declaration: BrushDeclaration | null | undefined,
  key: string,
  role: "line" | "vertex",
): Record<string, string> {
  if (index.size === 0) return {};
  const slugs = index.get(key);
  if (!slugs)
    throw new Error(
      `brush: nothing was drawn for the key ${JSON.stringify(key)} — brushAttrsFor was called with ` +
        "a key the index does not know, so the element would sit outside every band the reader can " +
        "choose",
    );
  return {
    "data-brush-key": key,
    "data-brush": slugs.join(" "),
    "data-brush-role": role,
    "data-brush-tone": (declaration?.held ?? []).includes(key)
      ? "held"
      : "free",
  };
}

/**
 * Reads the rendered markup back and refuses a half-tagged datum, before the page is written.
 *
 * The same guarantee `assertOneVocabulary` gives one vocabulary over, and it is needed for the same
 * reason: a line that carries the brush vocabulary while its own vertices do not is a selection that
 * thickens a stroke and leaves seven unringed points on it, which reads as a drawing error rather
 * than as a state.
 *
 * WHAT A TAG SCAN CANNOT SEE, AND HOW A BEAT CLOSES IT. `filter.ts` states the hole plainly for its
 * own version of this function — "neither half can see an element drawn from a datum that carries NO
 * attributes at all" — and leaves it to a guard that drives a real browser. Measured on this
 * vocabulary the day it was written: deleting the `brushAttrsFor` spread from every vertex, leaving
 * it on every line, passed this check silently. Nothing was half-tagged; a whole kind of element had
 * simply stopped existing as far as a scan for `data-brush-key` was concerned.
 *
 * `perKey` is the closure, and it is a number only the BEAT knows: how many elements one datum draws.
 * A parallel-coordinates line is one path plus one vertex per rail, so it passes `1 + axes.length`
 * and the deletion above goes red at 1 instead of 8. It is optional because a beat whose data draw a
 * varying number of elements cannot state one, and a check that demanded a wrong number would be
 * worse than the hole; what is not optional is that a beat which CAN state it does, which is why the
 * hole is written down here rather than left to be rediscovered.
 */
export function assertOneBrushVocabulary(
  markup: string,
  index: Map<string, string[]>,
  { perKey }: { perKey?: number } = {},
): void {
  if (index.size === 0) {
    const stray = String(markup).match(
      /\sdata-brush(?:-key|-role|-tone|-band|-note|-axis)?=/,
    );
    if (stray)
      throw new Error(
        `brush: this beat declares no brush, but its markup carries a ${stray[0].trim()} attribute ` +
          "— declare the brush or drop the attribute; a residue is how a beat ends up with a " +
          "control nobody can operate",
      );
    return;
  }
  const tags = String(markup).match(/<[a-zA-Z][^>]*>/g) ?? [];
  const drawnPerKey = new Map<string, number>();
  let tagged = 0;
  for (const tag of tags) {
    const key = tag.match(/\sdata-brush-key="([^"]*)"/);
    if (!key) continue;
    const expected = index.get(key[1]);
    if (!expected)
      throw new Error(
        `brush: an element carries data-brush-key="${key[1]}", which is not one of the ${index.size} ` +
          `drawn data — ${tag.slice(0, 120)}`,
      );
    const actual = tag.match(/\sdata-brush="([^"]*)"/);
    if (!actual)
      throw new Error(
        `brush: an element drawn from "${key[1]}" carries no data-brush, so it would stay at rest ` +
          `while the rest of its own line comes forward — ${tag.slice(0, 120)}`,
      );
    if (actual[1] !== expected.join(" "))
      throw new Error(
        `brush: an element drawn from "${key[1]}" carries data-brush="${actual[1]}" where the ` +
          `vocabulary says "${expected.join(" ")}" — two derivations of one string is how a ` +
          "selection comes out as the wrong set",
      );
    if (!/\sdata-brush-role="(?:line|vertex)"/.test(tag))
      throw new Error(
        `brush: an element drawn from "${key[1]}" carries no data-brush-role, so the stylesheet ` +
          `cannot tell which of the two channels it takes — ${tag.slice(0, 120)}`,
      );
    drawnPerKey.set(key[1], (drawnPerKey.get(key[1]) ?? 0) + 1);
    tagged++;
  }
  if (perKey !== undefined)
    for (const key of index.keys()) {
      const drew = drawnPerKey.get(key) ?? 0;
      if (drew !== perKey)
        throw new Error(
          `brush: the datum "${key}" tagged ${drew} element(s) where this beat draws ${perKey} per ` +
            "datum — a whole kind of element has stopped carrying the vocabulary, so a selected " +
            "line would come forward with part of itself left at rest",
        );
    }
  if (tagged === 0)
    throw new Error(
      `brush: ${index.size} data are brushable and NOT ONE element in the markup carries ` +
        "data-brush-key — the bands would be drawn over a picture they cannot reach",
    );
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function brushOptionsForMarkup(
  declaration: BrushDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isNone: boolean;
}[] {
  if (!declaration) return [];
  return [
    {
      id: brushOptionId(idPrefix, BRUSH_NONE_SLUG),
      slug: BRUSH_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: brushOptionId(idPrefix, brushSlugOf(option.key)),
      slug: brushSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes`,
 * `stackNotesForMarkup`, `levelNotesForMarkup` and `withdrawNotesForMarkup` hold. One sentence per
 * band, revealed by the same `:checked` that brings the set forward. The untouched option gets NO
 * note, because it is not a selection: it is the claim the title states.
 *
 * WHAT THE SENTENCE IS FOR ON THIS VOCABULARY, and it is not a count. A reader who has just chosen
 * "nuclear >= 25 %" knows they asked for the high-nuclear countries; being told there are five of
 * them is the question read back. What they cannot see — because a parallel-coordinates plate can
 * only put ONE pair of rails side by side, and seven rails make twenty-one pairs — is what that same
 * set does on an axis three rails away. That is the reading this sentence carries, and it is the one
 * `assertBrushChangesThePicture` measures.
 */
export function brushNotesForMarkup(
  declaration: BrushDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: brushSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * EVERY BAND THE BEAT HAS TO DRAW — one per option, each carrying the slug the generated selector
 * quotes and the rectangle it occupies in geometry units.
 *
 * The component draws them ALL, once, hidden; the stylesheet reveals the chosen one. That is why
 * nothing here emits a transform, and why a reader with no script gets the same control a reader
 * with one does.
 */
export function brushBandsForMarkup(
  declaration: BrushDeclaration | null | undefined,
): { slug: string; axis: string; label: string; band: BrushBand }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: brushSlugOf(option.key),
    axis: option.axis,
    label: option.label,
    band: option.band,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `stackCss`, `levelCss` and `withdrawCss`
 * do.
 *
 * THE VOCABULARY IT WRITES AGAINST, which is what the component must tag its markup with:
 *
 *   data-brush="<slug…>"    every element drawn from a datum, handed out by `brushAttrsFor` — the
 *                           bands that datum falls inside, as a TOKEN LIST, matched with `~=`.
 *   data-brush-role         "line" (takes weight, and value unless held) or "vertex" (takes a ring).
 *   data-brush-tone         "free" or "held" — whether this mark's colour is already carrying the
 *                           argument. A held mark never takes the value step.
 *   data-brush-axis="<key>" the rail. The one this band cuts comes forward with the set.
 *   data-brush-band="<slug>"  the band's own rectangle, drawn hidden and revealed by its option.
 *   data-brush-note="<slug>"  the sentence under the control.
 *
 * COLOURS ARRIVE AS ARGUMENTS, never as literals: the beat sets them from the direction it is being
 * rendered in and MEASURES them there (`tone`, checked by `assertBrushDeclaration`), so nothing here
 * names a colour and a direction that changes its ink changes this control with it.
 *
 * NO RULE HERE EMITS AN OPACITY ON A MARK. The one `opacity` in the file reveals a band's rectangle,
 * which is either drawn or not drawn — a two-state reveal, never a mark painted part-way, which is
 * the measurement this format has already lost twice.
 */
export function brushCss(
  declaration: BrushDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    deep,
    ring,
    band,
    weight,
    moveMs,
  }: {
    scope: string;
    idPrefix: string;
    /** What a selected line whose colour is free steps to, and what the cut rail steps to. Measured
     *  by the beat against the ground AND against the colour it steps from. */
    deep: string;
    /** The ring a selected vertex takes. A STROKE and never a fill: the format's own
     *  `.pt:hover { fill: … }` owns that channel, and a (1,3,0) rule setting `fill` would beat it. */
    ring: { stroke: string; width: number };
    /** What a revealed band is painted in, on the rail it cuts. */
    band: { fill: string; stroke: string };
    /** The stroke widths, in the same units the beat draws its lines at. */
    weight: { line: number; rail: number };
    /** How long a selection takes to come forward. Honoured only under `prefers-reduced-motion:
     *  no-preference` — the whole transition lives inside the query rather than being overridden
     *  back, so under `reduce` there is no transition to resolve at all. */
    moveMs: number;
  },
): string {
  if (!declaration) return "";

  /**
   * EVERY SELECTOR IN A GROUP CARRIES THE SCOPE, ASSERTED AND NOT REMEMBERED.
   *
   * `A B, C` is `(A B), (C)`: a descendant prefix binds to the FIRST selector of a group and to no
   * other. `stack.ts` shipped that defect once — two of ten columns painted with the accent in every
   * state of the page, the untouched one included — and it was caught by reading the emitted CSS
   * back, which is not a thing anyone can be relied on to do twice.
   */
  const scoped = (selectors: string[], at: string) => {
    for (const selector of selectors)
      if (!selector.startsWith(`${at} `))
        throw new Error(
          `brush: the generated selector ${JSON.stringify(selector)} does not start with its own ` +
            `option scope ${JSON.stringify(at)} — every selector in a group needs it, because ` +
            "`A B, C` is `(A B), (C)` and the second half would apply in every state of the page",
        );
    return selectors.join(", ");
  };
  const round = (n: number) => Number(n.toFixed(3));

  const lines: string[] = [
    `/* The brush this beat declared: ${declaration.options.length} bands over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with and withdraw.ts re-runs an arithmetic with, and the reason this control needs`,
    `   no script and survives one being blocked. A continuous drag would need one; named bands are`,
    `   the version of this gesture the format can promise. */`,
    `${scope} [data-brush-note] { display: none; }`,
    // The bands are drawn in every state and revealed in one. A reveal is two-state — painted or
    // not painted — so an opacity here is not a colour anybody has to read at an intermediate
    // value, which is the whole of this file's rule against the property.
    `${scope} [data-brush-band] { opacity: 0; pointer-events: none; }`,
    `${scoped([`${scope} [data-brush-band]`], scope)} { fill: ${band.fill}; stroke: ${band.stroke}; stroke-width: 1; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scoped(
      [
        `${scope} [data-brush-role]`,
        `${scope} [data-brush-axis]`,
        `${scope} [data-brush-band]`,
      ],
      scope,
    )} {`,
    `    transition: stroke ${moveMs}ms ease, stroke-width ${moveMs}ms ease, opacity ${moveMs}ms ease;`,
    `  }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = brushSlugOf(option.key);
    const at = `${scope}:has(#${brushOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      // WEIGHT MOVES ON EVERY SELECTED LINE. `stroke-width` and not a colour, because this is the
      // one channel a plate drawn in an accent still has free.
      `${at} [data-brush-role="line"][data-brush~="${slug}"] { stroke-width: ${round(weight.line)}; }`,
      // VALUE MOVES ONLY WHERE COLOUR IS FREE. A `held` line keeps the accent it carries the
      // argument in — `web-discipline.md`, "What must not become interactive": no control on the
      // page may take the accent off the subject.
      `${at} [data-brush-role="line"][data-brush~="${slug}"][data-brush-tone="free"] { stroke: ${deep}; }`,
      // THE VERTEX IS RINGED, NEVER REFILLED. Its fill belongs to the format's own hover rule.
      `${at} [data-brush-role="vertex"][data-brush~="${slug}"] { stroke: ${ring.stroke}; stroke-width: ${round(ring.width)}; }`,
      // THE RAIL THE BAND CUTS COMES FORWARD WITH IT, so a reader looking at the plot rather than at
      // the pills can see WHICH of the axes the selection was made on.
      `${at} [data-brush-axis="${option.axis}"] { stroke: ${deep}; stroke-width: ${round(weight.rail)}; }`,
      `${at} [data-brush-band="${slug}"] { opacity: 1; }`,
      `${at} [data-brush-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/**
 * THE RENDER-TIME REFUSAL, AND WHY IT LIVES HERE RATHER THAN IN `interaction-plan.ts`.
 *
 * `assertControlsChangeSomething` discovers a page's controls by walking the markup for the shapes
 * it knows — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
 * `chart-level-*` radios. It does not know this vocabulary's radios exist, so a brush is invisible to
 * it and would ship unmeasured. Squatting on `filter.ts`'s id prefix and `data-filter` attribute to
 * be discovered is not available and should not be: `assertOneVocabulary` refuses that attribute
 * outright on a beat that declares no filter, and it is right to — this control does not narrow, and
 * the census would report a filter that removes nothing.
 *
 * So the refusal is written here, against the same definition the format already holds — *a control
 * whose state, once applied, equals the default state is one the reader operates while nothing
 * changes* — and applied on the channel this vocabulary owes:
 *
 *   THE SENTENCE. Each band's note must carry a reading the page does not already print. That is the
 *   half `interaction-plan.ts` measures for a stack and a yardstick, and the reason it measures the
 *   sentence rather than the geometry: a rectangle on a rail is not a reading, no markup scan can
 *   see one, and a check that counted generated rules would go green on a hundred rules that
 *   selected nothing.
 *   THE SET. `assertBrushDeclaration` has already refused a band that keeps every drawn datum and
 *   two bands that keep the same one, which is the half this vocabulary CAN see because it wrote it.
 *
 * `defaultPrintedText` is imported rather than re-derived — the last time this repository derived one
 * string two ways, a whole map emptied with nothing red. What IS done here is strip this
 * vocabulary's own revealed sentences before handing the page over, for exactly the reason that
 * function strips a filter's note, a stack's and a yardstick's: an element revealed by `:checked`
 * counted as printed makes the control that reveals it look dead.
 */
export function assertBrushChangesThePicture(
  html: string,
  declaration: BrushDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed = /<[^>]*data-brush-note="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
  const printed = defaultPrintedText(String(html).replace(revealed, " "));
  const inert: string[] = [];
  for (const option of declaration.options) {
    const adds = answerPieces(option.note).some(
      (piece) => !printed.includes(piece),
    );
    if (!adds) inert.push(option.label);
  }
  if (inert.length)
    throw new Error(
      `${where}: ${inert.length} of ${declaration.options.length} band(s) reveal a sentence the page ` +
        `already prints (${inert.join(", ")}). A reader who works through every band is told nothing ` +
        "they could not read at rest — give each one the cross-axis reading its own selection " +
        "produces, or stop offering it " +
        '(chart-web/references/directed-interaction.md, "The mechanical refusal")',
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a brush.
 *
 * A DELIBERATE COPY of `withdrawChromeCss`, not an import, and the cost is stated rather than hidden
 * — the same trade that file records against `stackChromeCss` and `render-web.mjs`'s `.chart-filter`
 * block. Reaching one of those would mean either shipping a control this beat does not want or
 * teaching another file's stylesheet a class it cannot see the declaration for. The blocks are held
 * together by the eye; the thing that would actually hurt if they drifted — a reader unable to
 * operate the control — is held by neither, but by `verify-web.mjs` driving a real keyboard.
 *
 * AND ONE PLACE IT NO LONGER COPIES THEM, WHICH IS THE POINT OF THE `pill` ARGUMENT. Those blocks
 * draw ONE rounded outline around the whole row of options and leave each option bare, so only the
 * chosen one — ink fill, ground words — reads as a control at all. Measured on this vocabulary's
 * own first page: six options at 13 px, five of them `#61605a` on the cream ground with no border
 * and no fill, i.e. a row of grey words beside a black pill. So the group's frame comes off, a real
 * gap goes between the options, and EVERY option carries its own outline — painted in a colour the
 * BEAT measured against the ground it actually sits on and handed in, because this file may not
 * measure one. `assertBrushDeclaration` refuses the declaration whose outline is under the floor.
 *
 * The native radios underneath are what the reader actually operates. The pills are layered ON TOP
 * (`opacity: 0`, never `display: none`) and the whole treatment is behind
 * `@supports selector(:has(*))`, so an engine that cannot draw a checked pill gets the plain radios
 * rather than six identical ones.
 */
export function brushChromeCss({
  scope,
  pill,
}: {
  scope: string;
  /** What the option at rest is outlined in. One colour, measured by the beat against the ground —
   *  the hovered, focused and chosen states are all the direction's own `--ink`, which is already
   *  what this format draws its words in. */
  pill: { outline: string };
}): string {
  return `
${scope} .chart-brush {
  flex: 0 0 auto;
  margin: 10px 0 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  font-size: var(--filter-size);
}
/* float:left is the HTML spec's own opt-out from becoming the "rendered legend" the browser lifts
   into the fieldset's border — inside a flex container the float itself does nothing. Without it the
   legend takes a row of its own, which this format's window-fit rule pays for in plot height. */
${scope} .chart-brush legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-brush .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-brush label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-brush input { cursor: pointer; margin: 0; }

/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not a band is chosen, so
   choosing one never moves the plot underneath it. role="status" is on the container rather than on
   each note: the notes come and go by display, and a live region that itself comes and goes
   announces nothing. */
${scope} .brush-notes {
  flex: 0 0 auto;
  margin: 4px 0 0;
  min-height: 1.5em;
  font-size: var(--source-size);
  color: var(--muted);
}
${scope} .brush-notes p { margin: 0; }

@supports selector(:has(*)) {
  /* NO FRAME AROUND THE GROUP, AND ONE AROUND EVERY OPTION — see this function's own header for the
     measurement. The gap is what makes six outlines read as six objects rather than as one ruled
     table; without it two 1px edges meet and the row goes back to looking like a single frame. The
     two axes are not the same number and must not be: 6px ACROSS is what separates two outlines on
     one row, while 2px DOWN is all a wrapped row can afford — at 375px this control wraps to three
     rows on the direction that sets its display in 32px uppercase, where the page has no pixels to
     spare and the format's window-fit rule pays for every one of them out of the plot. */
  ${scope} .chart-brush .options {
    gap: 2px 6px;
    padding: 0;
    border: 0;
  }
  /* 4px of vertical padding and not the 5px the frameless copies take, so that an option's OUTER
     box is the same 25,6px it was before it had a border: the 1px edge is paid for out of the
     padding rather than out of the plot below, which on this format's tightest direction at 375px
     is the difference between the source line being on screen and being under the fold. Still a
     24px touch target, which is what the 5px was there to protect. */
  ${scope} .chart-brush label {
    gap: 0;
    padding: 4px 10px;
    /* NO PER-OPTION EDGE. This control shipped one for a while and the owner's verdict on the
       result was « l'encadré gris au filtre c'est moche » — a row of outlined boxes over a plot
       that is already a thicket of lines reads as a second grid. The shared chrome frames the
       GROUP and leaves each label bare, which is what every other control in this format does; a
       pill still says it can be pressed, by its padding, its radius and its hover. Kept
       transparent rather than removed so the chosen state's own border has something to swap and
       the row cannot shift sideways by 2px when a reader changes their mind. */
    border: 1px solid transparent;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
  }
  ${scope} .chart-brush label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 999px;
  }
  ${scope} .chart-brush label:hover { color: var(--ink); border-color: var(--ink); }
  /* ink-on-ground, never the accent: the accent is what the argument is drawn in on this page, and a
     control that borrowed it would make the one colour that means something also mean "you clicked
     here". The chosen option keeps a border rather than dropping one: its own fill hides it, and a
     pill that lost 2px of box on being chosen would shove the row sideways every time the reader
     changed their mind. */
  ${scope} .chart-brush label:has(input:checked) { background: var(--ink); color: var(--ground); border-color: var(--ink); }
  ${scope} .chart-brush label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
