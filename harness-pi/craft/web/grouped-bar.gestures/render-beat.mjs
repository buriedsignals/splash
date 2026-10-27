// The generic half of a PAIRED-family GESTURE web page (craft/gestures/GRAMMAR.md §4, F1 Length: two values per key
// or a signed one), for one type: VARIANT below. The per-type kit's runner (web/<type>/render-beat.mjs) with its fixed
// interaction replaced by the beat's `gestures`. Guard order: applyStoryboard → REQUIRED → the values → check() and the
// shared guards → the gesture core (validateGestures over the family's marks, family "paired", format "web", the
// family's hooks, claim read from STORYBOARD.md) → the web scheduler and the generated interaction declaration
// (./gesture-paired-web.mjs) → render (renderWeb holds the page against the declaration), verify-web, look. A gesture
// refusal prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix
// is applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12 times. Nothing here refuses the data's SHAPE
// (key count, gaps, negatives, long names): the layout adapts. Copied into the beat by the harness; never edited by
// the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { webRegisters } from "#shared/design-base/web.mjs";
import { FRAME, GesturePairedWeb, PITCH } from "./GesturePairedWeb.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, assertNumbers, importBeat, legibleFormat, rowFacts, runCheck } from "./guards.mjs";
import { GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { marksOf } from "./gesture-family-paired.mjs";
import { HEADROOM, stagePairedWeb } from "./gesture-paired-web.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const VARIANT = "grouped-bar";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
const GUTTER = { min: 60, max: 220, pad: 19 };

await refusing(HERE, async () => {
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));

  const REQUIRED = ["eyebrow", "series", "rows", "gestures", "format", "restLabel", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  if (!String(beat.restLabel).trim()) throw new Error("beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. \"The two years alone\"");

  // ── the values, and the claim first
  const rows = (Array.isArray(beat.rows) ? beat.rows : []).map((r) => ({ ...r, name: plain(r?.name) }));
  const series = [beat.series].flat().map((s) => plain(s));
  const { keys, marks } = marksOf({ rows, series, variant: VARIANT });
  assertNumbers(marks.map((m) => [m.name, m.value]));
  runCheck(beat);
  const values = marks.map((m) => m.value);
  const format = (v) => plain(beat.format(v));
  assertDrawsClaimColumn(values, HERE);
  assertNoAggregates(keys.map((k) => k.name), HERE);
  const title = plain([beat.title].flat()[0]);
  // The figures the plate draws beyond its marks: each key's change and ratio, the key count, how many keys each
  // series leads — a takeaway's "1,7 times" or "5 of 6" is drawn, not invented.
  const derived = [keys.length];
  for (const k of keys) {
    const [a, b] = k.values;
    if (a !== null && b !== null && b !== undefined) derived.push(b - a, a ? b / a : NaN, b ? a / b : NaN, a + b);
  }
  if (series.length === 2) {
    const leads = keys.filter((k) => k.values[0] !== null && k.values[1] !== null && k.values[0] > k.values[1]).length;
    derived.push(leads, keys.length - leads);
  }
  for (let i = 0; i < keys.length; i++)
    for (let j = 0; j < keys.length; j++) {
      const a = keys[i].values.at(-1);
      const b = keys[j].values.at(-1);
      if (i !== j && a && b) derived.push(a / b);
    }
  // Only derived figures inside the marks' own range: a ratio of 1,1 must not open the guard to a band name's "60".
  const magnitudes = values.map(Math.abs);
  const inRange = (v) => Number.isFinite(v) && Math.abs(v) >= Math.min(...magnitudes) / 2 && Math.abs(v) <= Math.max(...magnitudes) * 2;
  assertHeadlineNumbersDrawn(title, [...values, ...derived.filter(inRange)], "marks");

  // ── the gestures
  const front = (() => {
    const file = join(HERE, "..", "..", "STORYBOARD.md");
    const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
    return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  })();
  const claim = {
    takeaway: front("takeaway") ?? title,
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(HERE),
    unit: beat.unit,
  };
  const unit = beat.unit === undefined ? "" : plain(beat.unit);
  const ceiling = beat.ceiling ?? (VARIANT === "bullet" && /%/.test(unit) ? 100 : undefined);
  let staged;
  try {
    staged = stagePairedWeb({ gestures: beat.gestures, variant: VARIANT, rows, series, claim, format, ceiling, repair: REPAIR, validateGestures });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { scheduled, interaction, valid } = staged;
  beat.format = legibleFormat(values, beat.format);
  assertLegibleLabels(values, beat.format);

  // ── the words, every one through plain()
  const F = (v) => plain(beat.format(v));
  const signed = (v) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${F(Math.abs(v))}`;
  const shaped = marks.map((m) => {
    const k = keys.find((x) => x.name === m.key);
    const pair = series.length === 2 && k.values.every((v) => v !== null) ? ` · ${series[0]} / ${series[1]}: ${F(k.values[0])} / ${F(k.values[1])} (${signed(k.values[1] - k.values[0])})` : "";
    return { ...m, label: F(m.value), detail: `${m.name} · ${F(m.value)}${unit ? ` ${unit}` : ""}${pair}` };
  });
  const restLabel = plain(beat.restLabel);
  const controls = scheduled.controls.map((c) => {
    const chip = plain(c.chip);
    const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
    return { ...c, legend: plain(c.label ?? c.legend), chip, note, announce: `${chip} — ${note}` };
  });
  const restNotes = scheduled.resting.notes.map((n) => {
    const text = plain(n.text);
    return n.keys.length && !n.keys.some((k) => text.includes(k)) ? `${n.keys.join(", ")}: ${text}` : text;
  });
  const eyebrow = plain(beat.eyebrow);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(keys) : beat.alt);
  const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${controlText} ${source} ${series.join(" ")} < > ${shaped.map((r) => r.detail).join(" ")}`,
    axis: `${unit} ${keys.map((k) => k.name).join(" ")}`,
    annot: restNotes.join(" "),
    value: [...shaped.map((r) => r.label), "n/a / = ", ...controls.map((c) => c.chip)].join(" "),
  };
  console.log(`  ${VARIANT}: ${keys.length} keys × ${series.length} · resting: ${valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const widest = Math.max(...keys.map((k) => labelBoxPx(k.name, { ...regs.axis, fontWeight: 700 }, measureText, { chip: false }).w));
      const wrapNames = widest + GUTTER.pad > GUTTER.max;
      const gutterPx = Math.max(GUTTER.min, Math.min(GUTTER.max, Math.ceil(widest + GUTTER.pad)));
      const nameBox = labelBoxPx("Hg", regs.axis, measureText, { chip: false }).h * (wrapNames ? 2 : 1);
      const perBand = VARIANT === "lollipop" || VARIANT === "grouped-bar" ? 2 : 1;
      const figureBox = Math.max(...shaped.map((r) => labelBoxPx(r.label, regs.value, measureText, { chip: true }).h)) * perBand;
      const H = Math.max(keys.length * PITCH[VARIANT], FRAME.minHeight);
      const rowFloor =
        keys.length >= 2
          ? {
              rows: keys.length,
              pitch: H / keys.length,
              px: Math.ceil(Math.max(nameBox, figureBox)),
              why: `Each of the ${keys.length} rows carries its name in the gutter and ${perBand === 2 ? "two figures, one per mark" : "its figure"} beside its marks; under that pitch a row prints over its neighbour's.`,
            }
          : null;
      const { outPath } = await renderWeb({
        lang,
        component: GesturePairedWeb,
        props: {
          variant: VARIANT,
          keys,
          marks: shaped,
          series,
          resting: scheduled.resting,
          controls,
          domain: scheduled.domain,
          headroom: HEADROOM,
          restLabel,
          restNotes,
          restLine: null,
          gutterPx,
          wrapNames,
          title,
          eyebrow,
          caveat,
          source,
          unit,
          alt,
          interaction,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          format: F,
        },
        rowFloor,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
