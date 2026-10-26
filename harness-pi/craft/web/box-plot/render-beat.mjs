// The generic half of a box plot WEB beat, taken from
// proof/web-boxplot-france-co2-decades/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: one box per
// group (quartiles, median, Tukey whiskers at 1.5 × IQR, hollow outliers) with every reading drawn
// beside its box; a "measure against" control lays one group's three levels (Q1, median, Q3) flat
// across every box and one sentence says how many boxes sit wholly above and below that band, which
// ones cut it, and how many readings of OTHER groups fall inside it (CSS only, works without JS); and
// every reading answers hover/tap/Tab with where it sits in its own group. This file computes that
// arithmetic; ./beat.mjs — the one file the model writes — gives the groups and WORDS every reading.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { fitY } from "#shared/design-base/web.mjs";
import { DirectedBoxplotWeb, FRAME, LEVEL_SERIES } from "./DirectedBoxplotWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { levelSlugOf } = await import(chartWeb(HERE, "assets", "level.ts"));

  const REQUIRED = ["eyebrow", "groups", "subject", "unit", "format", "detail", "subjectNote", "subjectNoteShort", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the groups: two to twelve, four readings or more each, every reading named ──────────────
  if (!Array.isArray(beat.groups) || beat.groups.length < 2 || beat.groups.length > 12)
    throw new Error(`groups holds ${beat.groups?.length ?? 0} groups: a box plot compares two to twelve distributions — merge groups (decades rather than years) or split the beat`);
  const labels = new Set();
  for (const g of beat.groups) {
    if (typeof g.label !== "string" || !g.label) throw new Error(`a group has no label: every group is { label, readings: [{ name, value }] }`);
    if (labels.has(g.label)) throw new Error(`two groups are labelled ${JSON.stringify(g.label)}: one group per label`);
    labels.add(g.label);
    if (!Array.isArray(g.readings)) throw new Error(`group ${g.label} has no readings array: every group is { label, readings: [{ name, value }] }`);
    assertNumbers(g.readings.map((r) => [r.name, r.value]), `group ${g.label}'s readings`);
    if (g.readings.length < 4) throw new Error(`group ${g.label} has ${g.readings.length} readings: a box needs four or more to have quartiles — merge it with its neighbour or draw a dot plot`);
    const names = new Set(g.readings.map((r) => String(r.name)));
    if (names.size !== g.readings.length) throw new Error(`group ${g.label} holds two readings with one name: name each reading once (its year, its place)`);
    const unsafe = g.readings.find((r) => /["\\<>]/.test(String(r.name)));
    if (unsafe) throw new Error(`reading name ${JSON.stringify(unsafe.name)} holds a quote, a backslash or an angle bracket: give each reading a plain name`);
  }
  if (!labels.has(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a group label; the labels are ${[...labels].join(", ")}`);

  beat.check();
  assertDrawsClaimColumn(beat.groups.flatMap((g) => g.readings.map((r) => r.value)), HERE);

  // ── the summary, exactly as the worked example computes it (linear quantiles, Tukey fences) ──
  const quantile = (sorted, p) => {
    const h = (sorted.length - 1) * p;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo);
  };
  const format = (v) => plain(beat.format(v));
  const boxes = beat.groups.map((g, i) => {
    const values = g.readings.map((r) => r.value).sort((a, b) => a - b);
    const q1 = quantile(values, 0.25);
    const median = quantile(values, 0.5);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    const lowFence = q1 - 1.5 * iqr;
    const highFence = q3 + 1.5 * iqr;
    const inside = values.filter((v) => v >= lowFence && v <= highFence);
    const isOutlier = (v) => v < lowFence || v > highFence;
    // Keys used in ids and selectors are the runner's own, never the model's labels.
    const box = { key: `g${i + 1}`, label: g.label, n: values.length, min: Math.min(...inside), q1, median, q3, max: Math.max(...inside), medianLabel: format(median) };
    box.outliers = g.readings.filter((r) => isOutlier(r.value)).map((r) => ({ year: String(r.name), value: r.value, label: format(r.value) }));
    box.readings = g.readings.map((r) => {
      const reading = { name: String(r.name), value: r.value, group: g.label, n: values.length, q1, median, q3, isOutlier: isOutlier(r.value), aboveMedian: r.value > median };
      return { year: String(r.name), value: r.value, detail: plain(beat.detail(reading)) };
    });
    return box;
  });
  for (const b of boxes) {
    const answers = new Set(b.readings.map((r) => `${r.year} ${r.detail}`));
    if (answers.size < b.readings.length) throw new Error(`detail() gives two readings of ${b.label} the same answer`);
  }
  const subject = boxes.find((b) => b.label === beat.subject);
  const allReadings = beat.groups.flatMap((g) => g.readings.map((r) => ({ group: g.label, value: r.value })));

  // ── the fitted axis: a box plot is a position encoding, never anchored at zero ────────────────
  const lo = Math.min(...boxes.map((b) => Math.min(b.min, ...b.outliers.map((o) => o.value))));
  const hi = Math.max(...boxes.map((b) => Math.max(b.max, ...b.outliers.map((o) => o.value))));
  const yTicks = beat.yTicks ?? scaleLinear().domain([lo, hi]).nice(6).ticks(6);
  if (yTicks[0] > lo || yTicks[yTicks.length - 1] < hi) throw new Error(`yTicks ${yTicks.join(", ")} do not hold every reading (${lo} to ${hi}): leave yTicks out`);
  const yOf = fitY(yTicks[0], yTicks[yTicks.length - 1], FRAME.height);

  // ── the yardstick: each group's band against every other ──────────────────────────────────────
  const comparisons = boxes.map((b) => {
    const others = boxes.filter((o) => o !== b);
    return {
      label: b.label,
      n: b.n,
      q1: b.q1,
      median: b.median,
      q3: b.q3,
      groups: boxes.length,
      above: others.filter((o) => o.q1 > b.q3).length,
      below: others.filter((o) => o.q3 < b.q1).length,
      overlapping: others.filter((o) => !(o.q1 > b.q3) && !(o.q3 < b.q1)).map((o) => o.label),
      strangers: allReadings.filter((r) => r.group !== b.label && r.value >= b.q1 && r.value <= b.q3).length,
    };
  });
  const levels = {
    label: plain(beat.levelLabel),
    noneLabel: plain(beat.noneLabel),
    options: comparisons.map((c, i) => {
      const option = { key: boxes[i].key, label: c.label, announce: plain(beat.announce(c)), note: plain(beat.note(c)), marks: LEVEL_SERIES.map((series) => ({ series, y: yOf(boxes[i][series]) })) };
      if (!option.announce.includes(c.label)) throw new Error(`announce() must contain the group's label (${c.label}); it says: ${option.announce}`);
      for (const [name, v] of [["q1", c.q1], ["q3", c.q3]])
        if (!option.note.includes(format(v))) throw new Error(`note() is shown when the reader lays ${c.label}'s band, so it must state its ${name}, format(${name}) = "${format(v)}"; it says: ${option.note}`);
      return option;
    }),
  };

  // The plate prints every median; a title may state one.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...allReadings.map((r) => r.value), ...boxes.map((b) => b.median)], "boxes");

  const ruleWords = beat.ruleWords ?? (/^fr\b/.test(beat.lang ?? storyLanguage(HERE) ?? "") ? undefined : { q1: "Q1", median: "median", q3: "Q3" });
  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const alt = plain(beat.alt);
  const peakNote = plain(beat.subjectNote);
  const peakNoteUnder = plain(beat.subjectNoteShort);

  const facts = beatFacts(boxes.map((b) => ({ key: b.key, label: b.label, value: b.median })), { subject: subject.label, declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${levels.label} ${levels.noneLabel} ${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${yTicks.join(" ")} ${boxes.map((b) => `${b.label} n=${b.n}`).join(" ")}`,
    annot: `${peakNote} ${peakNoteUnder} ${Object.values(ruleWords ?? { q1: "Q1", median: "médiane", q3: "Q3" }).join(" ")}`,
    value: boxes.map((b) => b.medianLabel).join(" "),
  };

  const readingCount = allReadings.length;
  const widest = comparisons.reduce((a, b) => (b.overlapping.length > a.overlapping.length ? b : a));
  const interaction = {
    earns:
      `A still can print the ${boxes.length} medians, which is what the headline asserts. It cannot say whether the groups SEPARATE: medians move just as ` +
      `well when the boxes carrying them overlap. Here the reader lays one group's three levels flat across all ${boxes.length}, and the page answers ` +
      `with what the medians bury — ${widest.label}'s band is cut by ${widest.overlapping.length} other box(es), and ${widest.strangers} readings of other groups fall inside it.`,
    controls: [
      {
        question: "Is this group really apart from the others, or do their boxes overlap?",
        gesture: "find-your-own-case",
        changes: "The chosen group's Q1, median and Q3 are laid flat across every box on ground casings; its own box takes a full-ink ring and its axis label steps forward; one sentence gives its band, how many boxes sit wholly above and below it, which ones cut it, and how many readings of other groups fall inside it.",
        parameter: "the group every box is read against",
        authorPicked: "none",
        readerPicks: ["none", ...boxes.map((b) => levelSlugOf(b.key))],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this reading worth, and where does it sit in its own group?",
        gesture: "ask-a-mark",
        changes: `The reading pointed at turns full ink and answers with its value, its group's median and count, and whether it sits above or below that median or outside the fences — the ${readingCount} readings the boxes summarise without naming.`,
        parameter: "which reading is asked about",
        authorPicked: subject.label,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang,
        component: DirectedBoxplotWeb,
        props: {
          boxes,
          peakKey: subject.key,
          yTicks,
          levels,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          unit,
          reading,
          peakNote,
          peakNoteUnder,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          ...(ruleWords ? { ruleWords } : {}),
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
          // The worked example put the control after the plot; Tab must then cross every reading
          // before it reaches it, and verify-web gives up after 40 presses.
          controlFirst: readingCount > 30,
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
