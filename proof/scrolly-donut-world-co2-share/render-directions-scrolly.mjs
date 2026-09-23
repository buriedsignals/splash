// The world's CO₂ shared out between its six largest emitters, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `pie and donut` type in the scrolly format.
//
// THE SUBJECT OF `static-donut-world-co2-share`, CHOREOGRAPHED. The six (the largest 2023 totals), the shares,
// the swap, the whole's growth, the country the growth hides and their assertions are the static beat's own;
// the scroll tells them with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. 2000: one ring for the world, an arc per country;
//   2. the two the headline names kept;
//   3. the arcs turn to 2023: China and the United States swap;
//   4. the ring grows with the world's tonnes, the 2000 ring left as an outline;
//   5. Russia alone: its share fell, its tonnes rose;
//   6. the ring breaks into the static plate's six.
//
// Usage:  bun proof/scrolly-donut-world-co2-share/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedDonutScrolly } from "./DirectedDonutScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const NB = "\u00A0";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const SUBJECT = "CHN";
const NAMES = {
  CHN: ["Chine", "la Chine"], USA: ["États-Unis", "les États-Unis"], IND: ["Inde", "l’Inde"], RUS: ["Russie", "la Russie"],
  JPN: ["Japon", "le Japon"], IRN: ["Iran", "l’Iran"], IDN: ["Indonésie", "l’Indonésie"], SAU: ["Arabie saoudite", "l’Arabie saoudite"],
  DEU: ["Allemagne", "l’Allemagne"], KOR: ["Corée du Sud", "la Corée du Sud"],
};

