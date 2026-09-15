// twin/skills/chart-web/assets/aim.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image, `follow.ts` what may be followed through
// its ORDERED STEPS. `hold.ts` says which factor of a product may be HELD STILL. `descend.ts` says
// what may BECOME THE WHOLE. `floor.ts` says what the picture may STAND ON. `cutoff.ts` says where
// the claim's own line is drawn. `reorder.ts` says what the same numbers look like somewhere else
// in a cycle. This file says **WHERE A DISPLACEMENT POINTS** — one mark that is a vector, its tail
// nailed down, its head aimed at whichever reading of "where this thing ended up" the reader asked
// for. All of them are native radio inputs plus CSS generated at build time (`:checked` and
// `:has()` on the enclosing figure, no listener, no state, not one byte of JavaScript), because
// that is the only kind of control this format can promise still works with the script absent.
//
// WHERE IT COMES FROM. `proof/web-connected-scatter-lowcarbon`, and it comes from a property only
// one type in this catalogue has: ITS MARK IS A DISPLACEMENT. A bar has a length, a cell an area, a
// band a thickness — one number each, read against one axis. A connected scatter's mark is a tail,
// a head and the direction between them, over two axes that measure two independent things, so the
// mark carries a reading NEITHER AXIS CARRIES ALONE: the bearing.
//
// And that bearing is the hypotenuse of a right triangle the plate never draws. On the beat this
// file was written for, France's segment goes right and down, and the reader is asked to decompose
// it by eye into "+4,2 points of low-carbon share at home" and "−11,8 points of European weight" —
// two different scales, across a plate where fifteen other segments cross it. Sixteen hypotenuses,
// thirty-two legs, not one of them drawn.
//
// SO THE READER PICKS WHICH READING THE HEAD IS AIMED AT, and the three that matter are the
// triangle itself: the hypotenuse, then one leg, then the other. A fourth aims at a value of the
// same y computed against a denominator that does not grow — a counterfactual, which is the option
// that EXPLAINS the claim instead of restating it.
//
// THE PROPERTY THAT MAKES THIS HONEST, AND IT IS THE WHOLE REASON THIS GESTURE IS NOT A ROSE. Every
// head an option may aim at is A REAL POINT OF THE SAME PLANE. Nothing on the plate changes meaning
// when an option is chosen: not a tick, not a gridline, not an axis title. The first design of this
// control translated all sixteen tails onto one common origin so the fan of bearings became one
// shape — and the moment the tails move, the x and y ticks stop being shares and start being
// CHANGES IN shares, so the entire furniture lies. Repairing that needs a second set of tick labels
// crossfaded over the first, which is two axes in one gutter. Aiming the head buys the same reading
// with every number on the plate still saying what it said.
//
// WHY IT IS ITS OWN FILE, AND THE TWO NEAR MISSES.
//
//   - `stack.ts` CANNOT. Its unit is a `StackedColumn { key, dx, dy }`: ONE RIGID DISPLACEMENT PER
//     MEMBER, which is exactly the operation this control must never perform. A `dx`/`dy` moves the
//     whole arrow, tail included, and the tail is the one coordinate that may not move — it is where
//     `interaction.mjs` reads the answering mark's position, once, at init. What a re-aim changes is
//     the arrow's LENGTH and its ANGLE about a fixed origin, and a translation expresses neither.
//   - `hold.ts` CANNOT, and it is the closer miss, because its own sentence is the same one: freeze
//     one factor so the other becomes readable. Its unit is a per-column
//     `translate(tx, ty) scale(sx, sy)` over the columns of a mosaic, whose widths must sum to the
//     frame; it refuses a non-positive scale and it requires a figure riding a column. No affine of
//     that shape contains a ROTATION, and an arrow re-aimed is a rotation before it is anything
//     else. And the fourth option on that beat is not a hold of any factor: it is a different
//     denominator.
//
// `filter.ts` removes marks and nothing leaves here. `level.ts` lays a reference across a frame that
// stays and there is no reference here. `withdraw.ts` subtracts a term from a sum, `fold.ts` lays
// one half over the other, `brush.ts` picks a span of an axis, `descend.ts` re-parents, `floor.ts`
// shears, `cutoff.ts` outlines a region, `reorder.ts` hands a cyclic sequence round. `trace.ts` and
// `follow.ts` pull one competitor out of a tangle — and `follow.ts`'s arithmetic is a RANK's
// (`position[i] − position[i−1] = passed − overtaken`, a bijection over a field), which needs a walk
// of ordered steps. A two-date displacement has no walk and no crossing to audit.
//
// THE ARITHMETIC THIS FILE OWNS, AND IT IS DERIVED HERE RATHER THAN TYPED BESIDE THE POINTS.
//
//     length = |head − tail|          angle  = atan2(head.y − tail.y, head.x − tail.x)
//
// A beat declares two POINTS and never an angle or a length, so a typed angle can never disagree
// with a typed head — which is this type sheet's own trap one turn further on. `connected-scatter.md`
// names the failure as a path ordered by row arrival rather than by the time key, fluent-looking and
// completely wrong with nothing on the chart to flag it. With two dates there is no ordering to get
// wrong; what is wide open instead is that the DIRECTION of the mark is now the whole of its content,
// and a control that re-aims it could produce sixteen fluent arrows pointing at a story nobody
// measured. Hence: every head is checked against the frame, every option must name every drawn
// arrow, and the geometry is computed from the declared points.
//
// WHY THE MOVEMENT CAN BE INTERPOLATED HERE, WHICH `floor.ts`'S COULD NOT. A shear moves every step
// of a plate by a different amount, so each of its states is a different set of paths and there is
// nothing to transition; its own header says so. A re-aim is two CSS transform lists over elements
// that are ALWAYS RENDERED:
//
//     shaft:  translate(tail) rotate(θ) scale(L, 1)     over a unit segment (0,0)-(1,0)
//     head:   translate(tail) rotate(θ) translate(L, 0) over a triangle whose apex is (0,0)
//
// Both lists interpolate componentwise, and both resolve the arrow's tip to `tail + L·(cos θ, sin θ)`
// with the SAME θ and the SAME L at every frame — so the head stays welded to the end of the shaft
// for the whole trip, which a chord-interpolated head over an arc-interpolated shaft would not have
// done. That is the owner's fourth arbitrage honoured by construction rather than by a comment.
//
// AND `transform-origin` IS SET EXPLICITLY, exactly as `hold.ts` records for a scale. For an SVG
// element the initial `transform-box` is `view-box` and the initial `transform-origin` is `50% 50%`
// — the CENTRE of the viewBox, not its origin. A translate does not care; a rotate is entirely
// decided by it, and left alone every arrow on the page would have swung about the middle of the
// plate rather than about its own tail.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     aim: {
//       label: "La flèche montre",           // the <legend> — the beat's own words
//       noneLabel: "Le trajet",              // the untouched option: always first, always the
//                                            // default, and it IS the plate the beat ships.
//       protect: "FRA",                      // the key the plate accents — rule 5, see below
//       figure: { key: "FRA", text: "…" },   // what the DEFAULT plate prints, riding FRA's head
//       options: [
//         {
//           key: "chez-eux",
//           label: "Chez eux",
//           announce: "Chez eux — …",        // must contain `label` (WCAG 2.5.3)
//           note: "Les seize ont tous …",    // the sentence revealed under the control
//           figure: { key: "FRA", text: "France : +4,2 points chez elle" },
//           heads: [ { key: "FRA", x: 778.1, y: 89.7 }, … ],   // EVERY drawn arrow
//         },
//         …
//       ],
//     }
//
// THE TAIL IS NOT DECLARABLE, AND THAT IS STATED RATHER THAN ASSERTED. An option carries heads and
// nothing else; the tails come from the plate the beat draws and are baked into every generated
// rule. A declaration that cannot express a moved tail cannot be checked for one — the guarantee is
// structural, which is stronger than a refusal, and it is the reason the answering layer here is
// never silenced the way `hold.ts` has to silence its own.
//
// WHAT IS ASSERTED ABOUT THE ANSWERING LAYER INSTEAD, because something has to be. `interaction.mjs`
// resolves the mark under a pointer from coordinates read ONCE at init, so a beat whose arrows swing
// must give the pointer anchors that are true in every state. Two refusals hold that: every anchor
// must sit ON a point its own arrow actually occupies in some declared state, and every point an
// arrow occupies in some declared state must be covered by an anchor. The first refuses an anchor
// floating where its arrow never goes — a country answering for a place it is not; the second
// refuses a state whose arrows cannot be reached at all, which is the defect
// `proof/web-streamgraph-swiss-electricity` paid for one vocabulary over, in its own words: "under
// any option each point would have answered for the place its band used to occupy."
//
// IT IS HANDED A PROTECTED KEY, like `follow.ts` and for the same rule. `directed-interaction.md`
// rule 5: nothing argument-bearing sits behind a control. On this shape the argument is an arrow —
// the one the plate accents and the headline names — and an option that failed to name it would
// leave the subject aimed at the default while the other fifteen swung away, which is the claim
// quietly removed by a control.
//
// IT EMITS `chart-stack-…` IDS AND `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP, and the
// reason is `hold.ts`'s verbatim: `interaction-plan.ts` discovers the controls a page ships BY
// READING THE MARKUP, and its "moving or measuring control" branch looks for the radio id prefix
// `chart-stack-` and for the sentence carried on `data-stack-note`. Those two strings are the
// format's DISCOVERY CONTRACT for a control that moves the picture and owes the reader a sentence.
// A third grammar inventing its own spellings would be invisible to the guard written to refuse it
// — the precise failure `filter.ts`'s header records, where two spellings of one vocabulary made
// the check vacuous on four of the corpus's five filtered pages.
//
// COLOURS ARRIVE AS ARGUMENTS, never as literals: nothing here names a colour, and nothing here
// formats a number a reader sees.

