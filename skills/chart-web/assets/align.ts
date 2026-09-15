// twin/skills/chart-web/assets/align.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT OF A SUM. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image, `follow.ts` what may be followed through
// its ORDERED STEPS. `hold.ts` says which factor of a product may be HELD STILL. `descend.ts` says
// what may BECOME THE WHOLE. `floor.ts` says what the picture may STAND ON. `cutoff.ts` says where
// the claim's own line is drawn. `reorder.ts` says what the same numbers look like somewhere else
// in a cycle. `datum.ts` says what the picture may be MEASURED FROM. `aim.ts` says where a
// displacement POINTS. `weigh.ts` says what a mark is WORTH. `benchmark.ts` says what each row is
// JUDGED AGAINST. `count.ts` says which of a shape's terms are COUNTED IN IT. This file says
// **WHAT EVERY INTERVAL IS LINED UP ON** — where each mark's own zero is put on one shared axis, so
// that a calendar and a stopwatch can be the same picture in turn. All of them are native radio
// inputs plus CSS generated at build time (`:checked` and `:has()` on the enclosing figure, no
// listener, no state, not one byte of JavaScript), because that is the only kind of control this
// format can promise still works with the script absent.
//
// WHERE IT COMES FROM, AND IT IS A PROPERTY ONLY ONE TYPE IN THIS CATALOGUE HAS: ITS MARK IS AN
// INTERVAL.
//
// A bar has a length. A dot has a position. An interval has BOTH, and they are readings of two
// different quantities: where it sits says WHEN, how long it runs says HOW LONG. One horizontal axis
// carries them at the same time and can only do so by spending its ORIGIN — the zero is one shared
// date for every row, so a mark's left edge is a date and its length is a duration measured from
// that date.
//
// That spend is what makes a gantt's own three questions mutually exclusive on one plate:
//
//   - *who was there at the same time* needs a shared CALENDAR, and gets one;
//   - *who lasted longest* needs a shared STOPWATCH — sixteen lengths from one common edge — and a
//     calendar cannot give it, because the lengths begin in sixteen different places;
//   - *who was there in a given year* is the first question read vertically, and costs nothing.
//
// `chart-beat/references/types/gantt.md` states the consequence as the type's subtler failure:
// *"because a Gantt bar's length reads exactly like a plain bar's length at first glance, a reader
// with no stated caption explaining that length here means DURATION, not magnitude, can walk away
// having silently misread every bar."* A still can do exactly one thing about that: pick the
// calendar, print the caption, ask to be trusted. This file is the other answer — hand the reader
// the origin, and let the same sixteen intervals be a calendar and then a stopwatch, on one scale,
// with the axis's own words changing in the same breath so the furniture never lies about which one
// it currently is.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN THE THREE IT LOOKS LIKE.
//
// `datum.ts` is the near miss, and the distinction is exact in two places. A datum subtracts ONE
// LEVEL, THE SAME FOR EVERY MARK — its whole shape is one `value` per key per option, and every one
// of its refusals is about the SIGN that subtraction produces. An alignment subtracts A DIFFERENT
// NUMBER FROM EVERY ROW, and the number is a property of the row itself. And the two do opposite
// things to a mark: a datum changes a bar's LENGTH and leaves its origin nailed to the rule; an
// alignment changes a bar's ORIGIN and may never change its length, because a length here IS a
// duration and a duration is a fact about the world. `assertAlignDeclaration` enforces that by
// shape: lengths are declared once, on the bars, and an option may only say where each one starts.
//
// `stack.ts` is the second. A `StackedColumn { key, dx, dy }` is one rigid displacement per MEMBER,
// which is right for moving a whole mark — but a row of a gantt is not one mark. An interrupted row
// is several intervals, and the interesting option here moves THE SECOND SPAN OF A ROW AND NOT THE
// FIRST, by the size of that row's own gap. One displacement per member cannot express that.
//
// `filter.ts` removes marks and nothing leaves here: all the rows are drawn in all the states, which
// is the point — a reader who narrowed to the long ones would have answered the question by
// assuming it. `brush.ts` selects a span OF the axis; this control changes what the axis MEANS.
// `level.ts` lays a reference across a frame that stays, and emits no transform at all. `cutoff.ts`
// draws the claim's own line, which on a "top ten" is a real temptation — but changing the depth of
// the top MANUFACTURES AND DESTROYS ROWS, which is a filter's job and a different beat's argument.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     align: {
//       label: "Aligner les barres sur",         // the <legend> — the beat's own words
//       noneLabel: "le calendrier",              // the untouched option. Always first, always the
//                                                // default, and it IS the picture the page ships.
//       noneAnnounce: "…",                       // must contain `noneLabel`
//       noneNote: "…",                           // what a LENGTH means in the default state. This
//                                                // file requires one where four siblings forbid it
//                                                // — see `alignNotesForMarkup`.
//       noneTicks: ["1990", "1995", …],          // one word per graduation, in `tickAt` order
//       extent: 35,                              // the axis's full span in the data's own units
//       tickAt: [0, 5, 10, …],                   // where the graduations sit. They NEVER move.
//       bars: [{ key: "KOR-2", row: "KOR", length: 25 }, …],   // lengths, declared ONCE
//       base: [{ key: "KOR-2", at: 10 }, …],     // the default picture's left edges
//       options: [
//         {
//           key: "entry",
//           label: "leur propre entrée",
//           announce: "…leur propre entrée…",    // must contain `label`
//           note: "…",                           // revealed under the pills
//           ticks: ["0", "5", "10", …],          // this state's own words for the SAME graduations
//           places: [{ key: "KOR-2", at: 4 }, …],// EVERY declared bar, no others
//         },
//         …
//       ],
//     }
//
// POSITIONS AND LENGTHS ARE IN THE DATA'S OWN UNITS — years here — never in geometry units and never
// in CSS pixels. This file owns the one conversion, from `extent` and the frame's width, for the
// reason `stack.ts`, `level.ts` and `datum.ts` all give about `preserveAspectRatio="none"`: a viewBox
// unit is a different number of reader pixels at every width, so a length computed in pixels at
// build time is wrong at every width but one.

