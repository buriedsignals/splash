// twin/skills/map-web/assets/restore.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image, `follow.ts` what may be followed through
// its ORDERED STEPS. `hold.ts` says which factor of a product may be HELD STILL. `descend.ts` says
// what may BECOME THE WHOLE. `floor.ts` says what the picture may STAND ON. `cutoff.ts` says where
// the claim's own line is drawn on a value axis. `reorder.ts` says what the same numbers look like
// somewhere else in a cycle. `count.ts` says which members of a fixed frame are counted in.
// `aim.ts` says WHERE a displacement points. `weigh.ts` says what a mark is WORTH. `benchmark.ts`
// says what the verdict is measured against. `datum.ts` says where a diverging ZERO sits.
// `qualify.ts` says what the axis even COUNTS. `side.ts` says which SIDE of an ordered scale each
// rung counts on. This file says **WHAT A DELIBERATELY DEFORMED MAP GIVES BACK OF THE GEOGRAPHY IT
// TRADED AWAY** — one set of equal cells, and a reader who can put each of them back where its
// country really is, and then at the size its country really has. Native radio inputs plus CSS
// generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state,
// not one byte of JavaScript), because that is the only kind of control this format can promise
// still works with the script absent.
//
// WHY A CARTOGRAM NEEDS THIS AND NO OTHER MAP TYPE MAY HAVE IT.
//
// Seven of the eight map types in this tree make the same promise, and it is the promise the common
// brief states in one line: A PLACE DOES NOT MOVE. A map mark carries a position that is DATA, not
// a layout decision, so a gesture that displaces a country is a gesture that lies — unless the
// reader asked for exactly that. The cartogram is the one named exception: it deforms IN ORDER TO
// MEASURE, trading recognisable geography for a quantity, and its own reference sheet says the
// grid variant "gives up EVERY positional reference a reader might use to relocate their own
// region". So it is also the one type for which the owner's first ruling — nothing moves without
// the reader seeing why — is satisfied BY THE MOVEMENT ITSELF, on one condition: the movement has
// to be the reader's own gesture and never a side effect of something else.
//
// What a cartogram hides is therefore not a class bound or a sub-dominant flow. It is the
// geography it sacrificed, and that sacrifice is in two separable pieces which this file keeps
// separate on purpose:
//
//   THE PLACE — where each region really is, in the beat's own camera.
//   THE SIZE  — what each region really weighs on a map drawn at one scale.
//
// Handing them back one at a time is what turns an assertion into a demonstration: on the beat this
// file was written for, giving back the PLACE does not move the headline average by a thousandth,
// and giving back the SIZE drops it twenty points onto the choropleth's own figure. A reader who
// does both in that order has proved, with their own hand, that a tile cartogram's distortion is a
// distortion of WEIGHT and not of position.
//
// WHY THE TRAVEL IS EXPRESSIBLE HERE, WHICH `side.ts` COULD NOT ALLOW.
//
// `side.ts` established the mechanism and refuses, at its core, any state that RESIZES a band:
// there is no continuous path between two rectangles of different widths that a reader could read
// as the same band, so a cut may only translate. That refusal is correct there and would be wrong
// here, because a cell is a SQUARE and a stage gives it ONE side. Going from one square to another
// square is a SIMILARITY — `translate() scale()`, uniform, one path, no morph and nothing
// approximated — and a reader reads a square that grows as the same square. The squareness is not
// checked, it is structural: a stage declares a centre and a single side, so there is nowhere to
// write a second factor and nothing that can flatten a country into a lozenge.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     restore: {
//       label: "Ce que la carte rend",          // the <legend> — the beat's own words
//       frame: { width: 1104, height: 828 },    // the viewBox every place must live inside
//       tiles: [                                // every cell, once, with what its NAME needs
//         { key: "FRA", label: "France", nameWidth: 58.2, nameHeight: 30, lift: "fill" },
//         …
//       ],
//       stages: [
//         {
//           key: "pays",                        // the FIRST stage is the default, and it IS the
//           label: "une case par pays",         // picture the page ships. It carries no note: it
//           announce: "une case par pays — …",  // is not a counterfactual, it is the claim.
//           places: [ { key: "FRA", cx: 318, cy: 502, side: 84, areaShare: 0.0244 }, … ],
//         },
//         …
//       ],
//     }
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
//
//   - A PLACE THAT LEAVES THE FRAME. A cell half outside the viewBox is a reading the reader cannot
//     take. No sibling vocabulary has a frame to leave: a band lives on an axis, a cell lives on a
//     sheet of paper.
//   - SIDES THAT DO NOT SAY THE AREA THE STAGE DECLARES. Every stage states, per cell, the share of
//     the drawing that cell's square claims to carry, and `side² / Σside²` is checked against it.
//     This is the "the drawing and the reading are two readings of one arithmetic" refusal in a
//     map's own units, and it is the exact way a page comes to print 44,9 % over a drawing that
//     does not draw it.
//   - A NAME ON A CELL THAT CANNOT HOLD IT. The static sibling's own rule — "the tile has to hold
//     its own name", measured on the tile that is DRAWN and never on the pitch it sits on, which
//     once shipped a 15px tile against a 16.4px floor. Under a control that rule is made once PER
//     STAGE, not once per page, and on a value-by-area stage it bites hard: the smallest square on
//     the beat this was written for is 1,9 units across.
//   - A NAME TAKEN OFF A CELL THAT COULD HOLD IT. The other half, and it is what makes the rule
//     structural rather than declared: this file DERIVES which names are drawn, from the sides and
//     the overlaps, and `assertOneRestore` refuses a written page that draws a different set. An
//     author does not get to quietly extinguish an inconvenient label.
//   - A DEFAULT STAGE THAT CANNOT NAME EVERY CELL. Forty anonymous squares is the failure the type
//     sheet files as this variant's own; the page a reader gets with no script is the default, and
//     it has to be a map rather than a pattern.
//   - A STAGE THAT MOVES NOTHING. Not one cell displaced or resized past the floor: that is the
//     default under a second name, which `directed-interaction.md` refuses.
//   - A CELL A STAGE DOES NOT PLACE, OR PLACES TWICE, OR PLACES WITHOUT BEING DECLARED. There is
//     ONE drawing and every stage has to say where all of it goes.
//   - A STAGE WITH NO SENTENCE, A DEFAULT THAT CARRIES ONE, AND AN ACCESSIBLE NAME THAT DOES NOT
//     CONTAIN ITS VISIBLE LABEL (WCAG 2.5.3) — the conventions every sibling vocabulary holds.
//   - AND, READ BACK OFF THE WRITTEN PAGE (`assertOneRestore`): a half-tagged cell, a drawing that
//     also answers, a drawing that is not `aria-hidden`, a stage with no hit plate, a vocabulary
//     that emits no rules, the blanket rule emitted AFTER the default plate's reveal, and cells
//     with no `transition` — which would make them jump.
//
// AND WHAT MOVES IS NOT WHAT ANSWERS. `interaction.mjs` resolves the mark under a pointer from
// `cx`/`cy` read ONCE at init, which no CSS transform ever updates. So the drawing is `aria-hidden`
// and takes no pointer event, and each stage gets its own transparent HIT PLATE whose points are
// baked at that stage's own coordinates and never move. The honest cost, stated rather than hidden
// and inherited from `reorder.ts` and `side.ts`: for the flight's duration the plate is already at
// the destination, so a reader who points MID-FLIGHT is answered about the cell that is ARRIVING.
// Nothing is ever answered from a place no cell will occupy.


/** One cell of the map, declared once for the whole page — there is only ever one drawing. */
export type RestoreTile = {
  key: string;
  /** What the cell is called, for messages. Never used to derive an id. */
  label: string;
  /** How wide the cell's own name block is, in the frame's user units, measured in the register it
   *  is actually drawn in. The caller measures it, because only the caller knows which typeface the
   *  direction resolved to; this file only decides what follows from the number. */
  nameWidth: number;
  /** How tall that same block is, ascent to descent over however many lines it takes. */
  nameHeight: number;
  /** How the cell lights under a pointer. `fill` for a cell that has ink to darken; `stroke` for a
   *  cell drawn OUTSIDE the ramp — a missing reading is hollow, and a hollow cell has no fill to
   *  darken from, so it answers on its edge. That distinction belongs to maps: no chart vocabulary
   *  has a mark whose whole meaning is that it carries no value. */
  lift: "fill" | "stroke";
};

