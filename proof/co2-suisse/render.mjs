// twin/proof/co2-suisse/render.mjs
//
// THE RUNNER THIS BEAT DID NOT HAVE.
//
// `co2-suisse` is beat 1 of the project — the first thing built here, the beat every convention in
// this repository was written against — and until 2026-08-10 it was the one artifact under `proof/`
// that **nothing could reproduce**. `co2-suisse-still.png` sat committed at 1800 x 1120 (a 900 x 560
// element rasterised at `fitTo: width * 2`, the doubled-scale defect) beside a component,
// `EmissionsLine.tsx`, that no script imported: only `render-web.mjs` existed, and it renders the
// WEB genre from `EmissionsWeb.tsx`. A rendered artifact with no producing script is exactly what
// `splash/test/claims-grounded-in-data.test.ts`'s ancestry check exists to forbid — "that is how a
// chart carrying an invented series under a real institution's name survived here" — and this beat
// was passing it only because a script for the OTHER genre happened to sit in the same folder.
//
// Nothing here is invented. Every number comes from `data.csv` beside it (the frozen OWID series,
// filtered to Switzerland), and every WORD comes from `BEAT` in `render-web.mjs` — the journalist's
// own constants, taken from `BRIEF.md` and `STORYBOARD.md`. They are IMPORTED rather than retyped,
// so the static and the web genre can never disagree about what this chart says; that is the same
// reason `render-web.mjs` exports them in the first place.
//
// Usage, from the repository root:  bun proof/co2-suisse/render.mjs [--size <name>]

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { TYPE, EmissionsLine } from "./EmissionsLine.tsx";
import { BEAT, readingsFromCsv } from "./render-web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const data = readingsFromCsv(csv, {
    entity: BEAT.entity,
    firstYear: BEAT.firstYear,
  });
  console.log(
    `read ${data.length} readings from data.csv, ${data[0].year}-${data[data.length - 1].year}`,
  );

  // THE CLAIM, RE-CHECKED AGAINST THE FROZEN FILE ON EVERY RUN. The beat's whole sentence is a
  // CROSSING — 2024 back under the level of 1967 — so a refresh that broke it must stop the render
  // rather than draw a headline the series no longer supports. The reference level itself
  // (`BEAT.reference`) is checked against the 1967 reading it names, which is the number a hand-typed
  // constant is most likely to drift away from.
  const last = data[data.length - 1];
  const nineteenSixtySeven = data.find((d) => d.year === 1967);
  if (!nineteenSixtySeven)
    throw new Error(`data.csv holds no 1967 reading, and the beat's reference level is 1967's`);
  if (Math.abs(nineteenSixtySeven.mt - BEAT.reference) > 0.05)
    throw new Error(
      `BEAT.reference is ${BEAT.reference} Mt, but 1967 reads ${nineteenSixtySeven.mt.toFixed(2)} Mt ` +
        `in data.csv — the reference line would name a level the data does not hold`,
    );
  if (!(last.mt < nineteenSixtySeven.mt))
    throw new Error(
      `the beat states ${last.year} came back UNDER 1967 — the data says ` +
        `${last.mt.toFixed(1)} Mt against ${nineteenSixtySeven.mt.toFixed(1)} Mt`,
    );
  const peak = data.reduce((a, b) => (b.mt > a.mt ? b : a));
  console.log(
    `1967: ${nineteenSixtySeven.mt.toFixed(1)} Mt · peak ${peak.year}: ${peak.mt.toFixed(1)} Mt · ` +
      `${last.year}: ${last.mt.toFixed(1)} Mt — crossing holds`,
  );
  if (!BEAT.peakLabel.includes(String(peak.year)))
    throw new Error(
      `the peak marker says "${BEAT.peakLabel}" but the series peaks in ${peak.year}`,
    );

  console.log(`palette — ground ${BEAT.ground}, accent ${BEAT.accent}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "co2-suisse-still" : `co2-suisse-${size}`;
  if (flag !== -1) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all. A line has a MEASURED aspect range
  // (`proof/aspect-range-probe/ASPECT-VERDICT.md`), so unlike most types it is not refused outright
  // at a tall frame — it is clamped, and `assertPlotAspect` inside the component does the clamping.
  const form = assertTypeMayEnter(TYPE, size, { what: "co2-suisse" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(EmissionsLine, {
      data,
      title: BEAT.title,
      source: BEAT.source,
      alt: BEAT.alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      reference: BEAT.reference,
      referenceLabel: BEAT.referenceLabel,
      peakLabel: BEAT.peakLabel,
      limits: BEAT.limits,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // committed still was 1800 x 1120 precisely because nothing ever passed this.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "co2-suisse" });
  assertWithinStage(svg, size, { what: "co2-suisse" });
  console.log(
    `rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`,
  );
}

main();
