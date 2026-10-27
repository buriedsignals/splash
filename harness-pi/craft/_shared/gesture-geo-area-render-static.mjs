// The static render every AREA-map gesture kit shares: read and guard the beat (gesture-geo-area-run.mjs), validate
// and compose the gestures onto one plate (gesture-geo-area-static.mjs), choose the direction, render the still
// (GestureGeoAreaStatic.tsx) and print the PNG to look at. No basemap is baked: the plate draws the frozen shapes
// (choropleth, dot map) or the designed grid (cartograms) itself, so a static render spends no MapTiler tile.
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { GestureGeoAreaStatic } from "./GestureGeoAreaStatic.tsx";
import { composeGeoStatic, stageGeo } from "./gesture-geo-area-static.mjs";
import { readGeoBeat, readShapes, REPAIR, refusingGeo } from "./gesture-geo-area-run.mjs";

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Picks the run's direction when one is recorded, else the first composed one that holds for this text. */
export function pickGeoDirection(here, textPerRegister, evidenceLevels) {
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    return { label: labelOf(run.id), direction: resolveDirectionFamilies(run, textPerRegister) };
  }
  const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  const d = composition.offered[0];
  return { label: labelOf(d.id), direction: resolveDirectionFamilies(d, textPerRegister) };
}

export async function renderGeoAreaStatic(here, variant) {
  await refusingGeo(async () => {
    const SIZE = exportSizeFromArgv();
    const FRAME = directedFrame(SIZE);
    assertBeatMayEnter(here, SIZE, { what: basename(here) });
    const { beat, rows, points, geo, claim, titles, limits, reading } = await readGeoBeat(here, variant);
    const format = beat.format;
    const staged = stageGeo({ gestures: beat.gestures, geo, format: "static", claim, repair: REPAIR(), stage: (valid) => composeGeoStatic({ valid, geo, format }) });
    for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r}`);
    const plate = staged.staged;
    const textPerRegister = {
      display: titles.join(" "),
      eyebrow: beat.eyebrow,
      body: `${limits.join(" ")} ${beat.source}`,
      axis: `${rows.map((r) => r.key).join(" ")} ${geo.breaks.map(format).join(" ")} ${beat.unit} ${beat.missingLabel ?? ""}`,
      annot: `${reading.join(" ")} ${plate.notes.map((n) => n.text).join(" ")} ${rows.map((r) => r.name).join(" ")}`,
      value: rows.filter((r) => r.value !== null).map((r) => format(r.value)).join(" "),
    };
    const { label, direction } = pickGeoDirection(here, textPerRegister, beat.evidenceLevels ?? geo.breaks.length + 1);
    const OUT = join(here, "renders");
    const name = nameAtSize(label, SIZE);
    console.log(`  ${geo.marks.length} places · ${staged.valid.map((g) => g.do).join(" · ")} · accent ${plate.accent ?? "none"}`);
    try {
      await renderStill({
        element: createElement(GestureGeoAreaStatic, {
          variant,
          rows,
          shapes: readShapes(here),
          grid: beat.grid,
          points,
          breaks: geo.breaks,
          format,
          plate,
          unit: beat.unit,
          missingLabel: beat.missingLabel ?? "",
          title: titles,
          limits,
          reading,
          source: beat.source,
          alt: typeof beat.alt === "function" ? beat.alt(rows) : beat.alt,
          eyebrow: beat.eyebrow,
          direction,
          frame: { width: FRAME.width, height: FRAME.height },
          onLadder: (note) => console.log(`  ${note}`),
        }),
        width: FRAME.width,
        height: FRAME.height,
        outDir: OUT,
        name,
        scale: FRAME.scale,
      });
    } catch (error) {
      for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
      throw error;
    }
    console.log(`rendered renders/${name}.png`);
    console.log(`look at: ${join(OUT, `${name}.png`)}`);
  });
}