/** Where one cell sits in one stage, and what its square claims to be worth. */
export type RestorePlace = {
  key: string;
  /** The centre, in the frame's user units. */
  cx: number;
  cy: number;
  /** WHERE THE COUNTRY REALLY IS, in this stage's own units — the centre the square would have if
   *  nothing else were on the sheet. It is not where the square is drawn, and the gap between the
   *  two IS the price of the relaxation, which `restoreDisplacementOf` reads and the beat prints.
   *  Optional, because the filed grid has an anchor for measurement only while a relaxed stage MUST
   *  carry one — `assertRestoreDeclaration` refuses a relaxed stage without it. */
  ax?: number;
  ay?: number;
  /** ONE side. A cell is a square in every stage, and this is where that is made structural rather
   *  than checked: there is no second number to write. */
  side: number;
  /** The share of the whole drawing this square claims to carry, in [0, 1]. Checked against the
   *  sides themselves. */
  areaShare: number;
};

/** One position of the control. The first declared is the default and carries no `note`. */
export type RestoreStage = {
  key: string;
  /** This stage's squares were RELAXED: seeded on the true centroids and pushed apart until no two
   *  overlap, each keeping its area exactly. Saying so is a promise that is then CHECKED — a
   *  relaxed stage that still piles squares, or that carries no anchors, or that displaces a square
   *  further than its ceiling, is refused. */
  relaxed?: boolean;
  /** How far this stage may displace a square from its true centre, as a share of the frame's
   *  width. Defaults to `RESTORE_DISPLACEMENT_CEILING`; a stage may tighten it, never loosen it. */
  ceiling?: number;
  /** The visible pill text. */
  label: string;
  /** The accessible name, which must CONTAIN the visible label (WCAG 2.5.3). */
  announce: string;
  /** The sentence this stage reveals. The default has none: it is the claim, not a counterfactual. */
  note?: string;
  places: RestorePlace[];
};

/** What a beat declares when it wants a map that can be put back. Absent/`null` means it wants none. */
export type RestoreDeclaration = {
  label: string;
  frame: { width: number; height: number };
  tiles: RestoreTile[];
  stages: RestoreStage[];
};

/** Breath between a name and the edge of the cell that holds it, in user units. A name flush against
 *  a 1px edge is a name the eye reads as touching the neighbour. */
export const RESTORE_NAME_BREATH = 6;

/** Below this, in user units, a cell has not moved and has not been resized. One thousandth of the
 *  frame is under a rendered pixel at every width this format ships at. */
export const RESTORE_STILL_FLOOR = 0.5;

/** How long a cell takes to reach its place. A JUDGEMENT, and a knob: slow enough that the eye can
 *  follow forty-one squares travelling at once, short enough that it is not an animation the reader
 *  waits out. Longer than `side.ts`'s 420 ms because the distance is a whole plate rather than a
 *  bar's width, and because a scale and a translation run together here. */
export const RESTORE_TRAVEL_MS = 560;

/** One clock for everything that moves, so the cells and their names arrive together. */
export const RESTORE_TRAVEL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** A CSS-id-safe slug, derived from a KEY and never from a label. */
export function restoreSlugOf(key: string): string {
  const slug = String(key)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`restore: the key ${JSON.stringify(key)} slugs to nothing`);
  return slug;
}

/** The radio id for a stage's slug. One function, three readers. */
export function restoreOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The key naming ONE CELL for good — the `data-mark` the format's own contract is keyed on. */
export function restoreMarkOf(key: string): string {
  return String(key);
}

/** The attributes the one travelling square carries. */
export function restoreCellAttrs(key: string): {
  "data-restore-cell": string;
  "data-mark": string;
} {
  return {
    "data-restore-cell": restoreMarkOf(key),
    "data-mark": restoreMarkOf(key),
  };
}

/** The attributes the cell's name group carries. Translated, NEVER scaled: a cell may grow by a
 *  factor of five, and a name that grew with it would be a typeface deformed by a datum. */
export function restoreNameAttrs(key: string): { "data-restore-name": string } {
  return { "data-restore-name": restoreMarkOf(key) };
}

/** The attributes one stage's transparent HIT PLATE carries. */
/**
 * The separator layer's tag. It is a SECOND element per cell, carrying no `data-mark`, because the
 * outline must not be what a pointer lights: `restoreMarkLiftCss` sets `fill` on the mark, and a
 * `fill: none` outline handed that rule would suddenly acquire a fill under the pointer.
 */
export function restoreEdgeAttrs(key: string): { "data-restore-edge": string } {
  return { "data-restore-edge": key };
}

/**
 * HOW CROWDED EACH STAGE REALLY IS, counted on the squares rather than asserted.
 *
 * A cartogram that gives a country back its true place makes squares COLLIDE, and the collision is
 * a true fact about the geography the grid traded away — it is not a layout bug to be nudged out.
 * But an opaque square painted over another opaque square deletes it, and a reader then sees one
 * blob whose outline belongs to nobody. This census is what lets the drawing decide, per stage and
 * from the geometry alone, whether it owes the reader a separator.
 */
export function restoreCrowdingOf(
  declaration: RestoreDeclaration,
): { slug: string; pairs: number; touched: string[] }[] {
  return declaration.stages.map((stage) => {
    const places = stage.places;
    const touched = new Set<string>();
    let pairs = 0;
    for (let i = 0; i < places.length; i += 1)
      for (let j = i + 1; j < places.length; j += 1) {
        const a = places[i];
        const b = places[j];
        if (overlaps(a.cx, a.cy, a.side, a.side, b.cx, b.cy, b.side, b.side)) {
          pairs += 1;
          touched.add(a.key);
          touched.add(b.key);
        }
      }
    return { slug: restoreSlugOf(stage.key), pairs, touched: [...touched] };
  });
}

export function restorePlateAttrs(slug: string): {
  "data-restore-plate": string;
} {
  return { "data-restore-plate": slug };
}

/**
 * THE DRAW ORDER, AND IT IS ONE ORDER FOR THE WHOLE PAGE.
 *
 * There is a single drawing, so the DOM order is fixed once and every stage inherits it. Largest
 * behind, smallest in front, ordered by the biggest side a cell ever takes — which is the only
 * order under which a value-by-area stage stays readable at all: with Russia at 455 units and Malta
 * at 1,9, the other order hides forty cells behind one.
 *
 * THE TIE-BREAK IS NOT COSMETIC, AND IT WAS FOUND BY LOOKING AT A RENDER. Ranking on the biggest
 * side alone left twenty-seven of this beat's forty-one cells tied — every cell whose value-by-area
 * square is SMALLER than the grid cell peaks at the same 84 units — so the order among them fell
 * back to the alphabet, and the value-by-area stage drew France behind Albania. Between two cells
 * that peak alike, the one that is bigger at its smallest goes behind; the key breaks what is left,
 * so the order is deterministic and two runs of the same beat write the same bytes. Measured: the
 * fix moved the stage's clear cells from 17 to 20 of 41 and the names it can draw from 10 to 11.
 */
export function restoreDrawOrder(declaration: RestoreDeclaration): string[] {
  const biggest = new Map<string, number>();
  const smallest = new Map<string, number>();
  for (const stage of declaration.stages)
    for (const place of stage.places) {
      biggest.set(place.key, Math.max(biggest.get(place.key) ?? 0, place.side));
      smallest.set(place.key, Math.min(smallest.get(place.key) ?? Infinity, place.side));
    }
  return declaration.tiles
    .map((tile) => tile.key)
    .sort(
      (a, b) =>
        (biggest.get(b) ?? 0) - (biggest.get(a) ?? 0) ||
        (smallest.get(b) ?? 0) - (smallest.get(a) ?? 0) ||
        (a < b ? -1 : a > b ? 1 : 0),
    );
}

const placeIndex = (stage: RestoreStage) => new Map(stage.places.map((p) => [p.key, p]));

const overlaps = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;

/**
 * HOW MANY CELLS A STAGE LEAVES CLEAR — a cell nothing drawn in front of it covers.
 *
 * This is the PRICE a stage charges, and the beat prints it. It is font-free on purpose: it is a
 * fact about squares, so it is the same number in all three directions, which is what lets a runner
 * write it into a sentence once instead of three times.
 */