/** One interval the beat draws. A row with an interruption declares several, all naming that row. */
export type AlignBar = {
  /** Stable id for this SPAN — not for its row. Slugged into every generated selector. */
  key: string;
  /** The row this span belongs to. Several spans may share one; the value labels and the pointer
   *  both resolve on the ROW, which is the one coordinate no option moves. */
  row: string;
  /** How long this span is, in the axis's own data units. Declared ONCE and true in every state:
   *  this control moves an interval, it never stretches one. */
  length: number;
};

/** Where one span's left edge sits under one state, in the axis's own data units. */
export type AlignPlace = { key: string; at: number };

/** One origin a reader may line every interval up on. */
export type AlignOption = {
  /** Stable id for the radio and every generated selector. Slugged; must not slug to "none". */
  key: string;
  /** The pill's words. */
  label: string;
  /** What a screen reader hears. Must CONTAIN `label` — WCAG 2.5.3. */
  announce: string;
  /** What a LENGTH means under this origin. Not decoration: the type sheet calls the time-axis
   *  caption load-bearing, and under an origin that is not the calendar the plate LOOKS like a plain
   *  bar chart, which is the exact misreading the sheet warns about. */
  note: string;
  /** This state's own word for each graduation, in `tickAt` order. */
  ticks: string[];
  /** Every declared span's left edge under this origin. Exactly the declared set. */
  places: AlignPlace[];
};

export type AlignDeclaration = {
  label: string;
  noneLabel: string;
  noneAnnounce: string;
  noneNote: string;
  noneTicks: string[];
  /** The axis's full span in data units, HELD CONSTANT for every option — one unit of length is one
   *  unit of the quantity in every state, which is the whole difference between an alignment and a
   *  rescale, and what makes the states comparable to each other. */
  extent: number;
  /** Where the graduations sit, in data units. They never move; only their words change. */
  tickAt: number[];
  bars: AlignBar[];
  /** The default picture's left edges — the state a reader with no script never leaves. */
  base: AlignPlace[];
  options: AlignOption[];
};

/** The reserved slug of the untouched option. */
export const ALIGN_NONE_SLUG = "none";

/** Lowercase, hyphenated, ASCII — the same slugging every file in this family does, so a key with a
 *  space or an accent in it cannot become two different ids in the markup and the stylesheet. */
