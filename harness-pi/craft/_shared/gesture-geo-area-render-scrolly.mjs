// The scrolly render every AREA-map gesture kit shares: read and guard the beat (gesture-geo-area-run.mjs), validate
// the gestures (family geo, format scrolly), schedule one card per gesture plus the closing card carrying the limits
// (gesture-geo-area-scrolly.mjs — each card's words checked like a note), measure each state's camera from the
// layout, render the page through the scrolly skill with the self-contained drive, verify it with verify-scrolly, and
// shoot every card. No live tiles: the map is the frozen shapes or the designed grid; it spends no MapTiler tile.
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { GestureGeoAreaScrolly, SCROLLY_FRAME } from "./GestureGeoAreaScrolly.tsx";
import { stageGeo } from "./gesture-geo-area-static.mjs";
import { GEO_APPLY, geoDriveSource, scheduleGeoScrolly } from "./gesture-geo-area-scrolly.mjs";
import { layoutCells, seatsBox } from "./gesture-geo-area-shapes.mjs";
import { assertZoomFactors, readGeoBeat, readShapes, REPAIR } from "./gesture-geo-area-run.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

export async function renderGeoAreaScrolly(here, variant) {
  await refusing(here, async () => {
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const { beat, rows, points, geo, claim, titles, limits } = await readGeoBeat(here, variant);
    const format = (v) => plain(beat.format(v));
    const shapes = readShapes(here);
    const { width: W, height: H } = SCROLLY_FRAME;
    const layout = layoutCells(variant, { rows, shapes, grid: beat.grid, points, box: { x: 0, y: 0, width: W, height: H } });
    // The camera of a state: its close-up framed at the frame's ratio, else the whole map.
    const viewOf = (s) => {
      if (s.camera !== "closeUp" || !s.focus?.length) return { vx: 0, vy: 0, vw: W, vh: H };
      const b = seatsBox(layout.cells, s.focus, Math.max(W, H) * 0.08) ?? { x: 0, y: 0, width: W, height: H };
      const k = Math.max(b.width / W, b.height / H, 0.12);
      return { vx: b.x + b.width / 2 - (W * k) / 2, vy: b.y + b.height / 2 - (H * k) / 2, vw: W * k, vh: H * k };
    };
    const staged = stageGeo({ gestures: beat.gestures, geo, format: "scrolly", claim, repair: REPAIR(), stage: (valid) => {
        assertZoomFactors(valid, (g) => W / viewOf({ camera: "closeUp", focus: g.marks.map(geo.resolve) }).vw);
        return scheduleGeoScrolly({ valid, geo, claim, viewOf });
      } });
    for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r}`);
    const { cards, states } = staged.staged;
    const limitsText = plain(limits[0]);
    const prose = cards.map((c) => (c.prose === null ? [limitsText] : c.limits ? c.prose.map((p) => `${plain(p)} ${limitsText}`) : c.prose.map(plain)));
    const steps = cards.map((c) => c.id);
    const classLabels = geo.classes.map((c, i) => (i === 0 ? `< ${format(geo.breaks[0])}` : i === geo.breaks.length ? `≥ ${format(geo.breaks.at(-1))}` : `${format(c.from)} – ${format(c.to)}`));
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const unit = plain(beat.unit);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(rows) : beat.alt);
    const titleForms = titles.map(plain);
    const textPerRegister = {
      display: titleForms.join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: `${unit} ${classLabels.join(" ")} ${beat.missingLabel ?? ""} ${rows.map((r) => r.key).join(" ")}`,
      annot: rows.map((r) => r.name).join(" "),
      value: geo.marks.map((m) => format(m.value)).join(" "),
    };
    console.log(`  ${geo.marks.length} places · cards: ${steps.join(" · ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatScrolly({
      here,
      states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? geo.breaks.length + 1,
      async render({ label, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(GestureGeoAreaScrolly, {
              variant,
              rows,
              shapes,
              layoutGrid: beat.grid,
              points,
              breaks: geo.breaks,
              format,
              first: states[0],
              classLabels,
              missingLabel: plain(beat.missingLabel ?? ""),
              unit,
              alt,
              regs,
              direction,
              ground: direction.ground,
              ink,
              muted,
            }),
            states,
            driver: geoDriveSource(),
            apply: GEO_APPLY,
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
}