export function restoreClearOf(
  declaration: RestoreDeclaration,
): { slug: string; clear: string[] }[] {
  const order = restoreDrawOrder(declaration);
  return declaration.stages.map((stage) => {
    const at = placeIndex(stage);
    const clear: string[] = [];
    for (let i = 0; i < order.length; i += 1) {
      const me = at.get(order[i]);
      if (!me) continue;
      let covered = false;
      for (let j = i + 1; j < order.length && !covered; j += 1) {
        const other = at.get(order[j]);
        if (other)
          covered = overlaps(
            me.cx,
            me.cy,
            me.side,
            me.side,
            other.cx,
            other.cy,
            other.side,
            other.side,
          );
      }
      if (!covered) clear.push(order[i]);
    }
    return { slug: restoreSlugOf(stage.key), clear };
  });
}

/**
 * WHICH NAMES A STAGE DRAWS, DERIVED AND NEVER DECLARED.
 *
 * Two conditions, both about the cell that is actually drawn at this stage:
 *
 *   1. the cell can HOLD the name — its side covers the name's own width and height plus breath;
 *   2. nothing drawn IN FRONT of the cell covers the name's box.
 *
 * Deriving it rather than taking it from the declaration is what turns "the tile has to hold its
 * own name" from a convention into a refusal: an author cannot keep a name on a 1,9-unit square,
 * and cannot take one off a square that could carry it to tidy a picture up. `assertOneRestore`
 * reads the written page back against this answer.
 */
export function restoreNamesOf(
  declaration: RestoreDeclaration,
): { slug: string; named: string[] }[] {
  const order = restoreDrawOrder(declaration);
  const tiles = new Map(declaration.tiles.map((t) => [t.key, t]));
  return declaration.stages.map((stage) => {
    const at = placeIndex(stage);
    const named: string[] = [];
    for (let i = 0; i < order.length; i += 1) {
      const me = at.get(order[i]);
      const tile = tiles.get(order[i]);
      if (!me || !tile) continue;
      const room = me.side - RESTORE_NAME_BREATH;
      if (!(tile.nameWidth <= room && tile.nameHeight <= room)) continue;
      let covered = false;
      for (let j = i + 1; j < order.length && !covered; j += 1) {
        const other = at.get(order[j]);
        if (other)
          covered = overlaps(
            me.cx,
            me.cy,
            tile.nameWidth,
            tile.nameHeight,
            other.cx,
            other.cy,
            other.side,
            other.side,
          );
      }
      if (!covered) named.push(order[i]);
    }
    return { slug: restoreSlugOf(stage.key), named };
  });
}

/**
 * THE TRAVEL'S OWN ARITHMETIC — where each cell goes, relative to the drawing as it is written.
 *
 * The one drawing is written at the DEFAULT stage's coordinates, so every displacement and every
 * scale below is measured from there. A stage's transform is `translate(dx, dy) scale(k)` with
 * `transform-box: fill-box` and the origin at the square's own centre, so the square's centre lands
 * on the stage's centre and the square grows about it. That is a similarity, which is an exact
 * continuous path between two squares — the reason this type may resize at all, argued in the
 * header.
 */
export function restoreTravelOf(declaration: RestoreDeclaration): {
  slug: string;
  moves: { key: string; dx: number; dy: number; k: number }[];
}[] {
  const first = placeIndex(declaration.stages[0]);
  return declaration.stages.map((stage) => ({
    slug: restoreSlugOf(stage.key),
    moves: stage.places.map((place) => {
      const home = first.get(place.key);
      if (!home)
        throw new Error(
          `restore travel: the stage ${JSON.stringify(stage.label)} places ${JSON.stringify(place.key)} ` +
            "and the default stage places no such cell. The drawing is written once, at the default " +
            "stage's coordinates; a cell with no home has nowhere to travel from.",
        );
      return {
        key: place.key,
        dx: place.cx - home.cx,
        dy: place.cy - home.cy,
        k: place.side / home.side,
      };
    }),
  }));
}

/**
 * THE RELAXATION, AND WHY IT IS THE INSTRUMENT RATHER THAN A FUDGE.
 *
 * Squares dropped on their true centroids COLLIDE, and badly: on the beat this file was written
 * for, 125 pairs over 38 of 41 cells at the true place and 40 pairs over 35 at the true area. That
 * collision is a true fact about the geography a tile grid trades away, and the first answer this
 * file shipped was to make it VISIBLE — a cased boundary around every square, which raised the
 * worst readable edge from 1,18:1 to 1,79:1. The owner read that page and called it illegible a
 * second time, and he was right: a visible pile is still a pile. Forty-one squares stacked into one
 * blob cannot be read no matter how well each outline is drawn.
 *
 * The established instrument for exactly this is a cartogram RELAXATION — Dorling's for circles,
 * DEMERS' for squares, which is this case. It holds three things at once:
 *
 *   THE AREA IS NEVER TOUCHED. A square's side is its quantity; the relaxation only ever moves
 *     centres, so `side² / Σside²` — the share the stage declares and `assertRestoreDeclaration`
 *     checks to 1e-9 — is exactly the same before and after. The number the page prints is drawn.
 *   THE ARRANGEMENT IS KEPT. Each square starts at its true centroid and is only ever pushed by a
 *     square it actually overlaps, along the axis it overlaps LEAST, so the cheapest separation is
 *     the one taken and nothing is re-sorted, re-packed or re-laid-out.
 *   THE OVERLAP GOES TO ZERO. That is the exit condition, not a target: the sweep repeats until no
 *     pair is closer than its own two half-sides plus the ground gap, and this function THROWS with
 *     the residue if it cannot get there.
 *
 * TWO CHOICES INSIDE IT, BOTH MEASURED RATHER THAN ASSUMED.
 *
 *   A pair is separated in proportion to the OTHER square's area, so a small country gives way to a
 *   large one. On a cartogram that is the meaningful weighting: a square's area is its quantity, so
 *   the reading with the most at stake in a position is the one that keeps it. It costs nothing on
 *   a stage of equal squares, where the two shares are one half each by construction.
 *
 *   Each sweep removes only `RESTORE_RELAX_DAMPING` of a pair's overlap. Removing all of it is the
 *   obvious thing to write and it is measurably worse: the pushes overshoot, neighbours ricochet,
 *   and the arrangement settles further from the truth than it needs to. Measured on the beat's own
 *   `lieu` stage: full pushes settle at a worst displacement of 18,2 % of the frame's width, damped
 *   pushes at 14,7 %, for the same zero overlaps.
 *
 * AND THEN THE WHOLE ASSEMBLY IS FITTED BACK INTO THE FRAME, once, by a single uniform scale about
 * its own centre. Uniform is the only kind allowed: it cannot re-introduce an overlap, and it leaves
 * every area SHARE untouched, which is the one quantity this page prints.
 *
 * WHAT THIS COSTS, AND THE COST IS THE READER'S TO SEE. A square no longer sits exactly where its
 * country is. `restoreDisplacementOf` measures that gap per stage — worst and median, in user units
 * and as a share of the frame's width — and the beat prints it. The comparison worth making is with
 * the filed grid, which charges the same price silently: on this beat the hand-drawn grid sits a
 * median 16,4 % of the frame's width from the true centroids, and the relaxed stage 6,5 %.
 */
export const RESTORE_RELAX_DAMPING = 0.7;

/** The ground the relaxation leaves between two squares, in the seed's user units. It is NOT
 *  cosmetic: each square is drawn with its own one-pixel outline, and two outlines that meet read as
 *  one line belonging to neither square. Three units is a shade under three device pixels at the
 *  width this format ships at — wider than the two half-strokes that meet in it, which is the whole
 *  requirement. */
export const RESTORE_RELAX_GAP = 3;

/** How far a relaxed stage may displace a square from its true centre before the page is refused
 *  rather than shipped, as a share of the frame's width. A quarter of the map is the point past
 *  which a reader relocating their own country would be wrong about which neighbour it sits by —
 *  the relocation being the entire thing this stage gives back. A stage may tighten it. */
export const RESTORE_DISPLACEMENT_CEILING = 0.25;

/** A square as it is handed to the relaxation: where its country really is, and the side its
 *  quantity earns it. Neither is negotiable; only the centre moves. */
