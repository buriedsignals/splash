// The generic half of a grouped-bar WEB beat, taken from
// proof/web-grouped-bar-wind-vs-solar/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a "measure
// against" control (the `level` vocabulary) lets the reader pick one group and lay its two values
// flat across every other group, in the two series' own inks, with its rank on each series and the
// ratio between them in the sentence under the control (CSS only, works without JS); every group
// answers hover/tap/Tab with what the bars cannot print. This file computes the ranks, the ratio and
// the rules' heights; ./beat.mjs — the one file the model writes — gives the data and WORDS every
// reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { fitY } from "#shared/design-base/web.mjs";
import { DirectedGroupedBarWeb, FRAME } from "./DirectedGroupedBarWeb.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "groups", "firstName", "secondName", "subject", "unit", "format", "detail", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the groups: two values from zero each, one group per category ───────────────────────────
  const input = beat.groups;
  if (!Array.isArray(input) || input.length < 2) throw new Error(`groups holds ${input?.length ?? 0} group(s); a grouped bar compares at least two`);
  if (input.length > 12) throw new Error(`groups holds ${input.length} groups; the page draws at most 12 pairs legibly — keep the groups the takeaway is about`);
  assertNumbers(input.flatMap((g) => [[`${g.name} first`, g.first], [`${g.name} second`, g.second]]));
  const negative = input.flatMap((g) => [g.first, g.second]).filter((v) => v < 0);
  if (negative.length) throw new Error(`a grouped bar draws lengths from zero, and these values are negative: ${negative.slice(0, 3).join(", ")}. A change that can fall below zero belongs to a diverging bar`);
  const names = new Set(input.map((g) => String(g.name)));
  if (names.size !== input.length) throw new Error(`two groups share a name; one group per category, filtered to one period`);
  if (!names.has(beat.subject)) throw new Error(`subject "${beat.subject}" is not the name of a group; the names are ${[...names].join(", ")}`);
  if (beat.firstName === beat.secondName) throw new Error(`firstName and secondName are both "${beat.firstName}": the two series need two names`);
  const values = input.flatMap((g) => [g.first, g.second]);
  if (!(Math.max(...values) > 0)) throw new Error(`every value is zero: there is nothing to draw`);
  assertLegibleLabels(values, beat.format);
  beat.check();
  assertDrawsClaimColumn(values, HERE);

  // Order: the categories' own order when they carry one (declaredSequence), else the worked
  // example's — the largest pair first, so the eye reads down the groups.
  const ordered = beat.declaredSequence ? [...input] : [...input].sort((a, b) => b.first + b.second - (a.first + a.second));
  // ── the derived readings the yardstick answers with: a rank on each series, the ratio between them
  const rankOn = (key) => new Map([...ordered].sort((a, b) => b[key] - a[key]).map((g, i) => [g.name, i + 1]));
  const firstRank = rankOn("first");
  const secondRank = rankOn("second");
  const readings = ordered.map((g, i) => ({
    ...g,
    name: String(g.name),
    code: `g${i + 1}`,
    firstRank: firstRank.get(g.name),
    secondRank: secondRank.get(g.name),
    ratio: g.first === 0 ? null : g.second / g.first,
    count: ordered.length,
  }));
  const subject = readings.find((g) => g.name === beat.subject);
  const groups = readings.map((g) => ({
    code: g.code,
    name: plain(g.name),
    wind: g.first,
    solar: g.second,
    windLabel: plain(beat.format(g.first)),
    solarLabel: plain(beat.format(g.second)),
    detail: plain(beat.detail(g)),
  }));
  const details = new Set(groups.map((g) => g.detail));
  if (details.size !== groups.length) throw new Error(`detail() prints the same sentence for two groups: every group must answer with its own reading (start with the group's name)`);

  // The title may count the groups ("in 5 of these 6 countries"): the plate draws every group, so
  // the count of groups and the counts on either side of the comparison are figures it carries.
  const ahead = readings.filter((g) => g.first > g.second).length;
  const behind = readings.filter((g) => g.second > g.first).length;
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, readings.length, ahead, behind], "bars");

  // ── the axis: from zero, round ticks, the top tick holding the tallest bar ──────────────────
  const top = Math.max(...values);
  let yTicks = beat.yTicks ?? scaleLinear().domain([0, top]).nice(4).ticks(4);
  if (!beat.yTicks && yTicks[yTicks.length - 1] < top) yTicks = scaleLinear().domain([0, top]).nice(5).ticks(5);
  if (yTicks[yTicks.length - 1] < top) throw new Error(`yTicks ends at ${yTicks[yTicks.length - 1]}, under the tallest bar ${top}: the last tick must hold every bar`);

  // ── the yardstick: every option lays its two levels at the SAME y the bars are drawn to ─────
  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height);
  const options = readings.map((g) => {
    const option = {
      key: g.code,
      label: plain(g.name),
      announce: plain(beat.announce(g)),
      note: plain(beat.note(g)),
      marks: [
        { series: "wind", y: y(g.first) },
        { series: "solar", y: y(g.second) },
      ],
    };
    if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the group's name (${option.label}); it says: ${option.announce}`);
    for (const v of [g.first, g.second]) {
      const label = plain(beat.format(v));
      if (!option.note.includes(label))
        throw new Error(`note() is shown when ${g.name} is chosen, so it must state both of its values, format(first) = "${plain(beat.format(g.first))}" and format(second) = "${plain(beat.format(g.second))}"; it says: ${option.note}`);
    }
    return option;
  });
  const levels = { label: plain(beat.levelLabel), noneLabel: plain(beat.noneLabel), options };

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const seriesLabels = { wind: plain(beat.firstName), solar: plain(beat.secondName) };
  const alt = plain(typeof beat.alt === "function" ? beat.alt(readings) : beat.alt);

  const facts = beatFacts(groups.map((g) => ({ key: g.code, label: g.name, value: g.wind })), { subject: subject.name, declaredSequence: beat.declaredSequence ?? unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body:
      `${caveat} ${reading} ${source} ${seriesLabels.wind} ${seriesLabels.solar} ${levels.label} ${levels.noneLabel} ` +
      `${groups.map((g) => g.name).join(" ")} ${options.map((o) => `${o.note} ${o.announce}`).join(" ")}`,
    axis: `${yTicks.join(" ")} ${unit} ${groups.map((g) => g.name).join(" ")}`,
    annot: `${groups.map((g) => g.detail).join(" ")} ${seriesLabels.wind} ${seriesLabels.solar}`,
    value: groups.flatMap((g) => [g.windLabel, g.solarLabel]).join(" "),
  };

  // The interaction, declared as the worked example declares it; renderWeb holds it against the markup.
  const interaction = {
    earns:
      `A still can point at ${subject.name} and assert the takeaway; this page lets the reader lay any of the ${groups.length} groups' two levels ` +
      `across the other ${groups.length - 1} and read where it ranks on each series — the across-group comparison the group boundary makes hard by eye.`,
    controls: [
      {
        question: "Where does this group stand against the others, on each of the two series?",
        gesture: "toggle-a-comparison",
        changes:
          "Two rules cross the whole plot at the chosen group's two values, each in its series' own ink; the chosen group takes a ring and its name full ink; " +
          "one sentence gives its rank on each series and the ratio between the two.",
        parameter: "the group every other group is measured against",
        authorPicked: "none",
        readerPicks: ["none", ...groups.map((g) => g.code)],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What lies behind these two bars?",
        gesture: "ask-a-mark",
        changes: "The group answers with the reading the bars cannot print: the quantities behind its two values.",
        parameter: "which group is asked about",
        authorPicked: subject.name,
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
        component: DirectedGroupedBarWeb,
        props: {
          groups,
          subject: subject.code,
          seriesLabels,
          yTicks,
          levels,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          tickSuffix: /^%/.test(unit) ? ` ${unit}` : "",
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
