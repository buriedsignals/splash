// twin/skills/chart-web/assets/benchmark.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// (Not numbered, deliberately. `descend.ts` and `floor.ts` both call themselves the eighth, and this
// tree gains vocabularies from several hands at once; an ordinal in a header is a fact that goes
// stale without anyone editing the file it is in.)
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is
// chosen. `trace.ts` says what may be FOLLOWED through an image. `descend.ts` says what may BECOME
// THE WHOLE. `floor.ts` says what the picture may STAND ON. This file says **what each row is
// JUDGED AGAINST** — one target per row, confined to that row's own track, and the verdict every
// row earns under it. All of them are native radio inputs plus CSS generated at build time (`:checked`
// and `:has()` on the enclosing figure, no listener, no state, not one byte of JavaScript), because
// that is the only kind of control this format can promise still works with the script absent.
//
// WHERE IT COMES FROM, AND WHY IT IS THE BULLET'S OWN AND NOBODY ELSE'S.
//
// A bullet is the accountability chart. It is the one type in this catalogue whose reading is not a
// quantity but a VERDICT — *did this hit the mark* — and a verdict is a function of two things, only
// one of which is in the data. The value is measured. THE TARGET IS CHOSEN BY WHOEVER DREW THE
// PLATE, and `chart-beat/references/types/bullet.md` puts its warning exactly there: *"don't invent
// a target just to unlock the bullet's shape"*, and *"a bullet chart must not manufacture judgement
// the journalist didn't provide"*.
//
// A still has to pick one target, print it and ask to be trusted. So does a video and so does a
// scrolly: they can step through targets, but on the author's clock, in the author's order, and the
// reader never gets to ask the question the form provokes. Handing the target over is the one
// addition this type has that no other type in the catalogue even has a slot for — a line chart has
// no target, a treemap has no target, a stream has no target. It is also the one addition that can
// go straight to the catalogue's own failure, because a control with four options invites inventing
// three of them. SO PROVENANCE IS DECLARED, AND CHECKED, rather than trusted (see
// `assertBenchmarkDeclaration`'s provenance clause, which is this file's own refusal).
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN `level.ts`, WHICH IS THE NEAR MISS.
//
// A yardstick lays ONE reference ACROSS THE WHOLE PLOT at one datum's own value, and its own header
// says so in its first paragraph: "a level adds nothing and moves nothing". Every mark keeps exactly
// the meaning it had; what the reader gains is a straight edge to read them against. A benchmark
// keeps nothing still:
//
//   - it is PER ROW, and confined to that row's own track. The default option on the beat this file
//     was written for is EACH ROW'S OWN EARLIER VALUE — six different references, one per row. Drawn
//     as levels those are six full-width rules laid across each other, which is a picture of nothing.
//   - it RE-DERIVES A VERDICT for every row: the SIGN of the gap, its length, the paint that gap
//     takes, and how many rows clear it. `LevelMark` carries one coordinate and one reach. It has
//     nowhere to put an arithmetic whose sign flips from row to row, and making room for one would
//     mean giving a vocabulary whose whole argument is "nothing changes" a concept of pass and fail.
//
// `cutoff.ts` is the second near miss and it fails one axis over. It moves ONE line and outlines a
// REGION of the plate, declared as rectangles in geometry units. Six per-row gaps whose sign flips
// are not a region: the thing that moves is not an outline around part of the picture, it is a
// different arithmetic for every row at once. `filter.ts` removes, and nothing may leave here — the
// rows that fail are the whole reading. `stack.ts` and `hold.ts` arrange, and nothing is arranged.
// `withdraw.ts` takes a term out of a sum, and no sum is touched.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     benchmark: {
//       label: "Mesurer chaque pays contre",   // the <legend> — the beat's own words
//       claimText: "… sous la moitié",         // the beat's OWN claim, and what a benchmark
//                                              // declaring `stated-in-the-claim` is checked against
//       claim: {                               // the target the PLATE was drawn at. Always first,
//         label: "son propre 2015",            // always checked, and the picture the page ships in.
//         announce: "…son propre 2015…",       // No note: it is not a comparison, it is the claim.
//         provenance: "own-earlier-value",
//         at: { POL: 13.8, DEU: 43.8, … },     // ONE TARGET PER DRAWN ROW. A row with a value and
//       },                                     // no target is a bar pretending to be a bullet.
//       options: [
//         {
//           key: "half",
//           label: "la moitié",
//           announce: "la moitié — 50 % …",     // must CONTAIN `label` (WCAG 2.5.3)
//           note: "5 des 6 franchissent …",     // where this control's DERIVED readings live
//           provenance: "stated-in-the-claim",
//           at: { POL: 50, DEU: 50, … },
//         },
//       ],
//     }
//
// TARGETS ARE IN THE MEASURE'S OWN UNITS — percent, tonnes, headcount — never in geometry units and
// never in CSS pixels. This file never converts one into the other: the beat hands back the
// transforms it drew (`BenchmarkPlacement`), because only the beat knows its own scale, and
// `chart-web` svgs carry `preserveAspectRatio="none"`, so a viewBox unit is a different number of
// reader pixels at every width.
//
// AND THIS ONE DOES EMIT A TRANSFORM, which `level.ts` and `cutoff.ts` both deliberately refuse to.
// Their reason is real and it is honoured here rather than overturned: `interaction.mjs` resolves
// the mark under a pointer off `cx`/`cy` read ONCE at init, so a mark that moves under CSS answers
// as the mark whose slot it landed in. The rule that follows from it is not "nothing moves" but
// **a mark that moves must not be the mark that answers** — and on a bullet the mark that answers is
// the measure bar, which is the one thing no option touches. What moves is the apparatus of
// judgement: the tick, the gap, the band. None of them carries a `data-detail` and none of them is a
// `.pt`. Moving them is also what lets the change be INTERPOLATED rather than cut, which `display`
// can never be — the owner's own "ça pourrait changer en lerp smooth au lieu de saccader".

