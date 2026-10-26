// beat.mjs for the worked example proof/static-income-life-expectancy — "Beyond $30,000 per person,
// life expectancy fits in a band three times narrower". Every number on the plate is COMPUTED from
// data.json; the break is declared (editorial), the spreads on each side are arithmetic.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, LIFE, GDP] = [col("Code"), col("Life expectancy at birth"), col("GDP per capita")];

// The points: one { x, y } per country that has both measures (aggregates have no 3-letter code).
const points = table.rows
  .map((r) => ({ code: r[CODE], x: Number(r[GDP]), y: Number(r[LIFE]) }))
  .filter((p) => /^[A-Z]{3}$/.test(p.code ?? "") && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > 0)
  .map(({ x, y }) => ({ x, y }));

// The declared break, and the spread of y on each side of it.
const breakAt = 30000;
const side = (keep) => {
  const ys = points.filter(keep).map((p) => p.y);
  return { count: ys.length, range: Math.max(...ys) - Math.min(...ys) };
};
const below = side((p) => p.x < breakAt);
const above = side((p) => p.x >= breakAt);
const ratio = below.range / above.range;

// A plain space as thousands separator: the glyph guard refuses U+00A0 / U+202F on the serif ladder.
const money = (v) => `${v.toLocaleString("fr-FR").replace(/[  ]/g, " ")} $`;

export default {
  eyebrow: "Santé · Monde",
  points,
  breakAt,
  belowNote: `${below.count} pays sous ${money(breakAt)} · ${below.range.toFixed(0)} ans d’écart`,
  aboveNote: `${above.count} au-dessus · ${above.range.toFixed(0)} ans`,
  xName: "PIB par habitant",
  xQualifier: "(échelle logarithmique)",
  yName: "Espérance de vie à la naissance",
  yQualifier: "(années)",
  xLog: true,
  xTicks: [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000],
  xTick: (v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`),
  // The headline in forms, longest first: the renderer takes the longest that fits.
  title: [
    `Au-delà de 30 000 $ par personne, l’espérance de vie tient dans une bande 3 fois plus étroite`,
    `Au-delà de ${money(breakAt)}, l’espérance de vie tient dans une bande ${Math.round(ratio)} fois plus étroite`,
    `Au-delà de ${money(breakAt)}, l’espérance de vie se resserre`,
  ],
  limits: [
    `${points.length} pays disposant des deux mesures en 2021. Corrélation, pas causalité — les systèmes de santé, les conflits et les maladies évoluent aussi indépendamment du revenu.`,
    `${points.length} pays en 2021. Corrélation, pas causalité.`,
  ],
  source: "Source : Banque mondiale via Gapminder, ONU WPP (2024), via Our World in Data",
  alt: `Nuage de points du PIB par habitant contre l’espérance de vie pour ${points.length} pays en 2021, échelle logarithmique. Sous ${money(breakAt)}, ${below.count} pays s’étalent sur ${below.range.toFixed(0)} ans ; au-dessus, ${above.count} pays sur ${above.range.toFixed(0)} ans.`,
  // Three levels: the cloud, the break, the spread on each side.
  evidenceLevels: 3,
  check() {
    if (Math.round(ratio) !== 3)
      throw new Error(`the band above ${breakAt} is ${ratio.toFixed(2)} times narrower than below, not 3`);
  },
};
