// THE PROBE BEHIND `render.mjs`'s `fieldInk` DECISION — the two candidates, rendered and looked at.
//
// Usage, from the Splash root:
//   bun stories/stress-ad-polish-hospital-beds/beats/1-beds-per-resident/probe/field-ink.mjs
//
// It draws the same beat twice, changing exactly one value: the ink the seven non-subject bars are
// drawn in. Nothing here is delivered; `renders/` is the beat's own output.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  readTypeface,
  useTypeface,
  deriveFurniture,
  contrast,
  readApart,
  adjustToContrast,
} from "#shared/chart-beat/render-still.mjs";
import { sizeFor } from "#shared/chart-beat/sizes.mjs";
import { readVoivodeships, perTenThousand, pl, plInt } from "../beds.ts";
import { HospitalBeds } from "../HospitalBeds.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const BEAT = join(HERE, "..");
const STORY = join(BEAT, "..", "..");

const all = readVoivodeships(await readFile(join(STORY, "source", "data.csv"), "utf8"));
const byRate = [...all].sort((a, b) => perTenThousand(b) - perTenThousand(a));
const byRaw = [...all].sort((a, b) => b.beds - a.beds);
const subject = byRaw[0].name;
const rank = byRate.findIndex((r) => r.name === subject) + 1;
const ahead = byRate.slice(0, rank - 1);
const average = (all.reduce((s, r) => s + r.beds, 0) / all.reduce((s, r) => s + r.population, 0)) * 10000;
const rows = byRate.map((r) => ({
  name: r.name,
  perTenThousand: perTenThousand(r),
  beds: r.beds,
  population: r.population,
}));

const palette = readPalette(BEAT, { stopAt: STORY });
useTypeface(readTypeface(BEAT, { stopAt: STORY }));
const { ground, accent } = palette;
const { grid, muted } = deriveFurniture(ground);
const compliantGrey = adjustToContrast(grid, ground, 3);

console.log(`ground ${ground}, accent ${accent} (${contrast(accent, ground).toFixed(2)}:1)`);
for (const [name, ink] of [["grid", grid], ["muted", muted], ["grid raised to 3:1", compliantGrey]]) {
  console.log(
    `${name.padEnd(20)} ${ink}  ${contrast(ink, ground).toFixed(2)}:1 against the ground, ` +
      `reads apart from the accent: ${readApart(accent, ink)}`,
  );
}

const { width, height } = sizeFor("landscape");
for (const [name, fieldInk] of [["field-grid", grid], ["field-muted", muted]]) {
  const { pngPath } = await renderStill({
    element: createElement(HospitalBeds, {
      rows,
      title: `${subject} ma najwięcej łóżek szpitalnych — ale nie na mieszkańca`,
      standfirst:
        `Łóżka szpitalne na 10 tys. mieszkańców, ${all.length} województw, 2025. ` +
        `${subject} ma ${plInt(byRaw[0].beds)} łóżek, najwięcej w kraju, ale jest ${rank}. ` +
        `w przeliczeniu na mieszkańca: wyprzedzają je ${ahead.map((r) => `${r.name} (${pl(perTenThousand(r))})`).join(" i ")}.`,
      source: "Źródło: Narodowy Fundusz Zdrowia, dane za 2025 r.",
      alt: "probe",
      ground,
      accent,
      fieldInk,
      subject,
      subjectNote: `${plInt(byRaw[0].beds)} łóżek — najwięcej w kraju`,
      averageLabel: `średnia ośmiu województw: ${pl(average)}`,
      average,
      size: "landscape",
    }),
    width,
    height,
    scale: 1,
    outDir: HERE,
    name,
  });
  console.log(`probe -> ${pngPath}`);
}
