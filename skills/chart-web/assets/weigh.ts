// twin/skills/chart-web/assets/weigh.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is
// chosen. `trace.ts` says what may be FOLLOWED through an image. `hold.ts` says which factor of a
// product may be HELD STILL. `descend.ts` says what may BECOME THE WHOLE. `floor.ts` says what the
// picture may STAND ON. This file says **what a mark is WORTH in the picture, and therefore how much
// room it claims.** All of them are native radio inputs plus CSS generated at build time (`:checked`
// and `:has()` on the enclosing figure, no listener, no state, not one byte of JavaScript), because
// that is the only kind of control this format can promise still works with the script absent.
//
// WHY A PACKED FIELD NEEDS THIS AND A BAR CHART DOES NOT.
//
// Re-weighting a bar chart changes the bars and nothing else: each bar is measured against a fixed
// axis and its neighbours are irrelevant to where it sits. A PACKED field has no such axis. A
// beeswarm spends one whole dimension on collision avoidance — a mark's distance from the baseline
// is an artefact of packing order and encodes nothing — and what it buys with that spend is the
// swarm's WIDTH at each value, which is the type's only aggregate statement.
//
// AND THAT WIDTH IS NOT A COUNT. It is a count of whatever the marks are sized by. A swarm whose
// circles are sized by population is thick where the PEOPLE are; the same 213 marks at the same 213
// positions, sized equally, are thick where the COUNTRIES are. Nothing on a still says which of the
// two the reader is looking at, and a still cannot say it: one plate is one packing, and one packing
// is one weighting. The reader who is allowed to change the weighting is the only reader who can
// tell the two apart.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN `stack.ts` OR `hold.ts`, THE TWO NEAR MISSES.
//
// A `StackedColumn` is `{ key, dx, dy }` — a per-member DISPLACEMENT. A `HoldColumn` is
// `translate(tx, ty) scale(sx, sy)` — a per-column AFFINE RE-SCALE. Both take a drawing that exists
// and move or stretch it, and both are expressible as a `transform` on a drawn element. **A
// weighting is neither, because it does not transform the drawing: it re-derives it.** The packing
// is run again from nothing, and a mark's new place is a function of every OTHER mark's new size,
// not of its own old place. There is no `dx` that expresses "India is now a quarter of China" and no
// `scale` that expresses "and therefore forty of its neighbours moved". Folding this into either
// file would have meant giving a vocabulary whose whole argument is "a mark goes somewhere" a field
// about what a mark is made of.
//
// AND NOTHING HERE EMITS A `transform`, FOR THE REASON `floor.ts` AND `stack.ts` BOTH RECORD.
// `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at init, which no CSS
// transform and no CSS animation ever changes. A mark animated into a new place would keep answering
// for the place it left, which is the worst answer an interactive chart can give. So each option's
// swarm is DRAWN ONCE, at its own packing, in its own `<svg class="chart">`, and the stylesheet
// reveals one — a hidden `<svg>` has no CTM and no focusable content, so the pointer and the
// keyboard only ever reach the swarm the reader is looking at.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     weigh: {
//       label: "L'essaim pèse",                  // the <legend> — the beat's own words
//       options: [
//         {
//           key: "people",                       // the FIRST option is the default, and it IS the
//           label: "les habitants",              // picture the page ships in. It carries no note:
//           announce: "les habitants — …",       // it is not a comparison, it is the claim.
//           weights: [41454762, 2811660, …],     // one per drawn mark, same order
//           centre: 52.0,                        // where half this weighting's weight lies, in
//                                                // the geometry's own x units
//         },
//         {
//           key: "carbon",
//           label: "le CO₂",
//           announce: "le CO₂ — …",              // must CONTAIN `label` (WCAG 2.5.3)
//           note: "La moitié du CO₂ mondial …",  // the sentence revealed under the control
//           weights: [ … ],
//           centre: 171.2,
//         },
//       ],
//     }
//
// EVERY NUMBER IS IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, for the reason `stack.ts`,
// `hold.ts` and `floor.ts` all state at length: a `chart-web` `<svg>` carries
// `preserveAspectRatio="none"`, so a `viewBox` unit is a different number of reader pixels at every
// width.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
//
//   - A WEIGHT THAT JUST REPEATS THE AXIS. If a mark's weight rises and falls with its own position
//     on the measured axis, the swarm's width says what the axis already says, and the reader is
//     handed a control that draws the same argument twice. Measured as Spearman's rho between the
//     weights and the values, against a declared ceiling — a weighting by the axis variable itself
//     scores exactly 1.
//   - A FLOOR THAT HIDES WEIGHT. Real weights span orders of magnitude, so a minimum visible radius
//     is unavoidable, and it is a distortion: marks on the floor all draw the same size whatever
//     they weigh. The distortion only LIES if the floored marks carry real mass, so that is what is
//     measured — the share of the option's total weight sitting on the floor — and the COUNT is
//     reported rather than refused on.
//   - A SWARM THAT LEAVES THE BAND. The ladder walks ink fractions, generous first, and takes the
//     first that packs inside the frame. None fitting is a refusal, never a clip and never a
//     per-mark re-scale, which would make two neighbours mean different things.
//   - A MARK THAT MOVES ALONG THE MEASURED AXIS. A packed field that slid a mark sideways to make
//     room has lied about the one thing it measures. Checked per option against the default.
//   - A MARK THAT LEAVES, OR ARRIVES. Every option seats exactly the same key set: a weighting that
//     dropped a zero-weight mark would be a filter wearing this vocabulary's chips, and this file's
//     whole claim is that nothing leaves.
//   - AN OPTION THAT IS THE DEFAULT UNDER A SECOND NAME, which `directed-interaction.md` refuses
//     outright. Two arithmetic measurements, because one of them can be passed by accident: the
//     fraction of marks re-seated or re-sized, AND the movement of the centre of mass the option
//     hands back as a reading.
//   - AN OPTION WITH NO SENTENCE, and an accessible name that does not contain its visible label.
//   - A HALF-TAGGED DATUM, and A VOCABULARY THAT EMITS NO RULES — both read back off the written
//     page by `assertOneWeighing`. `descend.ts` records the mutation that earned the second one:
//     dropping the stylesheet call left every view drawn on top of every other and went green.