import { controlChromeCss } from "./control-chrome.ts";

/** A point of the plate, in the geometry's own units — never CSS pixels, for the reason `hold.ts`
 *  records at length: a `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a `viewBox`
 *  unit is a different number of reader pixels at every width, and a CSS `transform` on an SVG
 *  element resolves in user units. A rule generated here is correct at 320 px and at 1600 px
 *  without anything re-measuring it. */
export type AimPoint = { x: number; y: number };

/** One arrow of the plate as the DEFAULT picture draws it: where it starts, and where it points
 *  before the reader has touched anything. */
export type AimArrow = { key: string; tail: AimPoint; head: AimPoint };

/** One anchor of the beat's answering layer — a `.pt` the beat will draw, named by the arrow it
 *  speaks for. Its position is checked against that arrow's own states. */
export type AimAnchor = { key: string; x: number; y: number };

/** Where one arrow's head goes under one option. */
export type AimHead = { key: string; x: number; y: number };

/**
 * THE FIGURE PRINTED ON THE PLATE, and it is required for the reason `hold.ts` requires one: the
 * note is for the reader who is not looking at the picture, and this is for the one who is. It
 * rides the head it describes — the place the eye already is — and because each option's figure is
 * a SEPARATE element at its own option's head, nothing on the page travels: one is revealed and the
 * others are not drawn. That is the owner's first arbitrage, which refuses a word that moves for a
 * reason the reader cannot see.
 */
