// twin/proof/web-scatter-income-life-expectancy/render-directions-web.mjs
//
// Income against life expectancy across every country with both readings, rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// THE BAND IS MEASURED, NOT DESCRIBED: the low and high ends of life expectancy above the threshold
// are read off the data, and the beat throws if the band above is not much narrower than the spread
// below it.
//
// Usage:  bun proof/web-scatter-income-life-expectancy/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedScatterWeb } from "./DirectedScatterWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Santé · Monde";
const THRESHOLD = 30000;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const dollars = (v) => `${plain(Math.round(v).toLocaleString("fr-FR"))} $`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
/** The file is a real OWID export: a field may be quoted and contain a comma. */
const cells = (line) => {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
};

const rows = csv
  .slice(1)
  .map((line) => {
    const c = cells(line);
    return {
      entity: c[at("Entity")],
      code: c[at("Code")],
      year: Number(c[at("Year")]),
      life: Number(c[at("Life expectancy at birth")]),
      gdp: Number(c[at("GDP per capita")]),
      people: Number(c[at("Population")]),
      region: c[at("World region")],
    };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.life) && Number.isFinite(r.gdp) && r.gdp > 0);
const year = rows[0].year;
if (rows.some((r) => r.year !== year)) throw new Error("the frozen file spans more than one year");

const rich = rows.filter((r) => r.gdp >= THRESHOLD);
const poor = rows.filter((r) => r.gdp < THRESHOLD);
const band = { low: Math.min(...rich.map((r) => r.life)), high: Math.max(...rich.map((r) => r.life)) };
const poorBand = { low: Math.min(...poor.map((r) => r.life)), high: Math.max(...poor.map((r) => r.life)) };

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const spreadRich = band.high - band.low;
const spreadPoor = poorBand.high - poorBand.low;
if (!(spreadRich < spreadPoor * 0.75))
  throw new Error(
    `the headline says the band above ${THRESHOLD} is much narrower; it spans ${fr(spreadRich)} ` +
      `years against ${fr(spreadPoor)} below`,
  );
console.log(
  `${rows.length} pays en ${year} · ${rich.length} au-dessus de ${dollars(THRESHOLD)} : ` +
    `espérance de vie de ${fr(band.low)} à ${fr(band.high)} ans (${fr(spreadRich)} ans d'écart) · ` +
    `${poor.length} en dessous : de ${fr(poorBand.low)} à ${fr(poorBand.high)} (${fr(spreadPoor)})\n`,
);

const maxPop = Math.max(...rows.map((r) => r.people));
const points = rows.map((r) => ({
  code: r.code,
  x: r.gdp,
  y: r.life,
  r: Math.max(2.4, Math.sqrt(r.people / maxPop) * 22),
  detail:
    `${r.entity} · ${fr(r.life)} ans d'espérance de vie · ${dollars(r.gdp)} par personne et par an · ` +
    `${r.region || "région non renseignée"} · ${fr(r.people / 1e6, 1)} millions d'habitants`,
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.entity, value: r.life })),
  { subject: null, declaredSequence: "années" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE DOMAIN IS THE DATA'S OWN, and the ticks live inside it. A tick list chosen by hand set the
// scale's ends, so every country poorer than the first tick or richer than the last was drawn
// OUTSIDE the frame — three pixels of horizontal document scroll at all seven viewports, and, far
// worse, marks a reader could not see.
const gdps = rows.map((r) => r.gdp);
// The ends are the poorest and richest readings themselves, not the decades around them: rounding
// out to 100 $ and 1 000 000 $ left two thirds of the frame empty on a scale where empty space is
// itself a claim about how far apart countries are.
const xMin = Math.min(...gdps);
const xMax = Math.max(...gdps);
const xTicks = [xMin, ...[1000, 3000, 10000, 30000, 100000].filter((v) => v > xMin && v < xMax), xMax].map(
  (v) => ({ value: v, label: dollars(v) }),
);
// Same rule on the other axis: the floor is the data's own, rounded down to a decade.
const yFloor = Math.floor(Math.min(...rows.map((r) => r.life)) / 10) * 10;
const yCeil = Math.ceil(Math.max(...rows.map((r) => r.life)) / 10) * 10;
const yTicks = Array.from({ length: (yCeil - yFloor) / 10 + 1 }, (_, i) => yFloor + i * 10);

const title = `Au-delà de ${dollars(THRESHOLD)} par personne, le revenu n'achète presque plus d'années de vie`;
const caveat =
  `${rows.length} pays en ${year} : le revenu par personne en abscisse, l'espérance de vie à la ` +
  `naissance en ordonnée, la surface du point étant la population. **L'axe des revenus est ` +
  `logarithmique** — chaque graduation vaut environ trois fois la précédente. C'est le mensonge ` +
  `silencieux le plus courant de cette famille, alors la page le dit.`;
const thresholdNote = `${dollars(THRESHOLD)} par personne`;
const bandNote = `Au-dessus : ${rich.length} pays, de ${fr(band.low)} à ${fr(band.high)} ans — ${fr(spreadRich)} ans d'écart. En dessous : ${fr(spreadPoor)}.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un point pour lire le pays, ses deux valeurs, sa région et ` +
  `sa population. Le nuage porte une affirmation sur sa FORME, donc aucun point n'est nommé sur ` +
  `l'image ; la question suivante du lecteur est pourtant toujours « lequel est-ce ».`;
const source = `Source : Our World in Data · espérance de vie et PIB par habitant (dollars internationaux constants), ${year}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat.replace(/\*\*/g, "")} ${readingLine} ${source}`,
  axis: `${xTicks.map((t) => t.label).join(" ")} ${yTicks.join(" ")}`,
  annot: `${thresholdNote} ${bandNote}`,
  value: points.map((p) => fr(p.y)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedScatterWeb,
      props: {
        points, xTicks, yTicks,
        threshold: THRESHOLD,
        thresholdNote,
        bandNote,
        band,
        title, eyebrow: EYEBROW, caveat: caveat.replace(/\*\*/g, ""), source, reading: readingLine,
        alt:
          `Un nuage de ${rows.length} points, un par pays : le revenu par personne en abscisse sur ` +
          `une échelle logarithmique, l'espérance de vie en ordonnée. La courbe du nuage monte très ` +
          `vite jusqu'à environ ${dollars(THRESHOLD)}, puis s'aplatit : au-delà du trait vertical, ` +
          `les ${rich.length} pays tiennent dans une bande de ${fr(spreadRich)} ans ` +
          `(${fr(band.low)} à ${fr(band.high)}), là où les ${poor.length} pays en dessous s'étalent ` +
          `sur ${fr(spreadPoor)} ans.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
