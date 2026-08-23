/**
 * THIS BEAT'S PURE GEOMETRY — no DOM, no colours, no words. The arithmetic that turns twenty-seven
 * readings into row positions and stem lengths, so the composition beside it only draws and the
 * runner only reads the frozen file.
 *
 * A horizontal lollipop: one row per country, a stem from the zero baseline to that country's own
 * share, a dot at the end of it, and one vertical rule at the target every stem is read against.
 * Rows are laid out in TWO blocks — the countries that published a figure for the newest year in
 * the table, and, below a gap, the ones whose most recent figure is older. The gap is geometry, not
 * decoration: it is what stops a reader comparing a 2020 stem against a 2024 one by eye.
 */

export type Reading = {
  code: string;
  name: string;
  /** The share of utilised agricultural area under organic farming, in percent. */
  share: number;
  /** The year THIS reading is from. Not the same for every country, which is the point. */
  year: number;
  /** Eurostat's own observation flag, verbatim and possibly empty. */
  flag: string;
  /** The same country's share in the comparison year, for the detail a reader asks for. */
  earlierShare: number;
  earlierYear: number;
  /** How many annual readings this country has published in the whole table. */
  readings: number;
};

export type Row = Reading & {
  /** Row centre, in canonical units. */
  cy: number;
  /** Stem end, in canonical units. */
  cx: number;
  /** True when this row belongs to the block whose figures are older than the newest year. */
  stale: boolean;
  /** True when the value label would run off the right edge and must sit inside the stem instead. */
  labelFlips: boolean;
};

export type LollipopLayout = {
  rows: Row[];
  /** Canonical y of the rule that separates the two blocks, or null when every row is current. */
  dividerY: number | null;
  height: number;
  x: (share: number) => number;
};

/** One decimal place, the precision this beat prints at everywhere — the axis, the labels, the
 *  detail strings and the accessible table all read the same number. */
export function pct(value: number): string {
  return `${value.toFixed(1)} %`;
}

/** A signed change in percentage points, at the same precision. */
export function points(change: number): string {
  return `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} points`;
}

/** The value axis's own ticks. Fixed, because the domain is fixed: a share of farmland is read
 *  against the target, and a target that moved with the data would not be a target. */
export function xTickValues(domainMax: number): number[] {
  const ticks: number[] = [];
  for (let v = 0; v <= domainMax; v += 5) ticks.push(v);
  return ticks;
}

export function lollipopLayout(
  readings: Reading[],
  {
    width,
    rowHeight,
    topPad,
    gapRows,
    domainMax,
    flipAt,
    newestYear,
  }: {
    width: number;
    rowHeight: number;
    topPad: number;
    gapRows: number;
    domainMax: number;
    /** Fraction of the width past which a value label is drawn inside the stem instead of after it. */
    flipAt: number;
    newestYear: number;
  },
): LollipopLayout {
  if (readings.length === 0) throw new Error("a lollipop with no rows is not a chart");
  const beyond = readings.filter((r) => r.share > domainMax);
  if (beyond.length > 0)
    throw new Error(
      `${beyond.map((r) => `${r.name} (${r.share})`).join(", ")} sits past this axis's own maximum of ` +
        `${domainMax}, so its stem would be drawn shorter than its value — widen the domain or the ` +
        "axis is lying about the marks it carries",
    );

  const x = (share: number) => (share / domainMax) * width;

  const current = readings.filter((r) => r.year === newestYear).sort((a, b) => b.share - a.share);
  const stale = readings.filter((r) => r.year !== newestYear).sort((a, b) => b.share - a.share);

  const rows: Row[] = [];
  let index = 0;
  for (const r of current) {
    const cy = topPad + index * rowHeight + rowHeight / 2;
    rows.push({ ...r, cy, cx: x(r.share), stale: false, labelFlips: x(r.share) / width > flipAt });
    index += 1;
  }
  const dividerY = stale.length > 0 ? topPad + index * rowHeight + (gapRows * rowHeight) / 2 : null;
  if (stale.length > 0) index += gapRows;
  for (const r of stale) {
    const cy = topPad + index * rowHeight + rowHeight / 2;
    rows.push({ ...r, cy, cx: x(r.share), stale: true, labelFlips: x(r.share) / width > flipAt });
    index += 1;
  }

  return { rows, dividerY, height: topPad + index * rowHeight, x };
}
