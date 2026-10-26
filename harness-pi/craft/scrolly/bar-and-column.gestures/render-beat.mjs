// The generic half of a bar-and-column GESTURE scrolly: the per-type kit's runner (scrolly/bar-and-column/
// render-beat.mjs) with its fixed six-card choreography replaced by the beat's `gestures`. Guard order:
// applyStoryboard → REQUIRED → the values → check() and the shared guards → the gesture core (validateGestures,
// format "scrolly", claim read from STORYBOARD.md) → the rows drawn, the scrolly scheduler and every card's words
// (./gesture-scrolly.mjs) → render, verify-scrolly, one screenshot per card. One card per gesture, the scroll
// interpolating between their states, then a closing card carrying the limits. A gesture refusal — a card's words
// included — prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the
// refusal's fix is applied instead ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12
// times. Nothing here refuses the data's SHAPE (row count, which row leads, sizes, zero or negative values, long
// names): the layout adapts to it. Everything about THIS story lives in ./beat.mjs, the one file the model writes.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { GestureBarScrolly } from "./GestureBarScrolly.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, assertNumbers } from "./guards.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { APPLY, driveSource, stageScrolly } from "./gesture-scrolly.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rows", "gestures", "unit", "format", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { name, value }");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, …, card } (see CONTRACT.md)");

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
  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], values, "bars");

  // ── the gestures, checked against the rows and the claim the journalist confirmed, then scheduled card by card
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
  };
  let staged;
  try {
    staged = stageScrolly({ gestures: beat.gestures, rows, claim, format, repair: REPAIR });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { valid, drawn, rest, scheduled, cards } = staged;
  // Only the drawn bars carry a printed value: their labels must read apart (the remainder is stated, not printed).
  assertLegibleLabels(drawn.map((r) => r.value), beat.format);

  // ── what the page draws, by drawn row index
  const indexOf = new Map(drawn.map((r, i) => [r.name, i]));
  const idx = (list) => (list ?? []).map((n) => indexOf.get(n));
  const byValue = [...drawn].map((r, i) => i).sort((a, b) => drawn[b].value - drawn[a].value);
  const rank = drawn.map((_, i) => byValue.indexOf(i));
  const seen = drawn.map((r) => valid.findIndex((g) => g.marks.includes(r.name) || (g.do === "bracket" && g.of === "whole")));
  const notes = scheduled.plan.map((p) => plain(p.note ?? (p.do === "count" ? format(p.steps.at(-1)) : "")));
  const plan = scheduled.plan.map((p, j) => ({
    k: p.k,
    do: p.do,
    own: idx(p.own),
    ...(p.do === "compare" ? { value: p.value, label: format(p.value) } : {}),
    ...(p.do === "reference" ? { value: p.value, label: format(p.value) } : {}),
    ...(p.do === "bracket" ? { members: idx(p.members), whole: p.whole, steps: p.steps.map(format), label: format(p.steps.at(-1)) } : {}),
    ...(p.do === "count" ? { steps: p.steps.map(format), noteText: notes[j] } : {}),
  }));
  const closing = scheduled.states.at(-1);
  const still = {
    order: drawn.map((_, i) => i).sort((a, b) => closing[`slot${a}`] - closing[`slot${b}`]),
    accent: drawn.map((_, i) => closing[`accent${i}`] > 0.5 || closing[`ring${i}`] > 0.5),
    back: drawn.map((_, i) => closing[`back${i}`] > 0.5),
    lo: closing.lo,
    hi: closing.hi,
    copies: scheduled.plan.filter((p) => p.do === "compare").map((p) => ({ row: indexOf.get(p.own[0]), value: p.value, label: format(p.value) })),
  };
  const scope = typeof beat.scope === "function" ? (shown, all) => plain(beat.scope(shown, all)) : (shown, all) => `${shown} / ${all}`;
  const restLine = rest.count ? scope(drawn.length, rows.length) : null;

  const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
  const steps = [...cards.map((c) => c.id), "limits"];
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(drawn) : beat.alt);
  const labels = drawn.map((r) => ({ name: r.name, value: r.value, label: format(r.value) }));

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: unit,
    annot: `${drawn.map((r) => r.name).join(" ")} ${restLine ?? ""}`,
    value: [...labels.map((r) => r.label), ...plan.flatMap((p) => [p.label ?? "", ...(p.steps ?? [])]), ...notes].join(" "),
  };
  console.log(`  ${drawn.length} of ${rows.length} rows drawn · cards: ${steps.join(" · ")}`);

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
          element: createElement(GestureBarScrolly, {
            rows: labels,
            seen,
            rank,
            reveal: valid.some((g) => g.do === "reveal"),
            rest: restLine,
            plan,
            notes,
            still,
            unit,
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