export function alignSlugOf(key: string): string {
  return String(key)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function alignOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}${slug}`;
}

/** Every state of the page in reading order — the untouched one first, because that is the state the
 *  beat renders in and the one a reader with no script never leaves. */
export function alignStates(
  declaration: AlignDeclaration | null | undefined,
): { slug: string; places: AlignPlace[]; ticks: string[] }[] {
  if (!declaration) return [];
  return [
    { slug: ALIGN_NONE_SLUG, places: declaration.base, ticks: declaration.noneTicks },
    ...declaration.options.map((option) => ({
      slug: alignSlugOf(option.key),
      places: option.places,
      ticks: option.ticks,
    })),
  ];
}

export function alignOptionsForMarkup(
  declaration: AlignDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: alignOptionId(idPrefix, ALIGN_NONE_SLUG),
      slug: ALIGN_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneAnnounce,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: alignOptionId(idPrefix, alignSlugOf(option.key)),
      slug: alignSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * WHAT A LENGTH MEANS, PER STATE — AND THIS FILE REQUIRES ONE FOR THE DEFAULT, WHERE `filter.ts`,
 * `stack.ts`, `level.ts` AND `floor.ts` ALL FORBID IT.
 *
 * Their reasoning is sound for them and does not transfer: there the untouched option is the ABSENCE
 * of the gesture, so a sentence about it would be a caption on a non-event. Here the untouched
 * option is an ORIGIN somebody chose — the calendar is as chosen as the stopwatch — and it is the
 * one the reader is standing in when they arrive. `types/gantt.md` puts it stronger than a
 * preference: the caption saying that a length here is a DURATION and not a magnitude "is not
 * optional furniture, it's load-bearing for correct reading". A control that changes what the origin
 * is and let the default say nothing would have removed the one caption the type cannot do without.
 */
export function alignNotesForMarkup(
  declaration: AlignDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return [
    { slug: ALIGN_NONE_SLUG, text: declaration.noneNote },
    ...declaration.options.map((option) => ({ slug: alignSlugOf(option.key), text: option.note })),
  ];
}

/**
 * THE GRADUATIONS, AND THE WORDS EACH STATE GIVES THEM.
 *
 * One entry per graduation, carrying its fixed position and every state's word for it. The beat
 * draws them all, stacked at the same place, and the stylesheet crossfades between them — so the
 * graduation itself never moves and only its meaning does. That is the arrangement the owner's first
 * ruling asks for on an axis whose unit changes: a number that CHANGES in place reads as a
 * relabelling; a number that SLIDES reads as a bug.
 */
export function alignTicksForMarkup(
  declaration: AlignDeclaration | null | undefined,
): { at: number; words: { slug: string; text: string }[] }[] {
  if (!declaration) return [];
  const states = alignStates(declaration);
  return declaration.tickAt.map((at, i) => ({
    at,
    words: states.map((state) => ({ slug: state.slug, text: state.ticks[i] })),
  }));
}

/**
 * WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
 *
 * Handed the frame it draws in and the smallest length the narrowest verified viewport can resolve —
 * the same discipline `assertFilterDeclaration`, `assertStackDeclaration`, `assertDatumDeclaration`
 * and `assertFloorDeclaration` hold: a control that promises more than the plate can show is refused
 * before anything is rendered.
 */
export function assertAlignDeclaration(
  declaration: AlignDeclaration,
  {
    width,
    unitsPerCssPx,
  }: {
    /** The frame's full width in geometry units — `extent` maps onto it. */
    width: number;
    /** How many geometry units one CSS pixel is worth at the NARROWEST width this format is verified
     *  at. MEASURED in a real browser and carried here; it is what makes "the reader cannot tell
     *  these two options apart" arithmetic rather than a matter of taste. */
    unitsPerCssPx: number;
  },
): void {
  const where = "align declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  for (const field of ["label", "noneLabel", "noneAnnounce", "noneNote"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — an origin with no ${field} is a zero ` +
          "the reader is asked to take on trust, which is the thing this control exists to stop",
      );
  if (!declaration.noneAnnounce.includes(declaration.noneLabel))
    throw new Error(
      `${where}: the default option announces ${JSON.stringify(declaration.noneAnnounce)}, which does ` +
        `not contain its visible label ${JSON.stringify(declaration.noneLabel)} — WCAG 2.5.3`,
    );
  if (!Number.isFinite(declaration.extent) || declaration.extent <= 0)
    throw new Error(`${where}: \`extent\` must be a positive number of data units, got ${declaration.extent}`);
  if (!Number.isFinite(width) || width <= 0)
    throw new Error(`${where}: the frame width must be a positive number of geometry units, got ${width}`);
  if (!Number.isFinite(unitsPerCssPx) || unitsPerCssPx <= 0)
    throw new Error(
      `${where}: \`unitsPerCssPx\` must be a measured positive number — it is the floor the ` +
        "indistinguishable-option refusal below is made with, and a floor nobody measured is no floor",
    );
  if (!Array.isArray(declaration.tickAt) || declaration.tickAt.length === 0)
    throw new Error(`${where}: an axis whose meaning changes needs graduations to change the meaning of`);
  for (const at of declaration.tickAt)
    if (!Number.isFinite(at) || at < -1e-9 || at > declaration.extent + 1e-9)
      throw new Error(`${where}: a graduation at ${at} is outside the ${declaration.extent} this axis spans`);
  if (!Array.isArray(declaration.options) || declaration.options.length < 1)
    throw new Error(
      `${where}: needs at least one origin beside the default to be a choice, got ` +
        `${declaration.options?.length ?? 0}. A beat with one origin declares no alignment.`,
    );

  // THE BARS. Lengths live here and nowhere else, which is what makes "an option may move an
  // interval but never stretch one" a property of the SHAPE rather than a rule somebody remembers.
  if (!Array.isArray(declaration.bars) || declaration.bars.length === 0)
    throw new Error(`${where}: no bars — an alignment with nothing to line up is not a control`);
  const lengthOf = new Map<string, number>();
  const rowOf = new Map<string, string>();
  for (const bar of declaration.bars) {
    if (!bar || typeof bar.key !== "string" || !bar.key.trim())
      throw new Error(`${where}: a bar with no key — ${JSON.stringify(bar)}`);
    if (typeof bar.row !== "string" || !bar.row.trim())
      throw new Error(
        `${where}: bar ${JSON.stringify(bar.key)} names no row. Every interval belongs to one, and ` +
          "the row is what the pointer resolves on and what the value label rides.",
      );
    if (lengthOf.has(bar.key))
      throw new Error(`${where}: two bars share the key ${JSON.stringify(bar.key)} — one rule would drive both`);
    // THE TYPE SHEET'S LITERAL FAILURE MODE. `types/gantt.md`: "every bar's end has to fall on or
    // after its own start — an inverted span isn't a stylistic oddity, it's a broken date pair that
    // shouldn't render at all rather than draw backwards or silently clamp".
    if (!Number.isFinite(bar.length) || bar.length <= 0)
      throw new Error(
        `${where}: bar ${JSON.stringify(bar.key)} has length ${bar.length}. An interval whose end does ` +
          "not fall after its own start is a broken pair of dates, and it should not render at all " +
          "rather than draw backwards.",
      );
    lengthOf.set(bar.key, bar.length);
    rowOf.set(bar.key, bar.row);
  }

  const states = [
    { name: JSON.stringify(declaration.noneLabel), slug: ALIGN_NONE_SLUG, places: declaration.base, ticks: declaration.noneTicks },
    ...declaration.options.map((option) => ({
      name: JSON.stringify(option?.label ?? "(unnamed)"),
      slug: alignSlugOf(option?.key ?? ""),
      places: option?.places,
      ticks: option?.ticks,
    })),
  ];

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(`${where}: every option needs a label — got ${JSON.stringify(option)}`);
    const slug = alignSlugOf(option.key);
    if (!slug)
      throw new Error(`${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`);
    if (slug === ALIGN_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${ALIGN_NONE_SLUG}", the reserved id ` +
          "of the untouched option — rename it",
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug to ` +
          `${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);
    for (const field of ["announce", "note"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} has no \`${field}\` — an origin whose answer ` +
            "is only a picture leaves a keyboard reader with nothing, and one with no note takes away " +
            "the caption this type is not allowed to do without",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain the " +
          "visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot reach it",
      );
  }

  const byState = new Map<string, Map<string, number>>();
  for (const state of states) {
    if (!Array.isArray(state.ticks) || state.ticks.length !== declaration.tickAt.length)
      throw new Error(
        `${where}: option ${state.name} gives ${state.ticks?.length ?? 0} words for ` +
          `${declaration.tickAt.length} graduations. One word per graduation, or the axis prints a ` +
          "number belonging to a different origin.",
      );
    for (const word of state.ticks)
      if (typeof word !== "string" || !word.trim())
        throw new Error(`${where}: option ${state.name} leaves a graduation with no word`);
    if (!Array.isArray(state.places))
      throw new Error(`${where}: option ${state.name} places nothing`);

    const mine = new Map<string, number>();
    for (const entry of state.places) {
      if (!entry || typeof entry.key !== "string" || !Number.isFinite(entry.at))
        throw new Error(`${where}: option ${state.name} carries a placement with no key or no position — ${JSON.stringify(entry)}`);
      if (!lengthOf.has(entry.key))
        throw new Error(
          `${where}: option ${state.name} places ${JSON.stringify(entry.key)}, which the beat does not ` +
            "draw — the reader would be shown an interval computed for a bar that is not on the plate",
        );
      if (mine.has(entry.key))
        throw new Error(
          `${where}: option ${state.name} places ${JSON.stringify(entry.key)} twice — one interval cannot ` +
            "start in two places at once",
        );
      mine.set(entry.key, entry.at);
    }
    for (const key of lengthOf.keys())
      if (!mine.has(key))
        throw new Error(
          `${where}: option ${state.name} has no place for ${JSON.stringify(key)}. A bar this option ` +
            "cannot place does not disappear — it keeps the place the previous origin gave it, which " +
            "is an interval measured from a zero that is no longer on the page.",
        );

    // A MARK PAST THE EDGE IS HALF A READING. `extent` is one number for every state on purpose, so
    // this is also what refuses an origin the declared frame was never sized for.
    for (const [key, at] of mine) {
      const end = at + lengthOf.get(key)!;
      if (at < -1e-9 || end > declaration.extent + 1e-9)
        throw new Error(
          `${where}: option ${state.name} puts ${JSON.stringify(key)} at ${at.toFixed(3)}…${end.toFixed(3)}, ` +
            `outside the 0…${declaration.extent} this frame draws — the bar would run out of the ` +
            "picture and a reader would read a length that stops at the edge as the duration",
        );
    }

    // THE REFUSAL NO SIBLING VOCABULARY CAN MAKE, BECAUSE NO OTHER ONE KNOWS THAT A ROW'S MARKS ARE
    // DISJOINT INTERVALS IN TIME. Two spans of one row are two separate periods; an origin that
    // closed a gap by too much, or that re-placed two spans out of order, would draw one subject as
    // present twice at the same moment — which is the one thing a gantt exists to deny. It is the
    // type sheet's inverted-span failure reaching the only place this format can still reach it.
    const byRow = new Map<string, { key: string; at: number; end: number }[]>();
    for (const [key, at] of mine) {
      const row = rowOf.get(key)!;
      if (!byRow.has(row)) byRow.set(row, []);
      byRow.get(row)!.push({ key, at, end: at + lengthOf.get(key)! });
    }
    for (const [row, spans] of byRow) {
      spans.sort((a, b) => a.at - b.at);
      for (let i = 1; i < spans.length; i += 1)
        if (spans[i].at < spans[i - 1].end - 1e-9)
          throw new Error(
            `${where}: option ${state.name} puts ${JSON.stringify(spans[i - 1].key)} at ` +
              `${spans[i - 1].at.toFixed(3)}…${spans[i - 1].end.toFixed(3)} and ` +
              `${JSON.stringify(spans[i].key)} at ${spans[i].at.toFixed(3)}…${spans[i].end.toFixed(3)} — ` +
              `two intervals of row ${JSON.stringify(row)} overlap. A row's spans are separate periods; ` +
              "an origin that lays them on top of each other draws one subject present twice at once.",
          );
    }
    byState.set(state.slug, mine);
  }

  // TWO PILLS, ONE PICTURE. `directed-interaction.md` refuses a control whose resulting state equals
  // the default; on this control the refusal is arithmetic and it is wider than that rule, because
  // two OPTIONS that draw the same picture are the same defect as an option that draws the default.
  // The floor is the smallest length the narrowest verified viewport can resolve, measured rather
  // than typed: under it, the reader operates the control and every bar stays where it was.
  const perUnit = width / declaration.extent;
  const keys = [...lengthOf.keys()];
  const slugs = [...byState.keys()];
  for (let i = 0; i < slugs.length; i += 1)
    for (let j = i + 1; j < slugs.length; j += 1) {
      const a = byState.get(slugs[i])!;
      const b = byState.get(slugs[j])!;
      let worst = 0;
      for (const key of keys) worst = Math.max(worst, Math.abs(a.get(key)! - b.get(key)!));
      const units = worst * perUnit;
      if (units < unitsPerCssPx)
        throw new Error(
          `${where}: ${states.find((s) => s.slug === slugs[i])!.name} and ` +
            `${states.find((s) => s.slug === slugs[j])!.name} nowhere differ by more than ` +
            `${units.toFixed(3)} geometry units (${worst.toFixed(4)} data units), under the ` +
            `${unitsPerCssPx.toFixed(3)} one CSS pixel is worth at the narrowest verified width. ` +
            "The reader would operate the control and watch the picture not move.",
        );
    }

  // AND THE ONE REFUSAL THAT IS THE GESTURE ITSELF: AN ORIGIN THAT MOVES THE MARKS AND KEEPS THE
  // AXIS'S WORDS. If every interval is measured from its own entry and the graduations still read
  // 1995, the furniture is lying, and it is lying fluently — the reader has no way to tell, because
  // a gantt's graduations look the same whether they are dates or elapsed counts. No sibling can
  // make this refusal: none of them changes what an axis MEANS.
  const base = byState.get(ALIGN_NONE_SLUG)!;
  for (const option of declaration.options) {
    const slug = alignSlugOf(option.key);
    const mine = byState.get(slug)!;
    const moved = keys.filter((key) => Math.abs(base.get(key)! - mine.get(key)!) * perUnit >= unitsPerCssPx);
    if (moved.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} leaves all ${keys.length} intervals where the ` +
          "default put them. The question this control asks is what the picture is lined up on; an " +
          "origin that lines nothing up differently answers it with the plate again.",
      );
    const sameWords = option.ticks.every((word, i) => word === declaration.noneTicks[i]);
    if (sameWords)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} moves ${moved.length} of ${keys.length} ` +
          "intervals and keeps every one of the default's graduation words. A bar measured from its " +
          `own origin under an axis still reading ${JSON.stringify(declaration.noneTicks[0])} is ` +
          "furniture that lies about what it graduates, and nothing on the plate would show it.",
      );
  }
}