export type RestoreSeed = { key: string; cx: number; cy: number; side: number };

export function restoreRelaxation(
  seed: RestoreSeed[],
  {
    frame,
    gap = RESTORE_RELAX_GAP,
    damping = RESTORE_RELAX_DAMPING,
    sweeps = 20000,
    where = "this stage",
  }: {
    frame: { width: number; height: number };
    gap?: number;
    damping?: number;
    sweeps?: number;
    where?: string;
  },
): {
  places: (RestoreSeed & { ax: number; ay: number })[];
  scale: number;
  sweeps: number;
} {
  const items = seed.map((s) => ({ key: s.key, cx: s.cx, cy: s.cy, side: s.side, ax: s.cx, ay: s.cy }));
  let used = 0;
  let live = 0;
  for (; used < sweeps; used += 1) {
    live = 0;
    for (let i = 0; i < items.length; i += 1)
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const need = (a.side + b.side) / 2 + gap;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const ox = need - Math.abs(dx);
        const oy = need - Math.abs(dy);
        if (ox <= 1e-9 || oy <= 1e-9) continue;
        live += 1;
        // The share each one gives up is the OTHER's area: a small country gives way to a large one.
        const ma = a.side * a.side;
        const mb = b.side * b.side;
        const both = ma + mb;
        if (ox < oy) {
          // Two squares sharing a centre have no direction to be pushed along; the key breaks the
          // tie so that two runs of the same beat write the same bytes.
          const way = dx === 0 ? (a.key < b.key ? -1 : 1) : Math.sign(dx);
          a.cx -= way * ox * damping * (mb / both);
          b.cx += way * ox * damping * (ma / both);
        } else {
          const way = dy === 0 ? (a.key < b.key ? -1 : 1) : Math.sign(dy);
          a.cy -= way * oy * damping * (mb / both);
          b.cy += way * oy * damping * (ma / both);
        }
      }
    if (live === 0) break;
  }
  if (live > 0)
    throw new Error(
      `${where}: the relaxation still leaves ${live} pair(s) of squares overlapping after ${used} ` +
        "sweeps. The areas are exact and may not be touched, so what is left to give is the frame: " +
        "either the squares are too big for the sheet they are being put back on, or two centres " +
        "coincide. Shipping the pile is not the third option — the owner has refused it twice.",
    );

  const loX = Math.min(...items.map((p) => p.cx - p.side / 2));
  const hiX = Math.max(...items.map((p) => p.cx + p.side / 2));
  const loY = Math.min(...items.map((p) => p.cy - p.side / 2));
  const hiY = Math.max(...items.map((p) => p.cy + p.side / 2));
  const scale = Math.min(frame.width / (hiX - loX), frame.height / (hiY - loY));
  const ox = (frame.width - (hiX - loX) * scale) / 2 - loX * scale;
  const oy = (frame.height - (hiY - loY) * scale) / 2 - loY * scale;
  return {
    scale,
    sweeps: used,
    places: items.map((p) => ({
      key: p.key,
      cx: ox + p.cx * scale,
      cy: oy + p.cy * scale,
      side: p.side * scale,
      // The anchor rides the same transform, so the displacement below is measured in the frame the
      // reader is actually looking at rather than in the space the sweep happened to run in.
      ax: ox + p.ax * scale,
      ay: oy + p.ay * scale,
    })),
  };
}

/**
 * WHAT THE RELAXATION COST, PER STAGE — the number the owner is owed and the one nobody was
 * measuring when a page full of collisions rendered green.
 *
 * Read off the anchors a stage declares, in that stage's own drawn frame, which is the frame the
 * reader sees. A stage that declares no anchors reports none rather than pretending to zero: the
 * filed grid is measurable this way too, and on this beat it is the comparison that matters, since
 * a hand-drawn tile grid displaces every country far further than the relaxation does and has never
 * said so.
 */
export function restoreDisplacementOf(declaration: RestoreDeclaration): {
  slug: string;
  relaxed: boolean;
  anchored: boolean;
  worst: { key: string; units: number; share: number } | null;
  median: { units: number; share: number } | null;
}[] {
  return declaration.stages.map((stage) => {
    const slug = restoreSlugOf(stage.key);
    const anchored = stage.places.every(
      (p) => Number.isFinite(p.ax as number) && Number.isFinite(p.ay as number),
    );
    if (!anchored)
      return { slug, relaxed: !!stage.relaxed, anchored, worst: null, median: null };
    const gaps = stage.places
      .map((p) => ({ key: p.key, units: Math.hypot(p.cx - (p.ax as number), p.cy - (p.ay as number)) }))
      .sort((a, b) => a.units - b.units);
    const mid = gaps[Math.floor(gaps.length / 2)];
    const worst = gaps[gaps.length - 1];
    return {
      slug,
      relaxed: !!stage.relaxed,
      anchored,
      worst: { key: worst.key, units: worst.units, share: worst.units / declaration.frame.width },
      median: { units: mid.units, share: mid.units / declaration.frame.width },
    };
  });
}

/**
 * Everything that can be refused before a single element is written.
 *
 * `where` is quoted into every message so a runner rendering three directions says which one.
 */
