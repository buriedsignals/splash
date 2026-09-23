// twin/proof/web-small-multiples-solar-eu-six/render-directions-web.mjs
//
// Six European countries' solar SHARE of their own electricity, one panel each, 2010 to 2024.
// Rendered once per FILED DIRECTION into a self-contained interactive page.
//
// THE UNIT IS A SHARE, AND THE FIRST PASS OF THIS PAGE GOT IT WRONG. It printed "TWh" on every
// panel, in its caveat, in all six hover answers and in its own BRIEF. The column is a PERCENTAGE of
// each country's own electricity generation: the static sibling reads the same bytes (md5
// 47afd293940bee564f91047b5664fd6e, byte for byte) and says so in its own first line, and refuses a
// reading outside 0-100 with the message "is not a share of a whole". Germany's real solar
// generation in 2024 is of the order of seventy terawatt-hours, not 14,9. Every unit here is `%`,
// and the derived reading that leaned on the unit — "a passé un TWh" — is re-derived as a share.
//
// Every number a reader sees is computed here, from the frozen file, and asserted here, so the
// browser never formats one (`chart-web/references/directed-interaction.md`, rule 4).
//
// Usage:  bun proof/web-small-multiples-solar-eu-six/render-directions-web.mjs

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
import { DirectedSmallMultiplesWeb } from "./DirectedSmallMultiplesWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Europe";
const COLUMNS = 3;

/** Every country's French name, and the two forms this page's sentences actually need: the name
 *  with its own determiner, lowercase for a list and capitalised to open a sentence. Written out
 *  rather than derived, because "l'Espagne" and "la Pologne" are not a function of anything. */
const NAMES = {
  FRA: { name: "France", det: "la France", Det: "La France" },
  DEU: { name: "Allemagne", det: "l'Allemagne", Det: "L'Allemagne" },
  ITA: { name: "Italie", det: "l'Italie", Det: "L'Italie" },
  POL: { name: "Pologne", det: "la Pologne", Det: "La Pologne" },
  ROU: { name: "Roumanie", det: "la Roumanie", Det: "La Roumanie" },
  ESP: { name: "Espagne", det: "l'Espagne", Det: "L'Espagne" },
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
/** 1re, 2e, 3e — and never the superscript. Neither font scanner reads `ᵉ`, no house family carries
 *  it, and a page that ships one refuses all three directions with a message naming a code point. */
const rank = (n) => (n === 1 ? "1re" : `${n}e`);

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const raw = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { code: c[at("Code")], year: Number(c[at("Year")]), share: Number(c[at("Solar")]) };
});
const years = [...new Set(raw.map((r) => r.year))].sort((a, b) => a - b);
const codes = [...new Set(raw.map((r) => r.code))];
for (const code of codes) if (!NAMES[code]) throw new Error(`${code} has no French name filed`);

const rows = codes
  .map((code) => {
    const series = years.map((year) => {
      const r = raw.find((z) => z.code === code && z.year === year);
      if (!r || !Number.isFinite(r.share))
        throw new Error(`${NAMES[code].name} has no ${year} reading — a panel with a hole is not a multiple`);
      // The static sibling's own guard, held here too: this column is a SHARE OF A WHOLE, and a
      // reading outside 0-100 would mean the column is something else and every word on this page
      // is about the wrong quantity.
      if (r.share < 0 || r.share > 100)
        throw new Error(`${NAMES[code].name} ${year} is ${r.share}, which is not a share of a whole`);
      return { year, value: r.share };
    });
    const before = series[0].value;
    const after = series[series.length - 1].value;
    const passedOne = series.find((s) => s.value >= 1);
    return { code, ...NAMES[code], series, before, after, factor: before > 0 ? after / before : null, passedOne };
  })
  // Ordered by the value the story cares about — the 2024 share, descending — and never
  // alphabetically, which is the ordering the type sheet names as burying the comparison.
  .sort((a, b) => b.after - a.after);

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
if (rows.some((r) => r.after <= r.before))
  throw new Error(
    `the headline says all six rose; ${rows.filter((r) => r.after <= r.before).map((r) => r.name).join(", ")} did not`,
  );
const fastest = rows.reduce((a, b) => ((b.factor ?? 0) > (a.factor ?? 0) ? b : a));
const biggest = rows[0];
const lowest = rows[rows.length - 1];
if (fastest.code !== lowest.code)
  throw new Error(
    `the headline is the tension between the biggest factor and the smallest share; here the fastest ` +
      `is ${fastest.name} and the lowest is ${lowest.name}, which is a different story`,
  );

