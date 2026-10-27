// The generic half of a waterfall-bridge GESTURE scrolly (Stack family, craft/gestures/GRAMMAR.md F2): the per-type kit's
// runner (scrolly/waterfall-bridge/render-beat.mjs) with its fixed choreography replaced by the beat's `gestures`. Guard
// order: applyStoryboard → REQUIRED → the family model → the shared guards → check() → the gesture core on the
// family's marks (validateStack, format "scrolly", claim read from STORYBOARD.md) → the bars drawn, the scrolly
// scheduler and every card's words (./gesture-stack-scrolly.mjs) → render, verify-scrolly, one screenshot per
// card. One card per gesture, the scroll interpolating between their states, then a closing card carrying the
// limits. A gesture refusal — a card's words included — prints REFUSED with the beat.mjs field and a value that
// works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead, at most 12 times. Nothing here refuses
// the data's SHAPE: the layout adapts to it. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, seriesInks } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { GestureStackScrolly, stackFills } from "./GestureStackScrolly.tsx";
import { GestureRefusal } from "./gesture-core.mjs";
import { APPLY, driveSource, pageData, stageStackScrolly } from "./gesture-stack-scrolly.mjs";
import { loadStackBeat } from "./gesture-stack-beat.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const VARIANT = "waterfall-bridge";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const { beat, stack, claim } = await loadStackBeat(HERE, VARIANT);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, …, card } (see CONTRACT.md)");
  const format = (v) => plain(beat.format(v));
  const titleForms = [beat.title].flat().map(plain);

  let staged;
  try {
    staged = stageStackScrolly({ gestures: beat.gestures, stack, claim, format, repair: REPAIR });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { drawn, rest, scheduled, cards } = staged;
  const notes = scheduled.plan.map((p) => plain(p.note ?? (p.do === "count" ? format(p.steps.at(-1)) : "")));
  const closing = scheduled.states.at(-1);
  const still = {
    order: drawn.map((_, i) => i).sort((a, b) => closing[`slot${a}`] - closing[`slot${b}`]),
    accent: drawn.map((_, i) => closing[`accent${i}`] > 0.5 || closing[`ring${i}`] > 0.5),
  };
  const scope = typeof beat.scope === "function" ? (shown, all) => plain(beat.scope(shown, all)) : (shown, all) => `${shown} / ${all}`;
  const restLine = rest ? scope(drawn.length, stack.names.length) : null;

  const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
  const steps = [...cards.map((c) => c.id), "limits"];
  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit ?? "");
  const alt = plain(typeof beat.alt === "function" ? beat.alt(drawn) : beat.alt);
  const keyNames = VARIANT === "waterfall-bridge" ? [] : VARIANT === "diverging-stacked-bar-likert" ? [...[...stack.left].reverse(), ...(stack.centre ? [stack.centre] : []), ...stack.right] : stack.parts;

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: [unit, ...(VARIANT === "waterfall-bridge" ? [...stack.names, stack.closing.name] : [])].join(" "),
    annot: `${drawn.join(" ")} ${keyNames.join(" ")} ${restLine ?? ""}`,
    value: [...stack.marks.map((m) => format(m.value)), ...drawn.map((b) => format(stack.whole(b))), ...notes].join(" "),
  };
  console.log(`  ${drawn.length} of ${stack.names.length} bars drawn · cards: ${steps.join(" · ")}`);

  const newsroom = readPalette(HERE);
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatScrolly({
    here: HERE,
    states: scheduled.states,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const decreaseInk = VARIANT === "waterfall-bridge" ? seriesInks({ ground: direction.ground, accent: direction.accent, accents: [direction.accent, ...(newsroom.accents ?? []).slice(1)] }, 2)[1] : undefined;
      const fills = stackFills({ variant: VARIANT, stack, accent: direction.accent, ground: direction.ground, ink, muted, decreaseInk });
      const data = pageData({ stack, drawn, plan: scheduled.plan, format, fills });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
        reveal: {
          element: createElement(GestureStackScrolly, {
            data,
            notes,
            still,
            keyParts: keyNames.map((p) => ({ label: plain(p), fill: fills(drawn[0], p) })),
            unit,
            rest: restLine,
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