export type AimFigure = {
  /** The beat's own formatted string. This file never formats a number a reader sees. */
  text: string;
  /** The arrow whose head this figure rides. Must be one the plate draws. */
  key: string;
};

/** One option: where every arrow points under it, the words for it, and the reading it owes. */
export type AimOption = {
  /** What this reading is, in one slug. The generated selectors come from it and never from the
   *  label — the single derivation of one identity `stack.ts` argues for and `filter.ts` paid for. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The swung arrows are the answer for a reader looking at the picture. This is the answer for the
   * one who is not — and it is where the DERIVED readings live, the ones no arrow can draw: the
   * spread of the sixteen legs, the count that go each way, the growth rate the whole claim turns
   * on. It is also the ONLY channel `interaction-plan.ts` can measure this control on: a transform
   * is not a reading and nothing there can see one.
   */
  note: string;
  /** The figure this option prints on the plate, riding a head. */
  figure: AimFigure;
  /** EVERY drawn arrow, and where it points under this option. Partial sets are refused. */
  heads: AimHead[];
};

/** What a beat declares when it wants a re-aim. Absent/`null` means it wants none. */
export type AimDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. Always first, always the default, and it IS the plate. */
  noneLabel: string;
  /** The key the plate accents. Every option must name it — see the header, rule 5. */
  protect: string;
  /** The figure the DEFAULT plate prints, riding its own head. */
  figure: AimFigure;
  options: AimOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const AIM_NONE_SLUG = "none";

/** Two points closer than this, in geometry units, are the same point as far as this file is
 *  concerned. A third of a `viewBox` unit is well under a reader pixel at every width this format
 *  is verified at, so nothing a reader could see is rounded away by it. */
const SAME_POINT = 0.34;

