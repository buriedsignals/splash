/** The guard this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["staggerLacksAnOrder"];

/** A REVEAL STAGGERED ACROSS MARKS THAT CARRY NO ORDER — decoration with a time axis on it.
 *
 *  `motion-grammar.md` lets a reveal follow the data's own order (a time series draws oldest to
 *  newest) or the argument's (baseline, then evidence, then subject), and forbids "an arbitrary
 *  order chosen for visual interest — bars bouncing in by index, categories popping in at random".
 *  A choropleth of ONE SNAPSHOT has neither order available: eleven countries measured in the same
 *  month have no chronology between them and no argument that ranks them, so giving each its own
 *  start time invents an order the data does not contain. The beat that earned this went one step
 *  further and invented a "pending" stipple to fill the shapes still waiting their turn — a mark
 *  that encodes nothing except the wait, which is the placeholder the stagger needed to exist.
 *
 *  WHAT THIS MEASURES, and how a legitimate stagger is told from an arbitrary one. `marks` are the
 *  marks the reveal covers, handed IN THE ORDER the build gives them their windows; each carries
 *  `start`, the frame its own arrival begins, and `at`, the position its reading holds on the axis
 *  the reveal traverses — a year, a date, a distance — or `null` when the reading holds none. The
 *  build is STAGGERED when those starts are not all one number. A stagger is EARNED only when every
 *  mark carries a position, no two marks share one, and the positions ascend in the order the marks
 *  arrive: that is a time series drawing in the data's own order, and it passes. It is ARBITRARY
 *  when a mark carries no position at all (nothing to order it by), when marks share a position (a
 *  snapshot — every reading from one moment, so the order across them is the producer's choice and
 *  not the data's), or when the arrival order runs against the positions (a line drawing backwards
 *  because the end is prettier). Ties are arbitrary rather than lenient on purpose: two marks at one
 *  position are ordered by whoever sorted them, which is exactly the choice this refuses.
 *
 *  Marks arriving TOGETHER are always legal, and are the answer this refusal points at: one start,
 *  no order required, the values appearing as a single event.
 */
export function staggerLacksAnOrder(marks) {
  const starts = new Set(marks.map((mark) => mark.start));
  const placed = marks.filter((mark) => mark.at !== null && mark.at !== undefined);
  const positions = new Set(placed.map((mark) => mark.at));
  const reading = { marks: marks.length, starts: starts.size, positions: positions.size };
  if (starts.size <= 1)
    return { ...reading, arbitrary: false, why: "the marks arrive together, so no order is claimed" };
  if (placed.length < marks.length)
    return {
      ...reading,
      arbitrary: true,
      why: `${marks.length - placed.length} of ${marks.length} marks carry no position on any axis this reveal could traverse`,
    };
  if (positions.size < marks.length)
    return {
      ...reading,
      arbitrary: true,
      why: `${marks.length} marks hold ${positions.size} position(s) between them, so the order across them is the producer's and not the data's`,
    };
  if (!placed.every((mark, i) => i === 0 || placed[i - 1].at < mark.at))
    return { ...reading, arbitrary: true, why: "the marks arrive against their own positions" };
  return { ...reading, arbitrary: false, why: "the marks arrive in their own ascending order" };
}
