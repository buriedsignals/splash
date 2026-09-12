// twin/proof/web-dumbbell-life-expectancy-gains/render-directions-web.mjs
//
// Ten countries' life expectancy in 2000 and 2023 as dumbbells, rendered once per FILED DIRECTION
// into a self-contained interactive page.
//
// Usage:  bun proof/web-dumbbell-life-expectancy-gains/render-directions-web.mjs

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
import { DirectedDumbbellWeb } from "./DirectedDumbbellWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Santé · Monde";
const FROM = 2000;
const TO = 2023;
const NAMES = {
  POL: "Pologne", KOR: "Corée du Sud", PRT: "Portugal", ESP: "Espagne", ITA: "Italie",
  FRA: "France", DEU: "Allemagne", GBR: "Royaume-Uni", CHE: "Suisse", USA: "États-Unis",
  JPN: "Japon", SWE: "Suède", NLD: "Pays-Bas", AUT: "Autriche", NOR: "Norvège",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { code: c[at("Code")], year: Number(c[at("Year")]), value: Number(c[header.length - 1]) };
});
const value = (code, year) => all.find((r) => r.code === code && r.year === year)?.value ?? null;
const codes = [...new Set(all.map((r) => r.code))].filter((c) => /^[A-Z]{3}$/.test(c));
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);

const rows = codes
  .map((code) => {
    const before = value(code, FROM);
    const after = value(code, TO);
    if (before === null || after === null)
      throw new Error(`${NAMES[code]} has no reading in ${before === null ? FROM : TO}`);
    return { code, name: NAMES[code], before, after, gain: after - before };
  })
  .sort((a, b) => b.gain - a.gain);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const losers = rows.filter((r) => r.gain <= 0);
if (losers.length)
  throw new Error(`the headline says every country gained years; ${losers.map((r) => r.name).join(", ")} did not`);
const most = rows[0];
const least = rows[rows.length - 1];
const gains = rows.map((r) => r.gain).sort((a, b) => a - b);
const medianGain = gains.length % 2 ? gains[(gains.length - 1) / 2] : (gains[gains.length / 2 - 1] + gains[gains.length / 2]) / 2;
console.log(
  `${rows.length} pays · tous en hausse · plus fort gain ${most.name} +${fr(most.gain)} ans · plus ` +
    `faible ${least.name} +${fr(least.gain)} · gain médian +${fr(medianGain)}\n`,
);
console.table(rows.map((r, i) => ({ rang: i + 1, pays: r.name, [FROM]: fr(r.before), [TO]: fr(r.after), gain: `+${fr(r.gain)}` })));

const shaped = rows.map((r, i) => ({
  code: r.code,
  name: r.name,
  before: r.before,
  after: r.after,
  gain: r.gain,
  beforeLabel: fr(r.before),
  afterLabel: fr(r.after),
  gainLabel: `+${fr(r.gain)}`,
  detail:
    `${r.name} · ${fr(r.before)} ans en ${FROM} → ${fr(r.after)} ans en ${TO} · +${fr(r.gain)} an` +
    `${r.gain >= 2 ? "s" : ""} · ${i + 1}ᵉ gain sur ${rows.length} · ` +
    `${r.gain > medianGain ? "au-dessus" : r.gain < medianGain ? "au-dessous" : "à"} du gain médian ` +
    `(+${fr(medianGain)})`,
}));

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  {
    subject: most.name,
    states: [String(FROM), String(TO)],
    markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })),
    declaredSequence: "années",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const lo = Math.floor(Math.min(...rows.map((r) => r.before)));
const hi = Math.ceil(Math.max(...rows.map((r) => r.after)));
const xTicks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((t) => (t - lo) % 2 === 0);
if (xTicks[xTicks.length - 1] < hi) xTicks.push(hi);

const title = `Les dix ont tous gagné des années de vie depuis ${FROM} — la ${most.name} +${fr(most.gain)}, les ${least.name} +${fr(least.gain)}`;
const caveat =
  `Espérance de vie à la naissance, ${FROM} et ${TO}. La barre entre les deux têtes EST l'écart : ` +
  `un haltère répond à « de combien se sont-ils éloignés », pas à « à quelle distance de zéro », ` +
  `et l'axe est ajusté pour cette raison — il ne part pas de zéro et n'a pas à le faire.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une ligne pour lire les deux niveaux, le gain, le rang du ` +
  `pays parmi les dix et sa position par rapport au gain médian (+${fr(medianGain)} an). Dix lignes ` +
  `ont la place d'une annotation ; le pointeur en a dix.`;
const source = `Source : UN WPP / Our World in Data · espérance de vie à la naissance, ${FROM} et ${TO}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${FROM} ${TO}`,
  axis: `${xTicks.join(" ")} ${rows.map((r) => r.name).join(" ")}`,
  annot: shaped.map((r) => r.gainLabel).join(" "),
  value: shaped.flatMap((r) => [r.beforeLabel, r.afterLabel]).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
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
      component: DirectedDumbbellWeb,
      props: {
        rows: shaped,
        subject: most.code,
        xTicks,
        stateLabels: { before: String(FROM), after: String(TO) },
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Dix haltères horizontaux, un par pays, classés du plus fort au plus faible gain. Chaque ` +
          `barre relie l'espérance de vie de ${FROM} à celle de ${TO}. La ${most.name} gagne le ` +
          `plus, +${fr(most.gain)} ans (${fr(most.before)} → ${fr(most.after)}) ; les ` +
          `${least.name} le moins, +${fr(least.gain)} (${fr(least.before)} → ${fr(least.after)}). ` +
          `Aucune barre ne va vers la gauche.`,
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
