// The generic half of a bar-and-column GESTURE web page: the per-type kit's runner (web/bar-and-column/render-beat.mjs)
// with its fixed interaction replaced by the beat's `gestures`. Guard order: applyStoryboard → REQUIRED → the values →
// check() and the shared guards → the gesture core (validateGestures, format "web", claim read from STORYBOARD.md) →
// the web mapping, the rows drawn, the web scheduler and the generated interaction declaration (./gesture-web.mjs) →
// render (renderWeb holds the page against the declaration), verify-web, look. The resting gestures are drawn on the
// page the reader lands on; every further gesture is one reader control. A gesture refusal prints REFUSED with the
// beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's
// SHAPE (row count, which row leads, sizes, zero or negative values, long names): the layout adapts to it. Selector
// keys (r1…rN, gesture-1…) are this runner's, never the model's names. Everything about THIS story lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { webRegisters } from "#shared/design-base/web.mjs";
import { GestureBarWeb } from "./GestureBarWeb.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, assertNumbers, importBeat } from "./guards.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { HEADROOM, stageWeb } from "./gesture-web.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
/** The name gutter's bounds, in CSS px: past the upper one a long name wraps onto two lines. */
const GUTTER = { min: 60, max: 220, pad: 19 };

await refusing(HERE, async () => {
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));

  const REQUIRED = ["eyebrow", "rows", "gestures", "unit", "format", "restLabel", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.detail !== undefined && typeof beat.detail !== "function") throw new Error("beat.mjs: detail must be a function of the reading r (see CONTRACT.md)");
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { name, value }");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  if (!String(beat.restLabel).trim()) throw new Error("beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. \"The ranking alone\"");

  // ── the values, and the claim first: a title the data no longer supports is the refusal to read, before any other
  assertNumbers(beat.rows.map((r) => [r.name, r.value]));
  const names = beat.rows.map((r) => String(r.name));
  if (new Set(names).size !== names.length) throw new Error("rows holds the same name twice: give each row ONE value (filter data.json to one year / one series)");
  beat.check();
  const rows = beat.rows.map((r) => ({ name: plain(r.name), value: r.value }));
  const values = rows.map((r) => r.value);
  const format = (v) => plain(beat.format(v));
  assertDrawsClaimColumn(values, HERE);
  assertNoAggregates(beat.rows.map((r) => r.name), HERE);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, values, "bars");

  // ── the gestures, checked against the rows and the claim the journalist confirmed, then scheduled: a resting page
  // and one control per further gesture
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
  };
  let staged;
  try {
    staged = stageWeb({ gestures: beat.gestures, rows, claim, format, repair: REPAIR });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { drawn, rest, scheduled, interaction } = staged;
  // Only the drawn bars carry a printed value: their labels must read apart (the remainder is stated, not printed).
  assertLegibleLabels(drawn.map((r) => r.value), beat.format);

  // ── the words, every one through plain()
  const unit = plain(beat.unit);
  const total = drawn.reduce((s, r) => s + r.value, 0) + rest.sum;
  const count = drawn.length + rest.count;
  const decimalComma = /\d,\d/.test(format(1.5)) && !/\d\.\d/.test(format(1.5));
  const share = (v) => `${((v / total) * 100).toFixed(1).replace(".", decimalComma ? "," : ".")} %`;
  const byValue = [...drawn].sort((a, b) => b.value - a.value).map((r) => r.name);
  const shaped = drawn.map((r) => {
    const reading = { name: r.name, value: r.value, share: total > 0 ? (r.value / total) * 100 : null, rank: byValue.indexOf(r.name) + 1, count };
    const own = beat.detail ? plain(beat.detail(reading)) : [total > 0 ? share(r.value) : null, `${reading.rank} / ${count}`].filter(Boolean).join(" · ");
    return { name: r.name, value: r.value, label: format(r.value), detail: `${r.name} · ${format(r.value)}${unit ? ` ${unit}` : ""} · ${own}` };
  });
  const repeated = shaped.find((r, i) => shaped.findIndex((x) => x.detail === r.detail) !== i);
  if (repeated) throw new Error(`detail() answers two bars with the same words (${JSON.stringify(repeated.detail)}): start it with the row's name`);

  const restLabel = plain(beat.restLabel);
  const controls = scheduled.controls.map((c) => {
    const chip = plain(c.chip);
    const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
    return {
      ...c,
      legend: plain(c.label ?? c.legend),
      chip,
      note,
      announce: `${chip} — ${note}`,
      totalLabel: c.total !== undefined ? `= ${format(c.total)}` : undefined,
      valueLabel: c.value !== undefined ? format(c.value) : undefined,
    };
  });
  const restNotes = scheduled.resting.notes.map((n) => {
    const text = plain(n.text);
    return n.marks.length && !n.marks.some((m) => text.includes(m)) ? `${n.marks.join(", ")}: ${text}` : text;
  });
  const scope = typeof beat.scope === "function" ? (shown, all) => plain(beat.scope(shown, all)) : (shown, all) => `${shown} / ${all}`;
  const restLine = rest.count ? scope(drawn.length, count) : null;

  const eyebrow = plain(beat.eyebrow);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(drawn) : beat.alt);
  const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${controlText} ${source} ${restLine ?? ""} ${shaped.map((r) => r.detail).join(" ")}`,
    axis: `${unit} ${drawn.map((r) => r.name).join(" ")}`,
    annot: restNotes.join(" "),
    value: [...shaped.map((r) => r.label), ...controls.flatMap((c) => [c.totalLabel ?? "", c.valueLabel ?? ""])].join(" "),
  };
  console.log(`  ${drawn.length} of ${rows.length} rows drawn · resting: ${staged.valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      // THE GUTTER AND THE ROW FLOOR, from this direction's own registers: the widest name (bold when it carries
      // the accent) sets the gutter, wrapping past its bound; the tallest label a row carries sets the floor.
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const widest = Math.max(...drawn.map((r) => labelBoxPx(r.name, { ...regs.axis, fontWeight: 700 }, measureText, { chip: false }).w));
      const wrapNames = widest + GUTTER.pad > GUTTER.max;
      const gutterPx = Math.max(GUTTER.min, Math.min(GUTTER.max, Math.ceil(widest + GUTTER.pad)));
      const nameBox = labelBoxPx("Hg", regs.axis, measureText, { chip: false }).h * (wrapNames ? 2 : 1);
      const figureBox = Math.max(...[...shaped.map((r) => r.label), ...controls.map((c) => c.totalLabel ?? "")].filter(Boolean).map((t) => labelBoxPx(t, regs.value, measureText, { chip: true }).h));
      const H = Math.max(drawn.length * 24, 280);
      const rowFloor =
        drawn.length >= 2
          ? {
              rows: drawn.length,
              pitch: H / drawn.length,
              px: Math.ceil(Math.max(nameBox, figureBox)),
              why: `Each of the ${drawn.length} rows carries its name in the gutter and its figure on a ground chip at the bar's end; under that pitch a row prints both over its neighbour's.`,
            }
          : null;
      const { outPath } = await renderWeb({
        lang,
        component: GestureBarWeb,
        props: {
          rows: shaped,
          resting: scheduled.resting,
          controls,
          lo: scheduled.lo,
          hi: scheduled.hi,
          headroom: HEADROOM,
          restLabel,
          restNotes,
          restLine,
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
        },
        rowFloor,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