/** A CSS-id-safe slug, derived from the option's KEY and never from its label. */
export function aimSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched one. One function, three readers. */
export function aimOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE ARITHMETIC, and it is the whole of what this file computes.
 *
 * The angle is in DEGREES because that is what a CSS `rotate()` takes, and it is left unwrapped in
 * (−180, 180]: every option on the beat this was written for lands inside (−90, 90), so no two
 * states are ever separated by the long way round. A beat whose readings would cross the seam would
 * see it in the render as an arrow spinning the wrong way, which is a thing to look at rather than
 * a thing to assert — this file cannot know which way round a reader should read a reversal.
 */
export function aimPlacement(
  tail: AimPoint,
  head: AimPoint,
): { angle: number; length: number } {
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const length = Math.hypot(dx, dy);
  if (!(length > 0))
    throw new Error(
      `aim: an arrow from (${tail.x}, ${tail.y}) points at its own tail — a displacement of zero ` +
        "has no direction, and a mark whose whole content is its direction cannot be drawn without one",
    );
  return { angle: (Math.atan2(dy, dx) * 180) / Math.PI, length };
}

const same = (a: AimPoint, b: AimPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y) <= SAME_POINT;

/**
 * EVERY REFUSAL, AGAINST WHAT THE BEAT ACTUALLY DRAWS — the plate's own arrows and the anchors of
 * its own answering layer, not against the declaration alone. A declaration checked only against
 * itself is a declaration that can be internally consistent and completely wrong about the picture.
 */