import { controlChromeCss } from "./control-chrome.ts";

/** One mark the beat draws, in the order its `weights` arrays are written in. `value` is its place
 *  on the measured axis — the one number no weighting is allowed to move. */
export type WeighMark = { key: string; value: number };

/** Where one mark ended up under one option, in the geometry's own units. The beat owns its own
 *  collision layout — this file decides how big a mark is, never where a packer puts it — and hands
 *  the result back so the refusals can be made against what will actually be drawn. */
export type WeighSeat = { cx: number; cy: number; r: number };

/** One weighting. The first declared is the default and carries no `note`. */
export type WeighOption = {
  /** What the swarm is being weighed in, in one word. The slug is derived from THIS and never from
   *  the label — the same single derivation of one identity `stack.ts` argues for. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control, in the beat's own words. Required on every option but
   *  the default, and refused ON the default: the untouched picture is not a comparison, it is the
   *  claim, and a note under it would be the title said twice. */
  note?: string;
  /** What each drawn mark weighs under this option, one per mark, in the beat's `marks` order.
   *  Non-negative and finite; a zero is allowed and is drawn on the floor, because a mark that
   *  weighs nothing is still a mark and this vocabulary never removes one. */
  weights: number[];
  /** Where half this weighting's total weight lies, on the measured axis, in geometry x units.
   *  It is the reading the option hands back and the thing the page's own centre-of-mass marker is
   *  placed at — so it is declared, checked against the default, and never recomputed in a browser. */
  centre: number;
};

