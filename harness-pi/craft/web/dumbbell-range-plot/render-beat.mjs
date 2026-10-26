// The generic half of a dumbbell WEB beat, taken from
// proof/web-dumbbell-life-expectancy-gains/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: one dumbbell per
// row (a pale head at the earlier state, a full head at the later one, the bar between them IS the
// change, the change printed at the right), rows ranked by change. A YARDSTICK control lets the reader
// choose a row and stands that row's two levels up across every row as two dotted references, with a
// sentence counting who was already above its later level and who is still below its earlier one.
// Every row's bar answers hover/tap/Tab with its change, its rank and its distance from the median
// change. CSS only, works without JS. This file computes the ranking, the ranks of level, the counts
// and the scale; ./beat.mjs — the one file the model writes — gives the data and WORDS every reading.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedDumbbellWeb, ROW, SERIES, rowFloorFor, scaleFor } from "./DirectedDumbbellWeb.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** Letter-only keys ("ra", "rb", … "rba"): a control key ending in a digit was measured to break
 *  verify-web's "choosing it again restores the landing picture" on another vocabulary. */
const letterKey = (i) => {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `r${s}`;
};

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "fromName", "toName", "format", "gainLabel", "detail", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "gainLabel", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the rows (the static kit's shape) ─────────────────────────────────────────────────────────
  if (!Array.isArray(beat.rows) || beat.rows.length < 3 || beat.rows.length > 20)
    throw new Error(`rows holds ${beat.rows?.length ?? 0}: a dumbbell plate draws 3 to 20 rows`);
  assertNumbers(beat.rows.flatMap((r) => [[`${r.key} from`, r.from], [`${r.key} to`, r.to]]), "values");
  const keys = new Set(beat.rows.map((r) => String(r.key)));
  if (keys.size !== beat.rows.length) throw new Error(`rows holds the same key twice: one row per entity (filter data.json to one series)`);
  if (!keys.has(String(beat.subject))) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a row's key; the keys are ${[...keys].join(", ")}`);
  if (String(beat.fromName) === String(beat.toName)) throw new Error(`fromName and toName are both ${JSON.stringify(beat.fromName)}: a dumbbell joins two different states`);
  if (beat.rows.every((r) => r.from === r.to)) throw new Error(`no row changes between ${beat.fromName} and ${beat.toName}: check which rows from and to read`);

  beat.check();
  assertDrawsClaimColumn(beat.rows.flatMap((r) => [r.from, r.to]), HERE);

  // ── ranked by change, largest first (the claim's order) ──────────────────────────────────────
  const rows = [...beat.rows]
    .map((r) => ({ key: String(r.key), label: plain(r.label ?? r.key), from: r.from, to: r.to, gain: r.to - r.from }))
    .sort((a, b) => b.gain - a.gain)
    .map((r, i) => ({ ...r, code: letterKey(i), gainRank: i + 1 }));
  const subject = rows.find((r) => r.key === String(beat.subject));
  const gains = rows.map((r) => r.gain).sort((a, b) => a - b);
  const medianGain = gains.length % 2 ? gains[(gains.length - 1) / 2] : (gains[gains.length / 2 - 1] + gains[gains.length / 2]) / 2;
  assertLegibleLabels(rows.flatMap((r) => [r.from, r.to]), beat.format);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.flatMap((r) => [r.from, r.to, r.gain]), medianGain], "dumbbells");

  // ── the scale: fitted (the bar is the gap, not a distance from zero) ─────────────────────────
  const lo = Math.min(...rows.map((r) => Math.min(r.from, r.to)));
  const hi = Math.max(...rows.map((r) => Math.max(r.from, r.to)));
  const xTicks = beat.xTicks ?? scaleLinear().domain([lo, hi]).nice(6).ticks(6);
  if (xTicks[0] > lo || xTicks[xTicks.length - 1] < hi)
    throw new Error(`xTicks run ${xTicks[0]}–${xTicks[xTicks.length - 1]} but the values run ${lo}–${hi}: the axis runs from the first tick to the last — cover every value`);
  const xOf = scaleFor(xTicks);

  // ── each row's readings: its change against the group, and its rank of LEVEL at both states ──
  const byLevel = (field) => [...rows].sort((a, b) => b[field] - a[field]).map((r) => r.code);
  const rankFrom = byLevel("from");
  const rankTo = byLevel("to");
  const readings = rows.map((r) => {
    const others = rows.filter((o) => o.code !== r.code);
    return {
      key: r.key,
      label: r.label,
      from: r.from,
      to: r.to,
      gain: r.gain,
      gainRank: r.gainRank,
      count: rows.length,
      medianGain,
      vsMedian: r.gain - medianGain,
      rankFrom: rankFrom.indexOf(r.code) + 1,
      rankTo: rankTo.indexOf(r.code) + 1,
      // Already above this row's LATER level at the earlier state, and still below its EARLIER level at the later state.
      aheadThen: others.filter((o) => o.from >= r.to).length,
      behindNow: others.filter((o) => o.to <= r.from).length,
      isSubject: r.key === subject.key,
    };
  });

  const shaped = rows.map((r, i) => ({
    code: r.code,
    name: r.label,
    before: r.from,
    after: r.to,
    gain: r.gain,
    beforeLabel: plain(beat.format(r.from)),
    afterLabel: plain(beat.format(r.to)),
    gainLabel: plain(beat.gainLabel(readings[i])),
    detail: plain(beat.detail(readings[i])),
  }));
  const sameDetail = shaped.find((r, i) => shaped.findIndex((x) => x.detail === r.detail) !== i);
  if (sameDetail) throw new Error(`detail() answers two rows with the same sentence (${JSON.stringify(sameDetail.detail)}): start it with the row's label`);

  const levels = {
    label: plain(beat.levelLabel),
    noneLabel: plain(beat.noneLabel),
    options: rows.map((r, i) => {
      const announce = plain(beat.announce(readings[i]));
      if (!announce.includes(r.label)) throw new Error(`announce() must contain the row's label (${r.label}) — a screen reader hears it for that pill; it says: ${announce}`);
      return {
        key: r.code,
        label: r.label,
        announce,
        note: plain(beat.note(readings[i])),
        // Two references, stood up: the value axis is horizontal, so a row's levels are uprights.
        marks: [
          { series: SERIES[0], x: xOf(r.from) },
          { series: SERIES[1], x: xOf(r.to) },
        ],
      };
    }),
  };

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(readings) : beat.alt);
  const stateLabels = { before: plain(beat.fromName), after: plain(beat.toName) };

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.label, value: r.to })), {
    subject: subject.label,
    states: [stateLabels.before, stateLabels.after],
    markers: rows.map((r) => ({ key: r.code, label: r.label, value: r.from })),
    declaredSequence: eyebrow,
  });
  applicableTreatments(facts);

  const interaction = {
    earns:
      `A still must pick one order, and ranked by change this plate hides which rows stand highest; here the reader picks the row against which ` +
      `the other ${rows.length - 1} are measured, and its two levels stand across every row with the counts a reader would otherwise make by eye.`,
    controls: [
      {
        question: "Where does this one stand against the others, and did that move between the two states?",
        gesture: "find-your-own-case",
        changes:
          "Two dotted references stand across every row at the chosen row's two levels, its two heads take a full-ink ring, its name takes full ink while the others step back, and a sentence counts who was already above its later level and who is still below its earlier one.",
        parameter: "the row against which the others are measured",
        authorPicked: "none",
        readerPicks: ["none", ...rows.map((r) => r.code)],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "How much did this one change, and where does that put it?",
        gesture: "ask-a-line",
        changes: "The bar of the row pointed at takes full ink and answers with its change, its rank and its distance from the median change, which the page prints nowhere.",
        parameter: "which bar is asked about",
        authorPicked: subject.label,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${stateLabels.before} ${stateLabels.after} ${levels.label} ${levels.noneLabel} ${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${xTicks.join(" ")} ${rows.map((r) => r.label).join(" ")}`,
    annot: shaped.map((r) => r.gainLabel).join(" "),
    value: shaped.flatMap((r) => [r.beforeLabel, r.afterLabel]).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      // THE ROW FLOOR: the tallest of this direction's own row boxes (name, value chip, gain); the
      // phone cell grows taller and the page scrolls by that much and for that reason only.
      const floor = rowFloorFor(direction, measureText);
      const rowFloor = {
        rows: shaped.length,
        pitch: ROW,
        px: floor.px,
        why:
          `Every row prints its name (${floor.boxes.name.toFixed(1)}px), its two values on their chips (${floor.boxes.value.toFixed(1)}px) and its change ` +
          `(${floor.boxes.gain.toFixed(1)}px); under ${floor.px}px a row prints them over its neighbour's.`,
      };
      const { outPath } = await renderWeb({
        lang,
        component: DirectedDumbbellWeb,
        props: {
          rows: shaped,
          subject: subject.code,
          xTicks,
          stateLabels,
          levels,
          interaction,
          title, eyebrow, caveat, source, reading, alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
        rowFloor,
      });
      return { outPath };
    },
  });
});
