// The generic half of a Units-family GESTURE web page (craft/gestures/GRAMMAR.md F5), variant `histogram`. Guard
// order: applyStoryboard → REQUIRED → the partition (built once, adapting to the data's shape and saying so) →
// check() on the counted groups and the shared guards → the gesture core with the family's hooks (format "web",
// claim read from STORYBOARD.md) → the web scheduler and the generated interaction declaration
// (./gesture-units-web.mjs) → render (renderWeb holds the page against the declaration), verify-web, look. The
// resting gestures are drawn on the page the reader lands on; every further gesture is one reader control. A gesture
// refusal prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's
// fix is applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12 times. Nothing here refuses the data's
// SHAPE. Everything about THIS story lives in ./beat.mjs. Copied into the beat by the harness; never edited by the
// model.
//
// Usage:  bun <beat>/render-beat.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { webRegisters } from "#shared/design-base/web.mjs";
import { GestureUnitsWeb } from "./GestureUnitsWeb.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers, importBeat, rowFacts } from "./guards.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { headlineFigures, partitionOf, refusalText, runUnitsCheck, stageUnits } from "./gesture-family-units.mjs";
import { scheduleUnitsWeb, unitsInteractionPlan } from "./gesture-units-web.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const VARIANT = "histogram";
const PARTITION = VARIANT === "histogram" ? ["binWidth", "binCount"] : ["blocks"];
const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
const GUTTER = { min: 60, max: 220, pad: 19 };

await refusing(HERE, async () => {
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));

  if (beat.units === undefined && beat.observations !== undefined) beat.units = beat.observations;
  const REQUIRED = ["eyebrow", "units", "gestures", "unit", "restLabel", "title", "limits", "source", "alt", "check", ...PARTITION];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (!Array.isArray(beat.units) || !beat.units.length) throw new Error("beat.mjs: units must be a non-empty array of { name, value }, one per counted thing");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  if (!String(beat.restLabel).trim()) throw new Error('beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. "The groups alone"');

  // ── the partition, and the claim first
  assertNumbers(beat.units.map((u, i) => [u.name ?? u.label ?? i, Number(u.value)]), "units");
  const partition = partitionOf(beat, VARIANT);
  for (const line of partition.adapted) console.log(`  adapted: ${line}`);
  runUnitsCheck(beat, partition);
  assertDrawsClaimColumn(partition.groups.flatMap((g) => g.units.map((u) => u.value)), HERE);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, headlineFigures(partition), "groups");
  const format = typeof beat.format === "function" ? (v) => plain(beat.format(v)) : (v) => String(v);

  // ── the gestures, then the resting page and one control per further gesture
  const front = (() => {
    const file = join(HERE, "..", "..", "STORYBOARD.md");
    const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
    return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  })();
  const claim = { takeaway: front("takeaway") ?? title, subject: front("subject"), comparison: front("comparison"), entity: front("claimEntity"), versus: front("claimVersus"), facts: rowFacts(HERE) };
  let staged;
  try {
    staged = stageUnits({
      gestures: beat.gestures,
      partition,
      claim,
      format: "web",
      repair: REPAIR,
      schedule: (valid, entities) => scheduleUnitsWeb({ gestures: valid, groups: partition.groups, format, entities }),
    });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    throw new Error(refusalText(error));
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const scheduled = staged.scheduled;
  const subject = scheduled.resting.accent[0] ?? partition.groups[0].name;
  const interaction = unitsInteractionPlan({ scheduled, groups: partition.groups, subject });

  // ── the words, every one through plain()
  const total = partition.total;
  const decimalComma = /\d,\d/.test(format(1.5)) && !/\d\.\d/.test(format(1.5));
  const share = (v) => `${((v / total) * 100).toFixed(1).replace(".", decimalComma ? "," : ".")} %`;
  const byCount = [...partition.groups].sort((a, b) => b.count - a.count).map((g) => g.name);
  const groups = partition.groups.map((g) => {
    const members = g.units.slice(0, 6).map((u) => plain(u.name));
    const more = g.units.length > 6 ? ` +${g.units.length - 6}` : "";
    const detail = `${plain(g.name)} · ${format(g.count)} / ${format(total)} · ${share(g.count)} · ${byCount.indexOf(g.name) + 1} / ${partition.groups.length}${members.length ? ` · ${members.join(", ")}${more}` : ""}`;
    return { name: plain(g.name), count: g.count, label: format(g.count), detail };
  });
  const restLabel = plain(beat.restLabel);
  const controls = scheduled.controls.map((c) => {
    const chip = plain(c.chip);
    const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
    return { ...c, legend: plain(c.label ?? c.legend), chip, note, announce: `${chip} — ${note}`, totalLabel: c.total !== undefined ? `= ${format(c.total)}` : undefined, valueLabel: c.value !== undefined ? format(c.value) : undefined };
  });
  const restNotes = [
    ...scheduled.resting.notes.map((n) => (plain(n.text).includes(n.group) ? plain(n.text) : `${plain(n.group)}: ${plain(n.text)}`)),
    ...scheduled.resting.references.map((r) => plain(r.text)),
    ...scheduled.resting.captions.map((c) => plain(c.text)),
  ];
  const eyebrow = plain(beat.eyebrow);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const unit = plain([beat.unit, beat.unitIs].filter(Boolean).join(" · "));
  const counts = Object.fromEntries(partition.groups.map((g) => [g.key, g.count]));
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ groups: partition.groups, counts, total }) : beat.alt);
  const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${controlText} ${source} ${groups.map((g) => g.detail).join(" ")}`,
    axis: `${unit} ${groups.map((g) => g.name).join(" ")}`,
    annot: restNotes.join(" ") || unit,
    value: [...groups.map((g) => g.label), ...controls.flatMap((c) => [c.totalLabel ?? "", c.valueLabel ?? ""])].join(" "),
  };
  console.log(`  ${partition.groups.length} groups, ${total} units · resting: ${staged.valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const widest = Math.max(...groups.map((g) => labelBoxPx(g.name, { ...regs.axis, fontWeight: 700 }, measureText, { chip: false }).w));
      const wrapNames = widest + GUTTER.pad > GUTTER.max;
      const gutterPx = Math.max(GUTTER.min, Math.min(GUTTER.max, Math.ceil(widest + GUTTER.pad)));
      const nameBox = labelBoxPx("Hg", regs.axis, measureText, { chip: false }).h * (wrapNames ? 2 : 1);
      const figureBox = Math.max(...[...groups.map((g) => g.label), ...controls.map((c) => c.totalLabel ?? "")].filter(Boolean).map((t) => labelBoxPx(t, regs.value, measureText, { chip: true }).h));
      const H = Math.max(groups.length * 30, 280);
      const rowFloor =
        groups.length >= 2
          ? { rows: groups.length, pitch: H / groups.length, px: Math.ceil(Math.max(nameBox, figureBox)), why: `Each of the ${groups.length} groups carries its name in the gutter and its count after its mark; under that pitch a row prints both over its neighbour's.` }
          : null;
      const { outPath } = await renderWeb({
        lang,
        component: GestureUnitsWeb,
        props: {
          variant: VARIANT,
          groups,
          resting: scheduled.resting,
          controls,
          laid: scheduled.laid,
          restLabel,
          restNotes,
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
