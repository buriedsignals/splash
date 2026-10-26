// The generic half of a streamgraph WEB beat, taken from
// proof/web-streamgraph-swiss-electricity/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: the bands are
// stacked on a centred, floating baseline; every year answers hover/tap/Tab with its whole
// composition in rank order; the year the tracked band reaches its rank is ringed and named; and a
// "floor" control lets the reader lay one band flat — the stream shears until that band's bottom edge
// is straight, and an axis opens for it alone (CSS only, works without JS). Which bands may be laid
// flat is computed, not chosen: a band too thin to hold two graduations is not offered. This file
// computes the stack, the shears, the axes and the rank; ./beat.mjs — the one file the model writes —
// gives the data and WORDS every reading. Copied into the beat by the harness; never edited by the
// model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { filedDirections, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import { DirectedStreamWeb, FRAME } from "./DirectedStreamWeb.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** A band is named inside itself when it can hold the name; below this it is named by the pointer. */
const NAMEABLE_UNITS = 18;

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { floorShear, floorTicks, floorSlugOf } = await import(chartWeb(HERE, "assets", "floor.ts"));

  const REQUIRED = ["eyebrow", "keys", "labels", "tracked", "readings", "rank", "unit", "format", "detail", "crossingLabel", "floorLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "crossingLabel", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const fn of ["formatTick", "formatTotal", "optionLabel"])
    if (beat[fn] !== undefined && typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the layers and the readings, refused as the static kit refuses them ──────────────────────
  const keys = [beat.keys].flat().map(String);
  if (keys.length < 2) throw new Error(`keys holds ${keys.length} layer(s); a stream stacks at least two`);
  if (keys.length > 9) throw new Error(`keys holds ${keys.length} layers; a stream carries at most nine — group the smallest into one "other" layer`);
  if (new Set(keys).size !== keys.length) throw new Error(`keys names one layer twice`);
  const unlabelled = keys.filter((k) => typeof beat.labels?.[k] !== "string" || !beat.labels[k].trim());
  if (unlabelled.length) throw new Error(`labels has no name for ${unlabelled.join(", ")}: give every key its name in the story's language`);
  if (!keys.includes(String(beat.tracked))) throw new Error(`tracked is ${JSON.stringify(beat.tracked)}, which is not one of keys (${keys.join(", ")})`);
  if (!Array.isArray(beat.readings)) throw new Error(`readings must be one { year, <key>: value } per year`);
  assertOnePerX(beat.readings);
  for (const r of beat.readings) {
    assertNumbers(keys.map((k) => [`${r.year} ${k}`, r[k]]));
    const negative = keys.filter((k) => r[k] < 0);
    if (negative.length) throw new Error(`${r.year} holds a negative value for ${negative.join(", ")}: a stream cannot stack it — draw a line or a diverging bar`);
  }
  const rows = [...beat.readings].sort((a, b) => a.year - b.year);
  if (rows.length < 4) throw new Error(`readings hold ${rows.length} years; a stream needs at least 4`);
  for (let i = 1; i < rows.length; i += 1)
    if (rows[i].year !== rows[i - 1].year + 1) throw new Error(`readings skip from ${rows[i - 1].year} to ${rows[i].year}: give every year, none skipped`);
  const totalOf = (r) => keys.reduce((s, k) => s + r[k], 0);
  const [penult, final] = [rows[rows.length - 2], rows[rows.length - 1]];
  if (totalOf(final) < totalOf(penult) * (5 / 6) && beat.lastYearComplete !== true)
    throw new Error(`the total falls from ${beat.format(totalOf(penult))} in ${penult.year} to ${beat.format(totalOf(final))} in ${final.year} — more than a sixth, so ${final.year} is probably partial: leave it out of readings and say so in source (or set lastYearComplete: true if the source confirms it)`);

  beat.check();
  assertDrawsClaimColumn(rows.flatMap((r) => keys.map((k) => r[k])), HERE);

  // ── the claim's rank: the year it is first reached, held to the end ──────────────────────────
  const tracked = String(beat.tracked);
  const N = beat.rank;
  if (!(Number.isInteger(N) && N >= 1 && N <= keys.length)) throw new Error(`rank is ${JSON.stringify(N)}: the place the tracked layer reaches, an integer from 1 to ${keys.length}`);
  const rankOf = (r, key) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((z) => z.k === key) + 1;
  const reached = rows.find((r) => rankOf(r, tracked) <= N);
  if (!reached) throw new Error(`${beat.labels[tracked]} never reaches rank ${N} in these readings`);
  const lost = rows.find((r) => r.year > reached.year && rankOf(r, tracked) > N);
  if (lost) throw new Error(`${beat.labels[tracked]} reaches rank ${N} in ${reached.year} and loses it in ${lost.year}: the ring marks a rank held to the end`);
  if (beat.reachedIn !== undefined && beat.reachedIn !== reached.year) throw new Error(`reachedIn is ${beat.reachedIn}, but the data gives ${reached.year} as the first year at rank ${N}`);

  // ── geometry: a centred baseline, every layer stacked in keys order ──────────────────────────
  const B = keys.map((k, i) => ({ key: `b${i + 1}`, source: k, name: plain(beat.labels[k]) }));
  const keyOf = new Map(B.map((b) => [b.source, b.key]));
  const years = rows.map((r) => r.year);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const maxTotal = Math.max(...rows.map(totalOf));
  const x = (year) => ((year - years[0]) / (years[years.length - 1] - years[0])) * FRAME.width;
  const scale = (FRAME.height * 0.9) / maxTotal;
  const baseline = rows.map((r) => FRAME.height / 2 + (totalOf(r) * scale) / 2);
  const stacked = rows.map((r, i) => {
    let y = baseline[i];
    const out = {};
    for (const b of B) {
      const h = r[b.source] * scale;
      out[b.key] = { bottom: y, top: y - h };
      y -= h;
    }
    return out;
  });
  const geometry = { xs: rows.map((r) => x(r.year)), bands: B.map((b) => ({ key: b.key, top: rows.map((_, i) => stacked[i][b.key].top), bottom: rows.map((_, i) => stacked[i][b.key].bottom) })) };
  const round = (n) => Number(n.toFixed(2));
  const pathOf = (key, shift) => {
    const top = rows.map((r, i) => `${i === 0 ? "M" : "L"} ${round(x(r.year))} ${round(stacked[i][key].top + shift[i])}`).join(" ");
    const bottom = rows.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => `L ${round(x(r.year))} ${round(stacked[i][key].bottom + shift[i])}`).join(" ");
    return `${top} ${bottom} Z`;
  };
  const flat = rows.map(() => 0);
  const thickestOf = (b) => rows.reduce((best, r, i) => (r[b.source] > rows[best][b.source] ? i : best), 0);
  const peakUnitsOf = (b) => Math.max(...rows.map((_, i) => stacked[i][b.key].bottom - stacked[i][b.key].top));
  const midOf = (key, i, shift) => (stacked[i][key].top + stacked[i][key].bottom) / 2 + shift[i];

  // A band is named at its thickest year, clamped away from both edges; the name's height is read
  // at the year the clamp lands on, so a band that peaks at the edge is named inside itself there.
  const named = B.filter((b) => peakUnitsOf(b) >= NAMEABLE_UNITS).map((b) => {
    const at = Math.min(Math.max(x(rows[thickestOf(b)].year), FRAME.width * 0.08), FRAME.width * 0.92);
    const nearest = rows.reduce((best, r, i) => (Math.abs(x(r.year) - at) < Math.abs(x(rows[best].year) - at) ? i : best), 0);
    return { key: b.key, name: b.name, x: at, at: nearest };
  });
  const trackedKey = keyOf.get(tracked);
  const crossingIndex = rows.findIndex((r) => r.year === reached.year);
  const crossingX = x(reached.year);
  const crossingText = plain(beat.crossingLabel({ year: reached.year, rank: N, name: beat.labels[tracked] }));
  if (!crossingText.includes(String(reached.year))) throw new Error(`crossingLabel() names the ring, so it must state the year ${reached.year}; it says: ${crossingText}`);

  // ── the control: a band is offered only when it can carry an axis of two graduations ─────────
  // The spacing is the widest of the filed directions' own axis leading, as the worked example
  // measures it, so whichever direction governs the page offers the same control.
  const axisLeads = filedDirections().map((d) => leadOf(registerOf(resolveDirectionFamilies(d, { axis: years.join(" ") }), "axis", {})));
  const minSpacing = Math.max(...axisLeads);
  const formatTick = (v) => plain((beat.formatTick ?? beat.format)(v));
  const values = (b) => rows.map((r) => r[b.source]);
  const offeredBands = [];
  const refusedBands = [];
  for (const b of B) {
    const { shift, ruleY, span } = floorShear(geometry, b.key, { height: FRAME.height });
    const ticks = floorTicks(geometry, b.key, { unitsPerValue: scale, ruleY, minSpacing, maxTicks: 6 });
    if (ticks.length < 2) {
      refusedBands.push(`${b.name} (${ticks.length} graduation)`);
      continue;
    }
    offeredBands.push({ ...b, shift, ruleY, span, ticks });
  }
  if (refusedBands.length) console.log(`floor: not offered (too thin to carry an axis) — ${refusedBands.join(" · ")}`);
  if (offeredBands.length < 2)
    throw new Error(`only ${offeredBands.length} layer(s) are thick enough to carry an axis of their own, so the floor control would be a choice of ${offeredBands.length}: this data is a static streamgraph, or group thin layers into thicker ones`);

  const readingOf = (b) => {
    const v = values(b);
    const lastIndex = v.length - 1;
    const peakI = v.reduce((best, x, i) => (x > v[best] ? i : best), 0);
    const troughI = v.reduce((best, x, i) => (x < v[best] ? i : best), 0);
    return {
      name: b.name,
      first: { year: years[0], value: v[0] },
      last: { year: years[lastIndex], value: v[lastIndex] },
      // A peak or a trough that IS one of the two ends is not a third reading: null.
      peak: peakI !== 0 && peakI !== lastIndex ? { year: years[peakI], value: v[peakI] } : null,
      trough: troughI !== 0 && troughI !== lastIndex ? { year: years[troughI], value: v[troughI] } : null,
      move: v[lastIndex] - v[0],
      share: (v[lastIndex] / totalOf(last)) * 100,
    };
  };
  const optionLabel = (name) => plain(beat.optionLabel ? beat.optionLabel(name) : `${name[0].toUpperCase()}${name.slice(1)}`);
  const unit = plain(beat.unit);
  const floor = {
    label: plain(beat.floorLabel),
    noneLabel: plain(beat.noneLabel),
    carries: [...named.map((b) => ({ key: b.key, y: midOf(b.key, b.at, flat) })), { key: "crossing", y: midOf(trackedKey, crossingIndex, flat) }],
    options: offeredBands.map((band) => {
      const o = readingOf(band);
      const label = optionLabel(band.name);
      const option = {
        key: band.key,
        label,
        announce: plain(beat.announce({ ...o, label })),
        note: plain(beat.note(o)),
        shift: band.shift.map(round),
        ruleY: round(band.ruleY),
        ticks: band.ticks.map((t, i) => ({ value: t.value, y: round(t.y), text: i === band.ticks.length - 1 ? `${formatTick(t.value)} ${unit}` : formatTick(t.value) })),
        carries: [...named.map((b) => ({ key: b.key, y: round(midOf(b.key, b.at, band.shift)) })), { key: "crossing", y: round(midOf(trackedKey, crossingIndex, band.shift)) }],
      };
      if (!option.announce.includes(label)) throw new Error(`announce() must contain the option's label (${label}); it says: ${option.announce}`);
      const lastValue = plain(beat.format(o.last.value));
      if (!option.note.includes(lastValue)) throw new Error(`note() for ${band.name} must state its last value, format(o.last.value) = "${lastValue}"; it says: ${option.note}`);
      return option;
    }),
  };

  const plates = [
    { slug: "none", bands: B.map((b, tone) => ({ key: b.key, tone, d: pathOf(b.key, flat) })), ruleY: null, grid: [], crossing: { x: round(crossingX), y: round(midOf(trackedKey, crossingIndex, flat)) } },
    ...floor.options.map((option) => ({
      slug: floorSlugOf(option.key),
      bands: B.map((b, tone) => ({ key: b.key, tone, d: pathOf(b.key, option.shift) })),
      ruleY: option.ruleY,
      grid: option.ticks.slice(1).map((t) => t.y),
      crossing: { x: round(crossingX), y: round(midOf(trackedKey, crossingIndex, option.shift)) },
    })),
  ];
  const axes = floor.options.map((option) => ({ slug: floorSlugOf(option.key), name: B.find((b) => b.key === option.key).name, ticks: option.ticks.map((t) => ({ text: t.text, y: t.y })) }));

  // ── the reading: one point per year, at an x no option moves ─────────────────────────────────
  const marks = rows.map((r) => {
    const ranked = B.map((b) => ({ name: b.name, value: r[b.source] })).sort((a, b) => b.value - a.value);
    // The first and last readings sit ON the svg's border, so half their point is outside it; a
    // pointer there lands on the point but not on the hit area, and the format's stage listener
    // stands down for any target inside an svg.chart (interaction.mjs, insideSomeChart) — the first
    // year then answers nothing, depending on how the plot's edge rounds. The invisible point is
    // held one radius (5 units, the component's r) inside the frame; the stream is not moved.
    return { key: `${r.year}`, year: r.year, x: round(Math.min(Math.max(x(r.year), 5), FRAME.width - 5)), detail: plain(beat.detail({ year: r.year, total: totalOf(r), ranked })) };
  });
  const details = new Set(marks.map((m) => m.detail));
  if (details.size !== marks.length) throw new Error(`detail() answers two years with the same sentence: start it with the year`);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const colon = beat.colon ?? (/^fr\b/.test(lang) ? " : " : ": ");
  const formatTotal = beat.formatTotal ?? beat.format;
  const totals = { left: plain(`${years[0]}${colon}${formatTotal(totalOf(first))} ${beat.unit}`), right: plain(`${years[years.length - 1]}${colon}${formatTotal(totalOf(last))} ${beat.unit}`) };
  // The two totals are keyed to the first and the last year's tick, so both ends always carry one;
  // round years between them, none closer than half a step to an end.
  const step = years.length > 30 ? 10 : 5;
  const ends = [years[0], years[years.length - 1]];
  const between = years.filter((y) => y % step === 0 && y - ends[0] >= step / 2 && ends[1] - y >= step / 2);
  const xTicks = [ends[0], ...between, ends[1]].map((year) => ({ year, x: round(x(year)) }));

  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.flatMap((r) => keys.map((k) => r[k])), ...rows.map(totalOf)], "layers");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(rows) : beat.alt);
  const toneLabels = B.map((b) => b.name);

  const facts = beatFacts(B.map((b) => ({ key: b.key, label: b.name, value: last[b.source] })), { subject: beat.labels[tracked], declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${toneLabels.join(" ")} ${floor.label} ${floor.noneLabel} ${floor.options.map((o) => `${o.label} ${o.note}`).join(" ")}`,
    axis: `${xTicks.map((t) => t.year).join(" ")} ${axes.flatMap((a) => a.ticks.map((t) => t.text)).join(" ")}`,
    annot: `${crossingText} ${totals.left} ${totals.right}`,
    value: toneLabels.join(" "),
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang,
        component: DirectedStreamWeb,
        props: {
          plates,
          axes,
          floor,
          geometry,
          marks,
          xTicks,
          tones: B.length,
          toneLabels,
          bandNames: named.map((b) => ({ key: b.key, x: round(b.x), text: b.name })),
          totals,
          totalSeparator: colon,
          crossingText,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