export function assertAimDeclaration(
  declaration: AimDeclaration | null | undefined,
  { arrows, anchors }: { arrows: AimArrow[]; anchors: AimAnchor[] },
  { width, height }: { width: number; height: number },
): void {
  if (!declaration) return;
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  )
    throw new Error(
      `aim: the frame must be positive, got ${width} x ${height}`,
    );
  if (!arrows.length)
    throw new Error(
      "aim: the plate draws no arrow, so there is nothing to aim",
    );

  const drawn = new Map(arrows.map((a) => [a.key, a]));
  if (drawn.size !== arrows.length)
    throw new Error(
      "aim: the plate draws two arrows under one key — a key names one mark",
    );

  for (const [what, text] of [
    ["label", declaration.label],
    ["noneLabel", declaration.noneLabel],
  ] as const)
    if (!text || !String(text).trim())
      throw new Error(
        `aim: the declaration has no ${what}, and a control nobody can read is not one`,
      );

  if (!drawn.has(declaration.protect))
    throw new Error(
      `aim: the protected key ${JSON.stringify(declaration.protect)} is not an arrow this plate ` +
        `draws — it draws ${[...drawn.keys()].map((k) => JSON.stringify(k)).join(", ")}`,
    );

  if (!declaration.options.length)
    throw new Error(
      "aim: a control with no option is a legend over an empty row",
    );

  // The default plate's own geometry, which every option is measured against and which the figure
  // below has to ride.
  for (const arrow of arrows) {
    for (const [what, point] of [
      ["tail", arrow.tail],
      ["head", arrow.head],
    ] as const)
      if (point.x < 0 || point.x > width || point.y < 0 || point.y > height)
        throw new Error(
          `aim: ${arrow.key}'s default ${what} sits at (${point.x}, ${point.y}), outside the ` +
            `${width} x ${height} frame — a mark drawn off the plate says nothing, silently`,
        );
    aimPlacement(arrow.tail, arrow.head);
  }
  assertFigure(declaration.figure, drawn, "the default plate");

  // ── THE ANSWERING LAYER ───────────────────────────────────────────────────────────────────────
  //
  // See the header. Both halves are checked, because each one alone passes a defect the other
  // catches: anchors only-on-real-points passes a state with no anchor at all, and every-state-
  // covered passes an anchor parked where its arrow never goes.
  if (!anchors.length)
    throw new Error(
      "aim: the beat hands over no answering anchor, so no state of this control can be asked",
    );
  const statesOf = new Map<string, AimPoint[]>();
  for (const arrow of arrows) statesOf.set(arrow.key, [arrow.tail, arrow.head]);
  for (const option of declaration.options)
    for (const head of option.heads)
      statesOf.get(head.key)?.push({ x: head.x, y: head.y });

  for (const anchor of anchors) {
    const states = statesOf.get(anchor.key);
    if (!states)
      throw new Error(
        `aim: an anchor names ${JSON.stringify(anchor.key)}, which is not an arrow this plate draws`,
      );
    if (!states.some((point) => same(point, anchor)))
      throw new Error(
        `aim: ${anchor.key}'s anchor sits at (${anchor.x}, ${anchor.y}), where that arrow never is ` +
          "in any declared state — a pointer resolving there would answer for a country nowhere " +
          "near it, which is the worst answer an interactive chart can give",
      );
  }
  for (const [key, states] of statesOf)
    for (const point of states)
      if (!anchors.some((anchor) => anchor.key === key && same(point, anchor)))
        throw new Error(
          `aim: ${key} stands at (${round3(point.x)}, ${round3(point.y)}) in one of its states and ` +
            "no anchor covers it — that state's arrow cannot be asked anything, which is the " +
            "defect a sheared streamgraph paid for before this file existed",
        );

  // ── THE OPTIONS ───────────────────────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const headSets: { slug: string; heads: Map<string, AimPoint> }[] = [];
  for (const option of declaration.options) {
    const slug = aimSlugOf(option.key);
    const at = `aim: the option ${JSON.stringify(option.label ?? option.key)}`;
    if (!slug)
      throw new Error(
        `${at} slugs to nothing — a key needs at least one letter or digit`,
      );
    if (slug === AIM_NONE_SLUG)
      throw new Error(
        `${at} slugs to ${JSON.stringify(AIM_NONE_SLUG)}, which is the untouched option's own id`,
      );
    if (seen.has(slug))
      throw new Error(
        `${at} slugs to ${JSON.stringify(slug)}, which another option already took`,
      );
    seen.add(slug);

    if (!option.label || !String(option.label).trim())
      throw new Error(`${at} has no visible words`);
    if (!option.announce || !option.announce.includes(option.label))
      throw new Error(
        `${at} announces ${JSON.stringify(option.announce)}, which does not contain its own visible ` +
          `label ${JSON.stringify(option.label)} — the WCAG 2.5.3 "label in name" failure`,
      );
    if (!option.note || !String(option.note).trim())
      throw new Error(
        `${at} reveals no sentence — a reader who is not looking at the plot would be told nothing ` +
          "by an option that changed it, and it is the only channel this control can be measured on",
      );
    assertFigure(option.figure, drawn, `${at}`);

    const heads = new Map<string, AimPoint>();
    for (const head of option.heads) {
      if (!drawn.has(head.key))
        throw new Error(
          `${at} aims ${JSON.stringify(head.key)}, which is not an arrow this plate draws`,
        );
      if (heads.has(head.key))
        throw new Error(`${at} aims ${JSON.stringify(head.key)} twice`);
      if (head.x < 0 || head.x > width || head.y < 0 || head.y > height)
        throw new Error(
          `${at} aims ${head.key} at (${round3(head.x)}, ${round3(head.y)}), outside the ` +
            `${width} x ${height} frame — the arrow would leave the plate and take its reading with it`,
        );
      aimPlacement(drawn.get(head.key)!.tail, { x: head.x, y: head.y });
      heads.set(head.key, { x: head.x, y: head.y });
    }
    const missing = [...drawn.keys()].filter((key) => !heads.has(key));
    if (missing.length)
      throw new Error(
        `${at} names ${heads.size} of the ${drawn.size} arrows this plate draws and forgets ` +
          `${missing.map((k) => JSON.stringify(k)).join(", ")} — half a plate on one reading and ` +
          "half on another is not a state of anything",
      );
    if (!heads.has(declaration.protect))
      throw new Error(
        `${at} does not aim the protected key ${JSON.stringify(declaration.protect)} — the arrow ` +
          "the plate accents and the headline names would stay at the default aim while the rest " +
          "of the picture swung away, which is the claim removed by a control",
      );

    const moved = [...heads].filter(
      ([key, head]) => !same(head, drawn.get(key)!.head),
    );
    if (!moved.length)
      throw new Error(
        `${at} aims every arrow exactly where the default plate already points it — that is the ` +
          "untouched view under a second name, which this format refuses at the render",
      );
    headSets.push({ slug, heads });
  }

  for (let i = 0; i < headSets.length; i += 1)
    for (let j = i + 1; j < headSets.length; j += 1) {
      const a = headSets[i];
      const b = headSets[j];
      if ([...a.heads].every(([key, head]) => same(head, b.heads.get(key)!)))
        throw new Error(
          `aim: the options ${JSON.stringify(a.slug)} and ${JSON.stringify(b.slug)} draw the same ` +
            "picture — two pills, one state, and a reader told they are choosing between them",
        );
    }
}

