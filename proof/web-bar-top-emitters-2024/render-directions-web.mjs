// twin/proof/web-bar-top-emitters-2024/render-directions-web.mjs
//
// The ten largest emitters of CO₂ in 2024 as columns, rendered once per FILED DIRECTION into a
// self-contained interactive page. The `bar and column` beat of the web format.
//
// EVERY NUMBER ON THE PAGE IS COMPUTED HERE AND PRINTED BEFORE THE RENDER — the ten members, their
// order, the "next five", the world share, and the per-country answer the page's own interaction
// exists to give. None is typed into a title, a note or an alt text.
//
// `renders/`, PLURAL.
//
// Usage:  bun proof/web-bar-top-emitters-2024/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedColumnsWeb } from "./DirectedColumnsWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const UNIT = "Gt CO₂";
const YEAR = 2024;
const HOW_MANY = 10;
const SUBJECT = "CHN";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon",
  IDN: "Indonésie", IRN: "Iran", SAU: "Arabie s.", KOR: "Corée du S.", DEU: "Allemagne",
  CAN: "Canada", TUR: "Turquie", BRA: "Brésil", MEX: "Mexique",
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 2) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

// ── the ranking ───────────────────────────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const rows = csv.slice(1).map((line) => {
  const c = line.split(",");
  return { entity: c[at("Entity")], code: c[at("Code")], tonnes: Number(c[header.length - 1]) };
});
const world = rows.find((r) => r.code === "OWID_WRL");
if (!world) throw new Error("the frozen file carries no OWID_WRL row, so no world total is published in it");

// OWID ships its own aggregates — World, continents, income groups, trade blocs — in the same file.
// A bare ISO-3166 alpha-3 is what stops "Asia" from topping a chart of countries.
const countries = rows.filter((r) => /^[A-Z]{3}$/.test(r.code) && r.code !== "OWID_WRL");
const dropped = rows.length - countries.length - 1;
const ranked = [...countries].sort((a, b) => b.tonnes - a.tonnes);
const chosen = ranked.slice(0, HOW_MANY);
for (const c of chosen)
  if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed in this beat`);

/** The smallest number of countries BELOW this one that add up to at least its own total. The
 *  headline's arithmetic, asked of every rank rather than only of the subject — and asked over the
 *  whole ranking, not over the ten drawn. */
function followersNeeded(index) {
  let sum = 0;
  for (let i = index + 1; i < ranked.length; i += 1) {
    sum += ranked[i].tonnes;
    if (sum >= ranked[index].tonnes) return { n: i - index, sum };
  }
  return { n: null, sum };
}

const subjectIndex = ranked.findIndex((r) => r.code === SUBJECT);
if (subjectIndex !== 0)
  throw new Error(`the headline names ${SUBJECT} first; it ranks ${subjectIndex + 1} in this file`);

// "the next five" is a SEARCH, not an assertion: add the countries below the subject one at a time
// and stop at the last one still under its own total.
let running = 0;
let nextN = 0;
for (let i = 1; i < ranked.length; i += 1) {
  if (running + ranked[i].tonnes >= ranked[0].tonnes) break;
  running += ranked[i].tonnes;
  nextN += 1;
}
if (nextN < 2)
  throw new Error(`only ${nextN} countries fit under the subject's own total; the comparison is not worth drawing`);

const topShare = (chosen.reduce((s, c) => s + c.tonnes, 0) / world.tonnes) * 100;
const ratioUsa = ranked[0].tonnes / ranked[1].tonnes;

console.log(
  `${countries.length} pays retenus, ${dropped} agrégats écartés · monde ${fr(world.tonnes / 1e9)} Gt · ` +
    `les ${HOW_MANY} premiers = ${fr(topShare, 1)} % · ${NAMES[SUBJECT]} > les ${nextN} suivants ` +
    `réunis (${fr(running / 1e9)} Gt) · x${fr(ratioUsa, 1)} les États-Unis\n`,
);

