// The generic half of every Part-to-whole GESTURE scrolly (treemap, marimekko-mosaic-plot, pie-and-donut). Guard order:
// importBeat → applyStoryboard → REQUIRED → the marks → check() and the shared guards → the gesture core with this
// family's hooks (validatePart, format "scrolly", claim read from STORYBOARD.md) → the scrolly scheduler and every
// card's words (gesture-part-scrolly.mjs) → render, verify-scrolly, one screenshot per card. One card per gesture,
// the scroll interpolating between their states, then a closing card carrying the limits. A gesture refusal — a
// card's words included — prints REFUSED with the beat.mjs field and a value that works; with
// SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead and the list staged again, at most 12 times. Nothing
// here refuses the data's SHAPE: what the frame has no room for is folded into one remainder part. Node-side.
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { shareText, validatePart } from "./gesture-family-part.mjs";
import { readClaim, readPartBeat } from "./gesture-part-run-static.mjs";
import { APPLY, driveData, driveSource, stagePartScrolly } from "./gesture-part-scrolly.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, importBeat, legibleFormat } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const hintOf = (fix) => {
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  return "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
};

export async function runPartScrolly({ here, variant, Component }) {
  const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
  await refusing(here, async () => {
    const beat = await importBeat(here);
    applyStoryboard(beat, here);
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const { marks, title, headlineValues } = readPartBeat(beat, here, variant);
    if (beat.gestures.some((g) => g && typeof g === "object" && g.card === undefined))
      console.log("  a gesture has no card: the card check names it with a value that works");
    beat.format = legibleFormat(marks.map((m) => m.value), beat.format);
    const format = (v) => plain(beat.format(v));
    const claim = readClaim(here, title[0], beat.unit);

    let list = beat.gestures;
    let staged;
    for (let step = 0; ; step++) {
      try {
        const { valid } = validatePart({ variant, gestures: list, marks, claim, format: "scrolly" });
        staged = { valid, ...stagePartScrolly({ variant, valid, marks, format, facts: claim.facts }) };
        break;
      } catch (error) {
        if (!(error instanceof GestureRefusal)) throw error;
        if (!REPAIR || step >= 12) throw new Error(`${error.message}${hintOf(error.fix)}`);
        console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
        list = applyFix(list, error.fix);
      }
    }
    const { valid, scheduled, cards } = staged;
    assertHeadlineNumbersDrawn(title[0], [...headlineValues, marks.length, ...valid.map((g) => g.marks.length)], "parts");

    // Each card's header note: the gesture's own words, else the figure its picture shows.
    const whole = scheduled.whole;
    const derived = (p) =>
      p.do === "bracket"
        ? `${format(p.shown[0])} · ${shareText(format, p.ratio)}`
        : p.do === "compare"
          ? `${format(p.shown[0])} / ${format(p.value)}`
          : p.do === "count"
            ? format(p.steps.at(-1))
            : p.own.length && ["highlight", "name", "annotate", "filter"].includes(p.do)
              ? `${format(p.shown[0])} · ${shareText(format, p.shown[0] / whole)}`
              : "";
    const finals = scheduled.plan.map((p) => plain(p.note ?? derived(p)));
    const notes = scheduled.plan.map((p, k) => (p.do === "count" ? "" : finals[k]));
    const restText = scheduled.rest.count ? `${scheduled.rest.count} ${plain(beat.restLabel)}` : "";
    const closing = scheduled.states.at(-1);
    const parts = scheduled.parts.map((p) => ({ ...p, name: plain(p.name) }));
    const labels = parts.map((p) => format(p.value));
    const still = {
      accent: parts.map((_, i) => closing[`a${i}`] > 0.5),
      ring: parts.map((_, i) => closing[`r${i}`] > 0.5),
      groups: scheduled.groups,
    };

    const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
    const steps = [...cards.map((c) => c.id), "limits"];
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const unit = plain(`${beat.unit} · ${format(whole)}`);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(marks) : beat.alt);
    const textPerRegister = {
      display: title.map(plain).join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: `${unit} ${[...new Set(parts.map((p) => p.key ?? ""))].join(" ")} ${restText}`,
      annot: `${parts.map((p) => p.series ?? p.name).join(" ")} ${plain(beat.restLabel)} ${restText}`,
      value: [...labels, ...finals, ...scheduled.plan.flatMap((p) => (p.steps ?? []).map(format))].join(" "),
    };
    console.log(`  ${parts.length} of ${marks.length} parts drawn · cards: ${steps.join(" · ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatScrolly({
      here,
      states: scheduled.states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const data = driveData({ variant, parts: scheduled.parts, groups: scheduled.groups, plan: scheduled.plan, format, restText });
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(Component, {
              variant,
              parts,
              rest: scheduled.rest,
              restLabel: plain(beat.restLabel),
              data,
              labels,
              notes,
              finals,
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
          title: title.map(plain),
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
}
