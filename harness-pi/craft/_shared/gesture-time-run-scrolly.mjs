// The SCROLLY runner of every Time-series gesture beat (line, area-and-stacked-area, streamgraph,
// bump-ranking-over-time). Guard order: applyStoryboard → REQUIRED → the readings → check() and the shared guards
// (gesture-time-run.mjs loadTimeBeat) → the gesture core (validateTime, format "scrolly", claim read from
// STORYBOARD.md) → the scrolly scheduler and every card's words (gesture-time-scrolly.mjs) → render, verify-scrolly,
// one screenshot per card. One card per gesture, the scroll interpolating between their states, then a closing card
// carrying the limits. A gesture refusal — a card's words included — prints REFUSED with the beat.mjs field and a
// value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead. Nothing here refuses the
// data's SHAPE (how many series or readings, gaps, long names). Node only.
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { niceTicks, validateTime } from "./gesture-family-time.mjs";
import { loadTimeBeat, staged } from "./gesture-time-run.mjs";
import { APPLY, checkTimeCards, driveSource, scheduleTimeScrolly } from "./gesture-time-scrolly.mjs";
import { GestureTimeScrolly } from "./GestureTimeScrolly.tsx";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";
import { plain, refusing } from "./web.mjs";

export async function runTimeScrolly(here, variant) {
  await refusing(here, async () => {
    const { beat, model, claim, format: rawFormat, titleForms, lang, fallbackSubject } = await loadTimeBeat(here, variant, { required: ["limits", "alt"], format: "scrolly" });
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const format = (v) => plain(rawFormat(v));

    const { valid, scheduled, cards, subject } = staged((list) => {
      const v = validateTime({ gestures: list, model, format: "scrolly", claim, fallbackSubject });
      const s = scheduleTimeScrolly({ model, valid: v.gestures, format, subject: v.subject });
      const c = checkTimeCards({ model, valid: v.gestures, plan: s.plan, format, subject: s.accent, facts: claim.facts });
      return { valid: v.gestures, scheduled: s, cards: c, subject: s.accent };
    }, beat.gestures);

    // What the page draws: per series its readings [t, y0, y1, gap], the plan in the variant's units.
    const series = model.series.map((s) => ({
      name: plain(s),
      label: plain(variant === "bump-ranking-over-time" ? s : `${s} ${format(model.measureOf.get(model.marks.filter((m) => m.series === s).at(-1)?.name) ?? NaN)}`),
      pts: model.geometry.get(s).map((p) => [p.t, p.gap ? null : p.y0, p.gap ? null : p.y1, p.gap ? 1 : 0]),
      vals: variant === "bump-ranking-over-time" ? undefined : model.geometry.get(s).map((p) => (p.gap ? "" : format(model.read(s, p.t)))),
    }));
    for (const s of series) s.label = s.label.replace(/ NaN$/, "");
    const gaps = model.gaps.map((g) => {
      if (g.series === null) return { from: g.from, to: g.to, rect: true };
      const pts = model.geometry.get(g.series);
      return { from: g.from, to: g.to, rect: false, a: pts.find((p) => p.t === g.from).y1, b: pts.find((p) => p.t === g.to).y1 };
    }).filter((g) => g.rect || (Number.isFinite(g.a) && Number.isFinite(g.b)));
    const yTicks = variant === "line" || variant === "area-and-stacked-area" ? niceTicks(model.domain[0], model.domain[1], 5) : variant === "bump-ranking-over-time" ? Array.from({ length: model.slots }, (_, i) => i + 1) : [];
    const yLabels = yTicks.map((v) => (variant === "bump-ranking-over-time" ? String(v) : Number.isInteger(v) ? format(v).replace(/[.,]0+$/, "") : format(v)));
    const span = model.t1 - model.t0;
    let xTicks = niceTicks(model.t0, model.t1, 6).filter((t) => Number.isInteger(t) || span < 6);
    if (!xTicks.length) xTicks = [model.t0, model.t1];
    const plan = scheduled.plan.map(({ shown: _s, note: _n, ratio: _r, gap: _g, text: _t, levels: _l, ...p }) => p);
    const closing = scheduled.states.at(-1);
    const still = {
      accent: model.series.map((_, i) => closing[`accent${i}`] > 0.5),
      ring: model.series.map((_, i) => closing[`ring${i}`] > 0.5),
    };
    const notes = scheduled.plan.map((p) => plain(p.note ?? p.text ?? ""));

    const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
    const steps = [...cards.map((c) => c.id), "limits"];
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const unit = plain(beat.unit);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(model) : beat.alt);
    const title = titleForms.map(plain);
    const textPerRegister = {
      display: title.join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: `${unit} ${yLabels.join(" ")} ${xTicks.join(" ")} 0123456789`,
      annot: `${series.map((s) => s.label).join(" ")} ${model.gapLabel}`,
      value: notes.join(" "),
    };
    console.log(`  ${model.series.length} series · ${model.times.length} times · ${model.gaps.length} gap(s) · accent ${subject} · cards: ${steps.join(" · ")}`);

    await renderBeatScrolly({
      here,
      states: scheduled.states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 3,
      async render({ label, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(GestureTimeScrolly, {
              variant,
              series,
              plan,
              gaps,
              gapLabel: plain(beat.gapLabel ?? model.gapLabel),
              domain: model.domain,
              t0: model.t0,
              t1: model.t1,
              traced: scheduled.traced,
              yTicks,
              yLabels,
              xTicks,
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
          title,
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
