// A LABEL BELONGS TO ITS OWN ROW, AND SO DOES ITS VALUE.
//
// `references/types/slope.md` REQUIRES vertical de-collision the moment a chart names many
// categories at once: without direct end labels a slope is unreadable, and with enough categories to
// be worth drawing, a naive placement collides. De-collision moves a label off the thing it names —
// and once a label is no longer ON its mark, the only thing tying the two together is the ROW.
//
// THE DEFECT THAT EARNED THIS. A thirteen-region slope de-collided its left labels in 2020 rank
// order and its right values, independently, against their own 2026 positions. Both stacks
// overflowed the plot band, so both fell back to an equal gap over the same band and landed on the
// same thirteen y values to one decimal — thirteen visual rows. The one region whose 2026 cell is
// corrupt has no 2026 position, so its note borrowed its 2020 one, which sorts it one place higher
// than the value it should have followed. From there the two columns are off by one row and the
// delivered graphic states, in print, that the Peloponnese has no 2026 figure and that Eastern
// Macedonia and Thrace has 392 schools. Both false. A second, unreported pair crossed the same way
// wherever two lines cross at all: Epirus is printed 244 -> 238 and the South Aegean 241 -> 219,
// when the frozen source says 244 -> 219 and 241 -> 238. Four false rows out of thirteen, through
// approval, through `inspectSvg` at 31 of 31 contrast entries, through `assertDeliveredSize` and
// `assertTypeFloor`, and out to a reader.
//
// The same beat's FIRST version failed the other half of the same invariant: its de-collision drew
// a 1104-school region ABOVE an 1802-school one, inverting the rank on a chart whose whole subject
// is relative position. Nothing in the tree said so; the author caught it by opening the PNG.
//
// WHY THIS READS THE DELIVERED ARTEFACT. Every assertion that ran on this beat ran and passed. The
// crossing is not in the component's shape, it is in the numbers the component computed, and it is
// plainly visible in the file that shipped — so this reads the file that shipped. `decollide` in
// `render-still.mjs` is the other half: a de-collision that CANNOT produce this, offered where an
// author reaches for it. This is what says so when someone writes their own anyway.

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["mislabelledRows"];

/** How far a leader's own end may sit from the label it leads to, as a fraction of that label's
 *  font size, in x and in y independently. A leader stops SHORT of the glyphs it points at — it must
 *  never run under them — and a text's `y` is its baseline, not its centre, so the gap is real in
 *  both axes and scales with the type. Measured on the beat that earned this rule at typeScale 2.2:
 *  4px in x and 11px in y against a 33px font, so 0.5 admits both. It also has to EXCLUDE the near
 *  misses in the same picture: the plot rail 35px away in x, and the leader's OTHER end 29px away
 *  from the next label down. 0.5 x 33 = 16.5 sits between 11 and 29. */
const LEADER_REACH = 0.5;

/** How close two labels' baselines must be to read as ONE row. Two stacks spread over the same band
 *  land on the same value to the last bit of a float, so this is a tolerance for rounding, not for
 *  judgement: the rows on the beat that earned this rule are 38.4px apart. */
const ROW_TOLERANCE = 1;

/** How close a leader's anchor end must be to a drawn mark's end to be the same point. Both are the
 *  same scale applied to the same number, so they agree exactly; this is the float's own slack. */
const ANCHOR_TOLERANCE = 0.5;

