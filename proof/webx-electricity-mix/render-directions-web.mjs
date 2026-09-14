// twin/proof/webx-electricity-mix/render-directions-web.mjs
//
// Six countries' 2024 electricity mix, drawn as 100 %-stacked columns and rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// `data.csv` is the frozen OWID export copied from `proof/static-electricity-mix-source/data.csv`,
// the already-verified static sibling — 6 rows, one per country, 2024 only. It is re-verified here
// (row count, the nine source columns, and the two ends of the claim) rather than trusted on sight,
// before the component ever sees it.
//
// Usage:  bun proof/webx-electricity-mix/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedStackedMixWeb } from "./DirectedStackedMixWeb.tsx";
import { fr, STACK_ORDER } from "./stacked-bar-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const YEAR = 2024;
const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const FOSSIL_COLUMNS = ["Gas", "Oil", "Coal"];
const SOURCES = [...RENEWABLE_COLUMNS, "Nuclear", ...FOSSIL_COLUMNS];
const NAMES = { NOR: "Norvège", SWE: "Suède", CHE: "Suisse", DEU: "Allemagne", POL: "Pologne", FRA: "France" };
// THE BAND NAMES ARE ONE WORD EACH, AND WHAT THEY CONTAIN IS IN THE CAVEAT. They read
// "Renouvelables (hydro, éolien, solaire, bio)" and "Fossile (gaz, pétrole, charbon)" until the
// render was measured at 375 px: three legend entries that long wrap to three rows, and on
// `nocturne` — whose display register is 32 px uppercase — that put the source line 39 px below the
// fold, which is the one thing `web-discipline.md` will not have. The composition of each band is a
// sentence, so it went to the sentence.
const BANDS = { renewables: "Renouvelables", nuclear: "Nucléaire", fossil: "Fossile" };

const plain = (s) => plainSpaces(s);

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
  for (const k of SOURCES) o[k] = Number(c[at(k)]);
  return o;
});
if (raw.length !== 6) throw new Error(`expected 6 countries in the frozen file, got ${raw.length}`);

const measured = Object.keys(NAMES).map((code) => {
  const r = raw.find((z) => z.code === code && z.year === YEAR);
  if (!r) throw new Error(`${NAMES[code]} has no ${YEAR} row`);
  const renewablesTwh = RENEWABLE_COLUMNS.reduce((s, k) => s + r[k], 0);
  const fossilTwh = FOSSIL_COLUMNS.reduce((s, k) => s + r[k], 0);
  const nuclearTwh = r.Nuclear;
  const totalTwh = renewablesTwh + nuclearTwh + fossilTwh;
  if (!(totalTwh > 0)) throw new Error(`${NAMES[code]} generates nothing in ${YEAR}`);
  return {
    code,
    name: NAMES[code],
    renewables: (renewablesTwh / totalTwh) * 100,
    nuclear: (nuclearTwh / totalTwh) * 100,
    fossil: (fossilTwh / totalTwh) * 100,
    renewablesTwh,
    nuclearTwh,
    fossilTwh,
    totalTwh,
  };
}).sort((a, b) => b.renewables - a.renewables);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const top = measured[0];
const worst = [...measured].sort((a, b) => b.fossil - a.fossil)[0];
if (top.name !== "Norvège") throw new Error(`expected Norvège to lead renewables, got ${top.name}`);
if (worst.name !== "Pologne") throw new Error(`expected Pologne to lead fossil, got ${worst.name}`);

const countries = measured.map((c) => ({
  ...c,
  label:
    `${c.name} : renouvelables ${fr(c.renewables, 2)} %, nucléaire ${fr(c.nuclear, 2)} %, ` +
    `fossile ${fr(c.fossil, 2)} % — ${fr(c.totalTwh, 0)} TWh produits en ${YEAR}`,
  detail:
    `${c.name} · ${YEAR} · renouvelables ${fr(c.renewables, 2)} % = ${fr(c.renewablesTwh, 1)} TWh · ` +
    `nucléaire ${fr(c.nuclear, 2)} % = ${fr(c.nuclearTwh, 1)} TWh · fossile ${fr(c.fossil, 2)} % = ` +
    `${fr(c.fossilTwh, 1)} TWh · production totale ${fr(c.totalTwh, 1)} TWh`,
}));

console.log(
  `${countries.length} pays en ${YEAR} · ${top.name} mène le renouvelable (${fr(top.renewables, 2)} %) ` +
    `et ${worst.name} le fossile (${fr(worst.fossil, 2)} %)\n`,
);
console.table(
  countries.map((c) => ({
    pays: c.name,
    "renouvelables %": fr(c.renewables, 2),
    "nucléaire %": fr(c.nuclear, 2),
    "fossile %": fr(c.fossil, 2),
    "TWh": fr(c.totalTwh, 1),
  })),
);

// ── THE DERIVED READING THE CONTROL ANSWERS WITH ──────────────────────────────────────────────
// A band's SPREAD across the six — the distance between its longest and its shortest — is exactly
// what a moving floor takes away, and it is printed nowhere on the plate. Derived here, in the
// runner, from the frozen file; the browser never computes one, and the component checks each of
// these numbers against the six bands it actually draws before it will render the option.
const spreadOf = (band) => {
  const ordered = [...countries].sort((a, b) => b[band] - a[band]);
  const high = ordered[0];
  const low = ordered[ordered.length - 1];
  const ties = countries.filter((c) => Math.abs(c[band] - low[band]) < 0.005);
  return { high, low, ties, points: high[band] - low[band] };
};

