// twin/proof/web-bump-emitter-rank/render-directions-web.mjs
//
// The world ranking of annual CO₂ emitters, 1990 to 2024, rendered once per FILED DIRECTION into a
// self-contained interactive page.
//
// EVERY RANK IS COMPUTED OVER THE WHOLE FILE, not over the six lines drawn: a rank read off a subset
// is not a world rank. The crossings are found by walking a country's own rank series and asking who
// left or joined the set above it, never listed by hand — and that is true of the five FOLLOWABLE
// lines as much as of the subject's, which is what lets this page name the countries it does not
// draw.
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
import { followRuns, assertFollowChangesThePicture } from "../../skills/chart-web/assets/follow.ts";
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
/** The same names with their article, for a sentence rather than a column heading. Written out
 *  rather than derived: French articles are not a function of the string, and a rule that guessed
 *  would be wrong on "les États-Unis" and on every name beginning with a vowel. */
const THE = {
  IND: "l'Inde", USA: "les États-Unis", CHN: "la Chine", RUS: "la Russie", JPN: "le Japon",
  DEU: "l'Allemagne", UKR: "l'Ukraine", GBR: "le Royaume-Uni", IDN: "l'Indonésie", IRN: "l'Iran",
  SAU: "l'Arabie saoudite", KOR: "la Corée du Sud", CAN: "le Canada", MEX: "le Mexique",
  BRA: "le Brésil", TUR: "la Turquie", ITA: "l'Italie", FRA: "la France", POL: "la Pologne",
  ZAF: "l'Afrique du Sud", AUS: "l'Australie", ESP: "l'Espagne", THA: "la Thaïlande",
  VNM: "le Viêt Nam", MYS: "la Malaisie", EGY: "l'Égypte", KAZ: "le Kazakhstan",
  ARE: "les Émirats arabes unis", PAK: "le Pakistan", NGA: "le Nigeria",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const ord = (n) => (n === 1 ? "1er" : `${n}e`);
const nameOf = (code, fallback) => NAMES[code] ?? fallback;
const theOf = (code, fallback) => THE[code] ?? nameOf(code, fallback);

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
  if (!THE[code]) throw new Error(`${code} has no articled French name filed in this beat`);
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

/**
 * ── THE CROSSINGS, FOUND RATHER THAN LISTED ───────────────────────────────────────────────────
 *
 * For ANY country, not just the subject: who was above it last year and is not this year (it passed
 * them), and who is above it this year and was not last year (they passed it). Both directions,
 * because the whole point of the follow control is that the interesting half of a falling line's
 * story is the second one — and the countries in it mostly have no line on this chart.
 */
function walkOf(code) {
  const positions = years.map((y) => rankOf(code, y));
  const crossings = [];
  for (let i = 1; i < years.length; i += 1) {
    const before = new Set(table.get(years[i - 1]).slice(0, positions[i - 1] - 1).map((r) => r.code));
    const after = new Set(table.get(years[i]).slice(0, positions[i] - 1).map((r) => r.code));
    for (const other of [...before].filter((c) => !after.has(c)))
      crossings.push({ year: years[i], rank: positions[i], code: other, direction: "passed" });
    for (const other of [...after].filter((c) => !before.has(c)))
      crossings.push({ year: years[i], rank: positions[i], code: other, direction: "overtaken" });
  }
  return { positions, crossings };
}

const subjectWalk = walkOf(SUBJECT);
const subjectRanks = subjectWalk.positions;
const crossings = subjectWalk.crossings
  .filter((c) => c.direction === "passed")
  .map((c) => ({ ...c, name: nameOf(c.code, table.get(c.year).find((r) => r.code === c.code)?.entity ?? c.code) }));
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

/**
 * ── THE FOLLOW: THE FIVE LINES THE PLATE LEAVES ANONYMOUS ─────────────────────────────────────
 *
 * The subject is deliberately absent. Its line is the claim — accented, ringed and captioned in
 * every state this page can be put into — and `directed-interaction.md` rule 5 says nothing
 * argument-bearing sits behind a control. `assertFollowDeclaration` is handed its key and refuses an
 * option that names it, so that is enforced rather than remembered.
 *
 * Every string below is DERIVED. The run-length walk comes back from `followRuns` rather than being
 * typed, which is the one discipline `types/bump.md` insists on for this type; the crossings come
 * from `walkOf`; and the count of partners this chart does not draw is read off `drawn`.
 */
const STEPS = years.map((y) => String(y));
const followOptions = lines
  .filter((l) => l.code !== SUBJECT)
  .map((l) => {
    const { positions, crossings: events } = walkOf(l.code);
    const runs = followRuns(STEPS, positions);
    const walk = runs
      .map((run) => `${ord(run.position)} ${run.from === run.to ? `en ${run.from}` : `de ${run.from} à ${run.to}`}`)
      .join(", ");
    const net = positions[positions.length - 1] - positions[0];
    const moved =
      net === 0
        ? "même rang qu'en " + first
        : net < 0
          ? `${-net} rang${-net > 1 ? "s" : ""} gagné${-net > 1 ? "s" : ""}`
          : `${net} rang${net > 1 ? "s" : ""} perdu${net > 1 ? "s" : ""}`;
    // The two directions, worded so that neither needs a past participle: a French participle agrees
    // with its subject, and a sentence template that agreed with one country would be wrong on the
    // next. "dépasse" and "se fait dépasser" are invariable.
    const said = (c) =>
      `${c.direction === "passed" ? "dépasse" : "se fait dépasser par"} ${theOf(c.code, table.get(c.year).find((r) => r.code === c.code)?.entity ?? c.code)}`;
    const ahead = events.filter((c) => c.direction === "passed");
    const behind = events.filter((c) => c.direction === "overtaken");
    const listed = (set) => set.map((c) => `${theOf(c.code, c.code)} (${c.year})`).join(", ");
    const partners = [...new Set(events.map((c) => c.code))];
    const undrawn = partners.filter((code) => !drawn.includes(code));
    const sentences = [
      `${THE[l.code].replace(/^l'/, "L'").replace(/^(le|la|les) /, (m) => m[0].toUpperCase() + m.slice(1))} : ${walk} — ${moved}.`,
      behind.length ? `Se fait dépasser par ${listed(behind)}.` : "",
      ahead.length ? `Dépasse ${listed(ahead)}.` : "",
      undrawn.length
        ? `${undrawn.length} de ces pays ${undrawn.length > 1 ? "n'ont" : "n'a"} aucune ligne sur ce graphique.`
        : "",
    ].filter(Boolean);
    return {
      key: l.code,
      label: THE[l.code],
      announce: `Suivre ${THE[l.code]} de ${first} à ${last}`,
      note: plain(sentences.join(" ")),
      positions,
      crossings: events.map((c) => ({
        step: String(c.year),
        other: theOf(c.code, c.code),
        direction: c.direction,
        text: plain(`${c.year} · ${said(c)}`),
      })),
    };
  });
const follow = {
  label: "Suivre une ligne",
  noneLabel: `Les ${lines.length} lignes`,
  steps: STEPS,
  options: followOptions,
};
console.log(
  `follow: ${follow.options.length} options · ${follow.options.reduce((n, o) => n + o.crossings.length, 0)} croisements · ` +
    `${[...new Set(follow.options.flatMap((o) => o.crossings.map((c) => c.other)))].length} pays nommés\n`,
);

const facts = beatFacts(
  lines.map((l) => ({ key: l.code, label: l.name, value: MAX_RANK + 1 - l.ranks[l.ranks.length - 1] })),
  { subject: NAMES[SUBJECT], declaredSequence: "rang mondial" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `L'${NAMES[SUBJECT]} est passée du ${ord(from)} au ${ord(to)} rang mondial des émetteurs de CO₂`;
// The words are never squeezed to make the chart fit — the chart is (`render-web.mjs`, .chart-plot).
// So the caveat and the reading line are held to what they have to say and no longer: at 375 px each
// extra sentence is two lines, and two lines come straight off the plot's own height.
const caveat =
  `La position verticale est un RANG, jamais une valeur : une ligne qui monte a dépassé quelqu'un, ` +
  `elle n'a pas forcément plus émis. ${lines.length} pays — les cinq premiers en ${first} ou en ` +
  `${last} — sur les ${MAX_RANK} premiers rangs mondiaux ; les rangs vides sont tenus par des pays ` +
  `que ce graphique ne dessine pas.`;
const readingLine =
  `Lecture : survolez ou tabulez une année pour le rang de l'${NAMES[SUBJECT]}, ce qu'elle a émis ` +
  `et ses voisins au classement. Suivez une ligne pour lire son rang année après année et chaque ` +
  `pays qui la dépasse — y compris ceux qui n'ont aucune ligne ici.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${first}-${last}, classement calculé sur les ${table.get(last).length} pays du fichier`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${follow.label} ${follow.noneLabel} ${follow.options
    .map((o) => `${o.label} ${o.announce} ${o.note}`)
    .join(" ")}`,
  axis: `${first} ${years[Math.floor(years.length / 2)]} ${last} ${lines.map((l) => l.startLabel).join(" ")}`,
  annot: stillDrawn.map((c) => `dépasse ${c.name} · ${c.year}`).join(" "),
  value: lines.map((l) => l.endLabel).join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

/**
 * THE INTERACTION, WRITTEN BEFORE THE CODE AND CARRIED INTO THE RENDER. `BRIEF.md` holds the same
 * two controls in full. `assertInteractionPlan` matches what is declared against what the markup
 * ships — for the `ask` control; it knows five control kinds and this page's second one is an eighth
 * vocabulary it cannot see, so the refusal for that one ships with the vocabulary
 * (`assertFollowChangesThePicture`, called on the delivered file below).
 */
const interaction = {
  earns:
    `Ten rank rows are ten places in the world and this plate draws six lines on them, so a line ` +
    `that falls is a line falling past countries it never names. Following one names every country ` +
    `it passed and every country that passed it, with the year — including the four that have no ` +
    `line on this chart at all.`,
  controls: [
    {
      question: "Cette année-là, l'Inde était où — et ça pesait combien ?",
      gesture: "ask-a-mark",
      changes:
        "One mark per year answers with India's own world rank that year, what it actually emitted " +
        "in gigatonnes, and the two countries immediately above and below it in the ranking.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel rang est en question",
      authorPicked: "la Chine",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Cette ligne grise qui tombe à travers les rangs vides, c'est qui — et qui l'a doublée ?",
      gesture: "find-your-own-case",
      changes:
        "The chosen line comes forward in full ink and its two names with it, the rest of the field " +
        "steps back to the non-text floor, every step where it crossed somebody is ringed on its " +
        "own line, and the sentence gives its rank run by run across the thirty-five years with " +
        "every country it passed or was passed by, named and dated.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quelle ligne est suivie à travers le classement",
      authorPicked: "none",
      readerPicks: ["none", "usa", "rus", "chn", "jpn", "deu"],
      heldStill: [".chart-header", ".chart-source"],
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedBumpWeb,
      props: {
        lines, years, marks, follow, interaction,
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
    // THE REFUSAL THE CENSUS CANNOT MAKE FOR THIS VOCABULARY, made against the file just written.
    assertFollowChangesThePicture(await readFile(join(OUT, `${id}.html`), "utf8"), follow, `renders/${id}.html`);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk wearing this run's date.
  process.exitCode = 1;
}
