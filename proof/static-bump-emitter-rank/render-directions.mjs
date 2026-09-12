// twin/proof/static-bump-emitter-rank/render-directions.mjs
//
// World rank by annual CO₂ emissions, drawn once per filed direction, through the real engine. The
// sixth beat in this tree to go through the design base, and the first whose vertical position is an
// ordinal rather than a quantity.
//
// It also pays a debt: `exits-are-drawn` and the other derived treatments this family proposed were
// filed with `provenBy: not yet rendered — the parent owes this before filing`. This is the render.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-bump-emitter-rank/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedBump } from "./DirectedBump.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

const SLOTS = 10;
const FIRST = 1990;
const LAST = 2024;
const SUBJECT = "India";
const EYEBROW = "Climat · Monde";

const rows = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), value: Number(c[3]) }))
  .filter(
    (r) =>
      /^[A-Z]{3}$/.test(r.code) &&
      Number.isFinite(r.value) &&
      r.year >= FIRST &&
      r.year <= LAST,
  );

const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
/** Who held a slot in each year, and at which rank. This IS the membership the treatment reads. */
const membership = years.map((year) => ({
  key: String(year),
  members: rows
    .filter((r) => r.year === year)
    .sort((a, b) => b.value - a.value)
    .slice(0, SLOTS)
    .map((r) => r.entity),
}));
const rankIn = new Map(
  membership.map((m) => [m.key, new Map(m.members.map((e, i) => [e, i + 1]))]),
);

const everIn = [...new Set(membership.flatMap((m) => m.members))];
const tracks = everIn
  .map((entity) => ({
    entity,
    points: years
      .filter((y) => rankIn.get(String(y)).has(entity))
      .map((y) => ({ year: y, rank: rankIn.get(String(y)).get(entity) })),
    throughout: years.every((y) => rankIn.get(String(y)).has(entity)),
  }))
  // Longest tenure first, so the arbiter meets the entities a reader is most likely to look for
  // before the one-year visitors.
  .sort((a, b) => b.points.length - a.points.length);

const facts = beatFacts(
  tracks.map((t) => ({ key: t.entity, label: t.entity, value: t.points.length })),
  { subject: SUBJECT, namedSeries: everIn, membership },
);
const offered = applicableTreatments(facts);
console.log(
  `${facts.entitiesEver} pays au top ${SLOTS} au moins une fois · ${facts.entitiesThroughout} chaque année · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const india = tracks.find((t) => t.entity === SUBJECT);
const from = india.points[0].rank;
const to = india.points[india.points.length - 1].rank;
// THE COPY IS WRITTEN IN CHARACTERS ITS OWN DIRECTIONS CAN SET, and the first version was not.
// `resolveDirectionFamilies` refused every serif on the ladder — Superclarendon, Iowan Old Style,
// Georgia, Baskerville, Palatino, Times New Roman — because the title carried `CO₂` (U+2082) and
// the French ordinal `ᵉ` (U+1D49), and no face on that ladder covers both. The guard fired before a
// mark was drawn, which is what it is for: a missing glyph is a silent fallback at render time and
// a different typeface in the delivered file.
const title = `L’Inde est passée du ${from}e au ${to}e rang mondial des émetteurs de CO2`;
const limits = `Rang mondial par émissions annuelles de CO2, ${FIRST}–${LAST}. Les ${facts.entitiesEver} pays qui ont occupé une place dans le top ${SLOTS} au moins une fois sont dessinés ; ceux qui en sont sortis s’arrêtent là où ils sont sortis. Le rang est une position, pas une taille — rien ici ne dit de combien.`;
const source =
  "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: years.filter((y) => y % 5 === 0).join(" "),
  annot: everIn.join(" "),
  value: everIn.map((e) => `1 ${e}`).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  await renderStill({
    element: createElement(DirectedBump, {
      tracks,
      years,
      slots: SLOTS,
      subject: SUBJECT,
      title,
      limits,
      source,
      alt: `Graphique de rangs : le rang mondial de ${facts.entitiesEver} pays par émissions annuelles de CO2 entre ${FIRST} et ${LAST}, l’Inde passant du ${from}e au ${to}e.`,
      eyebrow: EYEBROW,
      direction,
      treatments: offered.map((t) => t.id),
    }),
    // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
    width: 960,
    height: 540,
    outDir: OUT,
    name: id,
    scale: 2,
  });
  console.log(`  -> renders/${id}.png\n`);
}
