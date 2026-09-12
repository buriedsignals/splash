// twin/proof/web-sankey-electricity-sources/render-directions-web.mjs
//
// Nine sources flowing into six countries' 2024 electricity, rendered once per FILED DIRECTION.
//
// CONSERVATION IS THE FORM'S OWN PROMISE, so it is the thing the runner checks: every node's total
// equals the sum of its own ribbons, on both sides, before a ribbon is drawn.
//
// Usage:  bun proof/web-sankey-electricity-sources/render-directions-web.mjs

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
import { DirectedSankeyWeb, FRAME } from "./DirectedSankeyWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const SOURCES = [
  ["Nuclear", "nucléaire"], ["Hydropower", "hydraulique"], ["Wind", "éolien"], ["Gas", "gaz"],
  ["Coal", "charbon"], ["Solar", "solaire"], ["Bioenergy", "biomasse"],
  ["Other renewables", "autres renouv."], ["Oil", "pétrole"],
];
const NAMES = { FRA: "France", DEU: "Allemagne", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };
const GAP = 8;
const MIN_RIBBON = 0.6;

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  const o = { code: c[at("Code")], year: Number(c[at("Year")]) };
  for (const [k] of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});

const countries = Object.keys(NAMES).map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  return { code, name: NAMES[code], by: Object.fromEntries(SOURCES.map(([k]) => [k, r[k]])) };
});
const grand = countries.reduce((s, c) => s + SOURCES.reduce((t, [k]) => t + c.by[k], 0), 0);
const bySource = SOURCES.map(([key, name]) => ({
  key,
  name,
  total: countries.reduce((s, c) => s + c.by[key], 0),
})).sort((a, b) => b.total - a.total);
const byCountry = countries
  .map((c) => ({ ...c, total: SOURCES.reduce((s, [k]) => s + c.by[k], 0) }))
  .sort((a, b) => b.total - a.total);

// ── CONSERVATION, CHECKED ─────────────────────────────────────────────────────────────────────
for (const s of bySource) {
  const sum = countries.reduce((t, c) => t + c.by[s.key], 0);
  if (Math.abs(sum - s.total) > 1e-9) throw new Error(`${s.name}'s ribbons sum to ${sum}, its node says ${s.total}`);
}
for (const c of byCountry) {
  const sum = SOURCES.reduce((t, [k]) => t + c.by[k], 0);
  if (Math.abs(sum - c.total) > 1e-9) throw new Error(`${c.name}'s ribbons sum to ${sum}, its node says ${c.total}`);
}

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const biggest = bySource[0];
const holder = [...countries].sort((a, b) => b.by[biggest.key] - a.by[biggest.key])[0];
const holderShare = (holder.by[biggest.key] / biggest.total) * 100;
if (!(holderShare > 80))
  throw new Error(`the headline says one country holds four fifths of the largest source; it holds ${fr(holderShare)} %`);
console.log(
  `${countries.length} pays · ${fr(grand)} TWh · source la plus grosse : ${biggest.name} ` +
    `${fr(biggest.total)} TWh, dont ${fr(holderShare)} % en ${holder.name}\n`,
);
console.table(bySource.map((s) => ({ source: s.name, TWh: fr(s.total), "% du total": fr((s.total / grand) * 100) })));

// ── geometry ──────────────────────────────────────────────────────────────────────────────────
const scale = (FRAME.height - GAP * Math.max(bySource.length, byCountry.length - 1)) / grand;
const nodes = [];
const cursors = { 0: 0, 1: 0 };
const nodeTop = {};
bySource.forEach((s, i) => {
  const h = s.total * scale;
  nodeTop[`s:${s.key}`] = cursors[0];
  nodes.push({ key: `s:${s.key}`, name: s.name, side: 0, y: cursors[0], h, label: `${s.name} · ${fr(s.total, 0)} TWh`, tone: i });
  cursors[0] += h + GAP;
});
byCountry.forEach((c, i) => {
  const h = c.total * scale;
  nodeTop[`c:${c.code}`] = cursors[1];
  nodes.push({ key: `c:${c.code}`, name: c.name, side: 1, y: cursors[1], h, label: `${c.name} · ${fr(c.total, 0)} TWh`, tone: i });
  cursors[1] += h + GAP;
});