export function assertRestoreDeclaration(
  declaration: RestoreDeclaration | null | undefined,
  where = "this beat",
): void {
  if (!declaration) return;
  const { frame, tiles, stages } = declaration;
  if (!frame || !(frame.width > 0) || !(frame.height > 0))
    throw new Error(`${where}: restore needs a frame with a positive width and height`);
  if (!Array.isArray(tiles) || tiles.length === 0)
    throw new Error(`${where}: restore declares no cells, so there is no map to give back`);
  if (!Array.isArray(stages) || stages.length < 2)
    throw new Error(
      `${where}: restore declares ${stages?.length ?? 0} stage(s). A control with one position is a ` +
        "picture with a pill drawn over it.",
    );

  const keys = new Set<string>();
  for (const tile of tiles) {
    if (keys.has(tile.key))
      throw new Error(`${where}: the cell ${JSON.stringify(tile.key)} is declared twice`);
    keys.add(tile.key);
    if (!(tile.nameWidth >= 0) || !(tile.nameHeight >= 0))
      throw new Error(
        `${where}: the cell ${JSON.stringify(tile.key)} declares no measured size for its own name. ` +
          "Whether a cell can hold its name is the rule this type turns on, and it cannot be guessed.",
      );
    if (tile.lift !== "fill" && tile.lift !== "stroke")
      throw new Error(
        `${where}: the cell ${JSON.stringify(tile.key)} lights as ${JSON.stringify(tile.lift)}. A cell ` +
          "either has ink to darken (`fill`) or is drawn outside the ramp and answers on its edge " +
          "(`stroke`) — there is no third way for a mark to say it was pointed at.",
      );
  }

  const slugs = new Set<string>();
  stages.forEach((stage, index) => {
    const slug = restoreSlugOf(stage.key);
    if (slugs.has(slug)) throw new Error(`${where}: two stages slug to ${JSON.stringify(slug)}`);
    slugs.add(slug);
    if (!stage.label?.trim()) throw new Error(`${where}: a stage carries no visible label`);
    if (!stage.announce?.includes(stage.label))
      throw new Error(
        `${where}: the stage ${JSON.stringify(stage.label)} announces itself as ` +
          `${JSON.stringify(stage.announce)}, which does not contain its visible label. A reader who ` +
          "says what they see and a reader who hears the name have to be talking about the same pill " +
          "(WCAG 2.5.3).",
      );
    if (index === 0 && stage.note)
      throw new Error(
        `${where}: the default stage ${JSON.stringify(stage.label)} reveals a sentence. The default is ` +
          "not a counterfactual — it is the claim the title already states.",
      );
    if (index > 0 && !stage.note?.trim())
      throw new Error(
        `${where}: the stage ${JSON.stringify(stage.label)} reveals no sentence. A reader who is not ` +
          "looking at the plate has to be told what the stage gave back.",
      );

    const seen = new Set<string>();
    let sumSquares = 0;
    for (const place of stage.places) {
      if (!keys.has(place.key))
        throw new Error(
          `${where}: the stage ${JSON.stringify(stage.label)} places the undeclared cell ${JSON.stringify(place.key)}`,
        );
      if (seen.has(place.key))
        throw new Error(
          `${where}: the stage ${JSON.stringify(stage.label)} places ${JSON.stringify(place.key)} twice`,
        );
      seen.add(place.key);
      if (!Number.isFinite(place.cx) || !Number.isFinite(place.cy) || !(place.side > 0))
        throw new Error(
          `${where}: the cell ${JSON.stringify(place.key)} has no finite square in ${JSON.stringify(stage.label)}`,
        );
      const half = place.side / 2;
      if (
        place.cx - half < -1e-6 ||
        place.cx + half > frame.width + 1e-6 ||
        place.cy - half < -1e-6 ||
        place.cy + half > frame.height + 1e-6
      )
        throw new Error(
          `${where}: in ${JSON.stringify(stage.label)} the cell ${JSON.stringify(place.key)} runs from ` +
            `(${(place.cx - half).toFixed(1)}, ${(place.cy - half).toFixed(1)}) to ` +
            `(${(place.cx + half).toFixed(1)}, ${(place.cy + half).toFixed(1)}) in a ` +
            `${frame.width} x ${frame.height} frame. A place the reader cannot see is not a place, and ` +
            "a square clipped by the viewBox no longer draws the area it claims.",
        );
      sumSquares += place.side * place.side;
    }
    if (seen.size !== keys.size)
      throw new Error(
        `${where}: the stage ${JSON.stringify(stage.label)} places ${seen.size} of ${keys.size} cells. ` +
          "There is ONE drawing and every stage has to say where all of it goes.",
      );

    // THE SIDES MUST SAY THE AREA THE STAGE DECLARES. The drawing and the reading are two readings
    // of one arithmetic, or they are two arithmetics and the page prints a figure it does not draw.
    let shareSum = 0;
    for (const place of stage.places) {
      if (!(place.areaShare >= 0))
        throw new Error(
          `${where}: ${JSON.stringify(place.key)} declares no area share in ${JSON.stringify(stage.label)}`,
        );
      shareSum += place.areaShare;
    }
    if (Math.abs(shareSum - 1) > 1e-6)
      throw new Error(
        `${where}: the area shares of ${JSON.stringify(stage.label)} sum to ${shareSum.toFixed(6)}, not 1`,
      );
    for (const place of stage.places) {
      const drawn = (place.side * place.side) / sumSquares;
      if (Math.abs(drawn - place.areaShare) > 1e-9)
        throw new Error(
          `${where}: in ${JSON.stringify(stage.label)} the cell ${JSON.stringify(place.key)} is drawn at ` +
            `${(drawn * 100).toFixed(6)} % of the plate and declares ${(place.areaShare * 100).toFixed(6)} %. ` +
            "A cartogram's square IS its number; a square that draws one share and reports another is " +
            "the exact way a page comes to print an average over a drawing that does not carry it.",
        );
    }
  });

  // EVERY STAGE BUT THE DEFAULT MOVES SOMETHING.
  const travel = restoreTravelOf(declaration);
  for (const stage of travel.slice(1)) {
    const live = stage.moves.some(
      (m) =>
        Math.abs(m.dx) > RESTORE_STILL_FLOOR ||
        Math.abs(m.dy) > RESTORE_STILL_FLOOR ||
        Math.abs(m.k - 1) * (declaration.stages[0].places.find((p) => p.key === m.key)?.side ?? 0) >
          RESTORE_STILL_FLOOR,
    );
    if (!live)
      throw new Error(
        `${where}: the stage ${JSON.stringify(stage.slug)} moves and resizes nothing past ` +
          `${RESTORE_STILL_FLOOR} user units. That is the default's picture under a second name, which ` +
          "`directed-interaction.md` refuses.",
      );
  }

  // A RELAXED STAGE KEEPS ITS PROMISE, OR IT IS NOT SHIPPED.
  //
  // `relaxed` says three things at once — the areas were held exact, the squares were pushed apart
  // until none overlapped, and each one stayed as close to its true centre as that allowed — and all
  // three are checked here rather than trusted. The area half is already checked above, on every
  // stage. What is left is the overlap and the price.
  const crowding = new Map(restoreCrowdingOf(declaration).map((c) => [c.slug, c]));
  const displacement = new Map(restoreDisplacementOf(declaration).map((d) => [d.slug, d]));
  for (const stage of stages) {
    if (!stage.relaxed) continue;
    const slug = restoreSlugOf(stage.key);
    const spread = displacement.get(slug);
    if (!spread?.anchored)
      throw new Error(
        `${where}: the stage ${JSON.stringify(stage.label)} says its squares were relaxed and does ` +
          "not say where their countries really are. A displacement nobody can measure is a " +
          "displacement nobody has to report, and the reader is owed the price of this method.",
      );
    const pile = crowding.get(slug);
    if (pile && pile.pairs > 0)
      throw new Error(
        `${where}: the stage ${JSON.stringify(stage.label)} says its squares were relaxed and still ` +
          `piles ${pile.pairs} pair(s) over ${pile.touched.length} of ${tiles.length} cells. ` +
          "Relaxed means the overlap went to zero; a stage that claims it and draws a pile is the " +
          "picture the owner refused twice, under a word that says it was fixed.",
      );
    const ceiling = stage.ceiling ?? RESTORE_DISPLACEMENT_CEILING;
    if (spread.worst && spread.worst.share > ceiling)
      throw new Error(
        `${where}: in ${JSON.stringify(stage.label)} the relaxation pushes ` +
          `${JSON.stringify(spread.worst.key)} ${spread.worst.units.toFixed(1)} user units — ` +
          `${(spread.worst.share * 100).toFixed(1)} % of the frame's width — off its own centroid, ` +
          `past the ${(ceiling * 100).toFixed(0)} % this stage allows. Past that a reader looking for ` +
          "their own country finds it beside the wrong neighbour, which is the one thing giving the " +
          "place back was for.",
      );
  }

  // THE DEFAULT PLATE MUST BE A MAP AND NOT A PATTERN. Forty anonymous squares is the failure this
  // variant's own type sheet files; the default is also the page a reader with no script receives.
  const named = restoreNamesOf(declaration);
  const missing = declaration.tiles
    .map((t) => t.key)
    .filter((key) => !named[0].named.includes(key));
  if (missing.length)
    throw new Error(
      `${where}: the default stage cannot name ${missing.length} of its ${declaration.tiles.length} ` +
        `cells (${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ", …" : ""}). A reader has to be ` +
        "able to say which country a cell is, or the geography it preserves is decoration — and the " +
        "default is the plate a reader with no script gets.",
    );
}

/** The stages a component draws, in reading order: the default first. */
export function restoreStagesForMarkup(
  declaration: RestoreDeclaration | null | undefined,
  idPrefix: string,
): {
  slug: string;
  id: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  if (!declaration) return [];
  return declaration.stages.map((stage, index) => {
    const slug = restoreSlugOf(stage.key);
    return {
      slug,
      id: restoreOptionId(idPrefix, slug),
      label: stage.label,
      announce: stage.announce,
      isDefault: index === 0,
    };
  });
}

/** The sentences the control owes. The default gets none. */
export function restoreNotesForMarkup(
  declaration: RestoreDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.stages
    .filter((stage) => stage.note)
    .map((stage) => ({
      slug: restoreSlugOf(stage.key),
      text: stage.note as string,
    }));
}

/**
 * THE CELL THE POINTED POINT SPEAKS FOR, LIT ACROSS THE SPLIT between the drawing and the hit
 * plate. `interaction.mjs` carries `.mark-active` with `svg.querySelectorAll` INSIDE one `<svg>`,
 * and there are four here. The mechanism is `count.ts`'s and `side.ts`'s, reused rather than
 * re-invented, including its finding that `:focus` in the selector gives a keyboard reader the lift
 * the script used to be the only source of.
 *
 * THE ONE THING THIS FILE ADDS, AND IT IS A MAP'S OWN. A cell drawn OUTSIDE the ramp — the reading
 * this tree's treatment `a-missing-cell-is-drawn-as-missing` requires to be hollow — has no fill to
 * darken from. Painting one on hover would turn "no reading" into a class under the reader's
 * pointer, which is the single thing that treatment exists to prevent. So a hollow cell lights on
 * its STROKE. No chart vocabulary needs this: no chart has a mark whose whole meaning is the
 * absence of a value.
 */
