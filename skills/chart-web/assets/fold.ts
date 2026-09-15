// twin/skills/chart-web/assets/fold.ts
//
// THE FIFTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum. This
// file says what may be LAID OVER what is drawn — one half of a picture, carried across and put down
// on the other half at its own measured values, so the difference between them stops being an
// inference and becomes a SHAPE. All five are native radio inputs plus CSS generated at build time
// (`:checked` and `:has()` on the enclosing figure, no listener, no state, not one byte of
// JavaScript), because that is the only kind of control this format can promise still works with the
// script absent, and "the reader without a script still gets the complete plate" is not a claim the
// format is willing to soften.
//
// WHY IT IS A FIFTH FILE AND NOT AN OPTION IN ONE OF THE OTHER FOUR.
//
// A filter's whole vocabulary is a NAMED SET OF KEYS: hide what is not in it. A stack's is a set
// plus an arrangement. A yardstick's is ONE reference per series, laid flat across the whole plot —
// `level.ts` says so in its own first paragraph, and its `LevelMark` carries exactly one coordinate
// for exactly that reason. A withdrawal's is an arithmetic.
//
// A PROFILE is none of those. It is a per-band SEQUENCE of edges that has to be read as ONE
// CONTINUOUS OUTLINE — twenty-one numbers whose meaning is the staircase they make together, not the
// twenty-one places they sit. Declaring it as twenty-one yardsticks would be true of every number and
// false of the thing: `level.ts` would happily draw twenty-one full-width rules, and a reader would
// get twenty-one rules where the beat promised a silhouette. The shape is the reading; a vocabulary
// that cannot make one cannot carry this gesture.
//
// AND THE ARITHMETIC THIS FILE OWNS IS EXACTLY THAT TURN. `foldPath` takes the sequence of edges and
// the bands' own rows and returns one `d` — in the geometry's own units, with no `transform`
// anywhere. That last part is not style. `interaction.mjs` resolves the mark under a pointer off the
// `cx`/`cy` attributes it reads ONCE at init, which no CSS transform ever changes (`stack.ts`, "the
// defect that driving found"); a control that needs no transform does not get to re-open that hole,
// and this one draws every option's outline once, at its own place, and lets the stylesheet reveal it.
//
// WHERE IT COMES FROM. `proof/web-population-pyramid-switzerland`, a MIRRORED type: two half-shapes
// drawn back to back from a shared centre. The still can say the silhouette is top-heavy. It cannot
// say WHERE the two halves swap places, because the one comparison its geometry makes hardest is the
// one between them — two lengths measured in opposite directions from a shared zero is the worst
// arrangement there is for a difference, and it is the arrangement that defines the type. Fold one
// half onto the other and the answer is a crossing you can point at.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     fold: {
//       label: "Rabattre une moitié",     // the <legend> — the beat's own words
//       noneLabel: "Les deux moitiés",    // the untouched option. Always first, always the default,
//                                         // and it IS the picture the page ships in.
//       options: [
//         {
//           key: "hommes",                // the half whose profile is carried across
//           host: "femmes",               // the half it is laid on
//           label: "les hommes",          // the pill's words
//           announce: "Rabattre les hommes sur les femmes — …",  // must contain `label`
//           note: "Le profil des hommes, posé sur …",            // revealed under the control
//           crossing: { key: "60-64", text: "à partir de 60-64 ans…" },
//           steps: [{ key: "0-4", at: 613.2 }, …],               // geometry units, never CSS pixels
//         },
//         …
//       ],
//     }
//
// `at` IS IN THE GEOMETRY'S OWN UNITS, for the reason `level.ts` and `stack.ts` both state: a
// `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a `viewBox` unit is a different number
// of reader pixels at every width, and an outline built from reader pixels would slide off its own
// bands the moment the page is resized.
//
// THE REFUSAL THIS FILE HAS AND THE OTHERS DO NOT. A fold offered in ONE DIRECTION ONLY privileges a
// side. On a mirrored type that is not a preference, it is a claim: "read the left against the right"
// says the right is the norm. So `assertFoldDeclaration` requires that EVERY half the beat draws
// hosts exactly one option — the reader may run the comparison either way, and check that the
// crossing they were shown is not an artefact of which half was laid over which.
//
// WHAT IS REFUSED BESIDES, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE. Every refusal here is the
// same sentence in a different costume: an outline the plate cannot honour is an outline whose
// sentence claims more than the reader can see. A profile that skips a band, or names the bands in a
// different order from the ones it is drawn over, is the SORTED PYRAMID wearing a different hat —
// the one failure `chart-beat/references/types/population-pyramid.md` names for this type — and it is
// refused in exactly those terms.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";
import { controlChromeCss } from "./control-chrome.ts";

