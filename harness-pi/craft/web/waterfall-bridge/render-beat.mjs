// The generic half of a waterfall (bridge) WEB beat, taken from
// proof/web-waterfall-germany-bridge/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a bridge from
// one named level to another, every step drawn from where the last one landed; every bar answers
// hover/tap/Tab with what no withdrawal can change (its size, its share of all movement, the closing
// level it would leave behind); and a "withdraw" control lets the reader take one step back out — it
// empties to an outline, the steps after it re-step from the new level and the closing bar is
// redrawn at the recomputed total (CSS only, works without JS). This file checks conservation and
// walks every counterfactual bridge; ./beat.mjs — the one file the model writes — gives the steps and
// WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedWaterfallWeb } from "./DirectedWaterfallWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertWithdrawChangesThePicture } = await import(chartWeb(HERE, "assets", "withdraw.ts"));

  const REQUIRED = ["eyebrow", "steps", "unit", "format", "detail", "levelDetail", "withdrawLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "levelDetail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the steps, refused as the static kit refuses them ────────────────────────────────────────
  if (!Array.isArray(beat.steps) || beat.steps.length < 4)
    throw new Error(`steps holds ${beat.steps?.length ?? 0} bars; a bridge with a control needs an opening total, at least two moves and a closing total`);
  assertNumbers(beat.steps.map((s) => [s.label, s.value]));
  const opening = beat.steps[0];
  const closing = beat.steps[beat.steps.length - 1];
  if (opening.kind !== "total" || closing.kind !== "total") throw new Error(`the first and last steps must be kind: "total" (the opening and closing levels)`);
  if (!(opening.value > 0) || !(closing.value > 0)) throw new Error(`the opening and closing levels must be positive`);
  const middle = beat.steps.slice(1, -1);
  for (const s of middle) {
    if (s.kind === "total") throw new Error(`step ${s.label} is a middle "total": the web bridge withdraws moves and recomputes every level after them, so it draws only the two ends — leave middle totals out`);
    if (s.kind === "increase" && !(s.value > 0)) throw new Error(`step ${s.label} is an "increase" with value ${s.value}: an increase is positive`);
    if (s.kind === "decrease" && !(s.value < 0)) throw new Error(`step ${s.label} is a "decrease" with value ${s.value}: a decrease is negative`);
    if (s.kind !== "increase" && s.kind !== "decrease") throw new Error(`step ${s.label} has kind ${JSON.stringify(s.kind)}: a move is "increase" or "decrease"`);
  }
  const labels = beat.steps.map((s) => String(s.label));
  if (new Set(labels).size !== labels.length) throw new Error(`two steps share one label`);
  if (middle.length > 8) throw new Error(`steps holds ${middle.length} moves; a bridge reads up to 8 — group the smallest into one`);

  // ── conservation, checked before anything is drawn ───────────────────────────────────────────
  const totalBefore = opening.value;
  const totalAfter = closing.value;
  const net = totalAfter - totalBefore;
  const sum = middle.reduce((s, m) => s + m.value, 0);
  if (Math.abs(sum - net) > Math.max(0.01, Math.abs(totalBefore) * 1e-6))
    throw new Error(`the moves sum to ${beat.format(sum)} but the two levels differ by ${beat.format(net)}: every column the totals add up must belong to exactly one move`);

  beat.check();
  assertDrawsClaimColumn(beat.steps.map((s) => s.value), HERE);

  const fmt = (v) => plain(beat.format(v));
  const signed = (v) => `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v))}`;
  const first = String(opening.label);
  const last = String(closing.label);
  const movement = middle.reduce((s, m) => s + Math.abs(m.value), 0);

  // ── the bridge, in the beat's own order, and each step's counterfactual closing level ────────
  const moves = middle.map((m, i) => ({ key: `s${i + 1}`, label: String(m.label), value: m.value }));
  let cursor = totalBefore;
  const steps = [
    { key: "start", name: plain(first), kind: "level", from: 0, to: totalBefore, label: fmt(totalBefore), detail: plain(beat.levelDetail({ label: first, value: totalBefore, isOpening: true, net, signedNet: signed(net), first, last })) },
  ];
  for (const m of moves) {
    const from = cursor;
    cursor += m.value;
    // Walked, not subtracted: the opening level plus every OTHER move, in order.
    const without = moves.reduce((level, z) => (z === m ? level : level + z.value), totalBefore);
    m.without = without;
    const s = { label: m.label, value: m.value, signedValue: signed(m.value), share: (Math.abs(m.value) / movement) * 100, without, closing: totalAfter, first, last };
    steps.push({ key: m.key, name: plain(m.label), kind: m.value >= 0 ? "up" : "down", from, to: cursor, label: signed(m.value), detail: plain(beat.detail(s)) });
  }
  steps.push({ key: "end", name: plain(last), kind: "level", from: 0, to: totalAfter, label: fmt(totalAfter), detail: plain(beat.levelDetail({ label: last, value: totalAfter, isOpening: false, net, signedNet: signed(net), first, last })) });
  if (Math.abs(cursor - totalAfter) > Math.max(0.01, Math.abs(totalBefore) * 1e-6)) throw new Error(`the bridge lands on ${fmt(cursor)} and the closing level is ${fmt(totalAfter)}`);
  const details = new Set(steps.map((s) => s.detail));
  if (details.size !== steps.length) throw new Error(`detail()/levelDetail() answer two bars with the same sentence: start each with the bar's own label`);

  // ── what the reader may take out ─────────────────────────────────────────────────────────────
  const withdrawPlan = {
    label: plain(beat.withdrawLabel),
    noneLabel: plain(beat.noneLabel),
    options: moves.map((m, i) => {
      const o = { label: m.label, value: m.value, signedValue: signed(m.value), without: m.without, closing: totalAfter, netWithout: m.without - totalBefore, net, following: moves.length - 1 - i, first, last };
      const option = { key: m.key, label: plain(m.label), announce: plain(beat.announce(o)), note: plain(beat.note(o)), restated: fmt(m.without), restatedValue: m.without };
      if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the step's label (${option.label}); it says: ${option.announce}`);
      if (!option.note.includes(option.restated)) throw new Error(`note() for ${m.label} must state the closing level without it, format(o.without) = "${option.restated}"; it says: ${option.note}`);
      return option;
    }),
  };
  if (withdrawPlan.options.some((o) => !(o.restatedValue > 0)))
    throw new Error(`withdrawing a step would leave a closing level at or below zero, which a bar cannot draw: this bridge needs no withdraw control`);

  // The scale holds every level the page can reach, measured and counterfactual.
  const reach = Math.max(totalBefore, totalAfter, ...moves.map((m) => m.without), ...steps.map((s) => Math.max(s.from, s.to)));
  const nice = scaleLinear().domain([0, reach]).nice(5);
  const yTicks = nice.ticks(5);
  // The component prints a tick as the bare number in a 44px gutter: three digits at most.
  if (yTicks[yTicks.length - 1] >= 1000 || yTicks.some((t) => !Number.isInteger(t)))
    throw new Error(`the axis would print ${yTicks.join(", ")}: ticks hold at most three digits and no decimals — draw the values in a larger or smaller unit (e.g. TWh instead of GWh) and say it in unit and limits`);
  const tick = (v) => String(v);

  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...beat.steps.map((s) => Math.abs(s.value)), Math.abs(net)], "steps");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const alt = plain(beat.alt);

  const facts = beatFacts(moves.map((m) => ({ key: m.key, label: m.label, value: m.value })), { subject: moves[0].label, declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${withdrawPlan.label} ${withdrawPlan.noneLabel} ${withdrawPlan.options.map((o) => `${o.label} ${o.announce} ${o.note}`).join(" ")}`,
    axis: `${yTicks.map(tick).join(" ")} ${steps.map((s) => s.name).join(" ")}`,
    annot: `${first} ${fmt(totalBefore)} ${last} ${fmt(totalAfter)} ${withdrawPlan.label} ${withdrawPlan.options.map((o) => o.note).join(" ")}`,
    value: [...steps.map((s) => s.label), ...withdrawPlan.options.map((o) => o.restated)].join(" "),
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { outPath } = await renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedWaterfallWeb,
        props: { steps, withdrawPlan, yTicks, unit, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
      });
      // The control changes the picture, measured on the page just written, as the worked
      // example's runner does.
      assertWithdrawChangesThePicture(await readFile(outPath, "utf8"), withdrawPlan, `renders/${label}.html`);
      return { outPath };
    },
  });
});