/**
 * THE SECOND HALF OF THE COUTURE, AND IT IS THE ONE `level.ts` EARNED BY DECLINING TO EMIT A
 * TRANSFORM AT ALL.
 *
 * This file DOES move marks, so the beat using it must anchor its readings on coordinates no option
 * touches, or `interaction.mjs` — which reads `cx`/`cy` once at init — will answer a pointer with
 * whichever mark's slot the pointer landed in. That is not a near miss; it is a confident wrong
 * answer, and `stack.ts`, `floor.ts` and `datum.ts` all record paying for it.
 *
 * On a gantt the safe coordinate exists and is free: the ROW. Every option moves marks along x and
 * none of them moves a row, so with every reading's `cx` equal the x term is the same for every
 * candidate and `nearestCell` reduces to "which row" — which is exactly how a reader means a gantt
 * anyway, since a row owns its whole horizontal band.
 */
export function assertAlignRest(cxs: number[], { where = "align readings" }: { where?: string } = {}): void {
  if (!Array.isArray(cxs) || cxs.length === 0)
    throw new Error(`${where}: a beat that moves its marks must still ship readings to point at`);
  const first = cxs[0];
  for (const cx of cxs) {
    if (!Number.isFinite(cx))
      throw new Error(`${where}: a reading with no x — ${JSON.stringify(cx)}`);
    if (Math.abs(cx - first) > 1e-9)
      throw new Error(
        `${where}: the readings sit at different x (${first} and ${cx}). This control moves every ` +
          "interval, and `interaction.mjs` resolves a pointer off the `cx` it read at init — so a " +
          "reading placed on a mark that moves answers for the place that mark used to occupy. " +
          "Put every reading at one x, which makes the resolution the row and nothing else.",
      );
  }
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-align-tick]` and
 * `${scope} [data-align-tick="none"]` score identically, so which wins is source order and nothing
 * else; every blanket is emitted FIRST and the state's own rule after it, inside each scope. A
 * sankey on this branch rendered green with zero ribbons lit for getting exactly this backwards.
 *
 * AND NOT ONE RULE INSIDE AN OPTION'S SCOPE SETS `fill`. An option's rules set `transform`, `left`,
 * `opacity`/`visibility` and `display` only, because `${scope}:has(#id:checked) [data-align-bar="X"]`
 * weighs (1,3,0) and would silently beat the format's own `.mark-active { fill: … }` at (0,1,0) —
 * the reader would point at a bar and nothing would answer. The paint is done once, at low
 * specificity, off custom properties, and the beat raises `.mark-active` above it.
 *
 * NOTHING IS REVEALED BY `display` EXCEPT THE SENTENCE UNDER THE PILLS. The owner's fourth ruling:
 * a state change interpolates rather than jumps, and `display` cannot be transitioned. Every bar is
 * rendered in every state and travels on `transform`; every graduation word is rendered in every
 * state and crossfades on `opacity`, paired with `visibility` so the words nobody is reading leave
 * the accessibility tree rather than being narrated seven times over.
 */
export function alignCss(
  declaration: AlignDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    width,
    labelOffsetPx,
    tipInsetUnitsOf,
    labelUnitsOf,
    moveMs,
    fadeMs,
    paint,
  }: {
    scope: string;
    idPrefix: string;
    /** The frame's full width in geometry units. `extent` maps onto it. */
    width: number;
    /** How far a value label sits outside its row's right-hand tip, in CSS pixels. */
    labelOffsetPx: number;
    /** How far back from the tip an INWARD label is pulled, in GEOMETRY UNITS — a figure drawn on
     *  its own bar must not cover the notation at that bar's end. Geometry units and not CSS pixels
     *  because what it has to clear is drawn in geometry units and therefore stretches with the plot:
     *  a fixed pixel inset is right at one width and wrong at every other. Zero for a row whose end
     *  carries no notation. */
    tipInsetUnitsOf: (row: string) => number;
    /** How much room a value label needs, in GEOMETRY UNITS, measured at the NARROWEST width this
     *  format is verified at. A label that does not fit outside its tip is drawn INSIDE, on the
     *  ground chip `.end-label` already carries. The narrowest width is the worst case for type at a
     *  fixed size over a plot that stretches, so a label that fits there fits everywhere. */
    labelUnitsOf: (row: string) => number;
    /** How long an interval takes to reach its new place. Honoured only under `no-preference` — the
     *  whole transition lives inside the query rather than being overridden back, so under `reduce`
     *  there is no transition to resolve at all. */
    moveMs: number;
    /** How long the axis takes to change its words. */
    fadeMs: number;
    /** What a row is painted with, and what it becomes under a pointer. The beat owns both colours
     *  and measures both against the ground it really paints; this file never names one. */
    paint: (row: string) => { bar: string; active: string };
  },
): string {
  if (!declaration) return "";
  const round = (n: number) => Number(n.toFixed(3));
  const perUnit = width / declaration.extent;
  const lengthOf = new Map(declaration.bars.map((bar) => [bar.key, bar.length]));
  const rowOf = new Map(declaration.bars.map((bar) => [bar.key, bar.row]));
  const rows = [...new Set(declaration.bars.map((bar) => bar.row))];

  const lines: string[] = [
    `/* The alignment this beat declared: ${declaration.options.length + 1} origins over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    // The intervals. `transform-box`/`transform-origin` are stated rather than inherited: the initial
    // origin of an SVG transform is the centre of the reference box in some engines and the view-box
    // origin in others, and a translate about the wrong origin is still wrong when the box changes.
    `${scope} [data-align-bar] { transform-box: view-box; transform-origin: 0 0; fill: var(--bar); }`,
    // The graduations' words: every state's set is drawn, one is shown. `visibility` rides with
    // `opacity` so the six-sevenths nobody is reading are out of the accessibility tree too.
    `${scope} [data-align-tick] { opacity: 0; visibility: hidden; }`,
    `${scope} [data-align-note] { display: none; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-align-bar] { transition: transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-align-value] { transition: left ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-align-tick] { transition: opacity ${fadeMs}ms ease, visibility ${fadeMs}ms ease; }`,
    `}`,
  ];

  // THE PAINT, ONCE, AT LOW SPECIFICITY — see the header. One rule per interval rather than per row,
  // because the selector the transform uses is the interval's and keeping both on the same element
  // is what lets a row with a gap answer a pointer as one thing.
  for (const bar of declaration.bars) {
    const { bar: fill, active } = paint(bar.row);
    lines.push(`${scope} [data-align-bar="${bar.key}"] { --bar: ${fill}; --mark-active: ${active}; }`);
  }

  const place = (at: string, slug: string, places: AlignPlace[]) => {
    const tipOf = new Map<string, number>();
    for (const p of places) {
      const row = rowOf.get(p.key)!;
      const end = p.at + lengthOf.get(p.key)!;
      if (!tipOf.has(row) || end > tipOf.get(row)!) tipOf.set(row, end);
      lines.push(`${at} [data-align-bar="${p.key}"] { transform: translateX(${round(p.at * perUnit)}px); }`);
    }
    // The figure rides its own row's right-hand tip, which is the ONE movement of text this control
    // allows itself — `datum.ts` allows the same one for the same reason, and the type sheet asks
    // for it by name. It turns INWARD where there is no room outside, onto the ground chip
    // `.end-label` already carries, rather than running off the frame or into the row gutter.
    //
    // AND AN INWARD FIGURE IS ANCHORED IN GEOMETRY, NOT IN PIXELS. Read in the first capture: the
    // outward offset, reused for the inward case, left a six-pixel stub of bar showing past the
    // chip's right edge on every row that turned in — a sliver with no meaning, which is exactly
    // what a reader reports as a rendering fault. An inward chip ends where the tip ends, minus
    // whatever notation that row's end carries, and both of those are lengths in the plane.
    for (const row of rows) {
      const tipUnits = tipOf.get(row) ?? 0;
      const tip = tipUnits * perUnit;
      const room = labelUnitsOf(row);
      const outward = tip + room <= width;
      const anchor = outward ? tip : Math.max(0, tip - tipInsetUnitsOf(row));
      lines.push(
        `${at} [data-align-value="${row}"] { left: ${round((anchor / width) * 100)}%; transform: ` +
          (outward
            ? `translate(0, -50%) translateX(${round(labelOffsetPx)}px); }`
            : `translate(-100%, -50%); }`),
      );
    }
    lines.push(`${at} [data-align-tick] { opacity: 0; visibility: hidden; }`);
    lines.push(`${at} [data-align-tick="${slug}"] { opacity: 1; visibility: visible; }`);
    lines.push(`${at} [data-align-note] { display: none; }`);
    lines.push(`${at} [data-align-note="${slug}"] { display: revert; }`);
  };

  place(scope, ALIGN_NONE_SLUG, declaration.base);
  for (const option of declaration.options) {
    const slug = alignSlugOf(option.key);
    place(`${scope}:has(#${alignOptionId(idPrefix, slug)}:checked)`, slug, option.places);
  }
  return lines.join("\n");
}