/** What a beat declares when it wants a weighing. Absent/`null` means it wants none. */
export type WeighDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** At least two. The FIRST is the default: it is the picture the page ships in, the picture a
   *  reader with no script never leaves, and the one every other option is measured against. */
  options: WeighOption[];
  /** The smallest radius a mark may be drawn at, in geometry units — the beat's own decision about
   *  what a reader can see and point at. It is declared HERE, once, rather than per option: a floor
   *  that changed between weightings would make two swarms' thinnest marks mean different things,
   *  and the whole comparison this control offers rests on the marks meaning the same thing
   *  throughout. What it costs is measured per option by `flooredWeightShare`. */
  floorRadius: number;
};

/** A CSS-id-safe slug, derived from the option's KEY and never from its label — `filter.ts` records
 *  the defect it got from having slugged words instead.
 *
 *  @parity */
export function weighSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug. One function, three readers. */
export function weighOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE RADII ONE WEIGHTING ASKS FOR, AT ONE INK BUDGET.
 *
 * Area is the quantity, so the radius runs on a square root — the same ladder rung the static
 * sibling walks, stated here once so three formats cannot disagree about it. `area` is the TOTAL
 * ink the marks may spend between them, which is what makes the budget a single number a ladder can
 * walk rather than a per-mark guess: `sum(pi r_i^2) = area` exactly when
 * `r_i = sqrt(area * w_i / (pi * sum w))`.
 *
 * `floorRadius` is the distortion this file exists to MEASURE rather than to hide. Below it a mark
 * would be invisible and unpointable, so it is raised — and raising it means the mark no longer
 * draws what it weighs. `flooredWeightShare` is how much that costs.
 */
export function weighRadii(
  weights: number[],
  { area, floorRadius }: { area: number; floorRadius: number },
): number[] {
  if (!Array.isArray(weights) || weights.length === 0)
    throw new Error("weigh: a weighting with no weights weighs nothing");
  if (!Number.isFinite(area) || area <= 0)
    throw new Error(
      `weigh: the ink budget must be a positive area, got ${area}`,
    );
  if (!Number.isFinite(floorRadius) || floorRadius <= 0)
    throw new Error(
      `weigh: the floor radius must be a positive number of geometry units, got ${floorRadius}`,
    );
  let total = 0;
  for (const w of weights) {
    if (!Number.isFinite(w) || w < 0)
      throw new Error(
        `weigh: a mark weighs ${w}. A weight is a finite, non-negative quantity — a negative one ` +
          "has no area and a mark with no area is a mark this vocabulary has removed.",
      );
    total += w;
  }
  if (total <= 0)
    throw new Error(
      "weigh: every mark weighs zero, so the weighting portions out nothing and the swarm has no shape",
    );
  return weights.map((w) =>
    Math.max(floorRadius, Math.sqrt((area * w) / (Math.PI * total))),
  );
}

/**
 * THE LADDER, AND WHY IT IS A LADDER AND NOT A SOLVE.
 *
 * How much ink a weighting may spend is decided by whether the whole packed field still fits its
 * band — and whether it fits is a question only the beat's own packer can answer, since this file
 * has no opinion about collision. So the rungs are walked from generous to mean and the first one
 * that fits is taken, exactly as the static sibling's own ladder does. `fit` is the beat's packer:
 * it is handed the radii and returns the seats, or `null` for "this does not fit".
 *
 * Every rung failing is a refusal. It is never a clip, and never a per-mark re-scale — two
 * neighbours drawn at two scales mean different things, which is the one thing a field of marks may
 * not do.
 */