import { controlChromeCss } from "./control-chrome.ts";

/** Where a target came from, and the only three answers this file will accept. A fourth kind of
 *  provenance is a fourth kind of invented target until someone writes down how to check it. */
export type BenchmarkProvenance =
  /** Each row measured against ITS OWN earlier value. Per-row by construction. */
  | "own-earlier-value"
  /** A line the beat's own claim already names in words, checked against `claimText`. */
  | "stated-in-the-claim"
  /** A statistic OF THE ROWS THE BEAT DRAWS — a median, a maximum, a mean. Checked to lie inside
   *  the drawn values' own range, because a "statistic" outside it is an invented goal wearing a
   *  statistic's name. */
  | "a-statistic-of-the-drawn-set";

const PROVENANCES: BenchmarkProvenance[] = [
  "own-earlier-value",
  "stated-in-the-claim",
  "a-statistic-of-the-drawn-set",
];

/** One row the beat actually draws: its identity and the value being judged, in the measure's own
 *  units. Every option is checked against this list and never against itself. */
export type BenchmarkRow = { key: string; value: number };

/** The target the PLATE was drawn at. Always first, always checked, and it IS the picture the page
 *  ships in — which is why, alone among the options, it owes the reader no sentence. */
export type BenchmarkClaim = {
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name. Must CONTAIN `label` (WCAG 2.5.3 "label in name"). */
  announce: string;
  /** Where this target comes from. */
  provenance: BenchmarkProvenance;
  /** One target per drawn row, by the row's own key, in the measure's own units. */
  at: Record<string, number>;
};

/** One other target the reader can judge every row against. */
export type BenchmarkOption = BenchmarkClaim & {
  /** The option's identity — what the slug, the attribute and the selector are ALL derived from.
   *  One derivation, because the last time two halves of one identity were derived separately a
   *  whole map emptied with nothing red (`filter.ts`'s own header). */
  key: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The gaps are the answer for a reader looking at the picture. This is the answer for the reader
   * who is not — and it is where this control's DERIVED readings live, the ones no rect can draw:
   * how many rows clear this target, by how much the nearest one misses, and what the ORDER of the
   * six becomes under it. `filterNotes`, `stackNotesForMarkup`, `levelNotesForMarkup` and
   * `cutoffNotesForMarkup` all hold the same position for the same reason.
   */
  note: string;
};

