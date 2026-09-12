// twin/proof/static-donut-world-co2-share/render-directions.mjs
//
// Each of the six largest emitters' share of the world's CO₂, in 2000 and in 2023, drawn as paired
// concentric arcs — one ring per country — once per filed direction, through the design base. The
// first `pie and donut` beat in this tree.
//
// WHY THIS AND NOT THE LOLLIPOP'S READING, ON THE SAME FROZEN FILE.
// `proof/static-lollipop-co2-per-person` draws the LEVEL each person emits. This draws the SHARE of
// one whole each country holds. They are different questions and they answer differently: Russia's
// share of world CO₂ fell between 2000 and 2023 while the tonnes it emits ROSE, because the whole
// grew by half. That is the trap this form sets, and the plate prints both numbers under every ring
// so a reader cannot fall into it.
//
// ONE FULL TURN IS 100 % OF THE WORLD'S EMISSIONS, on every ring, at one radius. The reference's own
// record leaves that open — "whether the arcs are on a common scale across the three rings — if they
// are not, the between-country comparison the layout invites would be false" — so this beat closes
// it rather than inheriting the doubt.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-donut-world-co2-share/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedDonuts } from "./DirectedDonuts.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const SUBJECT = "CHN";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud",
};
const refused = [];

// ── the countries ───────────────────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const all = csv.slice(1).map((l) => {
  const c = l.split(",");
  const perBefore = Number(c[at("t_per_person_2000")]);
  const perAfter = Number(c[at("t_per_person_2023")]);
  const popBefore = Number(c[at("population_2000")]);
  const popAfter = Number(c[at("population_2023")]);
  return {
    entity: c[at("entity")],
    code: c[at("code")],
    before: (perBefore * popBefore) / 1e9,
    after: (perAfter * popAfter) / 1e9,
  };
});
for (const c of all)
  if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after))
    throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);