const columns = chosen.map((c, i) => {
  const { n, sum } = followersNeeded(ranked.indexOf(c));
  // `followersNeeded` returns null when the whole tail below a country still does not reach it. That
  // cannot happen at these ranks and it is not left to chance: the answer this page exists to give
  // would otherwise print the word "null" beside a country's name.
  if (n === null)
    throw new Error(
      `no run of countries below ${c.entity} in this file adds up to its own ${c.tonnes} t, so the ` +
        "reading this page's interaction promises has no answer for it",
    );
  const share = (c.tonnes / world.tonnes) * 100;
  return {
    code: c.code,
    name: NAMES[c.code],
    gt: c.tonnes / 1e9,
    label: fr(c.tonnes / 1e9),
    followers: n,
    followersGt: sum / 1e9,
    detail:
      `${fr(share, 1)} % du total mondial · il faut additionner les ${n} pays suivants du ` +
      `classement pour l'égaler`,
  };
});
console.table(columns.map((c, i) => ({ rang: i + 1, pays: c.name, Gt: c.label, détail: c.detail })));

// ── the control, and the two ranks it refuses to offer ────────────────────────────────────────
//
// ONE ARITHMETIC, THREE READERS. `followersNeeded` was already computed above, once, over the full
// 215-country ranking, for the sentence a hover gives. The SAME `{ n, sum }` builds this control's
// options, its towers and its notes. Nothing below re-derives a count or a total.
//
// AND A RANK IS ONLY OFFERED WHEN THE PLATE CAN DRAW ITS WHOLE ANSWER. Measured on this file:
// eight of the ten ranks are matched by a run of countries that is entirely inside the ten drawn;
// Corée du S. needs Canada (rank 11) and Allemagne needs Canada and Brésil, which this beat does not
// draw. A tower one column short of what its own sentence counts is a picture that lies, so the
// option is not offered at all — both countries still answer the hover with their own `n`, which is
// the channel that does not need the columns to be on the plate.
const stackOptions = [];
const offPlate = [];
columns.forEach((c, i) => {
  const last = i + c.followers;
  if (last > columns.length - 1) {
    offPlate.push(`${c.name} (il lui faut ${c.followers} pays, jusqu'au rang ${last + 1})`);
    return;
  }
  const onto = columns.slice(i + 1, last + 1).map((x) => x.code);
  if (onto.length !== c.followers)
    throw new Error(`${c.code}: ${onto.length} colonnes empilées pour un compte de ${c.followers}`);
  stackOptions.push({
    key: c.code,
    label: c.name,
    // The accessible name CONTAINS the visible one, which `assertStackDeclaration` refuses the
    // declaration without: a name that does not is the WCAG 2.5.3 failure and puts the option out of
    // reach of a reader speaking what they can see.
    announce:
      `${c.name} — empiler les ${c.followers} pays suivants du classement, ` +
      `${fr(c.followersGt)} Gt contre ${c.label} Gt`,
    note:
      `Les ${c.followers} pays suivants du classement · ${fr(c.followersGt)} Gt réunis · ` +
      `${c.name} : ${c.label} Gt`,
    // WHAT THE TOWER IS WORTH, PRINTED ON THE TOWER. The same `followersGt` the sentence and the
    // accessible name already carry — one arithmetic, now four readers — written as an addition
    // rather than as a bare figure, because what the tower does is ADD and the reader is being
    // asked to see that. The component checks this against the columns it actually stacks.
    total: `= ${fr(c.followersGt)}`,
    totalGt: c.followersGt,
    onto,
  });
});
if (stackOptions.length < 2)
  throw new Error(
    `only ${stackOptions.length} of the ${HOW_MANY} ranks can have their whole run drawn on this ` +
      "plate, so the control would be a choice of one — draw more columns or drop the control",
  );
console.log(
  `empilable : ${stackOptions.length} rangs sur ${HOW_MANY} · hors plaque : ${offPlate.join(" ; ") || "aucun"}\n`,
);
console.table(
  stackOptions.map((o) => ({
    contre: o.label,
    pays: o.onto.length,
    empilés: o.onto.join(" "),
    total: o.note.split(" · ")[1],
  })),
);

const stackPlan = {
  label: "Empiler contre",
  noneLabel: "Le classement seul",
  options: stackOptions,
};

