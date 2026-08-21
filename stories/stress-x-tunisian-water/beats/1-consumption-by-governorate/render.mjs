// Beat 1 — water consumption by governorate, rendered from the frozen source.
//
// Usage, from the Splash root:
//   bun stories/stress-x-tunisian-water/beats/1-consumption-by-governorate/render.mjs
//
// Every number the chart asserts — the ranking, the leader's figure, the multiple over the runner
// up, the per-resident ranking the frozen table cannot be asked for, and every figure in the alt
// text — is COMPUTED here from `source/data.csv` and printed before the render. Nothing is typed.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
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
import { readGovernorates, millions, perResident } from "../../water.ts";
import { WaterBars, TYPE } from "./WaterBars.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

// The credit the journalist recorded at gate 2, in the story's own language. It opens with the
// Arabic, deliberately: a run whose FIRST strong character is Latin is laid out as a left-to-right
// paragraph by the rasteriser, which ignores SVG's `direction` attribute, so a credit beginning with
// a Latin organisation name would be drawn the wrong way round with no lever to correct it.
const SOURCE_LINE = "المصدر: الشركة الوطنية للمياه، أرقام السنة المدنية 2025 — بتاريخ 21 أوت 2026";

async function run() {
  const all = readGovernorates(await readFile(join(STORY, "source", "data.csv"), "utf8"));
  console.log(`read ${all.length} governorates from source/data.csv`);

  const ranked = [...all].sort((a, b) => b.consumption - a.consumption);
  console.table(
    ranked.map((r, i) => ({
      rank: i + 1,
      governorate: r.name,
      "million m3": millions(r.consumption),
      residents: r.population,
      "m3 per resident": perResident(r).toFixed(1),
      "cell as frozen": r.raw,
      transliterated: r.transliterated,
    })),
  );

  const leader = ranked[0];
  const runnerUp = ranked[1];
  const ratio = leader.consumption / runnerUp.consumption;
  console.log(
    `raw rank:  ${ranked.map((r) => r.name).join(" > ")}\n` +
      `${leader.name} is ${ratio.toFixed(2)}x ${runnerUp.name}`,
  );

  // THE DENOMINATOR NOBODY DETECTED. `السكان` is a population column typed as a number, and the
  // grounding check's denominator list matches English and French column names only, so no
  // per-resident reading was ever offered at the gate. It is computed here so the beat knows
  // whether the raw ranking it draws survives the other reading — and printed, so a reader of this
  // run can see the answer rather than take it on trust.
  const byRate = [...all].sort((a, b) => perResident(b) - perResident(a));
  console.log(`rate rank: ${byRate.map((r) => r.name).join(" > ")}`);
  const rateAgrees = byRate[0].name === leader.name;
  console.log(
    rateAgrees
      ? `the two readings AGREE at the top: ${leader.name} leads on raw m3 and on m3 per resident ` +
          `(${perResident(leader).toFixed(1)} against ${perResident(runnerUp).toFixed(1)})`
      : `the two readings DISAGREE at the top: raw ${leader.name}, per resident ${byRate[0].name} ` +
          `— the standfirst may not claim the ranking without saying which reading it is`,
  );

  const unreadable = all.filter((r) => r.transliterated);
  if (unreadable.length !== 1)
    throw new Error(
      `this beat's note names ONE transliterated cell and the table now has ${unreadable.length}; ` +
        `rewrite the note before rendering, or the picture states something the data does not`,
    );
  const [unread] = unreadable;
  console.log(`transliterated cell: ${unread.name} — "${unread.raw}" read as ${unread.consumption}`);

  const rows = ranked.map((r) => ({
    name: r.name,
    value: Number(millions(r.consumption)),
    raw: r.transliterated ? r.raw : null,
  }));
  console.log(framingMeasurement(rows.map((r) => r.value)));

  const title = `تستهلك محافظة ${leader.name} أكثر من غيرها من المياه، بواقع ${millions(leader.consumption)} مليون متر مكعب في السنة`;
  const subtitle =
    `الاستهلاك السنوي للمياه بملايين الأمتار المكعبة، سنة 2025، في ${all.length} محافظات. ` +
    `${leader.name} تستهلك ${ratio.toFixed(1)} أضعاف ما تستهلكه ${runnerUp.name}. ` +
    `الجدول لا يغطي كامل الجمهورية، فلا يُقرأ منه ترتيب وطني كامل.`;
  const unreadNote =
    `قيمة ${unread.name} مكتوبة في المصدر بالأرقام الهندية العربية (${unread.raw})، ` +
    `فلم تُقرأ آليًا كعدد. حُوِّلت رقمًا برقم لرسم هذا العمود، ولذلك رُسم بحدود لا بتعبئة.`;
  const alt =
    `رسم بياني بأعمدة أفقية يرتّب ${all.length} محافظات تونسية حسب استهلاك المياه سنة 2025. ` +
    `${leader.name} في المقدمة بـ ${millions(leader.consumption)} مليون متر مكعب، أي ${ratio.toFixed(1)} أضعاف ` +
    `${runnerUp.name} (${millions(runnerUp.consumption)} مليون). ثم ` +
    ranked
      .slice(2)
      .map((r) => `${r.name} ${millions(r.consumption)}`)
      .join("، ") +
    `. عمود ${unread.name} مرسوم بحدود لا بتعبئة لأن قيمته مكتوبة في المصدر بالأرقام الهندية العربية.`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`note:     ${unreadNote}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  const face = useTypeface(readTypeface(HERE, { stopAt: STORY }));
  console.log(`typeface ${face.family} (${face.origin}), from ${face.source}`);

  const size = await readPinnedSize(HERE, { readFile, dirname, join });
  const form = assertTypeMayEnter(TYPE, size, { what: "beat 1 — consumption by governorate" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(WaterBars, {
      rows,
      title,
      subtitle,
      source: SOURCE_LINE,
      alt,
      ground,
      accent,
      subject: leader.name,
      unreadNote,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir: join(HERE, "renders"),
    name: "consumption-by-governorate",
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "beat 1 — consumption by governorate" });
  assertWithinStage(svg, size, { what: "beat 1 — consumption by governorate" });
  assertDrawnInActiveTypeface(svg, { where: "beat 1 — consumption by governorate" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it.`);
}

run();