// ── the countries, and the static beat's own assertions ────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (name) => header.indexOf(name);
const all = csv.slice(1).map((l) => {
  const c = l.split(",");
  return {
    entity: c[at("entity")],
    code: c[at("code")],
    before: (Number(c[at("t_per_person_2000")]) * Number(c[at("population_2000")])) / 1e9,
    after: (Number(c[at("t_per_person_2023")]) * Number(c[at("population_2023")])) / 1e9,
  };
});
for (const c of all) if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after)) throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);
const worldBefore = all.reduce((s, c) => s + c.before, 0);
const worldAfter = all.reduce((s, c) => s + c.after, 0);
const chosen = [...all].sort((a, b) => b.after - a.after).slice(0, HOW_MANY);
for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed in this beat`);
const countries = chosen.map((c) => ({
  code: c.code,
  name: NAMES[c.code][0],
  shareBefore: (c.before / worldBefore) * 100,
  shareAfter: (c.after / worldAfter) * 100,
  gtBefore: c.before,
  gtAfter: c.after,
}));
const cn = countries.find((c) => c.code === "CHN");
const us = countries.find((c) => c.code === "USA");
if (!cn || !us) throw new Error(`the headline names China and the United States; the computed six are ${countries.map((c) => c.code).join(", ")}`);
if (!(us.shareBefore > cn.shareBefore && cn.shareAfter > us.shareAfter)) throw new Error("the headline says the two swapped; they did not");
if (Math.abs(us.shareBefore - 25) > 2.5) throw new Error(`a card calls the United States' ${FROM} share a quarter; it is ${us.shareBefore.toFixed(1)} %`);
if (Math.abs(cn.shareBefore - 100 / 7) > 1.5) throw new Error(`a card calls China's ${FROM} share a seventh; it is ${cn.shareBefore.toFixed(1)} %`);
const worldGrowth = (worldAfter / worldBefore - 1) * 100;
if (!(worldGrowth > 30)) throw new Error(`a card says the whole grew by about half; it grew ${worldGrowth.toFixed(0)} %`);
const trapped = countries.filter((c) => c.shareAfter < c.shareBefore && c.gtAfter > c.gtBefore);
if (trapped.length !== 1) throw new Error(`the fifth card shows the one country whose share fell while its tonnes rose; ${trapped.length} of the six do`);
const trap = trapped[0];

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v) => `${one(v)}${NB}%`;
const gt = (v) => `${one(v)}${NB}Gt`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `En ${FROM} les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en ${TO}, c’est l’inverse`,
  `La Chine et les États-Unis ont échangé leurs parts du CO₂ mondial`,
  `Les parts du CO₂ mondial, ${FROM} et ${TO}`,
];
const prose = [
  [`En ${FROM}, le monde émet ${gt(worldBefore)} de CO₂. Un tour d’anneau, c’est tout ce CO₂ ; les six plus gros émetteurs d’aujourd’hui y ont chacun leur arc.`],
  [`Les États-Unis en émettent ${pct(us.shareBefore)}, un quart. La Chine, ${pct(cn.shareBefore)}, un septième.`],
  [`En ${TO}, les parts s’inversent : la Chine monte à ${pct(cn.shareAfter)}, les États-Unis tombent à ${pct(us.shareAfter)}.`],
  [`Mais l’anneau n’a plus la même taille : le monde est passé de ${gt(worldBefore)} à ${gt(worldAfter)}, +${Math.round(worldGrowth)}${NB}%. Une part qui rétrécit n’est pas un chiffre qui baisse.`],
  [`${cap(NAMES[trap.code][1])} en est l’exemple : sa part tombe de ${pct(trap.shareBefore)} à ${pct(trap.shareAfter)}, ses émissions montent de ${gt(trap.gtBefore)} à ${gt(trap.gtAfter)}. Le monde a grossi autour d’elle.`],
  [`Lecture : un anneau par pays, où un tour complet vaut 100${NB}% du monde sur les six. L’arc extérieur est sa part en ${FROM}, l’arc intérieur sa part en ${TO}, et les tonnes sont écrites dessous.`],
];
const source = "Sources : Global Carbon Budget 2025 · population, via Our World in Data";
const words = {
  unit: `part du CO₂ mondial en {year}, un tour complet = 100${NB}%`,
  worldNote: `Monde${NB}: ${gt(worldBefore)} en ${FROM}, ${gt(worldAfter)} en ${TO}`,
  trapNote: `${NAMES[trap.code][0]}${NB}: part ${pct(trap.shareBefore)} puis ${pct(trap.shareAfter)}, ${gt(trap.gtBefore)} puis ${gt(trap.gtAfter)}`,
  splitNote: `extérieur ${FROM} · intérieur ${TO}`,
};
const alt =
  `Un anneau pour le CO₂ mondial, découpé entre les six plus gros émetteurs. La Chine passe de ${one(cn.shareBefore)} à ${one(cn.shareAfter)} % ` +
  `et les États-Unis de ${one(us.shareBefore)} à ${one(us.shareAfter)} % : les deux ont échangé leurs places, pendant que le total mondial grossissait de ` +
  `${Math.round(worldGrowth)} %. ${cap(NAMES[trap.code][1])} voit sa part baisser et ses tonnes monter. L’anneau se sépare enfin en six anneaux, un par pays.`;

/** One state per card; see `donut-drive.mjs` for what each field paints. */
const STATES = [
  { year: 0, pair: 0, grow: 0, russia: 0, split: 0 },
  { year: 0, pair: 1, grow: 0, russia: 0, split: 0 },
  { year: 1, pair: 1, grow: 0, russia: 0, split: 0 },
  { year: 1, pair: 0, grow: 1, russia: 0, split: 0 },
  { year: 1, pair: 0, grow: 1, russia: 1, split: 0 },
  { year: 1, pair: 0, grow: 1, russia: 0, split: 1 },
];
console.log(`monde ${worldBefore.toFixed(1)} -> ${worldAfter.toFixed(1)} Gt (+${worldGrowth.toFixed(0)} %) · piège : ${trap.code}\n`);

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.splitNote} ${FROM} ${TO} Gt 0123456789,·`,
  annot: countries.map((c) => c.name).join(" "),
  value: `${words.worldNote} ${words.trapNote} 0123456789,%·Gt`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "donut-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`monde-${FROM}`, "quart-septieme", `bascule-${TO}`, "le-monde-grossit", "le-piege", "six-anneaux"][i], prose: p })),
      reveal: {
        element: createElement(DirectedDonutScrolly, {
          countries,
          subject: SUBJECT,
          pair: ["CHN", "USA"],
          trap: trap.code,
          years: [String(FROM), String(TO)],
          worldBefore,
          worldAfter,
          words,
          alt,
          regs,
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyDonutState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
