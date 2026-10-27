// The generic half of a Units-family GESTURE scrolly (craft/gestures/GRAMMAR.md F5), variant `pictogram-isotype`. Guard
// order: applyStoryboard → REQUIRED → the partition (built once, adapting to the data's shape and saying so) →
// check() on the counted groups and the shared guards → the gesture core with the family's hooks (format "scrolly",
// claim read from STORYBOARD.md) → the units scrolly scheduler and every card's words (checkCards) → render,
// verify-scrolly, one screenshot per card. One card per gesture, the scroll interpolating between their states,
// then a closing card carrying the limits. A gesture refusal — a card's words included — prints REFUSED with the
// beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>"), at most 12 times. Nothing here refuses the data's SHAPE. Everything about
// THIS story lives in ./beat.mjs. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { GestureUnitsScrolly } from "./GestureUnitsScrolly.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers, importBeat, rowFacts } from "./guards.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { headlineFigures, partitionOf, refusalText, runUnitsCheck, stageUnits } from "./gesture-family-units.mjs";
import { checkCards } from "./gesture-scrolly.mjs";
import { APPLY_UNITS, scheduleUnitsScrolly, unitsDriveSource } from "./gesture-units-scrolly.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const VARIANT = "pictogram-isotype";
const PARTITION = VARIANT === "histogram" ? ["binWidth", "binCount"] : ["blocks"];
const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  if (beat.units === undefined && beat.observations !== undefined) beat.units = beat.observations;
  const REQUIRED = ["eyebrow", "units", "gestures", "unit", "title", "limits", "source", "alt", "check", ...PARTITION];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (!Array.isArray(beat.units) || !beat.units.length) throw new Error("beat.mjs: units must be a non-empty array of { name, value }, one per counted thing");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, …, card } (see CONTRACT.md)");

  // ── the partition, and the claim first
  assertNumbers(beat.units.map((u, i) => [u.name ?? u.label ?? i, Number(u.value)]), "units");
  const partition = partitionOf(beat, VARIANT);
  for (const line of partition.adapted) console.log(`  adapted: ${line}`);
  runUnitsCheck(beat, partition);
  assertDrawsClaimColumn(partition.groups.flatMap((g) => g.units.map((u) => u.value)), HERE);
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], headlineFigures(partition), "groups");
  const format = typeof beat.format === "function" ? (v) => plain(beat.format(v)) : (v) => String(Math.round(v * 10) / 10).replace(".", /^(fr|de|es|it|pt|nl|pl)/.test(storyLanguage(HERE) ?? "") ? "," : ".");

  // ── the gestures, checked against the groups and the claim, then scheduled card by card
  const front = (() => {
    const file = join(HERE, "..", "..", "STORYBOARD.md");
    const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
    return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  })();
  const claim = { takeaway: front("takeaway") ?? titleForms[0], subject: front("subject"), comparison: front("comparison"), entity: front("claimEntity"), versus: front("claimVersus"), facts: rowFacts(HERE) };
  let staged;
  try {
    staged = stageUnits({
      gestures: beat.gestures,
      partition,
      claim,
      format: "scrolly",
      repair: REPAIR,
      schedule: (valid) => {
        const scheduled = scheduleUnitsScrolly({ gestures: valid, groups: partition.groups });
        const rows = partition.groups.map((g) => ({ name: g.name, value: g.count }));
        const cards = checkCards({ gestures: valid, plan: scheduled.plan, rows, format, facts: Object.fromEntries(partition.groups.map((g) => [g.name, [g.lo, g.hi].filter(Number.isFinite)])) });
        return { scheduled, cards };
      },
    });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    throw new Error(refusalText(error));
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { valid } = staged;
  const { scheduled, cards } = staged.scheduled;
  const groups = partition.groups;
  const indexOf = new Map(groups.map((g, i) => [g.name, i]));
  const idx = (list) => (list ?? []).map((n) => indexOf.get(n));
  const notes = scheduled.plan.map((p) => plain(p.note ?? (p.do === "count" ? format(p.steps.at(-1)) : "")));
  const plan = scheduled.plan.map((p, j) => ({
    k: p.k,
    do: p.do,
    own: idx(p.own),
    ...(p.do === "compare" ? { value: p.value } : {}),
    ...(p.do === "reference" ? { value: p.value, between: p.between, label: plain(p.note ?? format(p.value)) } : {}),
    ...(p.do === "bracket" ? { members: idx(p.members), steps: p.steps.map(format), noteText: p.note ? plain(p.note) : "", label: plain(p.note ?? format(p.steps.at(-1))) } : {}),
    ...(p.do === "count" ? { steps: p.steps.map(format), noteText: notes[j] } : {}),
  }));
  const closing = scheduled.states.at(-1);
  const still = { accent: groups.map((_, i) => closing[`accent${i}`] > 0.5 || closing[`ring${i}`] > 0.5) };
  const max = Math.max(1, ...groups.map((g) => g.count), ...scheduled.plan.filter((p) => p.do === "compare").map((p) => p.value));

  const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
  const steps = [...cards.map((c) => c.id), "limits"];
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain([beat.unit, beat.unitIs].filter(Boolean).join(" · "));
  const counts = Object.fromEntries(groups.map((g) => [g.key, g.count]));
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ groups, counts, total: partition.total }) : beat.alt);
  const labels = groups.map((g) => ({ name: plain(g.name), count: g.count, label: format(g.count) }));
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: unit,
    annot: labels.map((g) => g.name).join(" "),
    value: [...labels.map((g) => g.label), ...plan.flatMap((p) => [p.label ?? "", ...(p.steps ?? [])]), ...notes].join(" "),
  };
  console.log(`  ${groups.length} groups, ${partition.total} units · cards: ${steps.join(" · ")}`);

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
          element: createElement(GestureUnitsScrolly, { variant: VARIANT, groups: labels, plan, notes, still, max, unit, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: scheduled.states,
          driver: unitsDriveSource(),
          apply: APPLY_UNITS,
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