const ceiling = Math.ceil(Math.max(...rows.map((r) => r.after)));
console.log(
  `${rows.length} pays, ${years.length} années ${years[0]}-${years[years.length - 1]} · part la plus ` +
    `haute ${biggest.name} ${fr(biggest.after)} % · plus forte multiplication ${fastest.name} ` +
    `x${fr(fastest.factor, 0)} (${fr(fastest.before, 2)} -> ${fr(fastest.after)} %) · plafond partagé ${ceiling} %\n`,
);
console.table(
  rows.map((r) => ({
    pays: r.name,
    [years[0]]: fr(r.before, 2),
    [years[years.length - 1]]: fr(r.after),
    facteur: r.factor ? `x${fr(r.factor, 0)}` : "parti de zéro",
  })),
);

// ── WHAT THE GRID CANNOT SAY, DERIVED ─────────────────────────────────────────────────────────
//
// For every ORDERED pair of panels, where the host stands against the guest in each of the fifteen
// years, and where that changes. This is the whole reason the page ships a control: two curves in
// two boxes never meet, so none of this is on any panel.
const seriesOf = (row) => row.series.map((s) => s.value);
const standing = (host, guest) => {
  const h = seriesOf(host);
  const g = seriesOf(guest);
  const above = h.map((v, i) => v > g[i]);
  const turns = [];
  for (let i = 1; i < above.length; i += 1) if (above[i] !== above[i - 1]) turns.push(years[i]);
  // The longest unbroken run the host spent above the guest, with its two ends.
  let best = { length: 0, from: null, to: null };
  let run = 0;
  for (let i = 0; i < above.length; i += 1) {
    run = above[i] ? run + 1 : 0;
    if (run > best.length) best = { length: run, from: years[i - run + 1], to: years[i] };
  }
  return { above, turns, run: best };
};

/** The verdict one panel earns against the carried country — one short line, drawn under that
 *  panel's own baseline. Everything here is a fact about a CROSSING, which is precisely what the
 *  grid's frames make unreachable. */
const verdictOf = (host, guest) => {
  if (host.code === guest.code) return "le pays posé";
  const { above, turns } = standing(host, guest);
  if (turns.length === 0) return above[0] ? `au-dessus les ${years.length} années` : "jamais au-dessus";
  if (turns.length === 1)
    return above[above.length - 1] ? `au-dessus depuis ${turns[0]}` : `au-dessus jusqu'en ${turns[0] - 1}`;
  if (turns.length === 2) {
    const middle = above[years.indexOf(turns[0])];
    return `${middle ? "au-dessus" : "en dessous"} de ${turns[0]} à ${turns[1] - 1}`;
  }
  return `croise en ${turns.slice(0, -1).join(", ")} et ${turns[turns.length - 1]}`;
};

/** The sentence one carried country owes the reader — the counts, the crossings and the longest run.
 *  None of it is drawable: a silhouette shows WHERE two curves meet, not how many did, nor for how
 *  long, nor which of the five never did. */
const noteOf = (guest) => {
  const others = rows.filter((r) => r.code !== guest.code);
  const read = others.map((host) => ({ host, ...standing(host, guest) }));
  const crossers = read.filter((r) => r.turns.length > 0);
  const always = read.filter((r) => r.turns.length === 0 && r.above[0]);
  const never = read.filter((r) => r.turns.length === 0 && !r.above[0]);
  if (crossers.length === 0)
    throw new Error(`nothing ever crosses ${guest.name} — this option answers with the ranking the ceiling prints`);
  const longest = crossers.reduce((a, b) => (b.run.length > a.run.length ? b : a));
  return plain(
    `${guest.Det} : ${fr(guest.after)} % en ${years[years.length - 1]}, ${rank(rows.indexOf(guest) + 1)} des six · ` +
      `${crossers.length} des ${others.length} autres la croisent ` +
      `(${crossers.map((r) => r.host.det).join(", ")}), ${always.length} restent devant, ` +
      `${never.length} jamais · ${longest.host.det} a tenu ${longest.run.length} ans d'affilée, de ` +
      `${longest.run.from} à ${longest.run.to}.`,
  );
};

const panels = rows.map((r, i) => ({
  code: r.code,
  name: r.name,
  series: r.series,
  endLabel: `${fr(r.after)} %`,
  highlight: r.code === biggest.code || r.code === fastest.code,
  detail: plain(
    `${r.name} · ${fr(r.before, 2)} % en ${years[0]}, ${fr(r.after)} % en ${years[years.length - 1]}` +
      (r.factor ? ` · part multipliée par ${fr(r.factor, 0)}` : " · partie de zéro") +
      ` · ${rank(i + 1)} part des six en ${years[years.length - 1]}` +
      (r.passedOne
        ? r.passedOne.year === years[0]
          ? " · déjà au-dessus de 1 % au départ"
          : ` · a passé 1 % en ${r.passedOne.year}`
        : " · n'a jamais atteint 1 %"),
  ),
}));

