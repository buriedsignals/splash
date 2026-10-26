// THE SUBJECT, FROM beat.mjs — the zone kit's stand-in for proof/video-calendar-heatmap-geneva/subject.mjs, which read
// that beat's frozen CSV. The derivation is the proof's: every day of one year in order, the longest run at or above the
// threshold, the warm days, six quantile bins. The proof asserted its own answers (a 31-day run at 20 °C, 59 warm
// days); a story's answers are whatever its data gives — the claim is beat.mjs's check() — and what this choreography
// cannot draw becomes a refusal naming what to change in beat.mjs.
//
// Runs in Bun only.

/**
 * @param beat  beat.mjs's default export: `days` [{ date: "YYYY-MM-DD", value }], `threshold`, `breakDecimals`
 * @returns     `{ days, breaks, warm, streak, threshold, year, daysInMonth }` — the names `build.mjs` reads
 */
export function subjectOf(beat) {
  const parsed = beat.days.map((d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d.date));
    if (!m) throw new Error(`a day's date is ${JSON.stringify(d.date)}: give every date as "YYYY-MM-DD"`);
    return { y: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]), date: String(d.date), value: d.value };
  });
  const years = [...new Set(parsed.map((d) => d.y))];
  if (years.length !== 1) throw new Error(`days span ${years.length} years (${years.slice(0, 4).join(", ")}): the calendar is ONE year — filter data.json's dates to one year`);
  const year = years[0];
  const daysInMonth = (month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const expected = Array.from({ length: 12 }, (_, m) => daysInMonth(m)).reduce((a, b) => a + b, 0);
  const days = [...parsed].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).map((d, index) => ({ index, date: d.date, month: d.month, day: d.day, value: d.value }));
  const dates = days.map((d) => d.date);
  const twice = dates.find((d, i) => i > 0 && d === dates[i - 1]);
  if (twice) throw new Error(`days hold ${twice} twice: give ONE value per day (filter data.json to one station / one measure)`);
  if (days.length !== expected) {
    const have = new Set(dates);
    const absent = [];
    for (let m = 0; m < 12 && absent.length < 3; m++)
      for (let d = 1; d <= daysInMonth(m) && absent.length < 3; d++) {
        const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (!have.has(date)) absent.push(date);
      }
    throw new Error(`days hold ${days.length} of ${year}'s ${expected} days (missing ${absent.join(", ")}…): every cell is a day, so every day of the year must have a value`);
  }

  const threshold = beat.threshold;
  if (!(typeof threshold === "number" && Number.isFinite(threshold))) throw new Error(`threshold is ${JSON.stringify(threshold)}: give the value the run is counted from, as a number`);
  let best = { length: 0, from: null, to: null };
  let run = [];
  for (const day of [...days, { value: -Infinity }]) {
    if (day.value >= threshold) run.push(day);
    else {
      if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
      run = [];
    }
  }
  if (best.length < 2) throw new Error(`no two days in a row reach ${threshold} (the highest is ${Math.max(...days.map((d) => d.value))}): the video outlines the longest run at or above the threshold — give the threshold the takeaway names`);
  const warm = days.filter((d) => d.value >= threshold).length;

  const decimals = beat.breakDecimals ?? 0;
  if (!(Number.isInteger(decimals) && decimals >= 0 && decimals <= 3)) throw new Error(`breakDecimals is ${JSON.stringify(beat.breakDecimals)}: give 0 to 3`);
  const sorted = days.map((d) => d.value).sort((a, b) => a - b);
  const quantile = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const round = (v) => Math.round(v * 10 ** decimals) / 10 ** decimals;
  const breaks = [0.166, 0.333, 0.5, 0.666, 0.833].map((p) => round(quantile(p)));
  if (new Set(breaks).size !== breaks.length) throw new Error(`two bins share a break after rounding (${breaks.join(", ")}): raise breakDecimals to ${decimals + 1}`);
  return { days, breaks, warm, streak: best, threshold, year, daysInMonth };
}
