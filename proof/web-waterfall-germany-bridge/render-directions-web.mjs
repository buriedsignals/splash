// twin/proof/web-waterfall-germany-bridge/render-directions-web.mjs
//
// Germany's electricity between 2015 and 2024 as a bridge, rendered once per FILED DIRECTION.
//
// CONSERVATION IS CHECKED BEFORE ANYTHING IS DRAWN: the moves must sum to the difference between the
// two declared levels. A bridge that does not reconcile is a bar chart with connectors.
//
// Usage:  bun proof/web-waterfall-germany-bridge/render-directions-web.mjs

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
import { DirectedWaterfallWeb } from "./DirectedWaterfallWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Allemagne";
const CODE = "DEU";
const FROM = 2015;
const TO = 2024;
const UNIT = "TWh";
const GROUPS = [
  { key: "renewables", name: "renouvelables", columns: ["Wind", "Solar", "Hydropower", "Bioenergy", "Other renewables"] },
  { key: "nuclear", name: "nucléaire", columns: ["Nuclear"] },
  { key: "fossil", name: "fossile", columns: ["Coal", "Gas", "Oil"] },
];
const ALL = GROUPS.flatMap((g) => g.columns);

const plain = (s) => plainSpaces(s);
const fr = (v, d = 0) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const signed = (v) => `${v >= 0 ? "+" : "−"}${fr(Math.abs(v))}`;

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const at = (n) => {
  const i = header.indexOf(n);
  if (i < 0) throw new Error(`the frozen file has no ${n} column`);
  return i;
};
const rowFor = (year) => {
  const line = csv.slice(1).find((l) => {
    const c = l.split(",");
    return c[at("Code")] === CODE && Number(c[at("Year")]) === year;
  });
  if (!line) throw new Error(`${CODE} has no ${year} row`);
  const c = line.split(",");
  const o = {};
  for (const k of ALL) o[k] = Number(c[at(k)]);
  return o;
};
const before = rowFor(FROM);
const after = rowFor(TO);

const totalBefore = ALL.reduce((s, k) => s + before[k], 0);
const totalAfter = ALL.reduce((s, k) => s + after[k], 0);
const moves = GROUPS.map((g) => ({
  key: g.key,
  name: g.name,
  value: g.columns.reduce((s, k) => s + after[k] - before[k], 0),
}));

// ── CONSERVATION, CHECKED ─────────────────────────────────────────────────────────────────────
const sum = moves.reduce((s, m) => s + m.value, 0);
if (Math.abs(sum - (totalAfter - totalBefore)) > 0.01)
  throw new Error(`the moves sum to ${fr(sum, 2)} but the levels differ by ${fr(totalAfter - totalBefore, 2)}`);
const net = totalAfter - totalBefore;
if (!(net < 0)) throw new Error(`the headline says the total fell; it moved ${signed(net)}`);
console.log(
  `${CODE} ${FROM} ${fr(totalBefore)} ${UNIT} -> ${TO} ${fr(totalAfter)} ${UNIT} (${signed(net)}) · ` +
    moves.map((m) => `${m.name} ${signed(m.value)}`).join(" · ") + "\n",
);

// ── the bridge ────────────────────────────────────────────────────────────────────────────────
const ordered = [...moves].sort((a, b) => a.value - b.value);
let cursor = totalBefore;
const steps = [
  {
    key: "start",
    name: `${FROM}`,
    kind: "level",
    from: 0,
    to: totalBefore,
    label: fr(totalBefore),
    detail: `${FROM} · niveau de départ · ${fr(totalBefore)} ${UNIT} produits`,
  },
];
for (const m of ordered) {
  const from = cursor;
  cursor += m.value;
  steps.push({
    key: m.key,
    name: m.name,
    kind: m.value >= 0 ? "up" : "down",
    from,
    to: cursor,
    label: signed(m.value),
    detail:
      `${m.name} · ${signed(m.value)} ${UNIT} entre ${FROM} et ${TO} · part de ${fr(from)} et arrive ` +
      `à ${fr(cursor)} ${UNIT} · ${fr((Math.abs(m.value) / moves.reduce((s, z) => s + Math.abs(z.value), 0)) * 100)} % ` +
      `de l'ensemble des mouvements`,
  });
}
steps.push({
  key: "end",
  name: `${TO}`,
  kind: "level",
  from: 0,
  to: totalAfter,
  label: fr(totalAfter),
  detail: `${TO} · niveau d'arrivée · ${fr(totalAfter)} ${UNIT} produits, soit ${signed(net)} depuis ${FROM}`,
});
if (Math.abs(cursor - totalAfter) > 0.01)
  throw new Error(`the bridge lands on ${fr(cursor, 2)} and the declared level is ${fr(totalAfter, 2)}`);

const facts = beatFacts(
  moves.map((m) => ({ key: m.key, label: m.name, value: m.value })),
  { subject: "renouvelables", declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const ceiling = Math.ceil(Math.max(totalBefore, totalAfter) / 100) * 100;
const yTicks = Array.from({ length: ceiling / 100 + 1 }, (_, i) => i * 100);

const grew = moves.find((m) => m.value > 0);
const fell = moves.filter((m) => m.value < 0);
const title = `L'électricité allemande a perdu ${fr(Math.abs(net))} TWh entre ${FROM} et ${TO} : ${fell.map((m) => `${m.name} ${signed(m.value)}`).join(", ")} contre ${grew.name} ${signed(grew.value)}`;
const caveat =
  `Un pont entre DEUX NIVEAUX NOMMÉS : la production totale de ${FROM} à gauche, celle de ${TO} à ` +
  `droite, et entre les deux les mouvements par groupe de sources. Le SENS d'une marche porte le ` +
  `signe ; la couleur ne fait que le répéter. Les marches se somment exactement à l'écart entre les ` +
  `deux niveaux — vérifié avant le dessin.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez une marche pour lire sa valeur, le niveau d'où elle part, ` +
  `celui où elle arrive et sa part de l'ensemble des mouvements. Une marche commence là où la ` +
  `précédente s'arrête : seules la première et la dernière se mesurent contre quelque chose de ` +
  `visible.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · Allemagne, ${FROM} et ${TO}`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${yTicks.join(" ")} ${steps.map((s) => s.name).join(" ")}`,
  annot: `${FROM} ${fr(totalBefore)} ${TO} ${fr(totalAfter)}`,
  value: steps.map((s) => s.label).join(" "),
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
      component: DirectedWaterfallWeb,
      props: {
        steps, yTicks, unit: UNIT,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Un pont : une barre pleine à ${fr(totalBefore)} TWh pour ${FROM}, puis trois marches — ` +
          moves.map((m) => `${m.name} ${signed(m.value)}`).join(", ") +
          ` — et une barre pleine à ${fr(totalAfter)} TWh pour ${TO}. Les marches descendantes sont ` +
          `plus longues que la montante, et le pont arrive ${fr(Math.abs(net))} TWh plus bas qu'il ` +
          `n'était parti.`,
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