/**
 * The de-collided label stacks a delivered artefact draws, and the marks that join their anchors.
 *
 * A STACK is a column of text whose members were MOVED off the thing they name — recognised by the
 * leader each moved label is drawn with, never by position alone. That is what makes the population
 * exactly the labels this rule is about: a label at its own mark cannot be on the wrong row, and a
 * column with no leaders (a title, a source line, an axis caption) is not a de-collision at all and
 * is never read as one. It is also the honest limit of this reader, stated plainly: a label the
 * artefact draws no leader for is invisible here, and a de-collision that moves labels without
 * saying where they came from cannot be checked by anything, which is a defect in the drawing
 * rather than a gap in the check.
 *
 * A LINK is any other line whose two ends land on anchors belonging to two different stacks — a
 * slope's own segment, a dumbbell's bar. It is what the artefact itself says about which anchor
 * goes with which, and the only evidence in the file about the pairing under test.
 *
 * Deliberately a text scan of `<text>` and `<line>`, for the same reason `marksFromSource` is one:
 * a scan cannot be wrong about an attribute that is not there. What it cannot see is named rather
 * than hidden — marks drawn as `<path>` or `<polyline>`, a leader drawn vertically (excluded on
 * purpose, because a plot rail is vertical and passes within a label's reach of it), and a stack
 * whose leaders are absent. The walking test asserts how many stacks and links this found on the
 * corpus, so a reader that broke fails instead of quietly passing everything.
 */
export function labelStacksFrom(svg) {
  const attr = (attributes, name) => {
    const found = new RegExp(`\\b${name}="([^"]*)"`).exec(attributes);
    return found ? Number.parseFloat(found[1]) : null;
  };
  // A `<text>` or a `<line>` that does not carry its own coordinates is positioned by something
  // this reader cannot see — a transform, a `<tspan>`, a stylesheet — and is dropped rather than
  // read as sitting at zero, which would invent a stack out of every unplaced run on the page.
  const placed = (one) => Object.values(one).every((value) => value !== null);
  const labels = [];
  for (const match of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
    const label = {
      id: `"${match[2]}"`,
      x: attr(match[1], "x"),
      y: attr(match[1], "y"),
      fontSize: attr(match[1], "font-size") ?? 16,
      anchorY: null,
    };
    if (label.x !== null && label.y !== null) labels.push(label);
  }
  const lines = [];
  for (const match of svg.matchAll(/<line\b([^>]*?)\/?>/g)) {
    const line = {
      x1: attr(match[1], "x1"),
      y1: attr(match[1], "y1"),
      x2: attr(match[1], "x2"),
      y2: attr(match[1], "y2"),
    };
    if (placed(line)) lines.push({ ...line, leader: false });
  }
  for (const line of lines) {
    // A VERTICAL LINE IS FURNITURE, NEVER A LEADER. A leader travels out of the plot to the gutter,
    // so it always has two different x. A plot rail does not, and on the beat that earned this rule
    // the rail's own top end sits within a period caption's reach — read as a leader, it would have
    // given that caption an anchor at the rail's other end, 461px away.
    if (line.x1 === line.x2) continue;
    for (const [x, y, anchorY] of [
      [line.x1, line.y1, line.y2],
      [line.x2, line.y2, line.y1],
    ]) {
      let nearest = null;
      for (const label of labels) {
        if (label.anchorY !== null) continue;
        const reach = LEADER_REACH * label.fontSize;
        const dx = Math.abs(x - label.x);
        const dy = Math.abs(y - label.y);
        if (dx > reach || dy > reach) continue;
        if (!nearest || dx + dy < nearest.distance)
          nearest = { label, distance: dx + dy };
      }
      if (!nearest) continue;
      nearest.label.anchorY = anchorY;
      line.leader = true;
    }
  }
  const columns = new Map();
  for (const label of labels) {
    if (label.anchorY === null) continue;
    const key =
      [...columns.keys()].find((at) => Math.abs(at - label.x) <= 0.5) ?? label.x;
    columns.set(key, [...(columns.get(key) ?? []), label]);
  }
  return {
    stacks: [...columns.entries()]
      .filter(([, members]) => members.length >= 2)
      .map(([x, members]) => ({ id: `x=${x.toFixed(1)}`, labels: members })),
    links: lines
      .filter((line) => !line.leader && line.x1 !== line.x2)
      .map((line, at) => ({ id: `link#${at}`, aY: line.y1, bY: line.y2 })),
  };
}

