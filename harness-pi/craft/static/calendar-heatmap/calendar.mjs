// The calendar arithmetic, computed once for the render and for beat.mjs's sentences, taken from
// proof/static-calendar-heatmap-geneva/render-directions.mjs. The model never walks the run or bins
// the year by hand: both the drawn grid and the numbers in its sentences come from here.

/** [{ date: "YYYY-MM-DD", value }] → [{ date, month (0-11), day (1-31), value }], refused unless it is
 *  every day of ONE year, once each. */
export function toDays(readings) {
  const days = readings.map((r) => {
    const m = String(r.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`date ${JSON.stringify(r.date)} is not YYYY-MM-DD`);
    return { date: r.date, year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]), value: r.value };
  });
  const years = [...new Set(days.map((d) => d.year))];
  if (years.length !== 1)
    throw new Error(`days cover ${years.length} years (${years.join(", ")}): a calendar heatmap draws ONE year — filter data.json's rows to one year`);
  const year = years[0];
  const seen = new Set();
  for (const d of days) {
    if (seen.has(d.date)) throw new Error(`two readings for ${d.date}: one value per day — filter data.json to one station or series`);
    seen.add(d.date);
  }
  const expected = Array.from({ length: 12 }, (_, m) => new Date(year, m + 1, 0).getDate()).reduce((a, b) => a + b, 0);
  if (days.length !== expected)
    throw new Error(`days hold ${days.length} of the ${expected} days of ${year}: the grid draws every day of the year — a missing day would read as data. Draw a complete year, or another chart`);
  return { year, days: days.sort((a, b) => a.date.localeCompare(b.date)).map(({ year: _, ...d }) => d) };
}

/** The longest run of consecutive days at or above `threshold`: { length, from, to } (from/to are days). */
export function longestRun(days, threshold) {
  let best = { length: 0, from: null, to: null };
  let run = [];
  for (const day of days) {
    if (day.value >= threshold) run.push(day);
    else {
      if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
      run = [];
    }
  }
  if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
  return best;
}

/** Five breaks for six bins of roughly equal count (quantiles of the year's own readings), rounded to
 *  `decimals`. */
export function quantileBreaks(days, decimals = 0) {
  const sorted = days.map((d) => d.value).sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const f = 10 ** decimals;
  return [0.166, 0.333, 0.5, 0.666, 0.833].map((p) => Math.round(q(p) * f) / f);
}

/** The mean of each month: [{ month, mean }]. */
export function monthlyMeans(days) {
  return Array.from({ length: 12 }, (_, month) => {
    const of = days.filter((d) => d.month === month);
    return { month, mean: of.reduce((s, d) => s + d.value, 0) / of.length };
  });
}
