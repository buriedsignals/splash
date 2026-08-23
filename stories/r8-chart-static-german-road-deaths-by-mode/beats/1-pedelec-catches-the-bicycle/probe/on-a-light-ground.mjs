// static-discipline.md, "Verification": look at the PNG on the light ground AND on the dark one.
// This beat ships on the newsroom's own #16191B; this probe redraws the same component on #FFFFFF
// so the ground-derived furniture (ink pole, muted, grid) can be seen doing its job on the other
// side. It writes into probe/ and is NOT the delivered render.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readTypeface, useTypeface, deriveFurniture, contrast } from "#shared/chart-beat/render-still.mjs";
import { sizeFor } from "#shared/chart-beat/sizes.mjs";
import { PedelecCatchesTheBicycle } from "../PedelecCatchesTheBicycle.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..", "..");
const { years, pedelec, bicycle } = JSON.parse(await readFile(join(HERE, "..", "data.json"), "utf8"));
useTypeface(readTypeface(STORY, { stopAt: STORY }));

for (const ground of ["#FFFFFF", "#16191B"]) {
  const { ink, muted, grid } = deriveFurniture(ground);
  console.log(
    `${ground}: ink ${ink} (${contrast(ink, ground).toFixed(2)}:1), muted ${muted} ` +
      `(${contrast(muted, ground).toFixed(2)}:1), grid ${grid}, accent #D4A853 ` +
      `(${contrast("#D4A853", ground).toFixed(2)}:1)`,
  );
  const { width, height } = sizeFor("landscape");
  const { pngPath } = await renderStill({
    element: createElement(PedelecCatchesTheBicycle, {
      years, pedelec, bicycle,
      title: "Germany's rise in cyclist deaths is all pedelecs: 36 riders killed in 2015, 214 in 2025",
      note: "People killed in German road traffic, by what they were riding, 2014 to 2025. The statistic counts pedelecs separately only from 2014; before that every bicycle was one column, so no series here reaches further back. Deaths, not risk: the road-accident statistic records no distance ridden.",
      source: "Source: Statistisches Bundesamt (Destatis), Verkehrsunfälle Zeitreihen, table 46241-11 — as of 7 July 2026",
      alt: "probe render",
      ground,
      accent: "#D4A853",
      size: "landscape",
    }),
    width, height, scale: 1, outDir: HERE,
    name: `on-${ground.replace("#", "").toLowerCase()}`,
  });
  console.log(`  -> ${pngPath}`);
}