export function weighLadder(
  weights: number[],
  {
    frameArea,
    rungs,
    floorRadius,
    fit,
    what = "this weighting",
  }: {
    frameArea: number;
    rungs: number[];
    floorRadius: number;
    fit: (radii: number[]) => Map<string, WeighSeat> | null;
    what?: string;
  },
): { fraction: number; radii: number[]; seats: Map<string, WeighSeat> } {
  if (!Array.isArray(rungs) || rungs.length === 0)
    throw new Error("weigh: the ladder has no rungs");
  for (let i = 1; i < rungs.length; i += 1)
    if (!(rungs[i] < rungs[i - 1]))
      throw new Error(
        `weigh: the ladder's rungs must descend from generous to mean — ${rungs[i - 1]} is ` +
          `followed by ${rungs[i]}. A ladder walked in another order takes a rung that is not the ` +
          "most generous one that fits.",
      );
  for (const fraction of rungs) {
    const radii = weighRadii(weights, {
      area: frameArea * fraction,
      floorRadius,
    });
    const seats = fit(radii);
    if (seats) return { fraction, radii, seats };
  }
  throw new Error(
    `weigh: ${what} does not fit its band at any rung of the ladder (${rungs.join(", ")}). ` +
      "The field is not clipped and no mark is re-scaled on its own — a weighting the frame cannot " +
      "hold is one the beat must not offer.",
  );
}

/**
 * SPEARMAN'S RHO BETWEEN WHAT A MARK IS WORTH AND WHERE IT SITS.
 *
 * The rank correlation and not the linear one, deliberately: what would make a control decoration
 * is that the weight rises and falls WITH the axis, monotonically, whatever the shape of the
 * relation. Ties are averaged, so a weighting that gives every mark the same weight — the honest
 * "one mark, one unit" option — scores near zero rather than being undefined.
 */
export function weighRankCorrelation(
  values: number[],
  weights: number[],
): number {
  if (values.length !== weights.length)
    throw new Error(
      `weigh: ${values.length} values against ${weights.length} weights — they do not describe the same marks`,
    );
  const n = values.length;
  if (n < 2) return 0;
  const ranks = (xs: number[]): number[] => {
    const order = xs
      .map((x, i) => [x, i] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const out = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && order[j + 1][0] === order[i][0]) j += 1;
      const mean = (i + j) / 2 + 1;
      for (let k = i; k <= j; k += 1) out[order[k][1]] = mean;
      i = j + 1;
    }
    return out;
  };
  const rv = ranks(values);
  const rw = ranks(weights);
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const mv = mean(rv);
  const mw = mean(rw);
  let num = 0;
  let dv = 0;
  let dw = 0;
  for (let i = 0; i < n; i += 1) {
    num += (rv[i] - mv) * (rw[i] - mw);
    dv += (rv[i] - mv) ** 2;
    dw += (rw[i] - mw) ** 2;
  }
  if (dv === 0 || dw === 0) return 0;
  return num / Math.sqrt(dv * dw);
}

/** How much of a weighting's total weight is carried by marks drawn on the visibility floor — the
 *  one number that says whether the floor is a rounding or a lie. */
