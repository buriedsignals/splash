// The generic half of a lollipop WEB beat, taken from
// proof/web-lollipop-co2-per-person/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: pairs of stems
// from zero (the first state a tint, the second the accent), and an "against" control (the `level`
// vocabulary) that lets the reader choose one entity and lay its two levels flat across every pair,
// with a sentence giving its LEVEL rank at each state, how many times the highest level out-measured
// it, and which others now sit between its two levels (CSS only, works without JS); every pair
// answers hover/tap/Tab with what the stems cannot print. This file computes the ranks, the
// multiples and the in-betweens; ./beat.mjs — the one file the model writes — gives the pairs and
// WORDS. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedLollipopWeb, SERIES, scaleFor } from "./DirectedLollipopWeb.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** True when `text` states the whole number `n` on its own — not as a digit inside 25, 16 or 9,8. */
const statesNumber = (text, n) => new RegExp(`(?<![\\d.,])${n}(?![\\d.,]*\\d)`).test(text);

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "pairs", "subject", "from", "to", "unit", "rule", "format", "detail", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.formatChange !== undefined && typeof beat.formatChange !== "function") throw new Error(`beat.mjs: formatChange must be a function (see CONTRACT.md)`);

  // ── the pairs ────────────────────────────────────────────────────────────────────────────────
  const input = beat.pairs;
  if (!Array.isArray(input)) throw new Error(`pairs must be an array of { key, name, before, after }`);
  assertNumbers(input.flatMap((p) => [[`${p.key} before`, p.before], [`${p.key} after`, p.after]]));
  if (input.length < 2 || input.length > 8)
    throw new Error(`pairs holds ${input.length} entities; a lollipop plate draws 2 to 8 pairs side by side. Keep the subject and the largest others, and say in rule how they were chosen`);
  const keys = input.map((p) => String(p.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two pairs share a key (${keys.join(", ")}): one pair per entity — filter data.json to one row per entity`);
  if (new Set(input.map((p) => p.name)).size !== input.length) throw new Error(`two pairs share a name: every pair needs its own label`);
  if (!keys.includes(String(beat.subject))) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of any pair (${keys.join(", ")})`);
  const negative = input.filter((p) => p.before < 0 || p.after < 0);
  if (negative.length) throw new Error(`${negative.map((p) => p.key).join(", ")} hold a negative value: a lollipop stem is a height from zero. A change that crosses zero is a diverging bar, not a lollipop`);
  const fromZero = input.filter((p) => p.before === 0);
  if (fromZero.length) throw new Error(`${fromZero.map((p) => p.key).join(", ")} start at 0, so their change in per cent is undefined: leave them out and say so in limits`);
  if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${beat.from}: the two states must differ`);
  const values = input.flatMap((p) => [p.before, p.after]);
  assertLegibleLabels(values, beat.format);

  const withChange = input.map((p) => ({ ...p, key: String(p.key), change: ((p.after - p.before) / p.before) * 100 }));
  beat.check({ pairs: withChange, subject: String(beat.subject) });
  assertDrawsClaimColumn(values, HERE);

  // ── the derived readings the yardstick answers with: level ranks, multiples, in-betweens ────
  const rankOn = (field) => new Map([...withChange].sort((a, b) => b[field] - a[field]).map((p, i) => [p.key, i + 1]));
  const beforeRank = rankOn("before");
  const afterRank = rankOn("after");
  const topBefore = withChange.reduce((m, p) => (p.before > m.before ? p : m));
  const topAfter = withChange.reduce((m, p) => (p.after > m.after ? p : m));
  const readings = withChange.map((p, i) => {
    const lo = Math.min(p.before, p.after);
    const hi = Math.max(p.before, p.after);
    return {
      ...p,
      code: `p${i + 1}`,
      beforeRank: beforeRank.get(p.key),
      afterRank: afterRank.get(p.key),
      count: withChange.length,
      topBefore,
      topAfter,
      isTopBoth: p.key === topBefore.key && p.key === topAfter.key,
      timesTopBefore: topBefore.before / p.before,
      timesTopAfter: p.after === 0 ? null : topAfter.after / p.after,
      multiple: p.after / p.before,
      between: withChange.filter((o) => o.key !== p.key && o.after >= lo && o.after <= hi),
    };
  });
  const subject = readings.find((p) => p.key === String(beat.subject));

  const formatChange = beat.formatChange ?? ((v) => `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))} %`);
  const pairs = readings.map((p) => ({
    code: p.code,
    name: plain(p.name),
    before: p.before,
    after: p.after,
    beforeLabel: plain(beat.format(p.before)),
    afterLabel: plain(beat.format(p.after)),
    changeLabel: plain(formatChange(p.change)),
    rising: p.change >= 0,
    detail: plain(beat.detail(p)),
  }));
  if (new Set(pairs.map((p) => p.detail)).size !== pairs.length)
    throw new Error(`detail() prints the same sentence for two pairs: every pair must answer with its own reading (start with its name)`);

  // The title may state a multiple ("tripled", "now only 2.0 times more"): the pair's own change and
  // the highest level's multiple of each pair are figures the plate carries (the change under each
  // name, the multiples in the yardstick's sentence).
  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [...values, ...readings.flatMap((p) => [p.multiple, p.timesTopBefore, p.timesTopAfter, Math.abs(p.change)])],
    "stems",
  );

  // ── the axis: from zero, round ticks ─────────────────────────────────────────────────────────
  const top = Math.max(...values);
  let yTicks = beat.yTicks ?? scaleLinear().domain([0, top]).nice(5).ticks(5);
  if (yTicks[0] !== 0) throw new Error(`yTicks must start at 0: a lollipop stem is a length from zero`);
  if (yTicks[yTicks.length - 1] < top) throw new Error(`yTicks ends at ${yTicks[yTicks.length - 1]}, under the tallest stem ${top}`);

  // ── the yardstick: two references laid flat, at the chosen entity's two levels ─────────────
  const y = scaleFor(yTicks);
  const options = readings.map((p) => {
    const option = {
      key: p.code,
      label: plain(p.name),
      announce: plain(beat.announce(p)),
      note: plain(beat.note(p)),
      marks: [
        { series: SERIES[0], y: y(p.before) },
        { series: SERIES[1], y: y(p.after) },
      ],
    };
    if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the pair's name (${option.label}); it says: ${option.announce}`);
    if (!option.note.includes(option.label)) throw new Error(`note() must name the pair chosen (${option.label}); it says: ${option.note}`);
    for (const r of [p.beforeRank, p.afterRank])
      if (!statesNumber(option.note, r))
        throw new Error(`note() is shown when ${p.name} is chosen, so it must state its level rank at both states (${p.beforeRank} and ${p.afterRank} of ${p.count}); it says: ${option.note}`);
    return option;
  });
  const levels = { label: plain(beat.levelLabel), noneLabel: plain(beat.noneLabel), options };

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const rule = plain(beat.rule);
  const stateLabels = { before: plain(String(beat.from)), after: plain(String(beat.to)) };
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ pairs: readings, subject }) : beat.alt);

  const facts = beatFacts(pairs.map((p) => ({ key: p.code, label: p.name, value: p.after })), {
    subject: subject.name,
    states: [stateLabels.before, stateLabels.after],
    markers: pairs.map((p) => ({ key: p.code, label: p.name, value: p.before })),
    declaredSequence: unit,
  });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${unit} ${stateLabels.before} ${stateLabels.after} ${levels.label} ${levels.noneLabel} ${options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${yTicks.join(" ")} ${pairs.map((p) => `${p.name} ${p.changeLabel}`).join(" ")}`,
    annot: rule,
    value: pairs.flatMap((p) => [p.beforeLabel, p.afterLabel]).join(" "),
  };

  const moved = readings.filter((p) => p.beforeRank !== p.afterRank).length;
  const interaction = {
    earns:
      `A still fixes the two ends the author chose and the drawn order hides the levels; here the reader picks the entity the other ${pairs.length - 1} are measured against, ` +
      `and what comes back is what that order buries: ${moved} of the ${pairs.length} changed level rank between ${stateLabels.before} and ${stateLabels.after}.`,
    controls: [
      {
        question: "Where does this one stand against the others, and who has passed between its two levels?",
        gesture: "find-your-own-case",
        changes:
          "Two cased dashed references lie across every pair at the chosen entity's two levels; its two heads are ringed and its name takes full ink while the others step back; " +
          "one sentence gives its level rank at each state, how many times the highest level out-measured it, and which others now sit between its two levels.",
        parameter: "the entity the others are measured against",
        authorPicked: "none",
        readerPicks: ["none", ...pairs.map((p) => p.code)],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What lies behind these two levels?",
        gesture: "ask-a-mark",
        changes: "The pair pointed at takes an ink halo on its two heads and answers with the reading the stems cannot print.",
        parameter: "which entity is asked about",
        authorPicked: subject.name,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 4,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedLollipopWeb,
        props: {
          pairs,
          subject: subject.code,
          yTicks,
          unit,
          stateLabels,
          levels,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          rule,
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
