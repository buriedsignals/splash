// The generic half of a beeswarm WEB beat, taken from
// proof/web-beeswarm-co2-per-person/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a "weigh by"
// control re-weighs the swarm — a circle's area is its size (population), or the same for every unit,
// or its total (value × size) — and each weighting is a drawing re-derived: the ink ladder runs again,
// the packer re-seats every mark (only ACROSS the axis, never along it), and a centre-of-mass caret
// slides to where half that weighting's weight lies (CSS only, works without JS). Every circle answers
// hover/tap/Tab with a different reading per weighting. This file computes the three packings and
// every reading; ./beat.mjs — the one file the model writes — gives the marks and WORDS every reading.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedSwarmWeb, FRAME } from "./DirectedSwarmWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOneWeighing, weighLadder } = await import(chartWeb(HERE, "assets", "weigh.ts"));

  const REQUIRED = ["eyebrow", "marks", "unit", "format", "marker", "markerLabel", "median", "medianLabel", "centreLabel", "callout", "weighLabel", "views", "detail", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "callout", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const view of ["size", "count", "total"]) {
    const v = beat.views[view];
    if (!v || typeof v.label !== "string" || typeof v.announce !== "string")
      throw new Error(`views.${view} must be { label, announce${view === "size" ? "" : ", note(w)"} } (see CONTRACT.md)`);
    if (view !== "size" && typeof v.note !== "function") throw new Error(`views.${view}.note must be a function (see CONTRACT.md)`);
    if (view === "size" && v.note !== undefined) throw new Error(`views.size takes no note: it is the page's landing picture, the claim itself`);
  }

  // ── the marks: one per unit, placed by value, its area its weight ───────────────────────────
  assertNumbers(beat.marks.map((m) => [m.name, m.value]));
  assertNumbers(beat.marks.map((m) => [m.name, m.size]), "sizes");
  if (beat.marks.length < 10) throw new Error(`marks holds ${beat.marks.length} units; a beeswarm needs ten or more (fewer is a dot strip or a bar)`);
  const names = new Set(beat.marks.map((m) => String(m.name)));
  if (names.size !== beat.marks.length) throw new Error(`marks holds the same name twice: give each unit ONE mark (filter data.json to one year / one group)`);
  const bad = beat.marks.find((m) => m.value < 0 || !(m.size > 0));
  if (bad) throw new Error(`${bad.name} has value ${bad.value} and size ${bad.size}: a value is zero or more (the axis starts at zero) and a size is more than zero`);
  // Keys used in ids and selectors are the runner's own, never the model's names.
  const all = beat.marks.map((m, i) => ({ key: `m${i + 1}`, name: String(m.name), value: m.value, size: m.size, total: m.value * m.size }));

  beat.check();
  assertDrawsClaimColumn(all.map((m) => m.value), HERE);

  const sorted = [...all].sort((a, b) => a.value - b.value);
  const median = sorted[Math.floor(sorted.length / 2)].value;
  if (Math.abs(beat.median - median) > Math.max(1e-9, Math.abs(median) * 1e-6))
    throw new Error(`median is ${beat.median}, but the middle unit of the ${all.length} marks sorted by value is at ${median}: give median = that value`);
  if (!Number.isFinite(beat.marker)) throw new Error(`marker is ${beat.marker}: give the value of the rule the field is read against (e.g. the size-weighted mean)`);

  const sizeTotal = all.reduce((s, m) => s + m.size, 0);
  const grandTotal = all.reduce((s, m) => s + m.total, 0);
  // What share of the sizes, of the units and of the totals sits strictly BELOW each mark.
  const below = new Map();
  let accSize = 0;
  let accCount = 0;
  let accTotal = 0;
  sorted.forEach((m, i) => {
    below.set(m.key, { rank: i + 1, belowSizePct: (accSize / sizeTotal) * 100, belowCountPct: (accCount / all.length) * 100, belowTotalPct: grandTotal > 0 ? (accTotal / grandTotal) * 100 : 0 });
    accSize += m.size;
    accCount += 1;
    accTotal += m.total;
  });
  const underMarker = (weight) => (sorted.filter((m) => m.value < beat.marker).reduce((s, m) => s + weight(m), 0) / all.reduce((s, m) => s + weight(m), 0)) * 100;

  // ── the axis: from zero, round steps, the last tick stops short of the frame's edge ───────────
  const farthest = all.reduce((a, b) => (b.value > a.value ? b : a));
  // The round step (1, 2 or 5 × 10^k) that gives about eight graduations.
  const roundStep = (span) => {
    const raw = span / 8;
    const power = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw * 0.75) ?? 10 * power;
  };
  const step = beat.tickStep ?? roundStep(farthest.value);
  const xMax = Math.ceil(farthest.value / step) * step || step;
  const X = (value) => (value / xMax) * FRAME.width;
  // A tick at 100 % would put half its label outside the plot (measured on the worked example).
  const xTicks = [];
  for (let t = 0; t < xMax - step * 1e-9; t += step) xTicks.push(Number(t.toPrecision(12)));

  // ── the three packings, exactly as the worked example packs ──────────────────────────────────
  const AXIS_Y = FRAME.height - 8;
  const FLOOR_R = 2.4;
  const GAP = 0.6;
  const RUNGS = [0.3, 0.26, 0.22, 0.19, 0.16, 0.13, 0.11, 0.09, 0.075, 0.06, 0.05, 0.04, 0.03, 0.025];
  /** Pushed only ACROSS the axis, largest first, exact tangent candidates, ties broken on the key. */
  function packWith(radii) {
    const placed = [];
    const order = all.map((c, i) => ({ c, r: radii[i] })).sort((a, b) => b.r - a.r || (a.c.key < b.c.key ? -1 : 1));
    const seats = new Map();
    let top = Infinity;
    for (const { c, r } of order) {
      const cx = X(c.value);
      const base = AXIS_Y - r;
      const candidates = [base];
      for (const p of placed) {
        const reach = p.r + r + GAP;
        const dx = Math.abs(p.cx - cx);
        if (dx >= reach) continue;
        candidates.push(p.cy - Math.sqrt(reach * reach - dx * dx));
      }
      candidates.sort((a, b) => b - a);
      let cy = null;
      for (const candidate of candidates) {
        if (candidate > base + 1e-9) continue;
        let clear = true;
        for (const p of placed) {
          const reach = p.r + r + GAP;
          if ((p.cx - cx) ** 2 + (p.cy - candidate) ** 2 < reach * reach - 1e-6) {
            clear = false;
            break;
          }
        }
        if (clear) {
          cy = candidate;
          break;
        }
      }
      if (cy === null) return null;
      placed.push({ cx, cy, r });
      seats.set(c.key, { cx, cy, r });
      top = Math.min(top, cy - r);
    }
    // The annotation band is reserved in EVERY packing, so no word on the page moves.
    return top >= FRAME.topBand ? seats : null;
  }

  const WEIGHTINGS = [
    { key: "size", weight: (c) => c.size },
    { key: "count", weight: () => 1 },
    { key: "total", weight: (c) => c.total },
  ];
  const frameArea = FRAME.width * FRAME.height;
  const laid = WEIGHTINGS.map((w) => {
    const weights = all.map(w.weight);
    const total = weights.reduce((s, x) => s + x, 0);
    const { radii, seats } = weighLadder(weights, { frameArea, rungs: RUNGS, floorRadius: FLOOR_R, fit: packWith, what: `the swarm weighed by ${w.key}` });
    let acc = 0;
    let centre = sorted[0].value;
    for (const c of sorted) {
      acc += w.weight(c);
      if (acc >= total / 2) {
        centre = c.value;
        break;
      }
    }
    return { ...w, weights, radii, seats, centre };
  });
  const centres = Object.fromEntries(laid.map((l) => [l.key, l.centre]));
  if (centres.size === centres.count && centres.count === centres.total)
    throw new Error(`half the weight sits at ${centres.size} under every weighting: the "weigh by" control would move nothing — this data has no beeswarm-weigh argument`);

  // ── the two cases named unconditionally: the largest circle and the farthest one out ─────────
  const biggest = all.reduce((a, b) => (b.size > a.size ? b : a));
  if (biggest.key === farthest.key) throw new Error(`${biggest.name} is both the largest circle and the farthest out: the page names one case on each side of the plot, so the data needs two distinct cases`);
  if (X(biggest.value) / FRAME.width > 0.5) throw new Error(`the largest circle (${biggest.name}) sits in the right half of the axis; the page names it on the left and the farthest unit on the right — this layout cannot hold this data`);
  const callFacts = (m) => ({ name: m.name, value: m.value, size: m.size, total: m.total, isBiggest: m.key === biggest.key, isFarthest: m.key === farthest.key });
  const notes = [biggest, farthest].map((m) => ({ key: m.key, text: plain(beat.callout(callFacts(m))) }));
  const CALLED_OUT = [biggest.key, farthest.key];

  // ── the words of the control and every reading ────────────────────────────────────────────────
  const heaviest = all.reduce((a, b) => (b.total > a.total ? b : a));
  const weighFacts = {
    count: all.length,
    median,
    marker: beat.marker,
    centres,
    sizeTotal,
    grandTotal,
    underMarker: { size: underMarker((m) => m.size), count: underMarker(() => 1), total: underMarker((m) => m.total) },
    heaviest: { name: heaviest.name, value: heaviest.value, size: heaviest.size, total: heaviest.total, sharePct: (heaviest.total / grandTotal) * 100 },
  };
  const weigh = {
    label: plain(beat.weighLabel),
    floorRadius: FLOOR_R,
    options: laid.map((l) => {
      const words = beat.views[l.key];
      const option = { key: l.key, label: plain(words.label), announce: plain(words.announce), weights: l.weights, centre: X(l.centre) };
      if (l.key !== "size") {
        option.note = plain(words.note({ ...weighFacts, centre: l.centre }));
        const centre = plain(beat.format(l.centre, 2));
        if (!option.note.includes(centre))
          throw new Error(`views.${l.key}.note() is shown when the swarm is weighed by ${l.key}, so it must state where half that weight lies, format(centre, 2) = "${centre}"; it says: ${option.note}`);
      }
      if (!option.announce.includes(option.label)) throw new Error(`views.${l.key}.announce must contain its label "${option.label}"; it says: ${option.announce}`);
      return option;
    }),
  };

  const plates = laid.map((l) => ({
    slug: l.key,
    marks: all.map((c) => {
      const seat = l.seats.get(c.key);
      const reading = { name: c.name, value: c.value, size: c.size, total: c.total, count: all.length, totalSharePct: (c.total / grandTotal) * 100, ...below.get(c.key) };
      return { key: c.key, name: c.name, cx: seat.cx, cy: seat.cy, r: seat.r, lit: CALLED_OUT.includes(c.key), detail: plain(beat.detail(reading, l.key)) };
    }),
    leaders: CALLED_OUT.map((key) => {
      const seat = l.seats.get(key);
      return { key, cx: seat.cx, y: seat.cy - seat.r };
    }),
  }));
  for (const plate of plates) {
    const answers = new Set(plate.marks.map((m) => `${m.name} ${m.detail}`));
    if (answers.size < plate.marks.length) throw new Error(`detail(m, "${plate.slug}") gives two marks the same answer: say each unit's own figures`);
  }
  const sameAcross = plates[0].marks.filter((m, i) => m.detail === plates[1].marks[i].detail || m.detail === plates[2].marks[i].detail);
  if (sameAcross.length > all.length / 2)
    throw new Error(`detail(m, view) answers the same under two weightings for ${sameAcross.length} marks: each weighting asks its own question (share of sizes below, rank among the units, share of the total below)`);

  // The plate draws the median and marker rules and the three centres; a title may state them.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...all.map((m) => m.value), median, beat.marker, ...Object.values(centres)], "marks");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const alt = plain(beat.alt);
  const centreLabel = plain(beat.centreLabel);
  const levels = { median: { value: median, label: plain(beat.medianLabel) }, average: { value: beat.marker, label: plain(beat.markerLabel) } };

  const facts = beatFacts(all.map((c) => ({ key: c.key, label: c.name, value: c.value })), { subject: biggest.name, declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${xTicks.join(" ")} ${unit} ${centreLabel}`,
    annot: `${levels.median.label} ${levels.average.label} ${notes.map((n) => n.text).join(" ")} ${weigh.label} ${weigh.options.map((o) => `${o.label} ${o.announce} ${o.note ?? ""}`).join(" ")}`,
    value: all.map((c) => plain(beat.format(c.value, 1))).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const name = `${label}.html`;
      const result = await renderWeb({
        lang,
        component: DirectedSwarmWeb,
        props: {
          plates,
          weigh,
          centreLabel,
          xTicks,
          xMax,
          median: levels.median,
          average: levels.average,
          title,
          eyebrow,
          caveat,
          source,
          unit,
          reading,
          notes,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name,
      });
      // Read the written page back: a datum tagged with a mark and not with a weighting, or a
      // stylesheet that forgot to hide the plates it generated, is caught only here.
      assertOneWeighing(readFileSync(result.outPath, "utf8"), weigh, name);
      return result;
    },
  });
});
