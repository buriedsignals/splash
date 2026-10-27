// The generic half of a bullet GESTURE scrolly (the paired family: craft/_shared/gesture-family-paired.mjs). The
// per-type kit's fixed choreography (scrolly/bullet/) is replaced by the beat's `gestures`. Guard order:
// applyStoryboard → REQUIRED → the values → check() and the shared guards → the gesture core (validateGestures over
// the family's marks, format "scrolly", the family's hooks, the claim read from STORYBOARD.md) → the keys drawn, the
// scrolly scheduler and every card's words (./gesture-paired-scrolly.mjs) → render, verify-scrolly, one screenshot
// per card. One card per gesture, the scroll interpolating between their states, then a closing card carrying the
// limits. A gesture refusal — a card's words included — prints REFUSED with the beat.mjs field and a value that works;
// with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12
// times. Nothing here refuses the data's SHAPE (key count, long names, negative values, gaps): the layout adapts.
// Everything about THIS story lives in ./beat.mjs. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { GesturePairedScrolly } from "./GesturePairedScrolly.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNoAggregates, importBeat, rowFacts, runCheck } from "./guards.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { marksOf, pairedFigures } from "./gesture-family-paired.mjs";
import { APPLY, driveSource, stagePairedScrolly } from "./gesture-paired-scrolly.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const VARIANT = "bullet";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "series", "rows", "gestures", "format", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, …, card } (see CONTRACT.md)");

  // ── the values, and the claim first
  const rows = (beat.rows ?? []).map((r) => ({ ...r, name: plain(r?.name) }));
  const series = [beat.series].flat().map((s) => plain(s));
  const { marks } = marksOf({ rows, series, variant: VARIANT });
  runCheck(beat);
  const values = marks.map((m) => m.value);
  const format = (v) => plain(beat.format(v));
  assertDrawsClaimColumn(values, HERE);
  assertNoAggregates(rows.map((r) => r.name), HERE);
  const titleForms = [beat.title].flat().map(plain);
  // What the page draws beyond the marks' own values: each key's change and ratio, each series' lead count.
  // A key's own label is drawn too: the pyramid's "60-64" band is printed on its spine.
  const derived = [
    ...pairedFigures(VARIANT, marks)({ do: "highlight" }, { marks: marks.map((m) => m.name) }),
    ...rows.flatMap((r) => (String(r.name).match(/\d+(?:[.,]\d+)?/g) ?? []).map((d) => Number(d.replace(",", ".")))),
  ];
  assertHeadlineNumbersDrawn(titleForms[0], [...values, ...derived], "marks");
  const unitWord = plain(beat.unit ?? "");
  const ceiling = VARIANT === "bullet" ? Number(beat.ceiling ?? (/%/.test(unitWord) ? 100 : Math.max(...values))) : undefined;

  // ── the gestures, checked against the marks and the claim the journalist confirmed, then scheduled card by card
  const front = (() => {
    const file = join(HERE, "..", "..", "STORYBOARD.md");
    const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
    return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  })();
  const claim = {
    takeaway: front("takeaway") ?? titleForms[0],
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(HERE),
    unit: beat.unit,
  };
  let staged;
  try {
    staged = stagePairedScrolly({ gestures: beat.gestures, variant: VARIANT, rows, series, claim, format, ceiling, repair: REPAIR });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { valid, scheduled, cards, keys } = staged;
  const { drawnKeys, drawnMarks, rest, plan: items, pictures, lo, hi } = scheduled;

  // ── what the page draws, by drawn index
  const kIndex = new Map(drawnKeys.map((k, i) => [k, i]));
  const mIndex = new Map(drawnMarks.map((m, i) => [m.name, i]));
  const idx = (list) => (list ?? []).map((n) => mIndex.get(n)).filter((i) => i !== undefined);
  const notes = items.map((p) => plain(p.note ?? ""));
  const plan = items.map((p) => ({
    k: p.k,
    do: p.do,
    own: idx(p.own),
    ...(p.do === "compare" ? { value: p.value, label: format(p.value) } : {}),
    ...(p.do === "reference" ? { value: p.value, label: format(p.value) } : {}),
    ...(p.do === "bracket" ? { members: idx(p.members), whole: p.whole, steps: p.steps.map(format), label: format(p.steps.at(-1)) } : {}),
  }));
  const keyRows = drawnKeys.map((name) => ({
    name,
    seen: valid.findIndex((g) => g.marks.some((n) => drawnMarks.find((m) => m.name === n)?.key === name)),
    gap: keys.find((k) => k.name === name)?.values.some((x) => x === null) ?? false,
  }));
  const markRows = drawnMarks.map((m) => ({ name: m.name, key: kIndex.get(m.key), j: m.j, value: m.value, label: format(m.value) }));
  const closing = pictures.at(-1);
  const still = {
    order: closing.order.filter((k) => kIndex.has(k)),
    emphasis: closing.emphasis,
    copies: closing.copies.map((c) => ({ onto: c.onto, value: c.value })),
    references: closing.references,
    lo,
    hi,
  };
  const scope = typeof beat.scope === "function" ? (shown, all) => plain(beat.scope(shown, all)) : (shown, all) => `${shown} / ${all}`;
  const restLine = rest.count ? scope(drawnKeys.length, keys.length) : null;

  const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
  const steps = [...cards.map((c) => c.id), "limits"];
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(drawnKeys) : beat.alt);

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unitWord} ${series.join(" ")}`,
    annot: `${drawnKeys.join(" ")} ${restLine ?? ""} n/a`,
    value: [...markRows.map((r) => r.label), ...plan.flatMap((p) => [p.label ?? "", ...(p.steps ?? [])]), ...notes].join(" "),
  };
  console.log(`  ${VARIANT}: ${drawnKeys.length} of ${keys.length} keys drawn · cards: ${steps.join(" · ")}`);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: scheduled.states,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
        reveal: {
          element: createElement(GesturePairedScrolly, {
            variant: VARIANT,
            keys: keyRows,
            marks: markRows,
            series,
            ceiling,
            reveal: valid.some((g) => g.do === "reveal"),
            rest: restLine,
            plan,
            notes,
            still,
            unit: unitWord,
            alt,
            regs,
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
          }),
          states: scheduled.states,
          driver: driveSource(),
          apply: APPLY,
        },
        title: titleForms,
        eyebrow,
        source,
        ground: direction.ground,
        type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
        lang,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