/** One edge of a profile: the band it belongs to, and where that band's edge sits, in the geometry's
 *  own units, ON THE SIDE IT IS BEING LAID OVER. A profile carried across is already mirrored by the
 *  beat that owns the scale; this file never flips a coordinate, because the sign convention of a
 *  mirrored axis belongs to the drawing and not to the control. */
export type FoldStep = { key: string; at: number };

/** One half the beat actually draws: its name, and its own edges in the same units. Handed to
 *  `assertFoldDeclaration` so a profile can be checked against the thing it will lie on rather than
 *  against a list of keys that happens to be the right length. */
export type FoldSide = { side: string; steps: FoldStep[] };

/**
 * One band's row in the geometry's own units — the full row, not the bar inside it. A profile is an
 * outline of BANDS, so its vertical segments span the band's whole share of the plot; drawing them at
 * the bar's height instead would leave the staircase's treads floating in the gutters between bars
 * and read as twenty-one disconnected ticks.
 *
 * `from` and `to` are WHERE THE OUTLINE ENTERS AND LEAVES the row, not "top" and "bottom". The
 * difference is load-bearing: a pyramid is drawn with its youngest band at the BOTTOM, so an outline
 * walked in the data's own order travels up the plot and every row's `from` is numerically greater
 * than its `to`. A vocabulary that called them top and bottom would have to know which way the beat
 * stacks its bands, and a vocabulary that knows that is a vocabulary that breaks on the next beat
 * that stacks them the other way.
 */
export type FoldRow = { key: string; from: number; to: number };

/** One option: the half carried across, the half it lands on, and the words for both. */
export type FoldOption = {
  /** The half whose profile is laid over the other. */
  key: string;
  /** The half it is laid ON. Its bars stay exactly where and as they are — a fold ADDS an outline,
   *  it does not redraw what is under it. */
  host: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture.
   *  It must CONTAIN `label`: an accessible name that does not contain the visible one is the
   *  WCAG 2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The outline is the answer for a reader looking at the picture. This is the answer for the one who
   * is not — and it is also where the DERIVED readings live, the ones an outline cannot draw at all:
   * how many bands fall on each side of the crossing, how wide the gap gets and where. `filterNotes`,
   * `stackNotesForMarkup`, `levelNotesForMarkup` and `withdrawNotesForMarkup` hold the same position
   * for the same reason.
   */
  note: string;
  /**
   * THE BAND WHERE THE OUTLINE CROSSES THE BARS IT LIES ON, NAMED ON THE PLOT.
   *
   * A fold's whole product is a crossing, and a crossing a reader has to find by scanning twenty-one
   * bands is a crossing the control did not actually deliver. The note under the control is for the
   * reader who is not looking at the picture; this is for the one who is, and it goes where their eye
   * already is. `key` is the band, so the beat can place it at that band's own row.
   */
  crossing: { key: string; text: string };
  /** The profile itself: every band the host draws, exactly once, in the host's own order. */
  steps: FoldStep[];
};