const facts = beatFacts(
  columns.map((c) => ({ key: c.code, label: c.name, value: c.gt })),
  { subject: NAMES[SUBJECT], declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `La ${NAMES[SUBJECT]} a émis plus de CO₂ en ${YEAR} que les ${nextN} pays suivants réunis`;
const caveat =
  `Émissions annuelles de CO₂ en ${YEAR}, en milliards de tonnes. Les ${HOW_MANY} premiers pays du ` +
  `classement mondial — ${fr(topShare, 1)} % du total. Chaque colonne porte son chiffre : la page ne ` +
  `dessine pas d'axe des valeurs, seulement son zéro.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une colonne pour lire sa part du total mondial. Dans ` +
  `« Empiler contre », choisissez un pays : les colonnes du dessous s'empilent à côté de lui jusqu'à ` +
  `l'atteindre. La pile doit l'atteindre, pas rester dessous : elle compte donc un pays de plus que ` +
  `le titre.`;
const source = `Source : Global Carbon Budget 2025, via Our World in Data · ${YEAR} · ${countries.length} pays classés`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${stackPlan.label} ${stackPlan.noneLabel} ${stackOptions
    .map((o) => `${o.label} ${o.announce} ${o.note}`)
    .join(" ")}`,
  axis: columns.map((c) => c.name).join(" "),
  // Nothing on this page sets the annot register any more — the bracket's caption was the one thing
  // that did, and it went with the bracket. The register is still declared because `figureVars`
  // still emits `--note-family`, so the face it names is still requested and must still cover the
  // words the page can display: the control's own, which are the ones that moved into this slot.
  annot: `${stackPlan.label} ${stackPlan.noneLabel} ${stackOptions.map((o) => o.note).join(" ")}`,
  // The totals are set in the VALUE register too, and they carry a character no column label does
  // — the "=" that makes the tower read as an addition. A register's declared text is what the
  // page's own faces are subsetted from, so a glyph the page can display and the register does not
  // name is a glyph the delivered file cannot draw.
  value: [...columns.map((c) => c.label), ...stackOptions.map((o) => o.total)].join(" "),
};

// EVERY REGISTER'S TEXT PASSES THROUGH `plain` BEFORE IT REACHES THE LADDER. One U+202F or U+00A0 —
// the spaces `toLocaleString("fr-FR")` emits, and the one a hand types without meaning to — refuses
// every family on the sans ladder and takes all three renders down with a message that names the
// code point and not the string. Measured on the marimekko beat, where a no-break space typed inside
// a band's own label, invisible in the source, stopped the whole build.
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

/**
 * THE INTERACTION, WRITTEN BEFORE THE CODE — `chart-web/references/directed-interaction.md`, rule 1,
 * and `BRIEF.md` carries the same thing in prose, including the three readings this beat considered
 * and declined and the measurement behind each. `renderWeb` checks this declaration against the
 * markup it is about to write, so the brief's promise and the page cannot drift apart.
 */
const interaction = {
  earns:
    `A still of this ranking prints ten numbers and a fixed bracket over five of them. It cannot ` +
    `say what any one of those columns is worth AGAINST THE WORLD — the plate draws only the ten, ` +
    `which are ${fr(topShare, 1)} % of the total, so a column's height is silent about the other ` +
    `${fr(100 - topShare, 1)} % — and it can run the headline's own arithmetic only on the subject ` +
    `the author chose. The scrolly sibling performs that addition for the reader as a sequence; ` +
    `this page is the only one of the three where the READER picks the reference and watches the ` +
    `columns below it stack up against it, on ${stackOptions.length} of the ${HOW_MANY} ranks, ` +
    `from the full ${countries.length}-country ranking the plate only shows the head of.`,
  controls: [
    {
      question:
        "Cette colonne, elle pèse combien dans le total mondial — et combien de pays faut-il " +
        "additionner, plus bas dans le classement, pour l'égaler ?",
      gesture: "ask-a-mark",
      changes:
        `The COLUMN itself steps one measured shade deeper — not a dot at its top — and the answer `+
        `box prints two readings the plate holds ` +
        `nowhere: that country's share of the WORLD total (${columns[1].detail.split(" · ")[0]} for ` +
        `${columns[1].name}, against ${columns[0].detail.split(" · ")[0]} for ${columns[0].name}), ` +
        `and how many countries below it in the full ${countries.length}-country ranking must be ` +
        `added together before they match it — the headline's own arithmetic asked of every rank ` +
        `instead of only of the subject.`,
    },
    {
      question:
        "Et si je pose la question à un autre pays : à partir de combien de pays du dessous " +
        "est-ce qu'on l'égale, et à quoi ça ressemble ?",
      gesture: "toggle-a-comparison",
      changes:
        `The ${stackOptions.length} columns the plate can answer for each become a reference the ` +
        `reader may choose. The columns below the chosen one LEAVE THEIR BANDS and stack on each ` +
        `other in the band beside it, one on top of the next, until the tower reaches or passes its ` +
        `height — ${stackOptions[0].onto.length} of them for ${stackOptions[0].label}, ` +
        `${stackOptions[1].onto.length} for ${stackOptions[1].label}. The reference and its run ` +
        `take the accent and every other column steps back to the neutral, the names of the ` +
        `columns that went stay under the bands they left, EACH COLUMN'S OWN FIGURE RIDES WITH IT ` +
        `into the middle of its segment (a segment too short to hold one prints none), the sum the ` +
        `tower comes to stands at its top — ${fr(stackOptions[0].totalGt)} Gt for ` +
        `${stackOptions[0].label} against ${columns[0].label} Gt — and one sentence appears under ` +
        `the control with the count and the running total. The fixed bracket this page used to ` +
        `draw is gone: it was that comparison made once, for the subject the author chose.`,
    },
  ],
};

// THE TAP THE READING LINE PROMISES. `interaction.mjs` clears the answer on `pointerleave`, and
// Chrome fires that event up the whole chain when a TOUCH pointer is destroyed — the instant the
// finger lifts. Measured on the committed file with a real CDP touch sequence (touchStart → 150 ms →
// touchEnd → 500 ms) at 390x844: the answer appeared and then vanished inside one gesture, while this
// page's own reading line says « survolez, touchez ou tabulez ». Same defect and same remedy as
// `proof/webx-life-expectancy` and `proof/weby-small-multiples-co2-per-capita`: clear on
// `pointerleave` for MOUSE AND PEN ONLY. A touch reader's answer is cleared instead by the
// document-level `pointerdown` the format already installs, so it holds until they tap elsewhere.
//
// Patched into the emitted HTML rather than into the format's shared `chart-web/assets/
// interaction.mjs`, which is outside this beat's scope. An ANCHORED replacement, not a vendored copy:
// a copy would drift silently the moment the format's script changed, whereas this throws by name if
// the line it expects is no longer there.
const LEAVE_LINE = '    hitArea.addEventListener("pointerleave", clear);';
const LEAVE_GUARDED = `    hitArea.addEventListener("pointerleave", function (evt) {
      // Mouse and pen only — see this beat's render-directions-web.mjs for the measurement.
      if (evt.pointerType === "touch") return;
      clear();
    });`;

async function repairTouch(outPath) {
  const html = await readFile(outPath, "utf8");
  if (html.split(LEAVE_LINE).length !== 2)
    throw new Error(
      `expected exactly one ${JSON.stringify(LEAVE_LINE.trim())} in the inlined interaction script ` +
        "to guard against a touch pointer's own leave — the format's script may already guard it, in " +
        "which case delete this patch rather than widening it",
    );
  await writeFile(outPath, html.replace(LEAVE_LINE, LEAVE_GUARDED));
}

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  try {
    const { outPath } = await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedColumnsWeb,
      props: {
        columns,
        interaction,
        subject: SUBJECT,
        stackPlan,
        top: columns[0].gt,
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        unit: UNIT,
        reading: readingLine,
        alt:
          `Dix colonnes, une par pays, mesurant les émissions de CO₂ de ${YEAR} en milliards de ` +
          `tonnes. Celle de la ${NAMES[SUBJECT]}, ${fr(columns[0].gt)} Gt, dépasse à elle seule la ` +
          `somme des ${nextN} suivantes (${fr(running / 1e9)} Gt). Les États-Unis suivent à ` +
          `${fr(columns[1].gt)} Gt, l'Inde à ${fr(columns[2].gt)} Gt. Un choix « Empiler contre » ` +
          `fait quitter leur place aux colonnes situées sous le pays choisi et les empile l'une sur ` +
          `l'autre à côté de lui jusqu'à l'égaler : ${stackOptions[0].onto.length} pays pour la ` +
          `${stackOptions[0].label}, ${stackOptions[1].onto.length} pour les ` +
          `${stackOptions[1].label}.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    await repairTouch(outPath);
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
