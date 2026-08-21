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

/** THE ROUTE A STORY BEAT CAN ACTUALLY TAKE, and the reason it had to exist.
 *
 *  ROUND SIX: `staggerLacksAnOrder` was imported by exactly one file in this tree —
 *  `chart-video/scripts/render-video.mjs`, which renders THIS SKILL'S OWN SEED. `shared/chart-video/`
 *  carried `sizes.mjs` and `timing.ts` and nothing else, and a skill's `scripts/` is not copied into
 *  an installed Splash root, so no story beat could reach the decision at all. The guard was
 *  correct, shared between two formats, walked by its own tests, and unreachable by every beat a
 *  journalist would ever produce with it.
 *
 *  So the decision stops being something a beat has to remember to call, and becomes the thing that
 *  BUILDS the windows. A staggered reveal spreads `readings` linearly across `event` (the
 *  `BeatTiming` event the reveal owns), one window per reading, and refuses on the way out rather
 *  than after the mp4 exists. A beat that wants its marks to arrive together simply does not call
 *  this — one start is legal and the decision says so.
 *
 *  `positionOf` is REQUIRED and never defaulted, for the reason the decision itself refuses a mark
 *  with no position: a default would answer "what orders these marks?" on the beat's behalf, and
 *  the whole defect this rule was earned by is a producer answering that question for data that
 *  could not. It returns the reading's own position on the axis the reveal traverses — a year, a
 *  date, a distance — or `null` when the reading holds none, which is the honest answer for a
 *  snapshot and reddens here instead of shipping.
 *
 *  Vendored to `#shared/chart-video/detect-reveal-order.mjs` so a beat in an installed root reaches
 *  the same file, the way `#shared/chart-beat/render-still.mjs` is already reached; the two copies
 *  are held to one decision by `splash/test/guard-copies-parity.test.ts`. */
export function staggeredReveal(readings, event, { keyOf, positionOf, where = "this reveal" }) {
  const marks = readings.map((reading, i) => ({
    key: String(keyOf(reading, i)),
    start:
      readings.length <= 1
        ? event.start
        : event.start + Math.round((i / (readings.length - 1)) * event.duration),
    at: positionOf(reading, i),
  }));
  const found = staggerLacksAnOrder(marks);
  if (found.arbitrary)
    throw new Error(
      `${where} claims an order the data does not carry: ${found.why}. ` +
        `${found.marks} marks, ${found.starts} start(s), ${found.positions} position(s). ` +
        "A stagger follows the data's own order or it does not happen — motion-grammar.md. " +
        "The fix is one window for every mark (they arrive together), not a wider check here.",
    );
  return { marks, reading: found };
}