/**
 * THE VOCABULARY CHECKS ITS OWN RULES REACHED THE PAGE, AND THIS EXISTS BECAUSE A MUTATION WENT
 * GREEN WITHOUT IT ELSEWHERE.
 *
 * `aim.ts` records it: deleting its stylesheet from the beat shipped sixteen arrows collapsed into
 * the corner of the viewBox, and every guard in the chain stayed silent — an SVG element with no
 * transform is drawn where its own coordinates put it, and every coordinate that vocabulary owned
 * lived in the stylesheet. The same hole is open here and it is worse: every interval on this plate
 * is drawn at x=0 and placed ONLY by a generated `translateX`, so a missing stylesheet is sixteen
 * rows stacked flush on the left margin, all three states at once, and nothing else on the page
 * would look wrong. `descend.ts` names the same defect. The fix is the same: a vocabulary a beat
 * brings with it has to check its own rules against the text it actually emitted.
 */
export function assertAlignStylesheet(
  css: string,
  declaration: AlignDeclaration,
  { scope, idPrefix }: { scope: string; idPrefix: string },
): void {
  const where = "align stylesheet";
  if (typeof css !== "string" || !css.trim())
    throw new Error(`${where}: nothing was emitted — every interval on this plate is placed by a generated rule`);
  if (!css.includes(`${scope} [data-align-bar] { transform-box: view-box; transform-origin: 0 0;`))
    throw new Error(
      `${where}: the transform box and origin are not stated. An SVG transform's initial origin is ` +
        "the centre of the reference box in some engines, so every interval would be placed from a " +
        "point that depends on the browser",
    );
  for (const marker of ["[data-align-tick] { opacity: 0", "[data-align-note] { display: none"])
    if (!css.includes(marker))
      throw new Error(`${where}: the blanket \`${marker}…\` is missing — every state's words would print at once`);
  const states = alignStates(declaration);
  for (const bar of declaration.bars) {
    if (!css.includes(`${scope} [data-align-bar="${bar.key}"] { --bar:`))
      throw new Error(`${where}: interval ${JSON.stringify(bar.key)} is never painted`);
    for (const state of states) {
      const at = state.slug === ALIGN_NONE_SLUG ? scope : `${scope}:has(#${alignOptionId(idPrefix, state.slug)}:checked)`;
      if (!css.includes(`${at} [data-align-bar="${bar.key}"] { transform: translateX(`))
        throw new Error(
          `${where}: interval ${JSON.stringify(bar.key)} has no place under state ` +
            `${JSON.stringify(state.slug)} — it would be drawn at the frame's own zero, which on this ` +
            "plate is the year the record opens for every row at once",
        );
    }
  }
  for (const state of states) {
    const at = state.slug === ALIGN_NONE_SLUG ? scope : `${scope}:has(#${alignOptionId(idPrefix, state.slug)}:checked)`;
    if (!css.includes(`${at} [data-align-tick="${state.slug}"] { opacity: 1`))
      throw new Error(`${where}: state ${JSON.stringify(state.slug)} shows no graduation words`);
    if (!css.includes(`${at} [data-align-note="${state.slug}"] { display: revert; }`))
      throw new Error(`${where}: state ${JSON.stringify(state.slug)} reveals no caption, which this type may not do without`);
  }
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared an alignment.
 *
 * A DELIBERATE COPY, to the byte, of the segmented treatment `render-web.mjs` gives `.chart-filter`
 * and `datumChromeCss` gives `.chart-datum`, and the cost is stated rather than hidden: the format's
 * own block is emitted only for a beat that declared a FILTER, which a beat using this file has not
 * and must not — nothing leaves this picture. The native radios underneath are what the reader
 * actually operates; the pills are layered ON TOP (`opacity: 0`, never `display: none`) and the
 * whole treatment is behind `@supports selector(:has(*))`. `WEB-TYPE-BRIEF.md` (b) names the
 * selected pill's black slab as a known systemic defect being repaired in one pass across all
 * sixteen vocabularies; this file copies the existing rule unchanged rather than inventing a local
 * variant that would be the only one left behind when that pass lands.
 *
 * `.align-values` IS A LAYER OF ITS OWN AND NOT `.overlay`, for the reason `floor.ts`'s earned axis
 * sits in `.y-axis` and `datum.ts`'s figures sit in `.datum-values`: every word inside `.overlay` is
 * required by `verify-web.mjs` to be drawn in the default view, and these travel under the control.
 */
export function alignChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-align {
  flex: 0 0 auto;
  margin: 6px 0 0;
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
${scope} .chart-align legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-align .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-align label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-align input { cursor: pointer; margin: 0; }

/* WHAT A LENGTH MEANS UNDER THE CHOSEN ORIGIN. Its row is reserved whether or not an option is
   chosen, so choosing one never moves the plot underneath it. role="status" is on the container
   rather than on each caption: the captions come and go by display, and a live region that itself
   comes and goes announces nothing. */
${scope} .align-notes {
  flex: 0 0 auto;
  margin: 2px 0 0;
  min-height: 3em;
  font-size: var(--source-size);
  color: var(--muted);
}
${scope} .align-notes p { margin: 0; }

/* The travelling figures' own layer. It shares the plot's grid cell with the svg and with .overlay,
   and pointer-events:none is load-bearing for the same reason it is on .overlay: a plain div over
   the whole plot intercepts every pointer event before it reaches the hit area beneath it. */
${scope} .chart-plot .align-values { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }

@supports selector(:has(*)) {
  ${scope} .chart-align .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  ${scope} .chart-align label {
    gap: 0;
    padding: 5px 12px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  ${scope} .chart-align label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    -webkit-appearance: none;
    appearance: none;
  }
  ${scope} .chart-align label:hover { color: var(--ink); }
  ${scope} .chart-align label:has(input:checked) { background: var(--ink); color: var(--ground); }
  ${scope} .chart-align label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