const ribbons = [];
const offsetLeft = Object.fromEntries(bySource.map((s) => [s.key, nodeTop[`s:${s.key}`]]));
const offsetRight = Object.fromEntries(byCountry.map((c) => [c.code, nodeTop[`c:${c.code}`]]));
let hidden = 0;
let hiddenTwh = 0;
bySource.forEach((s, si) => {
  for (const c of byCountry) {
    const v = c.by[s.key];
    const w = v * scale;
    if (w < MIN_RIBBON) {
      if (v > 0) {
        hidden += 1;
        hiddenTwh += v;
      }
      continue;
    }
    ribbons.push({
      key: `${s.key}-${c.code}`,
      from: s.name,
      to: c.name,
      y0: offsetLeft[s.key],
      y1: offsetRight[c.code],
      w,
      tone: si,
      detail:
        `${s.name} → ${c.name} · ${fr(v)} TWh · ${fr((v / s.total) * 100)} % de tout le ${s.name} ` +
        `des six · ${fr((v / c.total) * 100)} % de l'électricité ${c.name === "France" ? "française" : `de ${c.name}`}`,
    });
    offsetLeft[s.key] += w;
    offsetRight[c.code] += w;
  }
});

const facts = beatFacts(
  bySource.map((s) => ({ key: s.key, label: s.name, value: s.total })),
  { subject: biggest.name, declaredSequence: "TWh" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `Le ${biggest.name} est la première source d'électricité de ces six pays — et ${fr(holderShare, 0)} % de ce ${biggest.name} sort de ${holder.name === "France" ? "la France" : holder.name}`;
const caveat =
  `${fr(grand, 0)} TWh produits en ${YEAR} par six pays européens à partir de neuf sources. Chaque ` +
  `nœud porte SON PROPRE total : la promesse d'un sankey est la conservation, et un nœud qui ` +
  `n'écrit pas son total demande à être cru plutôt qu'à être vérifié. Les rubans sont translucides, ` +
  `donc un croisement se lit comme un croisement et non comme un ordre d'empilement.`;
const remainder =
  hidden > 0
    ? `${hidden} liaisons trop fines pour être dessinées à cette échelle ne le sont pas : elles ` +
      `pèsent ${fr(hiddenTwh)} TWh au total, soit ${fr((hiddenTwh / grand) * 100, 2)} % de l'ensemble.`
    : null;
const readingLine =
  `Lecture : survolez, touchez ou tabulez un ruban pour lire ses deux extrémités, ses TWh, sa part ` +
  `de la source qu'il quitte et sa part du pays où il entre. Une largeur de ruban est une quantité ` +
  `que personne ne sait mesurer, surtout parmi cinquante qui se croisent.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: nodes.map((n) => n.label).join(" "),
  annot: remainder ?? `${fr(grand, 0)} TWh`,
  value: bySource.map((s) => fr(s.total, 0)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      component: DirectedSankeyWeb,
      props: {
        nodes, ribbons,
        tones: Math.max(bySource.length, byCountry.length),
        remainder,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Neuf blocs de sources à gauche, six blocs de pays à droite, reliés par des rubans dont la ` +
          `largeur est une quantité d'électricité. Le bloc du ${biggest.name} est le plus haut à ` +
          `gauche (${fr(biggest.total, 0)} TWh) et presque tout son ruban part vers ` +
          `${holder.name} : ${fr(holderShare, 0)} %. ${byCountry[1].name}, deuxième producteur, ne ` +
          `reçoit aucun ruban de ce bloc.`,
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
