// The generic half of a calendar heatmap WEB beat, taken from
// proof/web-calendar-heatmap-geneva/render-directions-web.mjs with everything about ITS subject removed.
// The interaction is the worked example's and is not the model's to change: one cell per day (twelve
// month rows of 31 day columns, impossible dates dashed), binned on one ramp with a key in the data's
// units, the longest run at or above the claim's threshold outlined; a "threshold" control moves the
// line and the outline is retraced around the longest run at the chosen threshold, with one sentence
// giving its length, its two dates and how many days clear it (CSS only, works without JS); and every
// day answers hover/tap/Tab with its value, bin and rank in the year. This file computes the runs, the
// bins and the ranks; ./beat.mjs — the one file the model writes — gives the days and WORDS every
// reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedCalendarWeb, spanOf } from "./DirectedCalendarWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { CUTOFF_CLAIM_SLUG, cutoffSlugOf } = await import(chartWeb(HERE, "assets", "cutoff.ts"));

  const REQUIRED = ["eyebrow", "days", "threshold", "thresholds", "months", "monthsShort", "unit", "format", "detail", "streakNote", "cutoffLabel", "claimAnnounce", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "streakNote", "claimAnnounce", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const key of ["months", "monthsShort"])
    if (!Array.isArray(beat[key]) || beat[key].length !== 12) throw new Error(`${key} must hold the twelve month names`);
  if (new Set(beat.monthsShort).size !== 12) throw new Error(`monthsShort holds two identical names: abbreviate so every month reads differently`);

  // ── the days: every day of one year, in order ────────────────────────────────────────────────
  assertNumbers(beat.days.map((d) => [d.date, d.value]));
  const rows = beat.days.map((d) => {
    const m = String(d.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error(`a day's date is ${JSON.stringify(d.date)}: give every date as "YYYY-MM-DD"`);
    return { date: String(d.date), year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), value: d.value };
  }).sort((a, b) => (a.date < b.date ? -1 : 1));
  const year = rows[0].year;
  if (rows.some((r) => r.year !== year)) throw new Error(`days span more than one year: filter data.json to ONE year`);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const expected = leap ? 366 : 365;
  if (new Set(rows.map((r) => r.date)).size !== rows.length) throw new Error(`days holds the same date twice: one value per day`);
  if (rows.length !== expected) throw new Error(`days holds ${rows.length} days of ${year}, not ${expected}: a calendar draws every day of the year — a missing day would be drawn as an impossible date`);

  beat.check();
  assertDrawsClaimColumn(rows.map((r) => r.value), HERE);

  const unit = plain(beat.unit);
  const format = (v) => plain(beat.format(v));
  const months = beat.months.map(plain);
  const dateFacts = (r) => ({ date: r.date, month: r.month, day: r.day, monthName: months[r.month - 1] });

  // ── the runs, exactly as the worked example finds them ───────────────────────────────────────
  const runAt = (threshold) => {
    let best = { length: 0, from: null, to: null };
    let run = [];
    for (const r of rows) {
      if (r.value >= threshold) run.push(r);
      else run = [];
      if (run.length > best.length) best = { length: run.length, from: run[0], to: run[run.length - 1] };
    }
    return { ...best, threshold, days: rows.filter((r) => r.value >= threshold).length };
  };
  /** A run split into one block per month row: across a month boundary it is two blocks on the grid. */
  const runsOf = (best) => {
    const inside = rows.filter((r) => r.date >= best.from.date && r.date <= best.to.date);
    const out = [];
    for (const r of inside) {
      const open = out[out.length - 1];
      if (open && open.month === r.month && open.to === r.day - 1) open.to = r.day;
      else out.push({ month: r.month, from: r.day, to: r.day });
    }
    return out;
  };
  const runFacts = (line) => ({ threshold: line.threshold, length: line.length, days: line.days, from: dateFacts(line.from), to: dateFacts(line.to), count: rows.length });

  const thresholds = [...new Set([beat.threshold, ...beat.thresholds])].sort((a, b) => a - b);
  if (thresholds.length < 3 || thresholds.length > 7) throw new Error(`threshold and thresholds give ${thresholds.length} lines: offer the reader 3 to 7 thresholds, the claim's among them`);
  const lines = thresholds.map(runAt);
  for (const line of lines) if (line.length === 0) throw new Error(`no day of ${year} reaches ${line.threshold}: drop ${line.threshold} from thresholds`);
  const seen = new Map();
  for (const line of lines) {
    const signature = `${line.from.date}..${line.to.date}`;
    if (seen.has(signature)) throw new Error(`thresholds ${seen.get(signature)} and ${line.threshold} select the same run (${signature}) — two lines under one outline: drop one of them`);
    seen.set(signature, line.threshold);
  }
  const claim = lines.find((l) => l.threshold === beat.threshold);
  const claimRuns = runsOf(claim);

  // Where the run's end stays put while the threshold moves — the reading the worked example found.
  const endsLikeClaim = (t) => {
    const r = runAt(t);
    return r.length > 0 && r.to.date === claim.to.date;
  };
  const step = beat.anchorStep ?? 1;
  let low = beat.threshold;
  let high = beat.threshold;
  while (endsLikeClaim(low - step)) low -= step;
  while (endsLikeClaim(high + step)) high += step;
  const anchor = { low, high, lines: Math.round((high - low) / step) + 1, end: dateFacts(claim.to), startLow: dateFacts(runAt(low).from), startHigh: dateFacts(runAt(high).from) };

  // ── the bins: one ramp, breaks in the data's units ───────────────────────────────────────────
  const values = rows.map((r) => r.value);
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const breaks = beat.breaks ?? scaleLinear().domain([min, max]).ticks(4).filter((t) => t > min && t < max);
  if (breaks.length < 2 || breaks.length > 6) throw new Error(`breaks are ${breaks.join(", ")}: give 2 to 6 bin breaks inside the values' range (${min} to ${max})`);
  for (let i = 1; i < breaks.length; i += 1) if (!(breaks[i] > breaks[i - 1])) throw new Error(`breaks must rise: ${breaks.join(", ")}`);
  const breakLabels = breaks.map(format);
  if (new Set(breakLabels).size !== breaks.length) throw new Error(`format() prints two breaks alike (${breakLabels.join(", ")}): show enough decimals that each break reads differently`);
  const binOf = (v) => {
    let i = 0;
    while (i < breaks.length && v >= breaks[i]) i += 1;
    return i;
  };
  const bins = [
    { from: null, to: breaks[0], label: `< ${breakLabels[0]} ${unit}` },
    ...breaks.slice(0, -1).map((b, i) => ({ from: b, to: breaks[i + 1], label: `${breakLabels[i]}–${breakLabels[i + 1]}` })),
    { from: breaks[breaks.length - 1], to: null, label: `≥ ${breakLabels[breakLabels.length - 1]} ${unit}` },
  ];

  // ── every day's reading: its bin and its rank in the year (ties share a rank) ────────────────
  const byValue = [...rows].sort((a, b) => b.value - a.value);
  const rank = new Map();
  byValue.forEach((r, i) => {
    const previous = byValue[i - 1];
    rank.set(r.date, previous && previous.value === r.value ? rank.get(previous.date) : i + 1);
  });
  const days = rows.map((r) => {
    const bin = binOf(r.value);
    const detail = plain(beat.detail({ ...dateFacts(r), value: r.value, rank: rank.get(r.date), count: rows.length, binLabel: bins[bin].label }));
    return { month: r.month, day: r.day, bin, detail };
  });
  if (new Set(days.map((d) => d.detail)).size < days.length) throw new Error(`detail() gives two days the same answer: start it with the date`);

  // ── the control ──────────────────────────────────────────────────────────────────────────────
  const labelOf = (t) => `${format(t)} ${unit}`;
  const cutoff = {
    label: plain(beat.cutoffLabel),
    claim: { label: labelOf(claim.threshold), announce: plain(beat.claimAnnounce(runFacts(claim))), spans: claimRuns.map(spanOf) },
    options: lines.filter((l) => l !== claim).map((line) => {
      const facts = runFacts(line);
      const option = { key: String(line.threshold), label: labelOf(line.threshold), announce: plain(beat.announce(facts)), note: plain(beat.note(facts)), spans: runsOf(line).map(spanOf) };
      if (!option.note.includes(String(line.length))) throw new Error(`note() is shown when the threshold is ${option.label}, so it must state that run's length (${line.length} days); it says: ${option.note}`);
      if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the option's label "${option.label}"; it says: ${option.announce}`);
      return option;
    }),
  };
  if (!cutoff.claim.announce.includes(cutoff.claim.label)) throw new Error(`claimAnnounce() must contain the claim's label "${cutoff.claim.label}"; it says: ${cutoff.claim.announce}`);
  const streakNote = plain(beat.streakNote(runFacts(claim)));
  if (!streakNote.includes(String(claim.length))) throw new Error(`streakNote() names the outlined run, so it must state its length (${claim.length} days); it says: ${streakNote}`);

  // The title states the run's length and its threshold — both drawn (the outline and the key).
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, claim.length, beat.threshold, year, ...lines.map((l) => l.length)], "days");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(typeof beat.reading === "function" ? beat.reading({ claim: runFacts(claim), lines: lines.map(runFacts), anchor }) : beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(beat.alt);
  const monthLabels = beat.monthsShort.map(plain);
  const DAY_TICKS = [1, 5, 10, 15, 20, 25, 30];

  const facts = beatFacts(rows.map((r) => ({ key: r.date, label: `${r.day}/${r.month}`, value: r.value })), { subject: streakNote, declaredSequence: unit });
  applicableTreatments(facts);

  const controlWords = [cutoff.label, cutoff.claim.label, cutoff.claim.announce, ...cutoff.options.flatMap((o) => [o.label, o.announce, o.note])].join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${bins.map((b) => b.label).join(" ")} ${controlWords}`,
    axis: `${monthLabels.join(" ")} ${DAY_TICKS.join(" ")} ${bins.map((b) => b.label).join(" ")}`,
    annot: streakNote,
    value: days.map((d) => d.detail).join(" "),
  };

  const interaction = {
    earns:
      `A still has one plate, so it prints one run — and the threshold that defines it (${labelOf(claim.threshold)}) was chosen by its author. Here the ` +
      `reader moves the line among ${lines.length} thresholds, and the run's length moves with it (${lines.map((l) => `${l.length} days at ${labelOf(l.threshold)}`).join(", ")}); ` +
      `from ${labelOf(anchor.low)} to ${labelOf(anchor.high)} it always ends on the same day — a fact that lives only in the difference between the states.`,
    controls: [
      {
        question: "Who chose that threshold — and if the line had been elsewhere, would the run still say the same thing?",
        gesture: "toggle-a-comparison",
        changes: "The outline leaves the claim's run and is retraced around the longest run at the chosen threshold, wherever it sits on the calendar; one sentence gives that run's length, its two dates and how many days of the year clear the line. The colours do not move.",
        parameter: "the threshold that defines the run",
        authorPicked: CUTOFF_CLAIM_SLUG,
        readerPicks: [CUTOFF_CLAIM_SLUG, ...cutoff.options.map((o) => cutoffSlugOf(o.key))],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What was that day worth exactly — warm for the year, or only for its month?",
        gesture: "ask-a-mark",
        changes: `The day answers with its date, its value, its bin and its rank among the ${rows.length} days of the year — the reading a bin destroys by construction.`,
        parameter: "which day is asked about",
        authorPicked: "the warmest day",
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedCalendarWeb,
        props: { days, bins, monthLabels, dayTicks: DAY_TICKS, claimRuns, streakNote, cutoff, interaction, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