/** What a beat declares when it wants a benchmark. Absent/`null` means it wants none. */
export type BenchmarkDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The beat's own claim, verbatim. A `stated-in-the-claim` target has to appear in it. */
  claimText: string;
  claim: BenchmarkClaim;
  options: BenchmarkOption[];
};

/** Which side of its own target a row landed on. `level` is exact equality to a tenth of a unit and
 *  it is NOT a rounding convenience: a zero-length gap draws as nothing, and a reader has to be able
 *  to tell "exactly on the mark" from "not drawn". */
export type BenchmarkVerdict = "over" | "short" | "level";

/** What the beat drew for one row under one option: the three transforms and the verdict. The
 *  transforms are CSS, in the beat's own geometry units, because only the beat knows its scale. */
export type BenchmarkPlacement = {
  slug: string;
  key: string;
  /** The target tick's own group — a translate along the row. */
  target: string;
  /** The gap between the bar's end and the tick — a translate plus an x-scale. */
  gap: string;
  /** The stretch of track that clears the target — a translate plus an x-scale. */
  band: string;
  verdict: BenchmarkVerdict;
};

/** The reserved id of the claim's own target. No declared option may slug to it. */
export const BENCHMARK_CLAIM_SLUG = "claim";

/** How close to its target a row has to be before the gap is called `level` and drawn as nothing,
 *  in the measure's own units. A tenth is what every label on these plates is rounded to, so a
 *  smaller gap is one no printed number would distinguish either. */
export const BENCHMARK_LEVEL_EPSILON = 0.05;

/** A CSS-id-safe slug, derived from the option's KEY and never from its label — the same choice
 *  `levelSlugOf`, `stackSlugOf` and `cutoffSlugOf` make, for the same reason: the key is already the
 *  option's identity, so slugging from the words would be a second derivation of one thing. */
export function benchmarkSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a slug. One function, three readers: the markup, the selector, the guard. */
export function benchmarkOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The verdict label's own identity, so the attribute a component writes and the selector the
 *  stylesheet quotes cannot be derived two ways. */
export function benchmarkVerdictKey(slug: string, rowKey: string): string {
  return `${slug}:${rowKey}`;
}

/** Which side of its target one row fell, and by how much. The ONE implementation — the component
 *  draws from it, the guard checks against it, and the runner writes its sentences off it, so no
 *  two of the three can disagree about whether a row passed. */
export function benchmarkGapOf(
  value: number,
  target: number,
): { gap: number; verdict: BenchmarkVerdict } {
  const gap = value - target;
  if (Math.abs(gap) < BENCHMARK_LEVEL_EPSILON) return { gap: 0, verdict: "level" };
  return { gap, verdict: gap > 0 ? "over" : "short" };
}

/** Every row's verdict under one option, in the beat's own row order. */
export function benchmarkVerdicts(
  at: Record<string, number>,
  rows: BenchmarkRow[],
): { key: string; value: number; target: number; gap: number; verdict: BenchmarkVerdict }[] {
  return rows.map((row) => {
    const target = at[row.key];
    return { key: row.key, value: row.value, target, ...benchmarkGapOf(row.value, target) };
  });
}

/** THE PICTURE ONE OPTION DRAWS, as one string. Every row's gap, signed, to a tenth of the
 *  measure's own unit — which is exactly what a reader sees, since a tenth is what the rows print.
 *  Two options with the same signature draw the identical six rects and the identical six ticks. */
function verdictSignature(at: Record<string, number>, rows: BenchmarkRow[]): string {
  return benchmarkVerdicts(at, rows)
    .map((v) => `${v.key}:${(Math.round(v.gap * 10) / 10).toFixed(1)}`)
    .join("|");
}

/**
 * Refuses every declaration that would render a control that lies, before anything is drawn.
 *
 * @param rows      the rows the beat actually draws, with the values being judged. Every option is
 *                  checked against this and never against its own key set, because the thing that
 *                  goes wrong is an option that forgot a row.
 * @param scaleMax  the top of the track, in the measure's own units. A target beyond it is a verdict
 *                  drawn off the end of the picture.
 */