export function flooredWeightShare(
  weights: number[],
  radii: number[],
  floorRadius: number,
): { share: number; count: number } {
  const total = weights.reduce((s, w) => s + w, 0);
  let floored = 0;
  let count = 0;
  for (let i = 0; i < weights.length; i += 1)
    if (radii[i] <= floorRadius + 1e-9) {
      floored += weights[i];
      count += 1;
    }
  return { share: total > 0 ? floored / total : 0, count };
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn. `seats` is what the beat's own packer produced per option — what will actually be drawn
 * — so a weighting that slid a mark along the axis, dropped one, or came out identical to the
 * picture the page already ships is caught here rather than by a reader choosing it and looking at
 * the wreck.
 */
export function assertWeighDeclaration(
  declaration: WeighDeclaration,
  {
    marks,
    seats,
    radii,
    floorRadius,
    rhoCeiling,
    flooredWeightCeiling,
    movedFloor,
  }: {
    marks: WeighMark[];
    /** Per option slug: where every mark ended up. */
    seats: Map<string, Map<string, WeighSeat>>;
    /** Per option slug: what every mark's radius came out at. */
    radii: Map<string, number[]>;
    floorRadius: number;
    /** The largest rank correlation between a weighting and the axis this beat will accept. */
    rhoCeiling: number;
    /** The largest share of an option's weight that may sit on the visibility floor. */
    flooredWeightCeiling: number;
    /** The smallest fraction of the marks an option must re-seat or re-size to be a second picture. */
    movedFloor: number;
  },
): void {
  const where = "weigh declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no legend renders unnamed`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two weightings to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a weighing declares none.",
    );
  if (!Number.isFinite(declaration.floorRadius) || declaration.floorRadius <= 0)
    throw new Error(
      `${where}: \`floorRadius\` must be the beat's own visibility floor, a positive number of ` +
        `geometry units — got ${declaration.floorRadius}. It is what makes the distortion every ` +
        "weighting carries a measured quantity rather than an unstated one.",
    );
  if (declaration.floorRadius !== floorRadius)
    throw new Error(
      `${where}: the declaration's floor is ${declaration.floorRadius} and the marks were drawn ` +
        `against ${floorRadius}. Two floors means the share this file refuses on was measured ` +
        "against a picture the page does not ship.",
    );
  if (!Array.isArray(marks) || marks.length === 0)
    throw new Error(`${where}: the beat draws no marks`);
  const keys = marks.map((m) => m.key);
  if (new Set(keys).size !== keys.length)
    throw new Error(`${where}: the drawn marks are not unique`);
  const values = marks.map((m) => m.value);

  const defaultSlug = weighSlugOf(declaration.options[0].key);
  const seen = new Map<string, string>();

  declaration.options.forEach((option, index) => {
    const isDefault = index === 0;
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every option needs a label — got ${JSON.stringify(option)}`,
      );
    const slug = weighSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    if (typeof option.announce !== "string" || !option.announce.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`announce\` — a control whose ` +
          "answer is only a picture leaves a keyboard reader with nothing",
      );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ` +
          `${JSON.stringify(option.announce)}, which does not contain its own visible label — an ` +
          "accessible name that does not contain the visible one is the WCAG 2.5.3 failure, and a " +
          "reader speaking what they see cannot reach this option",
      );
    // THE DEFAULT IS NOT A COMPARISON, IT IS THE CLAIM. `filterNotes`, `stackNotes`, `levelNotes`
    // and `floorNotes` all hold the same line one option to the left.
    if (isDefault && typeof option.note === "string" && option.note.trim())
      throw new Error(
        `${where}: the default weighting ${JSON.stringify(option.label)} carries a note. The first ` +
          "option IS the picture the page ships in; a sentence revealed under it would be the " +
          "title said a second time, in a second place, to a reader who never chose anything.",
      );
    if (!isDefault && (typeof option.note !== "string" || !option.note.trim()))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`note\` — an argument the reader ` +
          "built that is only a picture cannot be checked, and a reader who is not looking at the " +
          "plot gets nothing at all",
      );

    if (
      !Array.isArray(option.weights) ||
      option.weights.length !== marks.length
    )
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} weighs ${option.weights?.length ?? 0} of ` +
          `${marks.length} drawn marks`,
      );
    if (!Number.isFinite(option.centre))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares no centre of mass — that is the ` +
          "reading this control hands back, and a control that hands back no number is a rearrangement",
      );

    // A WEIGHT THAT JUST REPEATS THE AXIS draws the same argument twice.
    const rho = weighRankCorrelation(values, option.weights);
    if (Math.abs(rho) > rhoCeiling)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} weighs the marks by something that ranks ` +
          `with the axis itself (Spearman rho ${rho.toFixed(4)}, ceiling ${rhoCeiling}). The swarm ` +
          "would be thick exactly where the axis already says it is, so the control draws the " +
          "picture's own argument a second time instead of a second argument.",
      );

    const mine = seats.get(slug);
    const myRadii = radii.get(slug);
    if (!mine || !myRadii)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} was never laid out — the declaration and ` +
          "the drawing do not describe the same page",
      );

    // A FLOOR THAT HIDES WEIGHT. The count is a distortion and is reported; the weight is the lie
    // and is refused on.
    const floored = flooredWeightShare(option.weights, myRadii, floorRadius);
    if (floored.share > flooredWeightCeiling)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} draws ${floored.count} of ${marks.length} ` +
          `marks on the visibility floor, and they carry ${(floored.share * 100).toFixed(2)} % of ` +
          `its weight (ceiling ${(flooredWeightCeiling * 100).toFixed(0)} %). A mark on the floor ` +
          "no longer draws what it weighs, so at that share the swarm's width is measuring the " +
          "floor rather than the quantity the option names.",
      );

    // A MARK THAT LEAVES, OR ARRIVES.
    if (mine.size !== marks.length)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} seats ${mine.size} of ${marks.length} ` +
          "marks. Nothing leaves a weighing — an option that drops a mark is a filter wearing this " +
          "vocabulary's chips.",
      );
    for (const mark of marks)
      if (!mine.has(mark.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} does not seat ` +
            `${JSON.stringify(mark.key)}`,
        );

    if (isDefault) return;

    // A MARK THAT MOVES ALONG THE MEASURED AXIS has lied about the one thing the picture measures.
    const base = seats.get(defaultSlug)!;
    for (const mark of marks) {
      const a = base.get(mark.key)!;
      const b = mine.get(mark.key)!;
      if (Math.abs(a.cx - b.cx) > 0.5)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} moves ${JSON.stringify(mark.key)} along ` +
            `the measured axis, from ${a.cx.toFixed(2)} to ${b.cx.toFixed(2)}. A packed field may ` +
            "push a mark ACROSS the axis to make room and never ALONG it: along it, the mark would " +
            "be drawn at a value it does not have.",
        );
    }

    // AN OPTION THAT IS THE DEFAULT UNDER A SECOND NAME, measured twice because one of the two can
    // be satisfied by accident: a picture that moved, and a reading that changed.
    let moved = 0;
    for (const mark of marks) {
      const a = base.get(mark.key)!;
      const b = mine.get(mark.key)!;
      if (Math.abs(a.cy - b.cy) > 0.5 || Math.abs(a.r - b.r) > 0.5) moved += 1;
    }
    if (moved / marks.length < movedFloor)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} re-seats or re-sizes ${moved} of ` +
          `${marks.length} marks (floor ${(movedFloor * 100).toFixed(0)} %) — the reader would ` +
          "operate this control while the swarm stands still",
      );
    const shift = Math.abs(option.centre - declaration.options[0].centre);
    if (shift <= 0.5)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} puts its centre of mass ` +
          `${shift.toFixed(3)} units from the default's. The whole reading this control hands back ` +
          "is where the middle of the swarm's weight lies; an option that leaves it where it was " +
          "renders the picture the page already ships. Do not offer it.",
      );
  });
}