/**
 * Every place a de-collided stack stopped naming what it names. Two clauses, one invariant.
 *
 * ORDER. A de-collision RANKS the labels by something, and that ranking is what a reader reads down
 * the page. So at least one stack in the picture must visit its own marks in order — that is the
 * stack the ranking was taken from, and a picture where NO stack does is a picture whose label order
 * corresponds to nothing. This is the clause the beat's first version failed, printing 1104 above
 * 1802: a backward pull-up pass moved labels past each other in every gutter at once.
 *
 * A second stack is allowed to cross itself, and this is not a loophole — it is the case the strict
 * form gets wrong. On a slope, the right-hand values are ranked by the LEFT-hand period, so two
 * regions whose lines genuinely cross put their right labels in an order their own 2026 values do
 * not have. Epirus (244 -> 219) and the South Aegean (241 -> 238) do exactly that in the beat this
 * rule was earned on. Refusing it would refuse the data. What is refused instead is a crossing stack
 * that nothing in the picture ties back to an ordered one: no ordered stack to be ranked by, or not
 * one mark joining this stack to anything. The cost, named: a two-stack picture with one ordered
 * stack and a second whose crossings are wrong in detail is left to the ROW clause below, which is
 * where the evidence for a single row actually lives.
 *
 * ROW. Two stacks that put a label each on the same line are asserting those two labels describe one
 * thing. The artefact either draws the mark that joins their anchors — and then the row is what it
 * claims — or it draws that anchor joined to a DIFFERENT one, and the row is false. A row where
 * neither anchor is joined to anything is not refused: nothing in the file contradicts it, and a
 * refusal there would be this function guessing. That is why the beat that earned this rule reddens
 * on four rows and not on the fifth, where the corrupt cell means there is no mark to join.
 *
 * Returns one sentence per crossing, naming the labels as the reader sees them, because the person
 * who has to fix it is looking at the picture.
 */
export function mislabelledRows(stacks, links) {
  const crossings = [];
  const same = (a, b) => Math.abs(a - b) <= ANCHOR_TOLERANCE;
  const joinedTo = (anchorY) =>
    links.flatMap((link) =>
      same(link.aY, anchorY) ? [link.bY] : same(link.bY, anchorY) ? [link.aY] : [],
    );
  const inversion = (stack) => {
    const drawn = [...stack.labels].sort((a, b) => a.y - b.y);
    const anchored = [...stack.labels].sort((a, b) => a.anchorY - b.anchorY);
    const at = drawn.findIndex((label, k) => label !== anchored[k]);
    return at === -1 ? null : { label: drawn[at], ranks: anchored.indexOf(drawn[at]) + 1, at: at + 1 };
  };
  const inversions = stacks.map((stack) => ({ stack, found: inversion(stack) }));
  const ranked = inversions.some((one) => one.found === null);
  for (const { stack, found } of inversions) {
    if (found === null) continue;
    if (ranked && stack.labels.some((label) => joinedTo(label.anchorY).length > 0)) continue;
    crossings.push(
      `${stack.id}: ${found.label.id} is drawn ${found.at} down its own stack and its mark is ${found.ranks} down that stack's own marks, with ${ranked ? "no mark joining this stack to one that reads its marks in order" : "no stack in the picture reading its own marks in order"}`,
    );
  }
  for (let one = 0; one < stacks.length; one++)
    for (let other = one + 1; other < stacks.length; other++)
      for (const left of stacks[one].labels)
        for (const right of stacks[other].labels) {
          if (Math.abs(left.y - right.y) > ROW_TOLERANCE) continue;
          const fromLeft = joinedTo(left.anchorY);
          const fromRight = joinedTo(right.anchorY);
          if (fromLeft.length === 0 && fromRight.length === 0) continue;
          if (fromLeft.some((y) => same(y, right.anchorY))) continue;
          if (fromRight.some((y) => same(y, left.anchorY))) continue;
          crossings.push(
            `row y=${left.y.toFixed(1)}: ${left.id} and ${right.id} are drawn on one line, and the marks they name are joined to something else`,
          );
        }
  return crossings;
}