/** What a beat declares when it wants a fold. Absent/`null` means it wants none. */
export type FoldDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  options: FoldOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const FOLD_NONE_SLUG = "none";

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label — the derivation
 * `stack.ts` and `withdraw.ts` both argue for, for the same reason: the option already HAS an
 * identity (the half it carries across, which is the same string the beat's own markup quotes), and
 * deriving a second one from the words is how `Central & Northern Europe` became
 * `[data-group="…&amp;…"]`.
 *
 *  @parity */
export function foldSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function foldOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** Three decimals of a `viewBox` unit is below a thousandth of a pixel at any width this format is
 *  verified at; a raw float is fifteen characters of noise in a delivered file. */
const round = (n: number) => Number(n.toFixed(3));

/**
 * THE ARITHMETIC THIS FILE OWNS: a sequence of per-band edges plus the bands' own rows, turned into
 * ONE continuous staircase.
 *
 * The rows must be CONTIGUOUS and in the profile's own order — each row starting exactly where the
 * previous one ended. That is not pedantry about floating point: a gap between two rows is a gap the
 * path would have to cross with a segment that stands for no band, and a reader would read a tread
 * there. It is refused rather than bridged, because bridging it invents geometry.
 *
 * The path alternates: down (or up) the row at this band's own edge, then across to the next band's
 * edge at the boundary the two rows share. No curve, no smoothing — a band is a discrete thing and an
 * outline that interpolated between two of them would draw values nobody measured.
 */
export function foldPath(steps: FoldStep[], rows: FoldRow[]): string {
  if (steps.length !== rows.length)
    throw new Error(
      `fold: the profile has ${steps.length} step(s) and the plate has ${rows.length} row(s) — an ` +
        "outline is drawn band by band, so the two are the same list or the shape is not of this plate",
    );
  if (!steps.length) throw new Error("fold: an empty profile draws no outline");
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].key !== steps[i].key)
      throw new Error(
        `fold: step ${i} names ${JSON.stringify(steps[i].key)} and row ${i} is ` +
          `${JSON.stringify(rows[i].key)} — a profile is walked in the drawn order or it is a ` +
          "silhouette of a different sequence, which is the sorted pyramid wearing another hat",
      );
    if (!Number.isFinite(rows[i].from) || !Number.isFinite(rows[i].to) || rows[i].from === rows[i].to)
      throw new Error(`fold: row ${JSON.stringify(rows[i].key)} has no height to draw an edge in`);
    if (i > 0 && round(rows[i].from) !== round(rows[i - 1].to))
      throw new Error(
        `fold: rows ${JSON.stringify(rows[i - 1].key)} and ${JSON.stringify(rows[i].key)} do not ` +
          "touch — a staircase across a gap draws a tread standing for no band",
      );
  }
  const parts = [`M ${round(steps[0].at)} ${round(rows[0].from)}`];
  for (let i = 0; i < steps.length; i++) {
    if (i > 0) parts.push(`L ${round(steps[i].at)} ${round(rows[i].from)}`);
    parts.push(`L ${round(steps[i].at)} ${round(rows[i].to)}`);
  }
  return parts.join(" ");
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything is
 * drawn. `drawn` is what the beat actually DRAWS — every half, with its own edges — so an option
 * laying a profile on a half that is not on the plate, or a profile that is the host's own outline
 * and therefore invisible once revealed, is caught here rather than by choosing it and looking.
 */