export function assertBenchmarkDeclaration(
  declaration: BenchmarkDeclaration,
  { rows, scaleMax }: { rows: BenchmarkRow[]; scaleMax: number },
): void {
  const where = "benchmark declaration";
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration))
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no label renders unnamed`,
    );
  if (typeof declaration.claimText !== "string" || !declaration.claimText.trim())
    throw new Error(
      `${where}: \`claimText\` must be the beat's own claim, verbatim — it is what a target ` +
        `declaring "stated-in-the-claim" is checked against, and without it that provenance is a ` +
        `word anyone can type`,
    );
  if (!Array.isArray(rows) || rows.length < 2)
    throw new Error(
      `${where}: a bullet judges at least two rows against their targets; got ` +
        `${rows?.length ?? 0}. One row against one target is a sentence, not a chart.`,
    );
  for (const row of rows)
    if (typeof row?.key !== "string" || !row.key.trim() || !Number.isFinite(row?.value))
      throw new Error(`${where}: every drawn row needs a key and a finite value, got ${JSON.stringify(row)}`);
  if (!Number.isFinite(scaleMax) || scaleMax <= 0)
    throw new Error(`${where}: the track's own top must be a positive number, got ${JSON.stringify(scaleMax)}`);
  if (!Array.isArray(declaration.options) || declaration.options.length < 1)
    throw new Error(
      `${where}: the plate's own target plus at least one other is what makes this a choice, got ` +
        `${declaration.options?.length ?? 0} other target(s). A beat that does not need a ` +
        `benchmark declares none.`,
    );

  const values = rows.map((row) => row.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);

  const named = (option: BenchmarkClaim | BenchmarkOption, slug: string) => {
    for (const field of ["label", "announce"] as const)
      if (typeof option?.[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: the option at ${JSON.stringify(slug)} has no \`${field}\` — a control whose ` +
            `answer is only a picture leaves a keyboard reader with nothing`,
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ` +
          `${JSON.stringify(option.announce)}, which does not contain its own visible label — an ` +
          `accessible name that does not contain the visible one is the WCAG 2.5.3 failure, and a ` +
          `reader speaking what they see cannot reach this option`,
      );

    // EVERY DRAWN ROW NEEDS A TARGET, and it is the catalogue's own sentence: "every row needs its
    // own target; a row with a value but no target isn't a bullet, it's a bar pretending to be one."
    // Checked against what the beat DRAWS, so an option that quietly forgot a country is refused
    // here rather than rendering that country with no tick and no verdict at all.
    if (!option.at || typeof option.at !== "object" || Array.isArray(option.at))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares no \`at\` — a benchmark with no ` +
          `targets judges nothing`,
      );
    for (const row of rows) {
      const target = option.at[row.key];
      if (!Number.isFinite(target))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(row.key)} no ` +
            `target (${JSON.stringify(target)}). Every row the beat draws needs one: a row with a ` +
            `value and no target is not a bullet, it is a bar pretending to be one ` +
            `(chart-beat/references/types/bullet.md).`,
        );
      if (target < 0 || target > scaleMax)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} puts ${JSON.stringify(row.key)}'s ` +
            `target at ${target}, outside the track's own 0…${scaleMax} — a tick drawn off the end ` +
            `of the row, and a verdict measured against a mark the reader cannot see`,
        );
    }
    const extra = Object.keys(option.at).filter(
      (key) => !rows.some((row) => row.key === key),
    );
    if (extra.length)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} carries targets for ` +
          `${extra.map((k) => JSON.stringify(k)).join(", ")}, which this beat does not draw — a ` +
          `target with no row is a judgement passed on nobody, and it is usually a key that was ` +
          `renamed in one place`,
      );

    // THIS FILE'S OWN REFUSAL, AND IT IS THE CATALOGUE'S OWN TRAP MADE MECHANICAL. A bullet's whole
    // reading is a verdict, and a verdict is only as honest as its target's provenance: "don't
    // invent a target just to unlock the bullet's shape … a bullet chart must not manufacture
    // judgement the journalist didn't provide." A control that offers four targets invites
    // inventing three of them, so each one says where it comes from and each kind is checked in the
    // only way its own words can be.
    if (!PROVENANCES.includes(option.provenance))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares the provenance ` +
          `${JSON.stringify(option.provenance)}, which is not one of ${PROVENANCES.join(", ")}. A ` +
          `target whose origin cannot be named is a target that was invented ` +
          `(chart-beat/references/types/bullet.md).`,
      );
    const targets = rows.map((row) => option.at[row.key]);
    if (option.provenance === "own-earlier-value") {
      if (new Set(targets.map((t) => Math.round(t * 10))).size < 2)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} claims every row is measured against ` +
            `ITS OWN earlier value and gives all ${rows.length} of them ${targets[0]} — one flat ` +
            `line under a per-row name. Either the rows share a past, in which case say so, or the ` +
            `targets came from somewhere else.`,
        );
    } else if (new Set(targets.map((t) => Math.round(t * 1e6))).size > 1) {
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares the provenance ` +
          `${JSON.stringify(option.provenance)}, which is ONE line for the whole plate, and gives ` +
          `the rows ${new Set(targets).size} different targets. Only "own-earlier-value" varies ` +
          `from row to row.`,
      );
    }
    if (option.provenance === "stated-in-the-claim" && !declaration.claimText.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} says its target is stated in the claim, ` +
          `and the claim — ${JSON.stringify(declaration.claimText)} — does not contain those ` +
          `words. A line the story never drew is one the reader is being asked to accept on the ` +
          `control's say-so.`,
      );
    if (option.provenance === "a-statistic-of-the-drawn-set") {
      const target = targets[0];
      if (target < lo || target > hi)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} calls ${target} a statistic of the ` +
            `rows this beat draws, whose own values run ${lo} to ${hi}. A number outside the set ` +
            `is not a statistic of it — it is an invented goal wearing a statistic's name ` +
            `(chart-beat/references/types/bullet.md).`,
        );
    }
  };

  named(declaration.claim, BENCHMARK_CLAIM_SLUG);

  const seen = new Map<string, string>();
  const pictures = new Map<string, string>([
    [verdictSignature(declaration.claim.at, rows), declaration.claim.label],
  ]);
  for (const option of declaration.options) {
    if (typeof option?.key !== "string" || !option.key.trim())
      throw new Error(`${where}: every option needs a key — got ${JSON.stringify(option)}`);
    const slug = benchmarkSlugOf(option.key);
    if (!slug)
      throw new Error(`${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`);
    if (slug === BENCHMARK_CLAIM_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${BENCHMARK_CLAIM_SLUG}", the ` +
          `reserved id of the plate's own target — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.key)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.key);

    named(option, slug);
    if (typeof option.note !== "string" || !option.note.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`note\` — the gaps are the ` +
          `answer for a reader looking at the picture, and the sentence is where this control's ` +
          `DERIVED readings live: how many rows clear this target, by how much the nearest one ` +
          `misses, what the order becomes. An option with neither answers nobody.`,
      );

    // The sibling of `cutoff.ts`'s identical-region refusal, one vocabulary over and measured on
    // what this type actually draws. Two targets that leave every row the same distance from its
    // own mark are ONE TARGET UNDER TWO NAMES: the ticks land in the same six places, the six gaps
    // have the same six lengths and the same six signs, and a reader who changes the yardstick and
    // watches the picture stand still has been told the verdict is robust when it is the control
    // that is inert.
    const signature = verdictSignature(option.at, rows);
    const twin = pictures.get(signature);
    if (twin !== undefined)
      throw new Error(
        `${where}: ${JSON.stringify(twin)} and ${JSON.stringify(option.label)} leave every row ` +
          `exactly the same distance from its own target — that is one benchmark under two names, ` +
          `and a reader who changes the yardstick and watches the six gaps stand still has been ` +
          `told the verdict is robust when it is this control that is inert`,
      );
    pictures.set(signature, option.label);
  }
}

