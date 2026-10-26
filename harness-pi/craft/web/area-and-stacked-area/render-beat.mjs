// The generic half of an area WEB beat, taken from proof/web-area-swiss-co2/render-directions-web.mjs
// with everything about ITS subject removed. The interaction is the worked example's and is not the
// model's to change: the surface is cut at ONE year into two chromas of one hue (the plate's cut), a
// "cut at" control hands that cut to the reader — choose a year and the seam travels there, a ground-
// cased rule stands on it, and one sentence gives the years and the share of the whole surface on each
// side (CSS only, works without JS) — and every reading answers hover/tap/Tab with its value and the
// share of the total already behind it. This file computes that arithmetic; ./beat.mjs — the one file
// the model writes — gives the series and WORDS every reading. Copied into the beat by the harness;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedAreaWeb, SERIES, xOf } from "./DirectedAreaWeb.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { levelSlugOf } = await import(chartWeb(HERE, "assets", "level.ts"));

  const REQUIRED = ["eyebrow", "data", "cut", "valueUnit", "format", "cutNote", "detail", "cutYears", "levelLabel", "noneLabel", "announce", "note", "total", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "total", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.markLabel !== undefined && typeof beat.markLabel !== "function") throw new Error(`beat.mjs: markLabel must be a function (see CONTRACT.md)`);

  // ── the series: an area is a quantity, so a gap or a negative value is refused ──────────────
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  const rows = [...beat.data].sort((a, b) => a.year - b.year);
  if (rows.length < 3) throw new Error(`an area needs a series; data gives ${rows.length} readings`);
  const negative = rows.find((r) => r.value < 0);
  if (negative) throw new Error(`${negative.year} is ${negative.value}: an area is drawn from zero and cannot draw a value below it — give data a series of quantities`);
  if (!rows.some((r) => r.value > 0)) throw new Error(`every reading is zero; there is no surface to draw`);
  for (let i = 1; i < rows.length; i += 1)
    if (rows[i].year !== rows[i - 1].year + 1)
      throw new Error(`data skips from ${rows[i - 1].year} to ${rows[i].year}: an area closes over a gap and states a quantity nobody measured — give consecutive years (start data after the gap and say so in limits)`);
  const firstYear = rows[0].year;
  const lastYear = rows[rows.length - 1].year;
  const isInterior = (year) => Number.isInteger(year) && year > firstYear && year < lastYear;
  if (!isInterior(beat.cut)) throw new Error(`cut ${beat.cut} must be a year strictly between ${firstYear} and ${lastYear}`);

  beat.check();
  assertDrawsClaimColumn(rows.map((d) => d.value), HERE);

  // ── the stock, as the worked example integrates it ───────────────────────────────────────────
  const total = rows.reduce((s, r) => s + r.value, 0);
  const sumFromOf = (year) => rows.filter((r) => r.year >= year).reduce((s, r) => s + r.value, 0);
  const shareFromCut = (sumFromOf(beat.cut) / total) * 100;
  const yearsFromCut = lastYear - beat.cut + 1;
  const yearsBeforeCut = beat.cut - firstYear;
  const plateFacts = { firstYear, lastYear, count: rows.length, total, cut: beat.cut, shareFromCut, yearsFromCut, yearsBeforeCut };

  let running = 0;
  const readings = rows.map((r) => {
    running += r.value;
    const facts = { year: r.year, value: r.value, sharePct: (running / total) * 100, isCut: r.year === beat.cut, isLast: r.year === lastYear, firstYear, lastYear, total };
    const detail = plain(beat.detail(facts));
    return {
      year: r.year,
      mt: r.value,
      label: plain(beat.format(r.value, 1)),
      share: plain(beat.format(facts.sharePct, 1)),
      detail,
      aria: beat.markLabel ? plain(beat.markLabel(facts)) : detail,
    };
  });
  const answers = new Set(readings.map((r) => r.detail));
  if (answers.size < readings.length) throw new Error(`detail() gives ${readings.length} years only ${answers.size} different answers: start it with the year so each mark answers for itself`);

  const totalLine = plain(beat.total(plateFacts));
  if (!totalLine.includes(String(beat.cut))) throw new Error(`total() is printed under the plate and must name the cut year ${beat.cut}; it says: ${totalLine}`);
  const cutNote = plain(beat.cutNote);
  if (!cutNote.includes(String(beat.cut))) throw new Error(`cutNote is written on the cut rule and must name its year ${beat.cut}; it says: ${cutNote}`);

  // ── the reader's cuts: each a year the surface is re-partitioned at ───────────────────────────
  const cutYears = [...new Set(beat.cutYears)].sort((a, b) => a - b);
  if (cutYears.length < 2 || cutYears.length > 8) throw new Error(`cutYears holds ${cutYears.length} years: offer the reader between 2 and 8 years to cut the surface at`);
  const cohorts = cutYears.map((year) => {
    if (!isInterior(year)) throw new Error(`cutYears holds ${year}, which is not a year strictly inside ${firstYear}–${lastYear}: the surface cannot be cut there`);
    const yearsFrom = lastYear - year + 1;
    const yearsBefore = year - firstYear;
    if (yearsFrom < 2 || yearsBefore < 2) throw new Error(`cutYears holds ${year}, which leaves ${yearsFrom} year(s) after it and ${yearsBefore} before it — not a cut; choose a year further inside the series`);
    const sumFrom = sumFromOf(year);
    const sumBefore = total - sumFrom;
    return {
      year,
      yearsFrom,
      yearsBefore,
      count: rows.length,
      firstYear,
      lastYear,
      shareOfYears: (yearsFrom / rows.length) * 100,
      shareOfTotal: (sumFrom / total) * 100,
      sumFrom,
      sumBefore,
      meanFrom: sumFrom / yearsFrom,
      meanBefore: sumBefore / yearsBefore,
    };
  });

  const levels = {
    label: plain(beat.levelLabel),
    noneLabel: plain(beat.noneLabel),
    options: cohorts.map((c) => {
      const option = { key: String(c.year), label: String(c.year), announce: plain(beat.announce(c)), note: plain(beat.note(c)), marks: [{ series: SERIES, x: xOf(c.year, firstYear, lastYear) }] };
      if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the year ${c.year}; it says: ${option.announce}`);
      const share = plain(beat.format(c.shareOfTotal, 1));
      if (!option.note.includes(share)) throw new Error(`note() is shown when the reader cuts at ${c.year}, so it must state that cut's share of the total, format(shareOfTotal, 1) = "${share}"; it says: ${option.note}`);
      return option;
    }),
  };
  const splits = cohorts.map((c) => ({ slug: levelSlugOf(String(c.year)), year: c.year, label: String(c.year), x: xOf(c.year, firstYear, lastYear) }));

  // The total line under the plate carries the whole stock and the share from the cut; a title that
  // counts the cut's years ("in 38 years out of 167") states the partition the plate draws, and one
  // that names the first year ("since 1858") names the axis's own start.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.map((d) => d.value), total, shareFromCut, yearsFromCut, yearsBeforeCut, rows.length, firstYear, lastYear], "series");

  // ── the axes: from zero (an area is a quantity), round ticks ─────────────────────────────────
  const values = rows.map((r) => r.value);
  const yTicks = beat.yTicks ?? scaleLinear().domain([0, Math.max(...values)]).nice(5).ticks(5);
  if (yTicks[0] !== 0) throw new Error(`yTicks start at ${yTicks[0]}: an area's axis starts at zero — leave yTicks out`);
  // Round years, at most six of them: the axis is fixed CSS type, and a phone holds about six.
  const yearTicks = () => {
    for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]) {
      const ticks = [];
      for (let t = Math.ceil(firstYear / step) * step; t <= lastYear; t += step) ticks.push(t);
      if (ticks.length <= 6) return ticks;
    }
    return [firstYear, lastYear];
  };
  const xTicks = beat.xTicks ?? yearTicks();

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.valueUnit);
  const alt = plain(beat.alt);

  const facts = beatFacts(readings.map((r) => ({ key: String(r.year), label: String(r.year), value: r.mt })), { subject: eyebrow, declaredSequence: unit, states: [String(firstYear), String(lastYear)] });
  const offered = applicableTreatments(facts);

  const last = readings[readings.length - 1];
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${totalLine} ${levels.label} ${levels.noneLabel} ${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${yTicks.join(" ")} ${xTicks.join(" ")} ${unit}`,
    annot: `${cutNote} ${levels.options.map((o) => o.label).join(" ")}`,
    value: `${readings.map((r) => `${r.year} ${r.label}`).join(" ")} ${last.year} · ${last.label}`,
  };

  // The interaction, declared as the worked example declares it; renderWeb holds it against the markup.
  const interaction = {
    earns:
      `A plate can cut the surface only once, at the author's year (${beat.cut}). Here the reader puts the cut on a year of their own among ` +
      `${cohorts.length}, and the page answers with the years on each side and the share of the whole surface each carries — an integral no eye ` +
      `can take off an area, recomputed for every one of the ${rows.length} readings.`,
    controls: [
      {
        question: "From the year I choose, how much of the whole total came after it?",
        gesture: "find-your-own-case",
        changes: `The seam between the two chromas leaves ${beat.cut} and moves to the chosen year; a ground-cased rule stands on the new seam, the year is written at its foot, and one sentence gives the years and the share of the total on each side.`,
        parameter: "the year the surface is cut at",
        authorPicked: "none",
        readerPicks: ["none", ...cohorts.map((c) => String(c.year))],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What was that year worth, and how much of the total was already behind it?",
        gesture: "ask-a-mark",
        changes: `The year answers with its own value and the share of the whole surface to its left — the ${rows.length} readings the plate could not print.`,
        parameter: "which year is asked about",
        authorPicked: String(beat.cut),
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
        component: DirectedAreaWeb,
        props: {
          readings,
          midYear: beat.cut,
          totalMt: plain(beat.format(total, 0)),
          shareAfter: plain(beat.format(shareFromCut, 1)),
          totalLine,
          yTicks,
          xTicks,
          title,
          eyebrow,
          caveat,
          source,
          unit,
          midNote: cutNote,
          reading,
          levels,
          splits,
          interaction,
          alt,
          direction,
          treatments: offered.map((t) => t.id),
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
