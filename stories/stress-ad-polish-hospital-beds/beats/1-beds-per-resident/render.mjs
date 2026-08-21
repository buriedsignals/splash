// Beat 1 — hospital beds per 10 000 inhabitants, rendered from the frozen source.
//
// Usage, from the Splash root:
//   bun stories/stress-ad-polish-hospital-beds/beats/1-beds-per-resident/render.mjs
//
// Every number the chart asserts — both rankings, the subject's place in each, the raw count on the
// subject's row, the eight-region average, and every figure in the alt text — is COMPUTED here from
// `source/data.csv` and printed before the render. Nothing is typed.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  deriveFurniture,
  readTypeface,
  useTypeface,
  assertDrawnInActiveTypeface,
  framingMeasurement,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { readVoivodeships, perTenThousand, pl, plInt } from "./beds.ts";
import { HospitalBeds, TYPE } from "./HospitalBeds.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const NAME = "beds-per-resident";

// The credit the journalist recorded at gate 2, in the story's own language, with the effective
// date the hand recorded beside it.
const SOURCE_LINE = "Źródło: Narodowy Fundusz Zdrowia, dane za 2025 r. — stan na 21 sierpnia 2026";

async function run() {
  const all = readVoivodeships(await readFile(join(STORY, "source", "data.csv"), "utf8"));
  console.log(`read ${all.length} voivodeships from source/data.csv`);

  const byRate = [...all].sort((a, b) => perTenThousand(b) - perTenThousand(a));
  const byRaw = [...all].sort((a, b) => b.beds - a.beds);
  console.table(
    byRate.map((r, i) => ({
      "rank per 10k": i + 1,
      voivodeship: r.name,
      "beds per 10k": pl(perTenThousand(r), 2),
      beds: r.beds,
      population: r.population,
      "rank raw": byRaw.findIndex((x) => x.name === r.name) + 1,
    })),
  );

  const rawLeader = byRaw[0];
  const rateLeader = byRate[0];
  console.log(`raw rank:  ${byRaw.map((r) => r.name).join(" > ")}`);
  console.log(`rate rank: ${byRate.map((r) => r.name).join(" > ")}`);

  // THE TWO READINGS, AND THE REFUSAL THAT DEPENDS ON THEM. This beat's standfirst says the raw
  // leader is NOT the leader per inhabitant. If the frozen table ever changed so that the two
  // readings agreed, that sentence would be false — so the render refuses rather than printing it.
  if (rawLeader.name === rateLeader.name)
    throw new Error(
      `this beat's standfirst says the raw leader is not the leader per inhabitant, and in this ` +
        `table ${rawLeader.name} now leads both readings. Rewrite the beat before rendering.`,
    );
  const subject = rawLeader.name;
  const subjectRateRank = byRate.findIndex((r) => r.name === subject) + 1;
  const ahead = byRate.slice(0, subjectRateRank - 1);
  console.log(
    `the two readings DISAGREE at the top: raw ${rawLeader.name} (${plInt(rawLeader.beds)} beds), ` +
      `per inhabitant ${rateLeader.name} (${pl(perTenThousand(rateLeader), 1)} per 10 000). ` +
      `${subject} is ${subjectRateRank} of ${all.length} per inhabitant, behind ${ahead.map((r) => r.name).join(" and ")}.`,
  );

  const totalBeds = all.reduce((sum, r) => sum + r.beds, 0);
  const totalPeople = all.reduce((sum, r) => sum + r.population, 0);
  const average = (totalBeds / totalPeople) * 10000;
  console.log(`eight-region average: ${pl(average, 2)} beds per 10 000 (${totalBeds} / ${totalPeople})`);

  const rows = byRate.map((r) => ({
    name: r.name,
    perTenThousand: perTenThousand(r),
    beds: r.beds,
    population: r.population,
  }));
  console.log("framing:", framingMeasurement(rows.map((r) => r.perTenThousand)));

  const title = `${subject} ma najwięcej łóżek szpitalnych — ale nie na mieszkańca`;
  const standfirst =
    `Łóżka szpitalne na 10 tys. mieszkańców, ${all.length} województw, 2025. ` +
    `${subject} ma ${plInt(rawLeader.beds)} łóżek, najwięcej w kraju, ale jest ${subjectRateRank}. ` +
    `w przeliczeniu na mieszkańca: wyprzedzają je ${ahead.map((r) => `${r.name} (${pl(perTenThousand(r))})`).join(" i ")}. ` +
    `Tabela obejmuje 8 z 16 województw, więc nie da się z niej odczytać pełnego rankingu krajowego.`;
  const subjectNote = `${plInt(rawLeader.beds)} łóżek — najwięcej w kraju, przy ${plInt(rawLeader.population)} mieszkańcach`;
  const averageLabel = `średnia ośmiu województw: ${pl(average)}`;
  const alt =
    `Wykres słupkowy poziomy: liczba łóżek szpitalnych na 10 tys. mieszkańców w ${all.length} ` +
    `województwach w 2025 roku, uporządkowana malejąco. ` +
    byRate.map((r) => `${r.name} ${pl(perTenThousand(r))}`).join(", ") +
    `. Średnia dla tych ośmiu województw wynosi ${pl(average)}. ` +
    `${subject}, wyróżnione kolorem, jest ${subjectRateRank}. mimo że ma ${plInt(rawLeader.beds)} łóżek — ` +
    `najwięcej w kraju.`;
  console.log(`title:      ${title}`);
  console.log(`standfirst: ${standfirst}`);
  console.log(`note:       ${subjectNote}`);
  console.log(`rule:       ${averageLabel}`);
  console.log(`alt:        ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // THE INK THE SEVEN NON-SUBJECT BARS ARE DRAWN IN — decided by rendering both and looking, and
  // it is the one decision on this beat the toolchain could not help with.
  //
  // `deriveFurniture` gives three inks. `grid` (#d1d1d1 on this ground) measures 1.53:1 against
  // white — invisible as a DATA mark under SC 1.4.11's 3:1 non-text floor, which the furniture was
  // never meant to satisfy: it is calibrated for gridlines. `muted` (#616161) measures 6.19:1 and
  // is what this corpus's other ranking beats use for their field — but every one of them draws on
  // a DARK ground, where muted is lighter than the page and the accent is the brightest thing in
  // the frame. On white the order inverts: muted is DARKER than the recorded accent (3.86:1), so
  // seven furniture bars would shout over the one bar that carries the argument.
  //
  // And the compliant middle does not exist here: `adjustToContrast(grid, ground, 3)` is #929292,
  // and `readApart("#5B8A8A", "#929292")` is FALSE — a grey that clears the floor is a grey a
  // reader cannot tell from this accent. The accent is only this pale because the house PRIMARY
  // accent fails outright on a print ground (PALETTE.md), so the choice was made two decisions
  // upstream.
  //
  // Both were rendered and looked at (`probe/`). `grid` won on the picture and loses on the floor,
  // and that trade is stated here rather than hidden: the subject bar and the average rule both
  // clear 3:1, and the field is deliberately a backdrop rather than a set of readings — every one
  // of its values is printed as a number on its own row, so no reading depends on seeing the pale
  // bars at all.
  const fieldInk = deriveFurniture(ground).grid;
  console.log(`field ink ${fieldInk} (furniture "grid"), subject ink ${accent}`);

  const face = useTypeface(readTypeface(HERE, { stopAt: STORY }));
  console.log(`typeface ${face.family} (${face.origin}), from ${face.source}`);

  const size = await readPinnedSize(HERE, { readFile, dirname, join });
  const form = assertTypeMayEnter(TYPE, size, { what: `beat 1 — ${NAME}` });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(HospitalBeds, {
      rows,
      title,
      standfirst,
      source: SOURCE_LINE,
      alt,
      ground,
      accent,
      fieldInk,
      subject,
      subjectNote,
      averageLabel,
      average,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir: join(HERE, "renders"),
    name: NAME,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: `beat 1 — ${NAME}` });
  assertWithinStage(svg, size, { what: `beat 1 — ${NAME}` });
  assertDrawnInActiveTypeface(svg, { where: `beat 1 — ${NAME}` });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it.`);
}

run();