/**
 * The options a component draws, in reading order: the plate's own target first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function benchmarkOptionsForMarkup(
  declaration: BenchmarkDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isClaim: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: benchmarkOptionId(idPrefix, BENCHMARK_CLAIM_SLUG),
      slug: BENCHMARK_CLAIM_SLUG,
      label: declaration.claim.label,
      announce: declaration.claim.announce,
      isClaim: true,
    },
    ...declaration.options.map((option) => ({
      id: benchmarkOptionId(idPrefix, benchmarkSlugOf(option.key)),
      slug: benchmarkSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isClaim: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes`,
 * `stackNotesForMarkup`, `levelNotesForMarkup` and `cutoffNotesForMarkup` hold. The plate's own
 * target gets NO note, because it is not a comparison: it is the claim the title states.
 */
export function benchmarkNotesForMarkup(
  declaration: BenchmarkDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: benchmarkSlugOf(option.key),
    text: option.note,
  }));
}

/** Every (option, row) pair the beat has to draw, with the target it is judged against and which
 *  side it fell. The component turns each into three transforms; this is the list it maps over, so
 *  a row can only be missed here by being missed in `rows`. */
export function benchmarkStatesForMarkup(
  declaration: BenchmarkDeclaration | null | undefined,
  rows: BenchmarkRow[],
): {
  slug: string;
  isClaim: boolean;
  key: string;
  value: number;
  target: number;
  gap: number;
  verdict: BenchmarkVerdict;
}[] {
  if (!declaration) return [];
  const all = [
    { slug: BENCHMARK_CLAIM_SLUG, isClaim: true, at: declaration.claim.at },
    ...declaration.options.map((option) => ({
      slug: benchmarkSlugOf(option.key),
      isClaim: false,
      at: option.at,
    })),
  ];
  return all.flatMap(({ slug, isClaim, at }) =>
    benchmarkVerdicts(at, rows).map((v) => ({ slug, isClaim, ...v })),
  );
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `stackCss`, `levelCss` and `cutoffCss`
 * do.
 *
 * EVERY RULE THAT PLACES CARRIES AN ID INSIDE `:has()`, so every one of them weighs (1,3,0) and the
 * base rules that carry the plate's own placement weigh (0,2,0). That is deliberate and it is a trap
 * this branch has already paid for: `:has(#id:checked) X` beats a class rule silently, and when two
 * rules have the SAME specificity the emission order is the whole mechanism — a sankey rendered
 * green with zero ribbons lit for exactly that reason. Here the two weights differ by construction,
 * so no order can flip it.
 *
 * COLOURS ARRIVE AS CUSTOM PROPERTIES, never as literals: this file names four —
 * `--bm-over-fill` / `--bm-over-stroke` for a row past its target, `--bm-short-fill` /
 * `--bm-short-stroke` for one that falls short — and the beat sets all four on its own figure from
 * the direction it is being rendered in, measured there against the surface each one actually lands
 * on. Nothing here knows a colour, which is what lets one vocabulary serve three directions.
 *
 * THE VERDICT IS DRAWN IN SHAPE, NOT IN HUE, and that is why the two pairs exist rather than one
 * fill that changes colour. `bullet.md` offers "exactly two accent hues — one for hit, one for
 * miss"; the beat this file was written for refuses it, because hue is already spent on which row
 * the story is about (`accent-marks-the-thread`), because a verdict carried by hue alone is a
 * verdict a colour-blind reader does not get, and because two hues calibrated independently against
 * the same floor against the same ground come out identical by construction — measured twice on this
 * branch. A beat is free to make both pairs the same colour and let the geometry carry it; this file
 * only guarantees the two states are separately addressable.
 *
 * @param placeMs  how long a change of target takes. The state change is INTERPOLATED and not cut:
 *                 every tick, gap and band is drawn at all times and only transformed, which is the
 *                 one way this format can honour "ça pourrait changer en lerp smooth au lieu de
 *                 saccader" — `display` does not transition, a transform on an always-rendered
 *                 element does.
 */
export function benchmarkCss(
  declaration: BenchmarkDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    placements,
    placeMs,
  }: {
    scope: string;
    idPrefix: string;
    placements: BenchmarkPlacement[];
    placeMs: number;
  },
): string {
  if (!declaration) return "";
  const slugs = [
    BENCHMARK_CLAIM_SLUG,
    ...declaration.options.map((option) => benchmarkSlugOf(option.key)),
  ];
  const paint = (verdict: BenchmarkVerdict) =>
    verdict === "level"
      ? `fill: none; stroke: none; opacity: 0;`
      : verdict === "over"
        ? `fill: var(--bm-over-fill); stroke: var(--bm-over-stroke); opacity: 1;`
        : `fill: var(--bm-short-fill); stroke: var(--bm-short-stroke); opacity: 1;`;

  const lines: string[] = [
    `/* The benchmark this beat declared: the plate's own target plus ${declaration.options.length} others,`,
    `   over ${JSON.stringify(declaration.label)}. Radios plus :checked/:has(), generated once at`,
    `   build time — the same mechanism filter.ts narrows with, stack.ts moves with, level.ts`,
    `   measures with and cutoff.ts cuts with, and the reason this control needs no script. */`,
    // THE SENTENCES ARE STACKED, NOT SWAPPED. `display: none` on the unchosen notes makes the box as
    // tall as whichever one is showing, so choosing a target that needs two lines PUSHES THE WHOLE
    // PLOT DOWN — the reader moves a control and the picture jumps, which is the thing the owner
    // refuses under a different name every time it appears. Every note sits in the same grid cell
    // instead, so the box is as tall as the tallest of them at that width, always, and revealing one
    // moves nothing. `visibility` rather than `opacity` alone: a hidden note has to be out of the
    // accessibility tree as well as out of sight, or the live region reads all four at once.
    `${scope} .benchmark-notes { display: grid; }`,
    `${scope} [data-benchmark-note] { grid-area: 1 / 1; visibility: hidden; opacity: 0; }`,
    // `transform-box`/`transform-origin` are STATED rather than left to the initial value, which has
    // changed inside Chrome's own lifetime (`border-box`, then `view-box`) and resolves `0 0` to two
    // different points under `fill-box`. Every transform below is authored from the view box's own
    // origin, so saying it is the difference between a tick on the row and a tick somewhere else.
    `${scope} [data-bm-target], ${scope} [data-bm-gap], ${scope} [data-bm-band] {`,
    `  transform-box: view-box;`,
    `  transform-origin: 0 0;`,
    `}`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-bm-target], ${scope} [data-bm-gap], ${scope} [data-bm-band] {`,
    `    transition: transform ${placeMs}ms ease, fill ${placeMs}ms ease, stroke ${placeMs}ms ease, opacity ${placeMs}ms ease;`,
    `  }`,
    `  ${scope} [data-benchmark-verdict], ${scope} [data-benchmark-note] { transition: opacity ${placeMs}ms ease; }`,
    `}`,
  ];

  // THE PLATE'S OWN PLACEMENT, UNGUARDED, at (0,2,0). This is what a reader with no script and a
  // reader on an engine with no `:has()` both land on — the picture the beat renders in — and every
  // guarded rule below outweighs it by construction.
  for (const placement of placements.filter((p) => p.slug === BENCHMARK_CLAIM_SLUG))
    lines.push(
      `${scope} [data-bm-target="${placement.key}"] { transform: ${placement.target}; }`,
      `${scope} [data-bm-band="${placement.key}"] { transform: ${placement.band}; }`,
      `${scope} [data-bm-gap="${placement.key}"] { transform: ${placement.gap}; ${paint(placement.verdict)} }`,
    );

  // A VERDICT BELONGING TO AN OPTION NOBODY HAS CHOSEN IS HIDDEN BY OPACITY AND NEVER BY DISPLAY: it
  // has to keep its box so revealing one can never reflow the row underneath it, and it has to be an
  // interpolable property so the number cross-fades instead of snapping.
  //
  // AND EVERY HIDING RULE IN THIS FILE EXCLUDES WHAT THE MATCHING REVEALING RULE MATCHES, rather
  // than hiding everything and revealing after. Both forms work; only this one works whatever order
  // the rules are emitted in. `cutoff.ts`'s own header names the reason the distinction is worth the
  // `:not()` — a sankey on this branch rendered green with zero ribbons lit because two rules of
  // equal specificity were emitted the other way round, and "the emission order is the whole
  // mechanism" is a sentence no one should have to remember twice.
  lines.push(
    `${scope} [data-benchmark-verdict]:not([data-benchmark-verdict^="${BENCHMARK_CLAIM_SLUG}:"]) { opacity: 0; }`,
  );

  for (const slug of slugs) {
    const at = `${scope}:has(#${benchmarkOptionId(idPrefix, slug)}:checked)`;
    for (const placement of placements.filter((p) => p.slug === slug))
      lines.push(
        `${at} [data-bm-target="${placement.key}"] { transform: ${placement.target}; }`,
        `${at} [data-bm-band="${placement.key}"] { transform: ${placement.band}; }`,
        `${at} [data-bm-gap="${placement.key}"] { transform: ${placement.gap}; ${paint(placement.verdict)} }`,
      );
    lines.push(
      `${at} [data-benchmark-verdict]:not([data-benchmark-verdict^="${slug}:"]) { opacity: 0; }`,
      `${at} [data-benchmark-verdict^="${slug}:"] { opacity: 1; }`,
    );
    if (slug !== BENCHMARK_CLAIM_SLUG)
      lines.push(
        `${at} [data-benchmark-note="${slug}"] { visibility: visible; opacity: 1; }`,
      );
  }
  return lines.join("\n");
}

