// twin/proof/static-income-life-expectancy/render-directions.mjs
//
// Income against life expectancy, drawn once per filed direction, through the real engine. The
// fifth beat in this tree to go through the design base, and the first whose marks are points.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-income-life-expectancy/render-directions.mjs

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
import { DirectedScatter } from "./DirectedScatter.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");

/** The editorial break. A cloud has no natural knee, so the BEAT declares it and the treatment
 *  draws it — the same division of labour `crossing-marked`'s reference level has. */
const BREAK = 30000;
const EYEBROW = "Santé · Monde";
const X_NAME = "PIB par habitant";
const X_QUALIFIER = "(échelle logarithmique)";
const Y_NAME = "Espérance de vie à la naissance";
const Y_QUALIFIER = "(années)";

const pairs = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ code: c[1], y: Number(c[3]), x: Number(c[4]) }))
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.x) && Number.isFinite(r.y) && r.x > 0)
  .map(({ x, y }) => ({ x, y }));

const facts = beatFacts(
  pairs.map((p, i) => ({ key: String(i), value: p.y })),
  {
    subject: "monde",
    pairs,
    breakAt: BREAK,
    // The two apparatus labels this beat declares as having a subordinate part.
    qualifiedApparatus: [X_NAME, Y_NAME],
  },
);
const offered = applicableTreatments(facts);
const spread = facts.spreadEachSideOfBreak;
console.log(`${pairs.length} pays · treatments applicable: ${offered.map((t) => t.id).join(", ")}`);
console.log(
  `spread derived from the data: below ${spread.below.count} pays ${spread.below.lo.toFixed(1)}–${spread.below.hi.toFixed(1)} (${spread.below.range.toFixed(1)}) · above ${spread.above.count} pays ${spread.above.lo.toFixed(1)}–${spread.above.hi.toFixed(1)} (${spread.above.range.toFixed(1)})\n`,
);

// A ratio of 2.96 is "3 fois" in a headline, not "3.0 fois" — and French writes a comma, not a
// point, on the days it needs a decimal at all.
const ratio = spread.below.range / spread.above.range;
const times =
  Math.abs(ratio - Math.round(ratio)) < 0.15
    ? String(Math.round(ratio))
    : ratio.toFixed(1).replace(".", ",");
/** THE THRESHOLD IS INTERPOLATED, NOT TYPED, and this is a defect this beat had already paid for
 *  once: `render.mjs`'s own comment records that "the title stated the band's low end as its own
 *  literal, beside the constant that defines it — move the band and the headline would have kept
 *  naming the old figure". This file retyped it as `30 000 $` and `claims-grounded-in-data` caught
 *  it the moment that guard learned to read directed render scripts. */
/** A PLAIN space, not the narrow no-break space `fr-FR` returns and not U+00A0: the glyph guard
 *  walks the serif ladder for every character a register has to set, and no face on it covers
 *  U+00A0 — Superclarendon, Iowan Old Style, Georgia, Baskerville, Palatino and Times New Roman
 *  were all refused, before a mark was drawn. Inside a single text run a plain space is not
 *  collapsed, so the thousands separator survives. */
const money = (v) => `${v.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} $`;
const title = `Au-delà de ${money(BREAK)} par personne, l’espérance de vie tient dans une bande ${times} fois plus étroite`;
const limits = `${pairs.length} pays disposant des deux mesures en 2021. Corrélation, pas causalité — les systèmes de santé, les conflits et les maladies évoluent aussi indépendamment du revenu.`;
const source = "Source : Banque mondiale via Gapminder, ONU WPP (2024), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: `${X_NAME} ${X_QUALIFIER} ${Y_NAME} ${Y_QUALIFIER} $500 $1k $100k 40 90`,
  annot: `${spread.below.count} pays sous ${money(BREAK)} · ${spread.below.range.toFixed(0)} ans d’écart au-dessus`,
  value: "",
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
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
    element: createElement(DirectedScatter, {
      pairs,
      breakAt: BREAK,
      spread,
      xName: X_NAME,
      xQualifier: X_QUALIFIER,
      yName: Y_NAME,
      yQualifier: Y_QUALIFIER,
      title,
      limits,
      source,
      alt: `Nuage de points du PIB par habitant contre l’espérance de vie pour ${pairs.length} pays en 2021, échelle logarithmique.`,
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