function assertFigure(
  figure: AimFigure | undefined,
  drawn: Map<string, AimArrow>,
  at: string,
): void {
  if (!figure || !figure.text || !String(figure.text).trim())
    throw new Error(
      `${at} prints no figure on the plate — the sentence under the control is for the reader who ` +
        "is not looking, and a state with nothing measured on it is a picture of a rearrangement",
    );
  if (!drawn.has(figure.key))
    throw new Error(
      `${at} rides its figure on ${JSON.stringify(figure.key)}, which is not an arrow this plate draws`,
    );
}

const round3 = (n: number) => Number(n.toFixed(3));

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function aimOptionsForMarkup(
  declaration: AimDeclaration | null | undefined,
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
      id: aimOptionId(idPrefix, AIM_NONE_SLUG),
      slug: AIM_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: aimOptionId(idPrefix, aimSlugOf(option.key)),
      slug: aimSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the rule `filterNotes`, `stackNotes`,
 * `levelNotes`, `floorNotes` and `holdNotes` all hold. A re-aimed view is an argument the reader
 * built, and an argument that is only a picture cannot be checked. The untouched option gets NO
 * note, because it is not a comparison: it is the claim.
 */
export function aimNotesForMarkup(
  declaration: AimDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: aimSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * Every figure the page prints on the plate, at the point it rides — the default plate's first,
 * under the reserved slug, then one per option. The beat turns these into its own absolutely
 * positioned words; this file says WHERE each one belongs and never how it is dressed.
 */
export function aimFiguresForMarkup(
  declaration: AimDeclaration | null | undefined,
  arrows: AimArrow[],
): { slug: string; key: string; text: string; x: number; y: number; above: boolean }[] {
  if (!declaration) return [];
  const drawn = new Map(arrows.map((a) => [a.key, a]));
  // WHICH SIDE OF ITS OWN HEAD A FIGURE SITS ON, and it is decided here because it is decided by the
  // SAME two points the aim is. A figure hung under a head that has risen above its tail lands on
  // the arrow's own shaft, and on the beat this was written for it landed on the subject's own name
  // as well — met in the render, in the counterfactual state, where France's head is four points
  // ABOVE its ring. So a figure goes above a head that rose and below one that did not; both are
  // fixed places for a fixed element, and nothing travels between them.
  const sideOf = (tail: AimPoint, head: { x: number; y: number }) => head.y < tail.y;
  const subject = drawn.get(declaration.figure.key)!;
  const out = [
    {
      slug: AIM_NONE_SLUG,
      key: declaration.figure.key,
      text: declaration.figure.text,
      x: subject.head.x,
      y: subject.head.y,
      above: sideOf(subject.tail, subject.head),
    },
  ];
  for (const option of declaration.options) {
    const head = option.heads.find((h) => h.key === option.figure.key)!;
    out.push({
      slug: aimSlugOf(option.key),
      key: option.figure.key,
      text: option.figure.text,
      x: head.x,
      y: head.y,
      above: sideOf(drawn.get(option.figure.key)!.tail, head),
    });
  }
  return out;
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `stackCss` and `floorCss` do.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED, and that is load-bearing here twice. `[data-stack-total]`
 * and `[data-stack-total="none"]` score identically — an attribute selector with a value is still one
 * attribute selector — so which wins is source order and nothing else; the blanket is emitted FIRST
 * and the default after it, and the same pair is emitted again inside each option's `:has()` scope,
 * where both score (1,3,0), blanket first again. A sankey on this branch rendered green with zero
 * ribbons lit for getting exactly this backwards.
 *
 * NO SELECTOR HERE IS GROUPED, for the reason `stack.ts` records: `A B, C` is `(A B), (C)` and the
 * second half would apply in every state of the page.
 */
export function aimCss(
  declaration: AimDeclaration | null | undefined,
  arrows: AimArrow[],
  {
    scope,
    idPrefix,
    swingMs,
    headUnits,
  }: {
    scope: string;
    idPrefix: string;
    /** How long an arrow takes to reach its new aim. Honoured only under `no-preference`. */
    swingMs: number;
    /**
     * THE ARROWHEAD'S OWN LENGTH, in the geometry's own units, and it is asked for rather than
     * assumed because of one thing an arrow can do that no other mark can: BE SHORTER THAN ITS OWN
     * HEAD. Austria's European weight moves 0,08 of a point, which is under one unit of this beat's
     * frame; a fixed head eight units long, drawn at that tip, would reach back past the tail and
     * point the wrong way — a mark overshooting its own origin, on the one country whose reading is
     * that it barely moved. So a head shorter than its own shaft is drawn whole and a head longer
     * than it is scaled down to fit, which keeps the apex exactly on the reading either way. The
     * scale is a component of the same interpolated list, so it swings with everything else.
     */
    headUnits: number;
  },
): string {
  if (!declaration) return "";
  if (!Number.isFinite(headUnits) || headUnits <= 0)
    throw new Error(`aim: the arrowhead's own length must be positive, got ${headUnits}`);
  const drawn = new Map(arrows.map((a) => [a.key, a]));
  const place = (tail: AimPoint, head: AimPoint) => {
    const { angle, length } = aimPlacement(tail, head);
    return {
      shaft: `translate(${round3(tail.x)}px, ${round3(tail.y)}px) rotate(${round3(angle)}deg) scale(${round3(length)}, 1)`,
      head:
        `translate(${round3(tail.x)}px, ${round3(tail.y)}px) rotate(${round3(angle)}deg) ` +
        `translate(${round3(length)}px, 0) scale(${round3(Math.min(1, length / headUnits))}, ${round3(Math.min(1, length / headUnits))})`,
    };
  };

  const lines: string[] = [
    `/* The aim this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with and floor.ts shears with, and the reason this control needs no script and`,
    `   survives one being blocked. */`,
    // See the header: an SVG element's initial `transform-box` is `view-box` and its initial
    // `transform-origin` is `50% 50%` — the CENTRE of the viewBox. A rotate is entirely decided by
    // it, and left alone every arrow would swing about the middle of the plate.
    `${scope} [data-aim-shaft] { transform-box: view-box; transform-origin: 0 0; }`,
    `${scope} [data-aim-head] { transform-box: view-box; transform-origin: 0 0; }`,
    // THE FIGURE EACH STATE PRINTS, AND IT IS SPELLED `data-stack-total` FOR THE SAME REASON THE
    // RADIO IDS ARE SPELLED `chart-stack-`: it is the format's discovery contract. `verify-web.mjs`
    // excludes exactly `[data-stack-total]`, `[data-fits-its-mark]` and `[data-level-rule]` from
    // "every argument-bearing word is drawn unconditionally", because a figure belonging to an
    // option nobody has chosen is not a word the default view is missing. A vocabulary inventing a
    // fourth spelling would have its own figures counted as words the page failed to draw — met
    // here, in a real browser, three directions at once, before it was renamed.
    `${scope} [data-stack-total] { display: none; }`,
    `${scope} [data-stack-total="${AIM_NONE_SLUG}"] { display: revert; }`,
    `${scope} [data-stack-note] { display: none; }`,
  ];
  for (const arrow of arrows) {
    const at = place(arrow.tail, arrow.head);
    lines.push(
      `${scope} [data-aim-shaft="${arrow.key}"] { transform: ${at.shaft}; }`,
      `${scope} [data-aim-head="${arrow.key}"] { transform: ${at.head}; }`,
    );
  }
  // The motion, and it is the only motion this control has — see the header for why it is a real
  // interpolation here and is not one in `floor.ts`. Under `reduce` the block does not exist, so
  // there is no transition to override and no branch anywhere.
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-aim-shaft] { transition: transform ${swingMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-aim-head] { transition: transform ${swingMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  );
  for (const option of declaration.options) {
    const slug = aimSlugOf(option.key);
    const at = `${scope}:has(#${aimOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} [data-stack-total] { display: none; }`,
      `${at} [data-stack-total="${slug}"] { display: revert; }`,
      `${at} [data-stack-note="${slug}"] { display: revert; }`,
    );
    for (const head of option.heads) {
      const placed = place(drawn.get(head.key)!.tail, { x: head.x, y: head.y });
      lines.push(
        `${at} [data-aim-shaft="${head.key}"] { transform: ${placed.shaft}; }`,
        `${at} [data-aim-head="${head.key}"] { transform: ${placed.head}; }`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * THE RULES THAT MAKE THE ATTRIBUTES DO ANYTHING, checked against the WHOLE WRITTEN PAGE.
 *
 * FOUND BY MUTATION, not by reasoning, and it is the same hole `descend.ts` records one vocabulary
 * over: dropping `aimCss` from the beat's own stylesheet — five lines — rendered GREEN at
 * `assertAimDeclaration`, green at `renderWeb`, and green through all 105 of `verify-web.mjs`'s
 * checks in three directions. Every check above reads a DECLARATION, and the declaration was still
 * perfect. What shipped was sixteen arrows collapsed to one-unit stubs at the corner of the viewBox
 * — an SVG element with no transform is drawn where its own coordinates put it, and this
 * vocabulary's coordinates live entirely in the stylesheet — with all four states' figures printed
 * at once over the top.
 *
 * `filter.ts` cannot have this hole, because `renderWeb` emits the filter's CSS itself from the
 * declaration. A vocabulary a BEAT brings with it has to emit its own rules, so it has to check its
 * own rules. Called by the runner on the file it just wrote, after `renderWeb` returns.
 */
export function assertOneAim(
  page: string,
  declaration: AimDeclaration | null | undefined,
  arrows: AimArrow[],
  { idPrefix }: { idPrefix: string },
): void {
  const markup = String(page);
  if (!declaration) {
    const stray = markup.match(/\sdata-aim-(?:shaft|head|ring)=/);
    if (stray)
      throw new Error(
        `aim: this beat declares no aim, but its markup carries a ${stray[0].trim()} attribute — ` +
          "declare the control or drop the attribute; a residue is how a beat ends up with marks " +
          "nothing places",
      );
    return;
  }
  const keys = arrows.map((a) => a.key);
  const known = new Set(keys);
  for (const [, which, key] of markup.matchAll(/\sdata-aim-(shaft|head)="([^"]*)"/g))
    if (!known.has(key))
      throw new Error(`aim: an element carries data-aim-${which}="${key}", which is not an arrow this plate draws`);
  for (const key of keys)
    for (const which of ["shaft", "head"])
      if (!markup.includes(`data-aim-${which}="${key}"`))
        throw new Error(
          `aim: ${key} is declared and the markup carries no data-aim-${which} for it — an arrow ` +
            "the control aims and the picture never draws",
        );

  const css = [...markup.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const need = (fragment: string, why: string) => {
    if (!css.includes(fragment))
      throw new Error(
        `aim: the page's stylesheet carries no rule ${JSON.stringify(fragment)} — ${why}. The whole ` +
          "of this control's geometry is generated CSS, so a page that lost it keeps every " +
          "attribute and draws none of the marks where they belong",
      );
  };
  for (const which of ["shaft", "head"])
    need(`[data-aim-${which}] { transform-box: view-box; transform-origin: 0 0; }`,
      `an SVG element's initial transform-origin is the CENTRE of the viewBox, so without this every arrow swings about the middle of the plate`);
  need(`[data-stack-total] { display: none; }`, "all four states' figures would print at once");
  need(`[data-stack-total="${AIM_NONE_SLUG}"] { display: revert; }`, "the default plate would print no figure at all");
  need(`[data-stack-note] { display: none; }`, "every option's sentence would print at once");
  for (const key of keys)
    for (const which of ["shaft", "head"])
      need(`[data-aim-${which}="${key}"] { transform: translate(`, `${key} would be drawn at the origin of the viewBox rather than at its own tail`);

  for (const option of declaration.options) {
    const slug = aimSlugOf(option.key);
    const at = `#${aimOptionId(idPrefix, slug)}:checked)`;
    for (const key of keys)
      for (const which of ["shaft", "head"])
        need(`${at} [data-aim-${which}="${key}"] { transform: translate(`,
          `choosing ${JSON.stringify(option.label)} would leave ${key} aimed where the default plate points it`);
    need(`${at} [data-stack-total] { display: none; }`, `choosing ${JSON.stringify(option.label)} would print two figures`);
    need(`${at} [data-stack-total="${slug}"] { display: revert; }`, `choosing ${JSON.stringify(option.label)} would print no figure`);
    need(`${at} [data-stack-note="${slug}"] { display: revert; }`, `choosing ${JSON.stringify(option.label)} would reveal no sentence`);
  }
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared an aim.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function aimChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "aim",
    notes: {
      reserve: "4.2em",
      why:
        "THREE LINES, RESERVED, AND THE NUMBER IS MEASURED RATHER THAN CHOSEN. The longest of this "
        + "control's sentences carries a total in TWh at both dates, a growth rate, a counterfactual "
        + "and the threshold the claim turns on, and it sets to two lines at 1440 and three from 1024 "
        + "down. Reserving fewer would push the plot down the moment an option was chosen, which is "
        + "the plot moving under the control this row exists to stop. Below about 700 it wraps "
        + "further and the plot does move; that is the narrow-width debt this format pays elsewhere "
        + "too, and it is stated here rather than hidden.",
    },
  });
}