const worldBefore = all.reduce((s, c) => s + c.before, 0);
const worldAfter = all.reduce((s, c) => s + c.after, 0);
const ranked = [...all].sort((a, b) => b.after - a.after);
const chosen = ranked.slice(0, HOW_MANY);
for (const c of chosen)
  if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed in this beat`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const shareOf = (c) => ({
  before: (c.before / worldBefore) * 100,
  after: (c.after / worldAfter) * 100,
});
const cn = chosen.find((c) => c.code === "CHN");
const us = chosen.find((c) => c.code === "USA");
if (!cn || !us)
  throw new Error(`the headline names China and the United States; the computed six are ${chosen.map((c) => c.code).join(", ")}`);
const sCn = shareOf(cn);
const sUs = shareOf(us);
const worldGrowth = (worldAfter / worldBefore - 1) * 100;
if (!(sUs.before > sCn.before && sCn.after > sUs.after))
  throw new Error(
    `the headline says the two swapped; ${FROM} was ${sUs.before.toFixed(1)}/${sCn.before.toFixed(1)} ` +
      `and ${TO} is ${sUs.after.toFixed(1)}/${sCn.after.toFixed(1)}`,
  );
if (!(worldGrowth > 30))
  throw new Error(`the standfirst says the whole grew by about half; it grew ${worldGrowth.toFixed(0)} %`);
/** THE TRAP THIS FORM SETS, FOUND IN THE DATA RATHER THAN ASSUMED: a country whose SHARE fell while
 *  the tonnes it emits ROSE. If no such country is among the six, the reading line that warns about
 *  it would be a warning about nothing, and the beat says so instead of printing it anyway. */
const fellButRose = chosen.filter((c) => {
  const s = shareOf(c);
  return s.after < s.before && c.after > c.before;
});
if (!fellButRose.length)
  throw new Error(
    `the reading line warns that a smaller share can hide a larger number; none of the six does ` +
      `that, so the warning has no case on this plate`,
  );
console.log(
  `${all.length} pays · monde ${worldBefore.toFixed(1)} -> ${worldAfter.toFixed(1)} Gt ` +
    `(+${worldGrowth.toFixed(0)} %) · CHN ${sCn.before.toFixed(1)} -> ${sCn.after.toFixed(1)} % · ` +
    `USA ${sUs.before.toFixed(1)} -> ${sUs.after.toFixed(1)} % · part en baisse mais tonnes en ` +
    `hausse : ${fellButRose.map((c) => c.code).join(", ")}\n`,
);
console.table(
  chosen.map((c) => {
    const s = shareOf(c);
    return {
      pays: NAMES[c.code],
      [`part ${FROM}`]: `${s.before.toFixed(1)} %`,
      [`part ${TO}`]: `${s.after.toFixed(1)} %`,
      [`Gt ${FROM}`]: c.before.toFixed(2),
      [`Gt ${TO}`]: c.after.toFixed(2),
    };
  }),
);

const rings = chosen.map((c) => {
  const s = shareOf(c);
  return {
    code: c.code,
    name: NAMES[c.code],
    shareBefore: s.before,
    shareAfter: s.after,
    gtBefore: c.before,
    gtAfter: c.after,
  };
});

const facts = beatFacts(
  rings.map((r) => ({ key: r.code, label: r.name, value: r.shareAfter })),
  {
    subject: NAMES[SUBJECT],
    states: [String(FROM), String(TO)],
    markers: rings.map((r) => ({ key: r.code, label: r.name, value: r.shareBefore })),
    panels: { count: rings.length, sharedScale: true },
    declaredSequence: "share of world emissions",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

const title = [
  `En ${FROM} les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en ${TO}, c’est l’inverse`,
  `La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial`,
  `Les parts du CO₂ mondial, ${FROM} et ${TO}`,
];
const limits = [
  `Un anneau par pays : l’arc gris est sa part du CO₂ mondial en ${FROM}, l’arc plein sa part en ` +
    `${TO}, et un tour complet vaut 100 % du monde — la même échelle sur les six anneaux. La Chine ` +
    `passe de ${one(sCn.before)} à ${one(sCn.after)} %, les États-Unis de ${one(sUs.before)} à ` +
    `${one(sUs.after)} %. Mais le total mondial a grossi de ${Math.round(worldGrowth)} % entre les ` +
    `deux dates : une part qui rétrécit n’est pas un chiffre qui baisse, et les tonnes sont ` +
    `écrites sous chaque anneau.`,
  `Un anneau par pays : la part du CO₂ mondial en ${FROM} et en ${TO}, un tour complet valant ` +
    `100 %. Le total mondial a grossi de ${Math.round(worldGrowth)} % entre les deux dates.`,
  `Un anneau par pays : sa part du CO₂ mondial en ${FROM} et en ${TO}.`,
];
const reading = [
  `Lecture : l’écart entre les deux arcs est le changement de part. La ${NAMES[fellButRose[0].code]} ` +
    `montre le piège : sa part baisse et ses tonnes montent, parce que le monde a grossi autour ` +
    `d’elle.`,
  `Lecture : l’écart entre les deux arcs est le changement de part, pas de tonnes.`,
];
const source = `Sources : Global Carbon Budget 2025 · population, via Our World in Data`;
const unit = `part du CO₂ mondial — un tour complet = 100 %`;
const worldNote = `Monde : ${one(worldBefore)} Gt en ${FROM}, ${one(worldAfter)} Gt en ${TO}.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${unit} ${worldNote} ${FROM} ${TO} Gt`,
  annot: `${reading.join(" ")} ${rings.map((r) => r.name).join(" ")}`,
  value: rings.map((r) => `${one(r.shareAfter)} %`).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  console.log(id);
  try {
    await renderStill({
      element: createElement(DirectedDonuts, {
        rings,
        subject: SUBJECT,
        from: FROM,
        to: TO,
        unit,
        worldNote,
        title,
        limits,
        reading,
        source,
        alt:
          `Six anneaux, un par pays, où un tour complet vaut 100 % du CO₂ mondial. Sur chaque ` +
          `anneau, un arc pour ${FROM} et un arc concentrique pour ${TO}. La Chine passe de ` +
          `${one(sCn.before)} à ${one(sCn.after)} % du total mondial et les États-Unis de ` +
          `${one(sUs.before)} à ${one(sUs.after)} % : les deux ont échangé leurs places. Sous ` +
          `chaque anneau, les tonnes des deux années, parce que le total mondial a grossi de ` +
          `${Math.round(worldGrowth)} % entre-temps.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
