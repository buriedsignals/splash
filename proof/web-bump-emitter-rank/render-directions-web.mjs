// twin/proof/web-bump-emitter-rank/render-directions-web.mjs
//
// The world ranking of annual CO₂ emitters, 1990 to 2024, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// EVERY RANK IS COMPUTED OVER THE WHOLE FILE, not over the six lines drawn: a rank read off a subset
// is not a world rank. The crossings the argument rests on are found by walking the subject's own
// rank series and asking who it passed, never listed by hand.
//
// Usage:  bun proof/web-bump-emitter-rank/render-directions-web.mjs

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
import { DirectedBumpWeb } from "./DirectedBumpWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const SUBJECT = "IND";
const MAX_RANK = 10;
const NAMES = {
  IND: "Inde", USA: "États-Unis", CHN: "Chine", RUS: "Russie", JPN: "Japon", DEU: "Allemagne",
  UKR: "Ukraine", GBR: "Royaume-Uni", IDN: "Indonésie", IRN: "Iran", SAU: "Arabie saoudite",
  KOR: "Corée du Sud", CAN: "Canada", MEX: "Mexique", BRA: "Brésil", TUR: "Turquie",
  ITA: "Italie", FRA: "France", POL: "Pologne", ZAF: "Afrique du Sud", AUS: "Australie",
  ESP: "Espagne", THA: "Thaïlande", VNM: "Viêt Nam", MYS: "Malaisie", EGY: "Égypte",
  KAZ: "Kazakhstan", ARE: "Émirats arabes unis", PAK: "Pakistan", NGA: "Nigeria",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const nameOf = (code, fallback) => NAMES[code] ?? fallback;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => header.indexOf(n);
const rows = csv
  .slice(1)
  .map((line) => {
    const c = line.split(",");
    return { entity: c[at("Entity")], code: c[at("Code")], year: Number(c[at("Year")]), tonnes: Number(c[header.length - 1]) };
  })
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.tonnes));

const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
/** rank[year] = ordered array of rows, best first — computed over EVERY country in the file. */
const table = new Map(years.map((y) => [y, rows.filter((r) => r.year === y).sort((a, b) => b.tonnes - a.tonnes)]));
const rankOf = (code, year) => table.get(year).findIndex((r) => r.code === code) + 1;
const valueOf = (code, year) => table.get(year).find((r) => r.code === code)?.tonnes ?? null;

const first = years[0];
const last = years[years.length - 1];
const topAt = (year, n) => table.get(year).slice(0, n).map((r) => r.code);
const drawn = [...new Set([...topAt(first, 5), ...topAt(last, 5), SUBJECT])];
for (const code of drawn) {
  if (!NAMES[code]) throw new Error(`${code} has no French name filed in this beat`);
  for (const y of years) {
    const r = rankOf(code, y);
    if (r < 1) throw new Error(`${code} is missing from ${y}`);
    if (r > MAX_RANK)
      throw new Error(`${code} falls to rank ${r} in ${y}, past the ${MAX_RANK} rows this frame draws`);
  }
}

const lines = drawn
  .map((code) => ({
    code,
    name: NAMES[code],
    ranks: years.map((y) => rankOf(code, y)),
    startLabel: `${ord(rankOf(code, first))} ${NAMES[code]}`,
    endLabel: `${ord(rankOf(code, last))} ${NAMES[code]}`,
  }))
  .sort((a, b) => a.ranks[0] - b.ranks[0]);