export function assertFoldDeclaration(
  declaration: FoldDeclaration | null | undefined,
  drawn: FoldSide[],
  { extent }: { extent: { min: number; max: number } },
): void {
  if (!declaration) return;
  const at = (what: string) => `fold: ${what}`;
  if (!declaration.label?.trim()) throw new Error(at("the control has no legend, so nothing says what the reader is choosing"));
  if (!declaration.noneLabel?.trim()) throw new Error(at("the untouched option has no words, and it is the state the page ships in"));
  if (!Array.isArray(drawn) || drawn.length < 2)
    throw new Error(at(`a fold lays one half over another and this plate declares ${drawn?.length ?? 0} half/halves`));
  if (!declaration.options?.length) throw new Error(at("a declared control with no options is a legend and a default"));

  const sides = new Map(drawn.map((d) => [d.side, d.steps]));
  if (sides.size !== drawn.length) throw new Error(at("two of the declared halves share a name"));

  const seen = new Set<string>();
  const hosted = new Map<string, number>();
  for (const option of declaration.options) {
    const slug = foldSlugOf(option.key);
    if (slug === FOLD_NONE_SLUG)
      throw new Error(at(`the option ${JSON.stringify(option.key)} slugs to the reserved id of the untouched option`));
    if (seen.has(slug)) throw new Error(at(`two options slug to ${JSON.stringify(slug)}, so one of them can never be chosen`));
    seen.add(slug);
    if (!sides.has(option.key)) throw new Error(at(`the option carries across ${JSON.stringify(option.key)}, which this plate does not draw`));
    if (!sides.has(option.host)) throw new Error(at(`the option lays ${JSON.stringify(option.key)} on ${JSON.stringify(option.host)}, which this plate does not draw`));
    if (option.key === option.host)
      throw new Error(at(`${JSON.stringify(option.key)} is laid on itself — an outline exactly over the bars it traces reveals nothing when the reader chooses it`));
    hosted.set(option.host, (hosted.get(option.host) ?? 0) + 1);

    if (!option.label?.trim()) throw new Error(at(`the option ${JSON.stringify(option.key)} has no visible words`));
    if (!option.announce?.includes(option.label))
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} announces ${JSON.stringify(option.announce)}, which ` +
            `does not contain its own visible words ${JSON.stringify(option.label)} — WCAG 2.5.3 ` +
            "label-in-name, and a reader who speaks the pill cannot operate the page",
        ),
      );
    if (!option.note?.trim()) throw new Error(at(`the option ${JSON.stringify(option.key)} reveals no sentence, so a reader not looking at the plot gets nothing`));
    if (!option.crossing?.text?.trim())
      throw new Error(at(`the option ${JSON.stringify(option.key)} names no crossing, and a crossing the reader must find by scanning is not one the control delivered`));

    const host = sides.get(option.host)!;
    if (option.steps.length !== host.length)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} carries ${option.steps.length} edge(s) onto a half ` +
            `drawn with ${host.length} band(s) — a profile names every band it is laid over, exactly once`,
        ),
      );
    let differs = false;
    for (let i = 0; i < host.length; i++) {
      if (option.steps[i].key !== host[i].key)
        throw new Error(
          at(
            `the option ${JSON.stringify(option.key)} names ${JSON.stringify(option.steps[i].key)} where ` +
              `the plate draws ${JSON.stringify(host[i].key)} — a profile walked out of the drawn ` +
              "sequence is the sorted pyramid under another name, and the sequence IS the silhouette",
          ),
        );
      if (!Number.isFinite(option.steps[i].at))
        throw new Error(at(`the option ${JSON.stringify(option.key)} has no usable edge at ${JSON.stringify(option.steps[i].key)}`));
      if (option.steps[i].at < extent.min || option.steps[i].at > extent.max)
        throw new Error(
          at(
            `the option ${JSON.stringify(option.key)} puts its ${JSON.stringify(option.steps[i].key)} edge ` +
              `at ${option.steps[i].at}, outside the plot's own ${extent.min}…${extent.max} — an outline ` +
              "off the plate is offered to a reader who cannot see it",
          ),
        );
      if (round(option.steps[i].at) !== round(host[i].at)) differs = true;
    }
    if (!differs)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} traces the half it is laid on, edge for edge — the ` +
            "reader operates the control and the picture does not change",
        ),
      );
    if (!host.some((step) => step.key === option.crossing.key))
      throw new Error(at(`the option ${JSON.stringify(option.key)} names a crossing at ${JSON.stringify(option.crossing.key)}, which is not a band of the half it is laid on`));
  }

  // THE MIRRORED REFUSAL. See the header: a fold offered one way round is a claim about which half is
  // the norm, and this type's two halves are peers.
  const unhosted = drawn.map((d) => d.side).filter((side) => !hosted.has(side));
  if (unhosted.length)
    throw new Error(
      at(
        `${unhosted.map((s) => JSON.stringify(s)).join(", ")} is never the half laid ON — the reader can ` +
          "run this comparison one way round only, which says the other half is the norm. Offer the " +
          "fold in both directions, or the control is an argument the beat did not make",
      ),
    );
  for (const [side, count] of hosted)
    if (count > 1)
      throw new Error(at(`${JSON.stringify(side)} hosts ${count} options, so two outlines claim the same half`));
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the state
 * the beat renders in and the one a reader with no script never leaves.
 */
export function foldOptionsForMarkup(
  declaration: FoldDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: foldOptionId(idPrefix, FOLD_NONE_SLUG),
      slug: FOLD_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: foldOptionId(idPrefix, foldSlugOf(option.key)),
      slug: foldSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule the other four hold. A folded
 * comparison is an ARGUMENT the reader built, and an argument that is only a picture cannot be
 * checked. One sentence per option, revealed by the same `:checked` that reveals the outline. The
 * untouched option gets NO note, because it is not a counterfactual: it is the claim.
 */
export function foldNotesForMarkup(
  declaration: FoldDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({ slug: foldSlugOf(option.key), text: option.note }));
}

/**
 * THE CROSSING, one per option, for the component to place at that band's own row.
 *
 * Same shape as `foldNotesForMarkup` and for the same reason; the difference is WHERE the two land.
 * The note goes under the control, in the reading order, for a reader who is not looking at the plot.
 * This goes ON the plot, at the band where the outline crosses the bars, because a reading a reader
 * makes with their eye needs its answer where their eye already is.
 */
export function foldCrossingsForMarkup(
  declaration: FoldDeclaration | null | undefined,
): { slug: string; key: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: foldSlugOf(option.key),
    key: option.crossing.key,
    text: option.crossing.text,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on a
 * real radio. No script runs, so the control works with JavaScript off exactly as it works with it on
 * — and the empty string returned for a beat with no declaration is what makes "no dead CSS" literal
 * rather than aspirational, exactly as `filterCss`, `stackCss`, `levelCss` and `withdrawCss` do.
 *
 * THE VOCABULARY IT WRITES AGAINST, which is what the component must tag its markup with:
 *
 *   data-fold-profile="<slug>"   the outline itself, drawn once at its own place and revealed here.
 *   data-fold-crossing="<slug>"  the crossing named on the plot, in the option's own layer.
 *   data-fold-note="<slug>"      the sentence under the control.
 *
 * NOTHING HERE NAMES A COLOUR AND NOTHING HERE MOVES ANYTHING. The outline's ink is the beat's, set
 * as a presentation attribute on the shape it belongs to and measured by the beat against the fills it
 * actually crosses — a colour literal in this file would be a colour nobody measured in the direction
 * the page is rendered in. And the reveal is an `opacity`, never a `transform`: see the header.
 *
 * THE OUTLINE IS REVEALED WITH `opacity` AND THE WORDS WITH `display`, which is not an inconsistency.
 * The outline is SVG geometry inside the plate's own stacking order, where a re-displayed shape is one
 * more thing for the layout to resolve; the words sit in an HTML layer whose row must not be reserved
 * twenty-one times over for text only one option ever shows.
 */
export function foldCss(
  declaration: FoldDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    revealMs,
  }: {
    scope: string;
    idPrefix: string;
    /** How long the outline takes to arrive. Honoured only under `prefers-reduced-motion:
     *  no-preference` — the whole transition lives inside the query rather than being overridden back,
     *  so under `reduce` there is no transition to resolve at all. */
    revealMs: number;
  },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The fold this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, stack.ts moves with, level.ts measures with and withdraw.ts subtracts with, and`,
    `   the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-fold-note] { display: none; }`,
    `${scope} [data-fold-crossing] { display: none; }`,
    `${scope} [data-fold-profile] { opacity: 0; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-fold-profile] { transition: opacity ${revealMs}ms ease; }`,
    `}`,
  ];
  for (const option of declaration.options) {
    const slug = foldSlugOf(option.key);
    const at = `${scope}:has(#${foldOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} [data-fold-profile="${slug}"] { opacity: 1; }`,
      `${at} [data-fold-crossing="${slug}"] { display: revert; }`,
      `${at} [data-fold-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/**
 * THE RENDER-TIME REFUSAL, AND WHY IT LIVES HERE RATHER THAN IN `interaction-plan.ts`.
 *
 * `assertControlsChangeSomething` discovers a page's controls by walking the markup for the shapes it
 * knows — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
 * `chart-level-*` radios. It does not know this vocabulary's radios exist, so a fold is invisible to
 * it and would ship unmeasured. Squatting on another vocabulary's id prefix to be discovered would
 * make the census report a yardstick that is not one, which is the "one word, two behaviours" defect
 * this family's headers refuse at the top. So the refusal ships with the vocabulary, written against
 * the same definition the format already holds — *a control whose state, once applied, equals the
 * default state is one the reader operates while nothing changes*.
 *
 * It is applied to the SENTENCE, because the geometry half is already refused earlier and better:
 * `assertFoldDeclaration` has compared every option's profile against the half it is laid on, edge for
 * edge, and refused one that traces it. What no declaration check can see is whether the words the
 * control reveals were already printed on the page at rest.
 *
 * `defaultPrintedText` is imported rather than re-derived — the last time this repository derived one
 * string two ways, a whole map emptied with nothing red. What IS done here is strip this vocabulary's
 * own revealed elements before handing the page over, for exactly the reason that function strips a
 * filter's note and a stack's: an element revealed by `:checked` counted as printed makes the control
 * that reveals it look dead.
 */
export function assertFoldChangesThePicture(
  html: string,
  declaration: FoldDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed = /<[^>]*data-fold-(?:note|crossing)="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
  const printed = defaultPrintedText(String(html).replace(revealed, " "));
  const inert: string[] = [];
  for (const option of declaration.options) {
    const adds = answerPieces(option.note).some((piece) => !printed.includes(piece));
    if (!adds) inert.push(option.label);
  }
  if (inert.length)
    throw new Error(
      `${where}: ${inert.length} of ${declaration.options.length} fold option(s) reveal a sentence the ` +
        `page already prints (${inert.join(", ")}). A reader who works through every option is told ` +
        `nothing they could not read at rest — give each one the reading its own comparison produces, ` +
        `or stop offering it ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a fold.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function foldChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "fold",
    notes: { reserve: "1.5em" },
  });
}