const rebase = {
  label: "Poser sur la ligne de base",
  noneLabel: "Renouvelables au sol",
  options: ["nuclear", "fossil"].map((band) => {
    const { high, low, ties, points } = spreadOf(band);
    const others =
      ties.length > 1
        ? `${fr(low[band], 2)} % dans ${ties.length} autres pays`
        : `${low.name} ${fr(low[band], 2)} %`;
    return {
      band,
      label: BANDS[band],
      announce:
        `${BANDS[band]} au sol — ${high.name} ${fr(high[band], 1)} %, ${others}, ` +
        `${fr(points, 1)} points d'écart`,
      note:
        `${BANDS[band]} au sol · ${high.name} ${fr(high[band], 2)} % contre ${others} · ` +
        `les six bandes partent enfin d'une même ligne, ce que la base mobile de la plaque interdit`,
      total: `${fr(points, 1)} points d'écart`,
      spreadPoints: points,
    };
  }),
};

const title = `La ${top.name} tire ${fr(top.renewables, 0)} % de son électricité du renouvelable, la ${worst.name} ${fr(worst.fossil, 0)} % du fossile`;
// THE WORDS ARE AS SHORT AS THE WINDOW FIT ALLOWS, and that is a measurement rather than a style.
// At 375 px on `nocturne` — 32 px uppercase display, the tallest header of the three directions —
// each line of prose this block adds costs about 13 px of a budget that has none: the first pass of
// this copy put the source line 39 px under the fold, and the format will not ship a beat the reader
// has to scroll to finish. The composition of each band is here because the legend could not carry
// it; the trap is here in one clause and its remedy is in the reading line.
const caveat =
  `Production d'électricité de six pays en ${YEAR}, répartie entre renouvelables (hydro, éolien, ` +
  `solaire, bio), nucléaire et fossile (gaz, pétrole, charbon). Chaque colonne vaut son propre ` +
  `total : seule la bande du bas part d'une ligne commune aux six.`;
const readingLine =
  `Lecture : posez une autre bande sur cette ligne — les six colonnes pivotent et son épaisseur ` +
  `devient comparable. Survolez ou tabulez une colonne pour ses parts au centième et les TWh.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · production ${YEAR}`;
// grounded-by-hand: alt:100 — "100 %-empilée" names the chart's own construction (each column
// normalised to its own total), not a reading from data.csv. Every share in the sentence below is
// interpolated from the frozen file.
const alt =
  `Colonnes 100 %-empilées : la production d'électricité de six pays en ${YEAR}, répartie entre ` +
  `renouvelables, nucléaire et fossile. La ${top.name} est renouvelable à ${fr(top.renewables, 0)} %, ` +
  `la part la plus élevée des six ; la ${worst.name} tire ${fr(worst.fossil, 0)} % de son ` +
  `électricité du fossile, la part fossile la plus élevée. Le lecteur peut poser le nucléaire ou le ` +
  `fossile sur la ligne de base pour comparer cette bande-là d'un pays à l'autre, et chaque colonne ` +
  `répond au survol avec ses trois parts au centième et les TWh derrière chacune.`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${rebase.label} ${rebase.noneLabel} ` +
    `${rebase.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `0 20 40 60 80 100 % ${Object.values(BANDS).join(" ")} ${countries.map((c) => c.name).join(" ")}`,
  annot: `${countries.map((c) => c.detail).join(" ")}`,
  value: `${countries.flatMap((c) => STACK_ORDER.map((b) => `${Math.round(c[b])} %`)).join(" ")} ${rebase.options.map((o) => o.total).join(" ")}`,
};
// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `Intl.NumberFormat("fr-FR")` emits — refuses every family on the sans ladder and takes
// all three renders down with a message that names the code point and not the string.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

// ── WHAT THIS PAGE EARNS, AND THE TWO CONTROLS THAT EARN IT ───────────────────────────────────
// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Un fixe n'a qu'une ligne de base et l'a déjà dépensée : ses bandes hautes flottent sur un sol " +
    "qui bouge d'un pays à l'autre, et leur épaisseur ne se compare pas. Cette page laisse le " +
    "lecteur poser la bande de son choix sur cette ligne, et lire enfin l'écart que ce type de " +
    "graphique cache par construction.",
  controls: [
    {
      question:
        "La bande nucléaire de la Suède a-t-elle l'air plus épaisse que celle de la Suisse parce " +
        "qu'elle l'est, ou parce qu'elle commence plus bas ?",
      gesture: "toggle-a-comparison",
      changes:
        "Les six colonnes pivotent jusqu'à ce que la bande choisie repose sur la ligne de base : " +
        "ses six longueurs repartent d'un même trait et se lisent sur l'axe. L'entrée de cette " +
        "bande s'allume dans la légende pendant que les deux autres reculent, un joint au fond " +
        "sépare les bandes déplacées, l'écart entre la plus longue et la plus courte s'inscrit au " +
        "sommet de la plus longue, et une phrase en donne les deux bouts.",
    },
    {
      question:
        "Cette bande vaut 1 %, 2 % ou rien du tout ? Et combien de TWh y a-t-il derrière une part " +
        "trop fine pour porter son chiffre ?",
      gesture: "ask-a-mark",
      changes:
        "La colonne répond avec ses trois parts au centième et les TWh derrière chacune, plus la " +
        "production totale du pays pour l'année — les quantités que le pourcentage a divisées, " +
        "qu'aucun axe de cette plaque ne porte, et que les bandes trop fines pour un chiffre " +
        "imprimé n'ont nulle part ailleurs.",
    },
  ],
};

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
      component: DirectedStackedMixWeb,
      props: {
        countries,
        bandLabels: BANDS,
        rebase,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, alt,
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
