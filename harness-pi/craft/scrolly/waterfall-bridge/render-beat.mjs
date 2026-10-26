// The generic half of a waterfall (bridge) SCROLLY beat, taken from
// proof/scrolly-germany-electricity-bridge/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (bridge-drive.mjs, verbatim):
//
//   1 opening  the opening total rises from zero; the running total in the header;
//   2 step1    the first step climbs (or drops) from the total's level, a connector behind it;
//   3 step2    the second step, from where the first landed;
//   4 step3    the third step, then its slot widens into its THREE parts, one bar each;
//   5 closing  the third step folds back; the closing total rises; the opening level is carried across
//              and the net change bracketed; the steps' values step back;
//   6 reading  the whole bridge, every value on its bar; the card states the limits.
//
// The drive is built for exactly this walk: an opening total, three steps, the third unfolding into
// three parts, a closing total. It prints the running total with one decimal and a decimal COMMA.
//
// This file replays the bridge before it is drawn (the opening plus every step must land on the
// closing total), computes every figure the cards may state and checks the words against them;
// ./beat.mjs — the one file the model writes — gives the steps and the WORDS of each card. Copied into
// the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedBridgeScrolly } from "./DirectedBridgeScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["opening", "step1", "step2", "step3", "closing", "reading"];
/** One state per card; see bridge-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { opening: 1, ren: 0, nuc: 0, fos: 0, unfold: 0, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 0, fos: 0, unfold: 0, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 1, fos: 0, unfold: 0, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 1, fos: 1, unfold: 1, closing: 0, net: 0, focus: 0 },
  { opening: 1, ren: 1, nuc: 1, fos: 1, unfold: 0, closing: 1, net: 1, focus: 1 },
  { opening: 1, ren: 1, nuc: 1, fos: 1, unfold: 0, closing: 1, net: 1, focus: 0 },
];
/** The drive's own bar ids, in slot order (it names them; they are not the worked example's words). */
const STEP_IDS = ["ren", "nuc", "fos"];
/** The header notes the drive crossfades, one per gesture card. */
const NOTE_SLOTS = { step1: "renNote", step2: "nucNote", step3: "fosNote", closing: "netNote" };

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "steps", "unit", "unitLine", "running", "format", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", Object.keys(NOTE_SLOTS)]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the walk: opening, three steps (the third in three parts), closing ─────────────────────────
  const steps = beat.steps;
  if (!Array.isArray(steps) || steps.length !== 5)
    throw new Error(`steps holds ${Array.isArray(steps) ? steps.length : "no"} bars: this choreography walks exactly an opening total, THREE steps and a closing total (cards 1 to 5) — group the changes into three steps`);
  const kinds = steps.map((s) => s.kind);
  if (kinds[0] !== "total" || kinds[4] !== "total" || kinds.slice(1, 4).some((k) => k === "total"))
    throw new Error(`the first and last bars are totals (kind "total") and the three between are steps ("increase" / "decrease"); got ${kinds.join(", ")}`);
  for (const s of steps.slice(1, 4)) {
    if (s.kind === "increase" && s.value < 0) throw new Error(`step ${JSON.stringify(s.label)} is an "increase" with a negative value (${s.value}): a fall is kind "decrease", value negative`);
    if (s.kind === "decrease" && s.value > 0) throw new Error(`step ${JSON.stringify(s.label)} is a "decrease" with a positive value (${s.value}): give a decrease its negative value`);
    if (!["increase", "decrease"].includes(s.kind)) throw new Error(`step ${JSON.stringify(s.label)} has kind ${JSON.stringify(s.kind)}: use "increase" or "decrease"`);
  }
  const parts = steps[3].parts;
  if (!Array.isArray(parts) || parts.length !== 3)
    throw new Error(`the third step (${JSON.stringify(steps[3].label)}) must give parts: exactly THREE { label, short?, value } — card 4 unfolds its slot into three bars. Split it into its three components (largest change first)`);
  assertNumbers([...steps.map((s) => [s.label, s.value]), ...parts.map((p) => [p.label, p.value])], "steps");
  const [openStep, s1, s2, s3, closeStep] = steps;
  const opening = openStep.value;
  const closing = closeStep.value;
  if (!(opening > 0 && closing > 0)) throw new Error(`the opening and closing totals must be above zero (${opening}, ${closing}): the bridge is drawn from a zero baseline`);
  const walked = opening + s1.value + s2.value + s3.value;
  if (Math.abs(walked - closing) > Math.max(0.05, Math.abs(closing) * 1e-6))
    throw new Error(`the bridge does not replay: ${opening} plus the three steps lands at ${walked}, but the closing total says ${closing}. Compute every step as (later minus earlier) from the same columns as the totals`);
  const partsSum = parts.reduce((s, p) => s + p.value, 0);
  if (Math.abs(partsSum - s3.value) > Math.max(0.05, Math.abs(s3.value) * 1e-6))
    throw new Error(`the third step's parts add up to ${partsSum}, but the step is ${s3.value}: its parts must be its own components`);
  const levels = [opening, opening + s1.value, opening + s1.value + s2.value];
  const subLevels = [levels[2], levels[2] + parts[0].value, levels[2] + parts[0].value + parts[1].value, walked];
  const low = Math.min(...levels, ...subLevels);
  if (low < 0) throw new Error(`the running level goes below zero (${low}): this bridge draws from a zero baseline and cannot show a negative level`);

  // The drive prints the running total itself, one decimal with a decimal COMMA (bridge-drive.mjs,
  // `format`): a story written with a decimal point would read two marks on one page.
  const sample = plain(beat.format(1.5));
  const langOf = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = /,/.test(sample) ? "," : /\./.test(sample) ? "." : /,/.test(new Intl.NumberFormat(langOf).format(1.5)) ? "," : ".";
  if (decimal !== ",")
    throw new Error(`format(1.5) prints ${JSON.stringify(sample)} (a decimal point), but this choreography's drive writes the running total in the header with a decimal COMMA: this kit only serves stories written with a decimal comma`);
  if (!String(beat.running).includes("{v}"))
    throw new Error(`running must contain the token {v}: the header writes the running total there as the scroll walks the bridge (e.g. "total: {v} TWh")`);

  const details = (s) => Object.fromEntries(Object.entries(s.detail ?? {}).map(([k, v]) => [k, v]));
  for (const s of [s1, s2, s3]) assertNumbers(Object.entries(s.detail ?? {}), `${s.label}.detail`);
  const view = (s) => ({ label: s.label, value: s.value, detail: details(s) });
  const net = closing - opening;
  const reading = {
    opening,
    closing,
    net,
    steps: [s1, s2, s3].map(view),
    parts: parts.map((p) => ({ label: p.label, value: p.value })),
    levels: { afterStep1: levels[1], afterStep2: levels[2] },
    firstTwo: s1.value + s2.value,
    openingLabel: openStep.label,
    closingLabel: closeStep.label,
  };
  Object.freeze(reading);
  assertLegibleLabels([opening, closing, s1.value, s2.value, s3.value, ...parts.map((p) => p.value)], beat.format);
  beat.check(reading);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts_ = [text].flat();
    if (!parts_.length || parts_.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts_.map(plain);
  };
  const format = (v) => plain(beat.format(Math.abs(v)));
  const signed = (v) => `${v >= 0 ? "+" : "−"}${format(v)}`;
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(Object.entries(NOTE_SLOTS).map(([k, slot]) => [slot, say(`notes.${k}`, beat.notes[k]).join(" ")]));

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen (unsigned: the
  // sentence may say "falls by 91.8" or "−91.8").
  const OWES = {
    opening: [["opening", format(opening)]],
    step1: [["steps[0].value", format(s1.value)]],
    step2: [["steps[1].value", format(s2.value)], ["firstTwo", format(reading.firstTwo)]],
    step3: [["steps[2].value", format(s3.value)], ["parts[0].value", format(parts[0].value)]],
    closing: [["closing", format(closing)], ["net", format(net)]],
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  CARDS.slice(0, 5).forEach((k, i) => {
    const text = prose[i].join(" ");
    for (const [what, wanted] of OWES[k])
      if (!new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text))
        throw new Error(`card ${i + 1} (cards.${k}) must state ${what} = "${wanted}" — the figure its picture shows; it says: ${text}`);
  });

  // Every other figure a card, a note or the alt text states must be one this kit computed (or a
  // step's own `detail`), at the precision it is written with. A year (1900–2100) passes.
  const group = "[ .]";
  const known = [
    opening, closing, net, reading.firstTwo, ...levels, ...subLevels,
    ...[s1, s2, s3].flatMap((s) => [s.value, ...Object.values(s.detail ?? {})]),
    ...parts.map((p) => p.value),
  ].map(Math.abs);
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(",");
      const n = Number(`${whole.replace(/[ .]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of this bridge rounds to: every number in a card is computed — use the reading (r.opening, r.steps[1].value, r.firstTwo, r.parts[0].value, r.net, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, prose[i].join(" ")));
  for (const [k, slot] of Object.entries(NOTE_SLOTS)) checkFigures(`notes.${k}`, notes[slot]);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the net change, which the bracket draws beside the closing total.
  assertHeadlineNumbersDrawn(titleForms[0], [opening, closing, Math.abs(net), ...[s1, s2, s3, ...parts].map((s) => Math.abs(s.value))], "bars");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  const bars = [{ id: "opening", kind: "total", from: 0, to: opening, value: format(opening), label: plain(openStep.label), short: plain(openStep.short ?? openStep.label) }];
  [s1, s2, s3].forEach((s, i) => bars.push({ id: STEP_IDS[i], kind: "step", from: levels[i], to: levels[i] + s.value, value: signed(s.value), label: plain(s.label), short: plain(s.short ?? s.label) }));
  parts.forEach((p, i) => bars.push({ id: `p${i + 1}`, kind: "sub", from: subLevels[i], to: subLevels[i + 1], value: signed(p.value), label: plain(p.label), short: plain(p.short ?? p.label) }));
  bars.push({ id: "closing", kind: "total", from: 0, to: closing, value: format(closing), label: plain(closeStep.label), short: plain(closeStep.short ?? closeStep.label) });
  const top = Math.max(...bars.map((b) => Math.max(b.from, b.to)));
  const step = niceStep(top / 4);
  const max = Math.ceil(top / step) * step;
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  const unit = plain(beat.unit);
  const words = { unit: plain(beat.unitLine), running: plain(beat.running), ...notes, net: `${signed(net)} ${unit}` };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${bars.map((b) => `${b.label} ${b.short}`).join(" ")} ${ticks.join(" ")}`,
    annot: "",
    value: `${bars.map((b) => b.value).join(" ")} ${words.running} ${Object.values(notes).join(" ")} ${words.net} 0123456789,`,
  };

  const driver = readFileSync(join(HERE, "bridge-drive.mjs"), "utf8");
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedBridgeScrolly, { bars, max, ticks, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyBridgeState",
        },
        title: titleForms,
        eyebrow,
        source,
        ground: direction.ground,
        type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
        lang: langOf,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});

/** 1, 2, 2.5 or 5 × a power of ten, the first at or above `raw`. */
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw - 1e-9) return m * p;
  return 10 * p;
}
