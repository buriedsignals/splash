// A BROWSER CAN IMPORT THIS. THAT IS THE WHOLE REASON THE FILE EXISTS.
//
// ROUND-FIVE FINDING T4: `decollide` was declared in `render-still.mjs`, which imports
// `@resvg/resvg-js` at module load — a native addon no browser bundle can resolve. So the one
// de-collision this toolchain offers was, for every VIDEO component in the tree (Remotion renders
// in a browser) and for every web component bundled the same way, present in the file tree and
// impossible to call. `stress-t-europe-recycling` placed two map labels by hand and said so in its
// own notes; that is the shape of the cost.
//
// This module imports NOTHING. `test/decollide-is-reachable.test.ts` is what holds it to that, by
// reading the file rather than trusting this sentence.
//
// `render-still.mjs` keeps its own declaration rather than re-exporting from here, and that is a
// deliberate, stated choice: moving it would edit eleven copies of `render-still.mjs` across the
// skills, `shared/` and the root template, and two byte-parity walks with them. The copies are held
// to being ONE function by `splash/test/guard-copies-parity.test.ts`, which compares this file and
// every `render-still.mjs` that declares the name — the same mechanism every other shared decision
// in this tree stands on.

/** How far a placed label has to end up from its own anchor before it counts as MOVED, in frame
 *  pixels. Sub-pixel: a label half a pixel off the thing it names is on the thing it names, and a
 *  leader drawn for it would be a mark nobody can see. Above it the caller owes the reader a leader,
 *  which is also the only evidence a delivered artefact carries about where a label came from —
 *  `detect-label-rows.mjs` reads exactly this. */
const MOVED_AT = 0.5;

/**
 * VERTICAL DE-COLLISION FOR ONE COLUMN OF LABELS, and the reason it lives here rather than in each
 * author's own beat.
 *
 * `references/types/slope.md` REQUIRES this — "category labels sit in the side gutters at each end
 * and need vertical de-collision when lines land close together" — and until this function existed
 * no skill offered it, unlike `wrap()`, which every seed carries. So every author wrote the
 * algorithm again, and a single thirteen-region slope produced two data-integrity bugs out of one
 * hand-rolled pass: a first version that drew a 1104-school region ABOVE an 1802-school one, and a
 * delivered version that told a reader the Peloponnese had no 2026 figure and that Eastern Macedonia
 * and Thrace had 392 schools. Neither is a layout complaint. Both are the chart stating things the
 * frozen source does not say.
 *
 * TWO PROPERTIES, AND THE API EXISTS FOR THE SECOND ONE.
 *
 * 1. ORDER IS NEVER TRADED FOR ROOM. Labels come back in their anchors' own order, always. The
 *    inversion above came from a backward "pull-up" pass that subtracted the gap from every item in
 *    turn without checking whether that pushed one above the one before it. There is no such pass
 *    here: crowding is absorbed by POOLING neighbours onto a shared centre (below), which cannot
 *    reorder anything, and by the equal-gap fallback when the band is genuinely too short, which
 *    cannot either.
 *
 * 2. A ROW KEEPS ITS IDENTITY. The result is indexed exactly like the input — never re-sorted, never
 *    filtered — so `placed[i]` is row `i`'s label position and nothing else. That is the whole
 *    reason this returns what it returns: the delivered defect above came from calling a
 *    sorting de-collision TWICE, once per gutter, on two different rankings of the same thirteen
 *    rows. A chart with more than one label column calls this ONCE, on the ranking it wants to read
 *    down the page, and every column of row `i` takes `placed[i].y`. Then a row's label and its
 *    value cannot describe different data, because they are the same row.
 *
 * `anchors` are the true positions, in frame pixels, one per row. `minGap` is the vertical air a
 * label needs from its neighbour — the caller's own measured line height, not a guess. `top` and
 * `bottom` bound the band the stack may occupy.
 *
 * HOW CROWDING IS ABSORBED. Subtracting `k * minGap` from the k-th anchor turns "spaced by at least
 * minGap, in order" into "non-decreasing", which is the shape a pool-adjacent-violators pass solves
 * exactly: walk the anchors, and whenever the running block's centre would sit above the block
 * before it, merge the two and re-centre on their mean. Every label of a merged cluster ends up
 * spread evenly around the cluster's own centre of gravity, so a crowd is pushed apart symmetrically
 * instead of downhill, and the placement is the closest one to the truth that respects the gap.
 *
 * WHEN THE BAND IS TOO SHORT the honest gap does not exist, and the stack falls back to the largest
 * EQUAL gap the band allows, in anchor order. Every label then lies about its position by some
 * amount — which is why a moved label is drawn with a leader back to its own mark, and why `moved`
 * comes back with each one.
 */
export function decollide(anchors, { minGap, top, bottom }) {
  const rows = anchors.map((anchor, at) => ({ anchor, at }));
  if (rows.length === 0) return [];
  const band = Math.max(0, bottom - top);
  const order = [...rows].sort((a, b) => a.anchor - b.anchor || a.at - b.at);
  const placed = new Array(rows.length);
  const lay = (down) => order.forEach((row, k) => (placed[row.at] = down[k]));
  if (rows.length === 1) {
    lay([Math.min(bottom, Math.max(top, order[0].anchor))]);
  } else {
    // Pool adjacent violators on `anchor - k * minGap`, then add the gaps back.
    const blocks = [];
    order.forEach((row, k) => {
      let block = { sum: row.anchor - k * minGap, count: 1 };
      while (
        blocks.length > 0 &&
        blocks[blocks.length - 1].sum / blocks[blocks.length - 1].count >
          block.sum / block.count
      ) {
        const previous = blocks.pop();
        block = { sum: previous.sum + block.sum, count: previous.count + block.count };
      }
      blocks.push(block);
    });
    const fitted = [];
    for (const block of blocks)
      for (let i = 0; i < block.count; i++) fitted.push(block.sum / block.count);
    const down = fitted.map((centre, k) => centre + k * minGap);
    // One uniform shift, so the stack lands inside the band without any label passing another.
    const shift = Math.max(top - down[0], Math.min(0, bottom - down[down.length - 1]));
    lay(
      down[down.length - 1] - down[0] > band
        ? // The band cannot hold the honest gap for this many labels, or these anchors are spread
          // wider than the band itself. Either way every label is about to lie about its position,
          // so they lie by the same amount: the largest EQUAL gap the band allows, in anchor order.
          order.map((row, k) => top + (k * band) / (rows.length - 1))
        : down.map((y) => y + shift),
    );
  }
  return rows.map((row) => ({
    anchor: row.anchor,
    y: placed[row.at],
    moved: Math.abs(placed[row.at] - row.anchor) > MOVED_AT,
  }));
}
