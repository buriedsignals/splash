// The WEB runner of every Time-series gesture beat (line, area-and-stacked-area, streamgraph, bump-ranking-over-time).
// Guard order: loadTimeBeat (applyStoryboard → REQUIRED → the readings → check() and the shared guards) → the gesture
// core (validateTime, format "web", claim read from STORYBOARD.md) → the web scheduler and the generated interaction
// declaration (./gesture-time-web.mjs) → render (renderWeb holds the page against the declaration), verify-web, look.
// A gesture refusal prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the
// refusal's fix is applied instead and the list staged again, at most 12 times. Nothing here refuses the data's SHAPE.
// Node only.
import { validateTime } from "./gesture-family-time.mjs";
import { niceTicks } from "./gesture-family-time.mjs";
import { loadTimeBeat, staged } from "./gesture-time-run.mjs";
import { interactionPlanTime, scheduleTimeWeb } from "./gesture-time-web.mjs";
import { chartWeb, plain, refusing, renderBeatWeb } from "./web.mjs";

export async function runTimeWeb(here, variant) {
  await refusing(here, async () => {
    const { webRegisters } = await import("#shared/design-base/web.mjs");
    const { GestureTimeWeb, FRAME } = await import("./GestureTimeWeb.tsx");
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const { deriveFurniture, measureText } = await import(chartWeb(here, "scripts", "render-still.mjs"));
    const { labelBoxPx } = await import(chartWeb(here, "assets", "keyed-note.ts"));

    const { beat, model, claim, format: rawFormat, titleForms, lang, shape, fallbackSubject } = await loadTimeBeat(here, variant, { required: ["limits", "alt", "restLabel", "format"], format: "web" });
    if (!String(beat.restLabel).trim()) throw new Error('beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. "The whole series"');
    const format = (v) => plain(rawFormat(v));
    const bump = variant === "bump-ranking-over-time";

    const { valid, scheduled, subject } = staged((list) => {
      const v = validateTime({ gestures: list, model, format: "web", claim, fallbackSubject });
      const s = scheduleTimeWeb({ model, valid: v.gestures, format, subject: v.subject });
      return { valid: v.gestures, scheduled: s, subject: v.subject };
    }, beat.gestures);
    const accentSeries = scheduled.accent;
    const interaction = interactionPlanTime({ scheduled, model, subject: model.marks.filter((m) => m.series === accentSeries).at(-1)?.name });

    // ── every drawn reading's answer: its value, its place among the series at that time, its share of a stack
    const unit = plain(beat.unit ?? "");
    const readings = model.marks.map((m) => {
      const p = model.geometry.get(m.series).find((q) => q.t === m.t);
      const measure = model.measureOf.get(m.name);
      const among = model.rankingAt(m.t).length;
      let tail;
      if (bump) tail = `#${m.value} / ${among} · ${format(measure)}`;
      else if (model.stacked) {
        const total = model.series.reduce((s, x) => s + (Number.isFinite(model.read(x, m.t)) ? model.read(x, m.t) : 0), 0);
        tail = `${format(measure)}${unit ? ` ${unit}` : ""} · ${total > 0 ? ((measure / total) * 100).toFixed(1) : "0"} % · ${model.rankAt(m.t, m.series)} / ${among}`;
      } else tail = `${format(measure)}${unit ? ` ${unit}` : ""}${model.series.length > 1 ? ` · ${model.rankAt(m.t, m.series)} / ${among}` : ""}`;
      return { name: m.name, series: m.series, t: m.t, y0: p.y0, y1: p.y1, detail: plain(`${m.series} · ${m.key} · ${tail}`) };
    });

    // ── controls' words: the chip, the note and the readings no plate prints
    const restLabel = plain(beat.restLabel);
    const controls = scheduled.controls.map((c) => {
      const chip = plain(c.chip);
      const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
      return { ...c, legend: plain(c.label ?? c.legend), chip, note, announce: `${chip} — ${note}`, figure: plain(c.note ?? c.pieces[0] ?? c.chip) };
    });
    const resting = {
      rings: scheduled.resting.rings,
      points: scheduled.resting.points.map((p) => ({ ...p, text: plain(p.text) })),
      references: scheduled.resting.references.map((r) => ({ ...r, text: r.text === undefined ? undefined : plain(r.text) })),
    };
    const restNotes = scheduled.resting.captions.map((c) => plain(c.text));

    // ── axes: a line fitted, an area from zero (value ticks); a stream has none; a bump writes its ranks
    const tickLabel = (v) => (Number.isInteger(v) ? format(v).replace(/[.,]0+$/, "") : format(v));
    const [lo, hi] = model.domain;
    const yTicks = bump
      ? Array.from({ length: model.slots }, (_, i) => ({ value: i + 1, label: String(i + 1) }))
      : variant === "streamgraph"
        ? []
        : niceTicks(Math.min(lo, hi), Math.max(lo, hi), 5).map((v) => ({ value: v, label: tickLabel(v) }));
    const keyAt = (t) => model.keyOf.get(t) ?? String(Math.round(t * 10) / 10);
    const ticksFor = ([a, b]) => {
      let ts = niceTicks(a, b, 6).filter((t) => Number.isInteger(t) || b - a < 6);
      if (ts.length < 2) ts = [a, b];
      return ts.map((t) => ({ t, label: model.keyOf.get(t) ?? String(t) }));
    };
    const windows = [[model.t0, model.t1], ...controls.filter((c) => c.do === "zoom").map((c) => c.window)];
    const xTicksOf = Object.fromEntries(windows.map((w) => [`${w[0]}-${w[1]}`, ticksFor(w)]));
    void keyAt;

    // ── end labels: every series with a reading at the end (a bump: those still in its slots, and the accent's)
    const lastOf = (s) => [...(model.geometry.get(s) ?? [])].reverse().find((p) => !p.gap);
    const ends = model.series
      .map((s) => {
        const p = lastOf(s);
        if (!p) return null;
        if (bump && p.t !== model.t1 && s !== accentSeries && !resting.rings.includes(s)) return null;
        const last = model.marks.filter((m) => m.series === s).at(-1);
        const text = plain(bump ? s : `${s} ${format(model.measureOf.get(last.name))}`);
        const y = variant === "line" || bump || model.series.length === 1 ? p.y1 : (p.y0 + p.y1) / 2;
        return { series: s, text, y };
      })
      .filter(Boolean);
    // Spread them so two never share a line at the plot's floor height (a phone): a pitch in value units.
    const span = Math.abs(hi - lo);
    const MIN_PLOT_PX = 240;
    const pitch = (span * 18) / MIN_PLOT_PX;
    const sign = hi > lo ? 1 : -1; // a bump's domain runs downward: rank 1 on top
    const sorted = [...ends].sort((a, b) => sign * (b.y - a.y));
    for (let i = 1; i < sorted.length; i++) if (sign * (sorted[i - 1].y - sorted[i].y) < pitch) sorted[i].y = sorted[i - 1].y - sign * pitch;
    const floorY = sign > 0 ? Math.min(lo, hi) : Math.max(lo, hi);
    if (sorted.length && sign * (sorted.at(-1).y - floorY) < 0) {
      sorted.at(-1).y = floorY + sign * pitch * 0.3;
      for (let i = sorted.length - 2; i >= 0; i--) if (sign * (sorted[i].y - sorted[i + 1].y) < pitch) sorted[i].y = sorted[i + 1].y + sign * pitch;
    }

    const title = plain(titleForms[0]);
    const eyebrow = plain(beat.eyebrow);
    const caveat = plain([beat.limits].flat()[0]);
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(model) : beat.alt);
    const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note, c.figure]).join(" ");
    const textPerRegister = {
      display: title,
      eyebrow,
      body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${controlText} ${source} ${readings.slice(0, 80).map((r) => r.detail).join(" ")}`,
      axis: `${unit} ${yTicks.map((t) => t.label).join(" ")} ${Object.values(xTicksOf).flat().map((t) => t.label).join(" ")}`,
      annot: `${ends.map((e) => e.text).join(" ")} ${resting.points.map((p) => p.text).join(" ")} ${resting.references.map((r) => r.text ?? "").join(" ")} ${controls.map((c) => c.figure).join(" ")} ${shape.gapLabel}`,
      value: readings.slice(0, 40).map((r) => r.detail).join(" "),
    };
    console.log(`  ${model.series.length} series · ${model.marks.length} readings · resting: ${valid.filter((_, i) => !scheduled.controls.some((c) => c.index === i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);

    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 3,
      async render({ label, direction, outDir }) {
        const furniture = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
        const gutterPx = yTicks.length ? Math.ceil(Math.max(...yTicks.map((t) => labelBoxPx(t.label, regs.axis, measureText, { chip: false }).w)) + 16) : 8;
        const endGutterPx = Math.min(260, Math.ceil(Math.max(0, ...ends.map((e) => labelBoxPx(e.text, { ...regs.annot, fontWeight: 700 }, measureText, { chip: false }).w)) + 18));
        return renderWeb({
          lang,
          component: GestureTimeWeb,
          props: {
            variant,
            shape,
            readings,
            accentSeries,
            resting,
            controls,
            endLabels: sorted,
            yTicks,
            xTicksOf,
            endGutterPx,
            gutterPx,
            restLabel,
            restNotes,
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
          outDir,
          name: `${label}.html`,
        });
      },
    });
    void FRAME;
    void subject;
  });
}