/**
 * The options a component draws, in reading order: the default first, because that is the state the
 * beat renders in and the one a reader with no script never leaves.
 */
export function weighOptionsForMarkup(
  declaration: WeighDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  if (!declaration) return [];
  return declaration.options.map((option, index) => ({
    id: weighOptionId(idPrefix, weighSlugOf(option.key)),
    slug: weighSlugOf(option.key),
    label: option.label,
    announce: option.announce,
    isDefault: index === 0,
  }));
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the rule every sibling vocabulary holds.
 * The default option gets NO note, because it is not a comparison: it is the claim.
 */
export function weighNotesForMarkup(
  declaration: WeighDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options
    .slice(1)
    .map((option) => ({
      slug: weighSlugOf(option.key),
      text: option.note as string,
    }));
}

/** The attributes one option's whole plate carries, so `assertOneWeighing` can read it back. */
export function weighLayerAttrs(slug: string): { "data-weigh": string } {
  return { "data-weigh": slug };
}

/** The attributes one drawn mark carries inside a plate. Both, always — an element carrying the
 *  mark and not the view is the half-tagged datum `filter.ts` was written about. */
export function weighMarkAttrs(
  slug: string,
  key: string,
): { "data-weigh": string; "data-weigh-mark": string } {
  return { "data-weigh": slug, "data-weigh-mark": key };
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss` and `floorCss` do.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-weigh]` and
 * `${scope} [data-weigh="<slug>"]` score identically — an attribute selector with a value is still
 * one attribute selector — so which wins is source order and nothing else; the blanket is emitted
 * FIRST and the default plate after it. The same pair is emitted again inside each option's `:has()`
 * scope, where both score (1,3,0), and again blanket first. A sankey on this branch rendered green
 * with zero ribbons lit for getting exactly this backwards.
 *
 * NO SELECTOR HERE IS GROUPED. `stack.ts` records, at length, a defect where `A B, C` painted two
 * columns with the accent in every state of the page because a descendant prefix binds to the first
 * selector of a group only. One rule per selector costs a few hundred bytes and cannot do that.
 *
 * AND THE ONE THING THAT TRAVELS. The plates cut — see this file's header for why they must — so
 * the only property here with a transition is the centre-of-mass marker's `left`, on an element that
 * is ALWAYS rendered, which is the shape a transition needs (`display` does not interpolate). It is
 * also the one movement on the page whose reason a reader can see: the swarm's mass moved, and the
 * marker went with it.
 */
export function weighCss(
  declaration: WeighDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    width,
    centreMs,
  }: {
    scope: string;
    idPrefix: string;
    /** The plot's own width in geometry units — what a centre's `cx` is a fraction of. The marker
     *  lives in an HTML layer sharing the `<svg>`'s grid cell, so under `preserveAspectRatio="none"`
     *  the one conversion exact at every width is a percentage of that layer. */
    width: number;
    /** How long the centre of mass takes to reach its new value. Honoured only under
     *  `no-preference`. */
    centreMs: number;
  },
): string {
  if (!declaration) return "";
  if (!Number.isFinite(width) || width <= 0)
    throw new Error(
      `weigh: the plot width must be a positive number of geometry units, got ${width}`,
    );
  const round = (n: number) => Number(n.toFixed(3));
  const defaultSlug = weighSlugOf(declaration.options[0].key);
  const lines: string[] = [
    `/* The weighing this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-weigh-note] { display: none; }`,
    `${scope} svg.chart[data-weigh] { display: none; }`,
    `${scope} svg.chart[data-weigh="${defaultSlug}"] { display: block; }`,
    // The centre of mass in the DEFAULT state, generated here rather than written inline on the
    // element for the reason `floor.ts` states about its carried words: an inline `left` wins
    // against every rule below it, so the marker would never move and the reader would watch the
    // swarm's mass shift while its own marker sat still.
    `${scope} [data-weigh-centre] { left: ${round((declaration.options[0].centre / width) * 100)}%; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-weigh-centre] { transition: left ${centreMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  ];
  for (const option of declaration.options) {
    const slug = weighSlugOf(option.key);
    const at = `${scope}:has(#${weighOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} svg.chart[data-weigh] { display: none; }`,
      `${at} svg.chart[data-weigh="${slug}"] { display: block; }`,
      `${at} [data-weigh-centre] { left: ${round((option.centre / width) * 100)}%; }`,
    );
    if (option.note)
      lines.push(`${at} [data-weigh-note="${slug}"] { display: revert; }`);
  }
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place two of these refusals can be made.
 *
 * `filter.ts` earned the first: an element drawn from a datum that carries the mark and not the view
 * is a half-tagged datum, and its visible symptom is a label left over a picture it no longer
 * belongs to. `descend.ts` earned the second by mutation — dropping the stylesheet call left every
 * view drawn on top of every other, and every attribute-level check stayed green, because the
 * attributes were all still perfectly correct.
 */
export function assertOneWeighing(
  html: string,
  declaration: WeighDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const slugs = declaration.options.map((option) => weighSlugOf(option.key));
  const declared = new Set(slugs);

  // Every element carrying a mark carries a declared view.
  const tags =
    html.match(/<[a-zA-Z][^>]*\sdata-weigh-mark="[^"]*"[^>]*>/g) ?? [];
  if (tags.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-weigh-mark\`. The chips would be drawn over a ` +
        "picture they cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  for (const tag of tags) {
    const view = /\sdata-weigh="([^"]*)"/.exec(tag);
    const key = /\sdata-weigh-mark="([^"]*)"/.exec(tag);
    if (!view || !declared.has(view[1]))
      throw new Error(
        `${where}: the mark ${JSON.stringify(key?.[1] ?? "?")} is drawn with ` +
          `${view ? `data-weigh="${view[1]}"` : "no data-weigh"}, which is not one of the declared ` +
          `weightings (${slugs.join(", ")}). A half-tagged datum is drawn in every state at once.`,
      );
  }

  // Every declared view is drawn, and every declared view has a rule that can hide it.
  for (const slug of slugs) {
    if (!html.includes(`data-weigh="${slug}"`))
      throw new Error(
        `${where}: the weighting ${JSON.stringify(slug)} is declared and nothing on the page carries it`,
      );
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the weighting ${JSON.stringify(slug)}. ` +
          "A vocabulary a beat brings with it has to emit its own rules: without them every plate " +
          "is drawn on top of every other and every attribute is still perfectly correct.",
      );
  }
  const blanket = html.search(/svg\.chart\[data-weigh\]\s*\{\s*display:\s*none/);
  if (blanket < 0)
    throw new Error(
      `${where}: the stylesheet carries no blanket rule hiding the plates, so all ` +
        `${slugs.length} swarms are drawn at once. This is the rule that must be emitted FIRST, ` +
        "before the default plate's own — two attribute selectors score identically and source " +
        "order is the whole mechanism.",
    );
  // AND IT MUST COME FIRST, WHICH IS A SEPARATE FACT AND WAS FOUND BY MUTATING IT.
  //
  // Swapping the two base rules renders GREEN in Chrome, at `verify-web`'s 99 checks and under a
  // driven browser, and the reason is worth writing down: the DEFAULT option has its own
  // `:has(#…:checked)` block, scoring (1,3,0) against the base pair's (0,2,1), so in an engine with
  // `:has()` the base pair never decides anything. It decides everything in an engine WITHOUT it —
  // where the swap leaves `display: none` last and the page ships a beeswarm with no marks in it at
  // all. Neither the render path nor the verifier can see that: both are Chrome. So it is checked
  // here, as an ordering, which is the one form the defect actually takes.
  const first = html.search(
    new RegExp(`svg\\.chart\\[data-weigh="${defaultSlugOf(declaration)}"\\]\\s*\\{\\s*display:`),
  );
  if (first >= 0 && first < blanket)
    throw new Error(
      `${where}: the stylesheet reveals the default plate BEFORE the blanket rule that hides them ` +
        "all. Two attribute selectors score identically, so source order is the whole mechanism — " +
        "and an engine without `:has()`, which is the only engine the base pair ever decides " +
        "anything for, would be shown a swarm with no marks in it.",
    );
}

/** The slug of the option a page ships in — the first declared. */
function defaultSlugOf(declaration: WeighDeclaration): string {
  return weighSlugOf(declaration.options[0].key);
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a weighting.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function weighChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "weigh",
    notes: { reserve: "3em" },
  });
}