// ── THE CARRY ─────────────────────────────────────────────────────────────────────────────────
//
// One option per panel, in the panels' own order, so a reader never has to re-learn a list. The
// carried series is the panel's OWN series, handed over by reference: `assertCarryDeclaration`
// refuses anything else, which is the type's one failure mode made mechanical.
const NONE_LABEL = "la grille seule";
const carry = {
  label: "Poser un pays dans les six cadres",
  noneLabel: NONE_LABEL,
  noneAnnounce: `${NONE_LABEL} : six panneaux, une seule échelle, aucune comparaison posée dedans`,
  options: rows.map((guest) => {
    const others = rows.filter((r) => r.code !== guest.code);
    const crossers = others.filter((host) => standing(host, guest).turns.length > 0);
    return {
      key: guest.code,
      label: guest.det,
      announce:
        `Poser ${guest.det} dans les six cadres : ${crossers.length} des ${others.length} autres pays ` +
        `changent de côté face à elle au moins une fois entre ${years[0]} et ${years[years.length - 1]}`,
      note: noteOf(guest),
      series: guest.series,
      verdicts: rows.map((host) => ({ panel: host.code, text: verdictOf(host, guest) })),
    };
  }),
};

console.log("\nverdicts, option by option:");
for (const option of carry.options)
  console.log(
    `  ${option.label.padEnd(14)} ${option.verdicts.map((v) => `${v.panel}=${v.text}`).join(" | ")}`,
  );
console.log("");

const facts = beatFacts(
  rows.map((r) => ({ key: r.code, label: r.name, value: r.after })),
  { subject: biggest.name, declaredSequence: "% de l'électricité" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// The tension is the finding: the country that multiplied its share the most is the one whose panel
// looks flattest, because a factor and a quantity are different questions and a shared scale answers
// only the second.
// SHORTENED BY A PHONE, not by taste. On `nocturne` the display register is set in CAPITALS, and at
// 375 px the first wording — eighty-seven characters — took FIVE lines and 312 px of an 812 px
// window on its own. Measured, not guessed.
const title =
  `${fastest.Det} a multiplié sa part solaire par ${fr(fastest.factor, 0)} et reste la plus plate ` +
  `des six`;
const caveat =
  `Un panneau par pays, part du solaire dans l'électricité produite, en %. Un facteur et une ` +
  `quantité sont deux questions différentes : l'échelle commune ne répond qu'à la seconde, et la ` +
  `platitude d'un panneau EST sa réponse.`;
// SAID ONCE, AT THE LEVEL OF THE WHOLE GRID, which is the type sheet's own repetition rule: the
// unit and the span on twelve panels is not reinforcement, it is the same decoding done twelve
// times. It was also three sentences long until a phone measured it: on `nocturne` the annot
// register is set in capitals, and this line alone was costing the 812 px window four rows of type.
const sharedNote =
  `Partagé : 0 à ${ceiling} %, ${years[0]}-${years[years.length - 1]}. Répété : le nom, la part ` +
  `finale, et le verdict face au pays posé.`;
const readingLine =
  `Lecture : posez un pays dans les six cadres — il entre en silhouette dans chacun, qui dit quand ` +
  `il est passé devant. Survolez ou tabulez un panneau pour ses deux bouts, son facteur et son rang.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${years[0]}-${years[years.length - 1]}`;

const controlText = [
  carry.label,
  carry.noneLabel,
  carry.noneAnnounce,
  ...carry.options.flatMap((o) => [o.label, o.announce, o.note]),
].join(" ");
const verdictText = carry.options.flatMap((o) => o.verdicts.map((v) => v.text)).join(" ");

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${controlText} ${panels.map((p) => p.detail).join(" ")}`,
  axis: `${panels.map((p) => `${p.name} ${p.endLabel}`).join(" ")} ${verdictText}`,
  annot: sharedNote,
  value: panels.map((p) => p.endLabel).join(" "),
};
// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedSmallMultiplesWeb,
      props: {
        panels, columns: COLUMNS, years, ceiling, carry, sharedNote,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Une grille de ${rows.length} panneaux, un par pays, tous à la même échelle de 0 à ` +
          `${ceiling} % et sur les mêmes années. Celui de ${biggest.det} monte de ` +
          `${fr(biggest.before, 2)} à ${fr(biggest.after)} % et remplit son panneau ; celui de ` +
          `${lowest.det} reste une ligne presque plate au bas du sien, à ${fr(lowest.after)} %. Le ` +
          `lecteur peut poser l'un des six en silhouette dans les six cadres : posée ${biggest.det}, ` +
          `${plain(
            standing(rows.find((r) => r.code === "DEU"), biggest).turns.join(" et "),
          )} sont les années où l'Allemagne change de côté face à elle.`,
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
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A RUNNER THAT SWALLOWS A REFUSAL MAKES A REFUSED PAGE LOOK LIKE A PRODUCED ONE, and leaves the
  // previous render on disk to be read as this one.
  process.exitCode = 1;
}