// ── the crossings, found rather than listed ───────────────────────────────────────────────────
const subjectRanks = years.map((y) => rankOf(SUBJECT, y));
const crossings = [];
for (let i = 1; i < years.length; i += 1) {
  if (subjectRanks[i] >= subjectRanks[i - 1]) continue;
  const before = new Set(table.get(years[i - 1]).slice(0, subjectRanks[i - 1] - 1).map((r) => r.code));
  const after = new Set(table.get(years[i]).slice(0, subjectRanks[i] - 1).map((r) => r.code));
  const passed = [...before].filter((c) => !after.has(c));
  for (const code of passed)
    crossings.push({
      year: years[i],
      rank: subjectRanks[i],
      code,
      name: nameOf(code, table.get(years[i]).find((r) => r.code === code)?.entity ?? code),
    });
}
const stillDrawn = crossings.filter((c) => drawn.includes(c.code));

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const from = subjectRanks[0];
const to = subjectRanks[subjectRanks.length - 1];
if (!(to < from))
  throw new Error(`the headline says the subject rose; it went from ${from} to ${to}`);
if (crossings.length < 3)
  throw new Error(`the headline says it passed several countries; it passed ${crossings.length}`);
console.log(
  `${rows.length} lignes · ${years.length} années ${first}-${last} · ${NAMES[SUBJECT]} ${ord(from)} -> ` +
    `${ord(to)} · a dépassé ${crossings.map((c) => `${c.name} (${c.year})`).join(", ")}\n`,
);
console.table(lines.map((l) => ({ pays: l.name, [first]: l.ranks[0], [last]: l.ranks[l.ranks.length - 1] })));

// ── the marks: one per YEAR, and the value the rank hides ──────────────────────────────────────
const marks = years.map((y) => {
  const rank = rankOf(SUBJECT, y);
  const column = table.get(y);
  const above = column[rank - 2];
  const belowRow = column[rank];
  return {
    year: y,
    rank,
    detail:
      `${NAMES[SUBJECT]} · ${y} · ${ord(rank)} mondial · ${fr(valueOf(SUBJECT, y) / 1e9)} Gt` +
      (above ? ` · derrière ${nameOf(above.code, above.entity)}` : " · en tête") +
      (belowRow ? `, devant ${nameOf(belowRow.code, belowRow.entity)}` : ""),
  };
});

const facts = beatFacts(
  lines.map((l) => ({ key: l.code, label: l.name, value: MAX_RANK + 1 - l.ranks[l.ranks.length - 1] })),
  { subject: NAMES[SUBJECT], declaredSequence: "rang mondial" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `L'${NAMES[SUBJECT]} est passée du ${ord(from)} au ${ord(to)} rang mondial des émetteurs de CO₂`;
const caveat =
  `La position verticale est un RANG, jamais une valeur : une ligne qui monte a dépassé quelqu'un, ` +
  `elle n'a pas forcément plus émis. ${lines.length} pays — ceux qui sont dans les cinq premiers en ` +
  `${first} ou en ${last} — sur les ${MAX_RANK} premiers rangs du classement mondial.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une année pour lire le rang de l'${NAMES[SUBJECT]} cette ` +
  `année-là, ce qu'elle a réellement émis, et qui la précédait et la suivait — la valeur que le ` +
  `rang cache, année par année.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${first}-${last}, classement calculé sur les ${table.get(last).length} pays du fichier`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${first} ${years[Math.floor(years.length / 2)]} ${last}`,
  annot: stillDrawn.map((c) => `dépasse ${c.name} · ${c.year}`).join(" "),
  value: lines.map((l) => `${l.startLabel} ${l.endLabel}`).join(" "),
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
      component: DirectedBumpWeb,
      props: {
        lines, years, marks,
        subject: SUBJECT,
        maxRank: MAX_RANK,
        crossings: stillDrawn.map((c) => ({ year: c.year, rank: c.rank, text: `dépasse ${c.name} · ${c.year}` })),
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Six lignes de rang, une par pays, de ${first} à ${last}, rang 1 en haut. La ligne de ` +
          `l'${NAMES[SUBJECT]} part du ${ord(from)} rang et monte jusqu'au ${ord(to)}, en dépassant ` +
          `${stillDrawn.map((c) => `${c.name} en ${c.year}`).join(", ")}. Chaque extrémité porte le ` +
          `nom du pays et son rang écrit en toutes lettres.`,
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