/**
 * THE MARKUP, READ BACK, and it is the half `assertBenchmarkDeclaration` cannot see. The declaration
 * can be perfect and the component can still draw five rows' ticks and forget the sixth, or emit a
 * verdict label for three options out of four — a half-tagged row here is a country with a target
 * nothing points at, which is the exact shape of the defect `filter.ts` was written after (a filter
 * hid the marks and left their labels on the map).
 */
export function assertOneBenchmark(
  markup: string,
  declaration: BenchmarkDeclaration,
  rows: BenchmarkRow[],
): void {
  const where = "benchmark markup";
  const slugs = [
    BENCHMARK_CLAIM_SLUG,
    ...declaration.options.map((option) => benchmarkSlugOf(option.key)),
  ];
  const found = (attribute: string) =>
    new Set(
      [...String(markup).matchAll(new RegExp(`\\sdata-${attribute}="([^"]*)"`, "g"))].map((m) => m[1]),
    );
  for (const attribute of ["bm-target", "bm-gap", "bm-band"]) {
    const drawn = found(attribute);
    const missing = rows.filter((row) => !drawn.has(row.key)).map((row) => row.key);
    if (missing.length)
      throw new Error(
        `${where}: no element carries data-${attribute} for ` +
          `${missing.map((k) => JSON.stringify(k)).join(", ")} — that row is judged by a control ` +
          `that cannot reach it, and it would sit under every option with the plate's own target ` +
          `still drawn on it`,
      );
  }
  const verdicts = found("benchmark-verdict");
  const missing: string[] = [];
  for (const slug of slugs)
    for (const row of rows)
      if (!verdicts.has(benchmarkVerdictKey(slug, row.key)))
        missing.push(benchmarkVerdictKey(slug, row.key));
  if (missing.length)
    throw new Error(
      `${where}: ${missing.length} of ${slugs.length * rows.length} verdicts are not drawn ` +
        `(${missing.slice(0, 4).join(", ")}${missing.length > 4 ? ", …" : ""}) — a reader who ` +
        `chooses that target gets a row with no number, and the derived reading this control owes ` +
        `is the number`,
    );
  const notes = found("benchmark-note");
  for (const option of declaration.options)
    if (!notes.has(benchmarkSlugOf(option.key)))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares a note and the page draws none ` +
          `— the reader who is not looking at the picture gets nothing at all from this option`,
      );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a benchmark.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function benchmarkChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "benchmark",
  });
}