export function restoreMarkLiftCss({
  scope,
  tiles,
}: {
  scope: string;
  tiles: { key: string; lift: "fill" | "stroke" }[];
}): string {
  if (tiles.length === 0) return "";
  const when = (key: string, state: string) =>
    `${scope} .chart-plot:has(.pt[data-mark-ref="${key}"]${state})`;
  const lines: string[] = [
    `/* The cell the pointed point speaks for, lit across the drawing/hit-plate split, in the dose`,
    `   the beat sought against that cell's OWN painted fill (--mark-active, set on the cell). A cell`,
    `   drawn outside the ramp has no fill to darken and lights on its edge instead. */`,
  ];
  for (const tile of tiles) {
    const property = tile.lift === "stroke" ? "stroke" : "fill";
    lines.push(
      `${when(tile.key, ".pt-active")} [data-mark="${tile.key}"],`,
      `${when(tile.key, ":focus")} [data-mark="${tile.key}"] { ${property}: var(--mark-active); }`,
    );
  }
  return lines.join("\n");
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as with it on —
 * and the empty string returned for a beat with no declaration is what makes "no dead CSS" literal,
 * exactly as `filterCss`, `floorCss` and `sideCss` do.
 *
 * WHAT `display` SWAPS IS NEVER THE PICTURE: the cells are ONE drawing and they TRAVEL. What is
 * swapped is the transparent hit plates, the line of average and the revealed sentence.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `svg.chart[data-restore-plate]` and
 * `svg.chart[data-restore-plate="<slug>"]` score identically, so which wins is source order and
 * nothing else; every blanket is emitted FIRST and the default's reveal after it. A sankey on this
 * branch rendered green with zero ribbons lit for getting exactly this backwards.
 *
 * NO SELECTOR HERE IS GROUPED, for the defect `stack.ts` records at length: a descendant prefix
 * binds to the first selector of a group only.
 *
 * EVERY TRANSITION IS EMITTED LAST, INSIDE `@media (prefers-reduced-motion: no-preference)`, where
 * `reduce` cannot reach it — and the declarations that SET the geometry are outside that query, so
 * a reader who asks for no motion gets the new picture already in place rather than no picture.
 *
 * IT EMITS `data-stack-note` AND `data-stack-total`, WHICH IS NOT A COPY-PASTE SLIP. Those two
 * strings are the FORMAT'S DISCOVERY CONTRACT for a control that moves the picture, owes the reader
 * a sentence and prints a figure on the plot: `interaction-plan.ts` reads the sentence off
 * `data-stack-note`, and `verify-web.mjs`'s "every argument-bearing word is drawn unconditionally"
 * excludes exactly `[data-stack-total]`. `side.ts`, `aim.ts` and `qualify.ts` all make the same
 * choice for the same reason.
 */
export function restoreCss(
  declaration: RestoreDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    travelMs = RESTORE_TRAVEL_MS,
    casing = 5,
  }: { scope: string; idPrefix: string; travelMs?: number; casing?: number },
): string {
  if (!declaration) return "";
  const round = (n: number) => Number(n.toFixed(3));
  const travel = restoreTravelOf(declaration);
  const names = new Map(restoreNamesOf(declaration).map((s) => [s.slug, new Set(s.named)]));
  const crowded = new Map(restoreCrowdingOf(declaration).map((c) => [c.slug, c.pairs > 0]));
  /* NO DEAD CSS, AND THE CENSUS IS WHAT DECIDES. The separator layer answers ONE question — what a
     square that is painted over another square still shows of itself — and a map whose every stage
     is relaxed to zero overlap never asks it. Emitting the layer's rules anyway would leave a
     stylesheet talking about elements no page draws, which is exactly what `filterCss`, `floorCss`
     and `sideCss` return the empty string rather than do. `assertOneRestore` makes the other half
     of this true: the moment a stage does collide, the outlines become compulsory again. */
  const collides = [...crowded.values()].some(Boolean);
  const homeSide = new Map(declaration.stages[0].places.map((p) => [p.key, p.side]));
  /* THE CASING IS IN USER UNITS AND THE SQUARE IT CASES IS NOT A FIXED SIZE. Across these stages a
     side runs from 455 units to 1,9 — a ratio of 245 to 1 — so a casing that is a constant on the
     screen swallows the smallest squares whole: at the true-area stage Malta is 1,3 device pixels
     across, and a three-pixel band centred on its outline would erase the country it was drawn to
     protect. The width is therefore capped at a FIFTH of the square's own side, and divided by the
     scale the stage applies so that what is painted is that width and not that width times k. */
  const casingFor = (key: string, k: number) =>
    Math.min(casing / (k || 1), (homeSide.get(key) ?? 0) / 5);
  const defaultSlug = travel[0].slug;

  const lines: string[] = [
    `/* What this map gives back: ${declaration.stages.length} stages over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked.`,
    `   The cells are ONE drawing and they TRAVEL; what display still swaps is the transparent hit`,
    `   plates, the line of average and the revealed sentence. */`,
    `${scope} [data-stack-note] { display: none; }`,
    `${scope} [data-stack-total] { display: none; }`,
    `${scope} svg.chart[data-restore-plate] { display: none; }`,
    `${scope} svg.chart[data-restore-plate="${defaultSlug}"] { display: block; }`,
    `${scope} [data-stack-total="${defaultSlug}"] { display: block; }`,
    `/* A transform has to EXIST on the element at rest for a transition to have anything to run`,
    `   from, so the default stage's own place is written as a translation of zero and a scale of`,
    `   one rather than left unsaid. \`fill-box\` puts the origin at the square's OWN centre, which`,
    `   is what makes the change of size a similarity about the cell rather than about the corner`,
    `   of the viewBox. Generated here and never inline: an inline transform wins against every`,
    `   rule below it, and the cells would stand still while the picture around them changed. */`,
    `${scope} [data-restore-cell] { transform-box: fill-box; transform-origin: center; transform: translate(0px, 0px) scale(1); }`,
    `/* The name TRAVELS with its cell and is never scaled by it. */`,
    `${scope} [data-restore-name] { transform: translate(0px, 0px); opacity: 1; }`,
    `/* THE SEPARATOR TRAVELS TOO, and it is revealed BY THE CENSUS rather than by an author. In a`,
    `   stage where nothing collides it is off, and the plate is exactly the picture the filed grid`,
    `   always was; in a stage where squares genuinely pile up it is on, and every square keeps a`,
    `   boundary of its own instead of dissolving into whichever fill was painted last. \`opacity\``,
    `   on an always-rendered element, never \`display\`, so the layer can be interpolated like`,
    `   everything else that changes here. */`,
    ...(collides
      ? [
          `${scope} [data-restore-edge] { transform-box: fill-box; transform-origin: center; transform: translate(0px, 0px) scale(1); opacity: ${crowded.get(defaultSlug) ? 1 : 0}; }`,
          ...declaration.tiles.map(
            (tile) =>
              `${scope} [data-restore-edge="${tile.key}"][data-restore-cased] { stroke-width: ${round(casingFor(tile.key, 1))}; }`,
          ),
        ]
      : []),
  ];
  for (const key of declaration.tiles.map((t) => t.key))
    if (!names.get(defaultSlug)?.has(key))
      lines.push(`${scope} [data-restore-name="${key}"] { opacity: 0; }`);

  for (const stage of travel) {
    const on = `${scope}:has(#${restoreOptionId(idPrefix, stage.slug)}:checked)`;
    lines.push(
      `${on} svg.chart[data-restore-plate] { display: none; }`,
      `${on} svg.chart[data-restore-plate="${stage.slug}"] { display: block; }`,
      `${on} [data-stack-total] { display: none; }`,
      `${on} [data-stack-total="${stage.slug}"] { display: block; }`,
    );
    const named = names.get(stage.slug) ?? new Set<string>();
    for (const move of stage.moves) {
      const still =
        Math.abs(move.dx) <= 1e-6 && Math.abs(move.dy) <= 1e-6 && Math.abs(move.k - 1) <= 1e-9;
      if (!still)
        lines.push(
          `${on} [data-restore-cell="${move.key}"] { transform: translate(${round(move.dx)}px, ${round(move.dy)}px) scale(${round(move.k)}); }`,
          ...(collides
            ? [
                `${on} [data-restore-edge="${move.key}"] { transform: translate(${round(move.dx)}px, ${round(move.dy)}px) scale(${round(move.k)}); }`,
                `${on} [data-restore-edge="${move.key}"][data-restore-cased] { stroke-width: ${round(casingFor(move.key, move.k))}; }`,
              ]
            : []),
          `${on} [data-restore-name="${move.key}"] { transform: translate(${round(move.dx)}px, ${round(move.dy)}px); }`,
        );
      // The opacity rule is emitted for EVERY cell of every stage, not only for the ones that
      // change: the base rule above is written for the DEFAULT stage's answer, and a cell the
      // default hides but this stage shows needs to be told so.
      lines.push(
        `${on} [data-restore-name="${move.key}"] { opacity: ${named.has(move.key) ? 1 : 0}; }`,
      );
    }
    if (collides)
      lines.push(`${on} [data-restore-edge] { opacity: ${crowded.get(stage.slug) ? 1 : 0}; }`);
    const note = declaration.stages.find((s) => restoreSlugOf(s.key) === stage.slug)?.note;
    if (note) lines.push(`${on} [data-stack-note="${stage.slug}"] { display: revert; }`);
  }

  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  /* ONE CLOCK. The square crosses and grows on one transform, and its name crosses on another;`,
    `     same duration, same easing, so a cell and the word naming it arrive together. */`,
    `  ${scope} [data-restore-cell] { transition: transform ${travelMs}ms ${RESTORE_TRAVEL_EASING}; }`,
    `  ${scope} [data-restore-name] { transition: transform ${travelMs}ms ${RESTORE_TRAVEL_EASING}, opacity ${travelMs}ms ${RESTORE_TRAVEL_EASING}; }`,
    ...(collides
      ? [
          `  ${scope} [data-restore-edge] { transition: transform ${travelMs}ms ${RESTORE_TRAVEL_EASING}, opacity ${travelMs}ms ${RESTORE_TRAVEL_EASING}, stroke-width ${travelMs}ms ${RESTORE_TRAVEL_EASING}; }`,
        ]
      : []),
    `}`,
  );
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place these refusals can be made.
 *
 * `filter.ts` earned the half-tagged one; `descend.ts` earned the "the vocabulary emitted no rules"
 * one by mutation, because dropping the stylesheet call left every plate drawn on top of every
 * other while every attribute-level check stayed green; `weigh.ts` earned the ordering one.
 *
 * Three are this page's own shape: a drawing that could answer would answer from where its cells
 * USED to be; a stage with no travel rule is a stage whose cells jump; and a page that draws a
 * different set of names from the one `restoreNamesOf` derives has quietly overruled the rule that
 * a cell has to hold its own name.
 */
export function assertOneRestore(
  html: string,
  declaration: RestoreDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const slugs = declaration.stages.map((stage) => restoreSlugOf(stage.key));

  const tags = String(html).match(/<[a-zA-Z][^>]*\sdata-restore-cell="[^"]*"[^>]*>/g) ?? [];
  if (tags.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-restore-cell\`. The pills would be drawn over a ` +
        "picture they cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  const drawn = new Set<string>();
  for (const tag of tags) {
    const cell = /\sdata-restore-cell="([^"]*)"/.exec(tag);
    const mark = /\sdata-mark="([^"]*)"/.exec(tag);
    if (!cell || !mark || cell[1] !== mark[1])
      throw new Error(
        `${where}: the cell ${JSON.stringify(cell?.[1] ?? "?")} carries ` +
          `${mark ? `data-mark="${mark[1]}"` : "no data-mark"}. A cell tagged for the travel and not ` +
          "for the format's own mark contract is lit by nothing when a reader points at it, and a " +
          "cell tagged the other way round travels nowhere.",
      );
    drawn.add(cell[1]);
  }
  for (const tile of declaration.tiles)
    if (!drawn.has(tile.key))
      throw new Error(
        `${where}: the cell ${JSON.stringify(tile.key)} is declared and the page draws none. A ` +
          "country with a reading and no square is a figure the reader is asked to take on trust.",
      );

  // THE DRAWING MUST NOT ANSWER, AND IT MUST NOT BE OFFERED TWICE TO A SCREEN READER.
  for (const chunk of String(html)
    .split(/<svg\b/)
    .slice(1)) {
    const close = chunk.indexOf(">");
    const head = close < 0 ? chunk : chunk.slice(0, close);
    const ends = chunk.indexOf("</svg>");
    const body = ends < 0 ? chunk : chunk.slice(0, ends);
    if (!/\sdata-restore-cell="/.test(body)) continue;
    if (/class="pt"/.test(body))
      throw new Error(
        `${where}: the <svg> that draws the travelling cells also carries the points that answer. ` +
          "`interaction.mjs` resolves the mark under a pointer from coordinates read ONCE at init, " +
          "which no CSS transform ever updates, so every one of those points would answer for the " +
          "place its cell has left. The drawing and the hit plates are separate <svg>s on purpose.",
      );
    if (!/aria-hidden="true"/.test(head))
      throw new Error(
        `${where}: the <svg> that draws the travelling cells is not \`aria-hidden\`. It is a picture ` +
          "of the data and not a way to ask it anything — the hit plates carry the readings, and a " +
          "screen reader offered both would meet every country twice.",
      );
  }

  for (const slug of slugs) {
    if (!String(html).includes(`data-restore-plate="${slug}"`))
      throw new Error(
        `${where}: the stage ${JSON.stringify(slug)} is declared and the page carries no hit plate ` +
          "for it, so nothing answers a pointer while it is chosen",
      );
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(String(html)))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the stage ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every plate is " +
          "drawn on top of every other and every attribute is still perfectly correct.",
      );
  }

  // THE PLATE ANSWERS FROM WHERE THE SQUARE IS, AND THE TWO ARE WRITTEN BY DIFFERENT HANDS.
  //
  // The travelling square's position comes from the STYLESHEET this file generates; the answering
  // point's position is written into the markup BY THE BEAT, once per stage. Nothing but this check
  // holds the two together, and the failure it catches is the one this whole split exists to
  // prevent: a plate baked at the wrong stage's coordinates answers for a place its square is not
  // at, silently and in every direction at once. It is also the only refusal here that reads a
  // number off the page rather than an attribute's presence.
  for (const stage of declaration.stages) {
    const slug = restoreSlugOf(stage.key);
    const chunk = String(html)
      .split(/<svg\b/)
      .slice(1)
      .find((part) => new RegExp(`data-restore-plate="${slug}"`).test(part.slice(0, part.indexOf(">") + 1)));
    if (!chunk) continue;
    const body = chunk.slice(0, chunk.indexOf("</svg>") < 0 ? undefined : chunk.indexOf("</svg>"));
    const at = new Map(stage.places.map((place) => [place.key, place]));
    const found = new Set<string>();
    for (const tag of body.match(/<circle[^>]*>/g) ?? []) {
      const ref = /\sdata-mark-ref="([^"]*)"/.exec(tag);
      const cx = /\scx="([-0-9.eE]+)"/.exec(tag);
      const cy = /\scy="([-0-9.eE]+)"/.exec(tag);
      if (!ref || !cx || !cy) continue;
      const place = at.get(ref[1]);
      if (!place) continue;
      found.add(ref[1]);
      const off = Math.hypot(Number(cx[1]) - place.cx, Number(cy[1]) - place.cy);
      if (off > RESTORE_STILL_FLOOR)
        throw new Error(
          `${where}: in the stage ${JSON.stringify(slug)} the point that answers for ` +
            `${JSON.stringify(ref[1])} sits at (${Number(cx[1]).toFixed(1)}, ${Number(cy[1]).toFixed(1)}) ` +
            `and its square is at (${place.cx.toFixed(1)}, ${place.cy.toFixed(1)}) — ${off.toFixed(1)} ` +
            "user units apart. The drawing and the hit plate are separate elements precisely so that " +
            "nothing that answers ever moves; a plate baked at another stage's coordinates makes " +
            "every reading on this stage a reading of somewhere else.",
        );
    }
    for (const place of stage.places)
      if (!found.has(place.key))
        throw new Error(
          `${where}: the stage ${JSON.stringify(slug)} places ${JSON.stringify(place.key)} and its hit ` +
            "plate carries no point for it. A square a reader cannot ask about is a square that only " +
            "has a colour, which is this type sheet's own accessibility trap.",
        );
  }

  for (const slug of slugs.slice(1))
    if (
      !new RegExp(
        `#[\\w-]*${slug}:checked\\)\\s\\[data-restore-cell="[^"]+"\\]\\s*\\{\\s*transform:\\s*translate\\(`,
      ).test(String(html))
    )
      throw new Error(
        `${where}: the stage ${JSON.stringify(slug)} moves no cell. Every stage but the default gives ` +
          "back a piece of the geography the grid took, so a stage whose stylesheet displaces nothing " +
          "is drawing the default's picture under a second name.",
      );

  if (!/\[data-restore-cell\]\s*\{\s*transition:\s*transform\s/.test(String(html)))
    throw new Error(
      `${where}: the cells carry no transition, so they JUMP between stages. A cartogram is the one ` +
        "map type allowed to move a country, and only because the reader is doing the moving — a jump " +
        "is a country teleporting, which reads as the bug the owner refused twice. The transition " +
        "belongs inside `@media (prefers-reduced-motion: no-preference)`, never outside it.",
    );

  // THE NAME HAS TO BE ON THE PLATE BEFORE A RULE CAN REVEAL IT. The check below reads the
  // STYLESHEET, and that stylesheet is generated from the same `restoreNamesOf` call it is then
  // compared against: the two agree by construction, and neither of them ever looks at the
  // drawing. An author who deletes the label ELEMENT keeps every `opacity: 1` rule and loses the
  // label — which is the inconvenient-label refusal in the one form it would really be committed.
  // Measured, not imagined: removing a single `<g data-restore-name>` from a beat's component
  // rendered green until this loop existed.
  const nameTags = String(html).match(/<[a-zA-Z][^>]*\sdata-restore-name="[^"]*"[^>]*>/g) ?? [];
  const drawnNames = new Set<string>();
  for (const tag of nameTags) {
    const key = /\sdata-restore-name="([^"]*)"/.exec(tag);
    if (key) drawnNames.add(key[1]);
  }
  for (const tile of declaration.tiles)
    if (!drawnNames.has(tile.key))
      throw new Error(
        `${where}: the cell ${JSON.stringify(tile.key)} is named by the geometry and the page draws ` +
          "no `data-restore-name` group for it. The stage rules would reveal a label that is not " +
          "there, and the one refusal this vocabulary makes that no sibling can — a name taken off " +
          "a square that could carry it — would be satisfied by a stylesheet talking to itself.",
      );
  for (const key of drawnNames)
    if (!declaration.tiles.some((tile) => tile.key === key))
      throw new Error(
        `${where}: the page draws a name for ${JSON.stringify(key)}, which the declaration never ` +
          "names. A label with no cell behind it travels nowhere and is measured against nothing.",
      );

  // A CROWDED STAGE OWES THE READER A BOUNDARY, and the census decides which stages those are.
  // Squares on true centroids genuinely collide; that collision is a fact about the geography the
  // grid traded away and must not be nudged out. What the page may not do is paint one opaque
  // square over another and leave the reader a blob whose outline belongs to nobody — the owner
  // read exactly that and called it "placed any old how, and not legible".
  const edgeTags = String(html).match(/<[a-zA-Z][^>]*\sdata-restore-edge="[^"]*"[^>]*>/g) ?? [];
  const drawnEdges = new Set<string>();
  for (const tag of edgeTags) {
    const key = /\sdata-restore-edge="([^"]*)"/.exec(tag);
    if (key) drawnEdges.add(key[1]);
  }
  const crowding = restoreCrowdingOf(declaration);
  if (crowding.some((stage) => stage.pairs > 0)) {
    for (const tile of declaration.tiles)
      if (!drawnEdges.has(tile.key))
        throw new Error(
          `${where}: ${JSON.stringify(tile.key)} has no \`data-restore-edge\` outline, and this map ` +
            `collides in ${crowding.filter((s) => s.pairs > 0).length} of its ${crowding.length} ` +
            "stages. A square with no boundary of its own disappears under the next opaque fill, and " +
            "the pile it disappeared into is then a shape no country answers for.",
        );
    for (const stage of crowding) {
      if (stage.pairs === 0) continue;
      const on = new RegExp(
        `#[\\w-]*${stage.slug}:checked\\)\\s\\[data-restore-edge\\]\\s*\\{\\s*opacity:\\s*1\\s*;`,
      );
      if (!on.test(String(html)))
        throw new Error(
          `${where}: the stage ${JSON.stringify(stage.slug)} piles ${stage.pairs} pairs of squares ` +
            `over ${stage.touched.length} of ${declaration.tiles.length} cells and its stylesheet ` +
            "leaves the separator layer off. The crowding is the finding of that stage; hiding what " +
            "it looks like is the one way to make the stage lie without moving a single square.",
        );
    }
  }
  for (const key of drawnEdges)
    if (!declaration.tiles.some((tile) => tile.key === key))
      throw new Error(
        `${where}: an outline is drawn for ${JSON.stringify(key)}, which the declaration never ` +
          "names. A boundary with no square inside it is a shape the reader cannot ask about.",
      );

  // THE NAMES DRAWN ARE THE NAMES DERIVED. The stylesheet is the page's own answer to "which cells
  // can hold their name in this stage"; if it disagrees with `restoreNamesOf`, the rule that a cell
  // has to hold its own name has been overruled somewhere between the two.
  for (const stage of restoreNamesOf(declaration)) {
    const named = new Set(stage.named);
    const on = new RegExp(
      `#[\\w-]*${stage.slug}:checked\\)\\s\\[data-restore-name="([^"]+)"\\]\\s*\\{\\s*opacity:\\s*([01])\\s*;`,
      "g",
    );
    const seen = new Map<string, number>();
    for (const hit of String(html).matchAll(on)) seen.set(hit[1], Number(hit[2]));
    for (const tile of declaration.tiles) {
      const want = named.has(tile.key) ? 1 : 0;
      const got = seen.get(tile.key);
      if (got === undefined)
        throw new Error(
          `${where}: the stage ${JSON.stringify(stage.slug)} says nothing about the name of ` +
            `${JSON.stringify(tile.key)}. Whether a cell keeps its name is this type's own rule and it ` +
            "is answered per stage, never once per page.",
        );
      if (got !== want)
        throw new Error(
          `${where}: in the stage ${JSON.stringify(stage.slug)} the name of ${JSON.stringify(tile.key)} ` +
            `is drawn at opacity ${got} and the geometry says ${want}. A name kept on a square too ` +
            "small for it is unreadable; a name taken off a square that could carry it is an author " +
            "tidying an inconvenient label away.",
        );
    }
  }

  const blanket = String(html).search(/svg\.chart\[data-restore-plate\]\s*\{\s*display:\s*none/);
  if (blanket < 0)
    throw new Error(
      `${where}: the stylesheet carries no blanket rule hiding the hit plates, so all ${slugs.length} ` +
        "answer at once. This is the rule that must be emitted FIRST, before the default plate's own — " +
        "two attribute selectors score identically and source order is the whole mechanism.",
    );
  const reveal = String(html).search(
    new RegExp(`svg\\.chart\\[data-restore-plate="${slugs[0]}"\\]\\s*\\{\\s*display:`),
  );
  if (reveal >= 0 && reveal < blanket)
    throw new Error(
      `${where}: the stylesheet reveals the default hit plate BEFORE the blanket rule that hides them ` +
        "all. Two attribute selectors score identically, so source order is the whole mechanism — and " +
        "an engine without `:has()`, which is the only engine the base pair ever decides anything for, " +
        "would have every plate answering at once.",
    );
}

/**
 * THE CHROME IS NOT HERE, AND THAT IS WHAT MAKES THIS FILE A MAP VOCABULARY RATHER THAN A GUEST IN
 * THE CHART SKILL. The fieldset, the pill rail, the wash and the ring are
 * `chart-web/assets/control-chrome.ts`, and the BEAT calls it — a file under `proof/` may import
 * from any skill, where a file inside a skill may not. Wiring it from here would have pinned this
 * vocabulary to `skills/chart-web/`, and a newsroom installing `map-web` would not have received
 * the one gesture only a cartogram can make. What this control's own chrome ever amounted to was
 * two arguments the beat now passes itself: the sentences are STACKED in one grid cell, and three
 * ems are reserved for them, because a row that grows when a sentence is revealed pushes the plot
 * down under the reader's hands while forty-one cells are in the air.
 */
