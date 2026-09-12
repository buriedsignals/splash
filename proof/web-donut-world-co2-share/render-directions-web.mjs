// twin/proof/web-donut-world-co2-share/render-directions-web.mjs
//
// The world's CO₂ in 2000 and in 2023, split between the six largest emitters of 2023 and everyone
// else, as two concentric rings. Rendered once per FILED DIRECTION.
//
// Usage:  bun proof/web-donut-world-co2-share/render-directions-web.mjs

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
import { DirectedDonutWeb } from "./DirectedDonutWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Monde";
const FROM = 2000;
const TO = 2023;
const HOW_MANY = 6;
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};

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
const all = csv.slice(1).map((line) => {
  const c = line.split(",");
  return {
    entity: c[at("entity")],
    code: c[at("code")],
    beforePer: Number(c[at("t_per_person_2000")]),
    afterPer: Number(c[at("t_per_person_2023")]),
    beforePop: Number(c[at("population_2000")]),
    afterPop: Number(c[at("population_2023")]),
  };
});
const totals = all.map((c) => ({
  code: c.code,
  entity: c.entity,
  before: (c.beforePer * c.beforePop) / 1e9,
  after: (c.afterPer * c.afterPop) / 1e9,
}));
const worldBefore = totals.reduce((s, c) => s + c.before, 0);
const worldAfter = totals.reduce((s, c) => s + c.after, 0);
const chosen = [...totals].sort((a, b) => b.after - a.after).slice(0, HOW_MANY);
for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed`);

const shareBefore = (c) => (c.before / worldBefore) * 100;
const shareAfter = (c) => (c.after / worldAfter) * 100;

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const chn = chosen.find((c) => c.code === "CHN");
const usa = chosen.find((c) => c.code === "USA");
if (!chn || !usa) throw new Error("the headline names China and the United States");
if (!(shareBefore(usa) > shareBefore(chn) && shareAfter(chn) > shareAfter(usa)))
  throw new Error("the headline says the two swapped; they did not");
const growth = (worldAfter / worldBefore - 1) * 100;
if (!(growth > 33)) throw new Error(`the headline says the whole grew by at least a third; it grew ${fr(growth)} %`);
console.log(
  `monde ${fr(worldBefore)} -> ${fr(worldAfter)} Gt (+${fr(growth, 0)} %) · États-Unis ` +
    `${fr(shareBefore(usa))} % -> ${fr(shareAfter(usa))} % · Chine ${fr(shareBefore(chn))} % -> ` +
    `${fr(shareAfter(chn))} %\n`,
);
console.table(chosen.map((c) => ({ pays: NAMES[c.code], [`% ${FROM}`]: fr(shareBefore(c)), [`% ${TO}`]: fr(shareAfter(c)) })));

// ── the two rings ─────────────────────────────────────────────────────────────────────────────
const order = [...chosen].sort((a, b) => b.after - a.after);
const RING = [
  { key: String(FROM), label: String(FROM), total: `${fr(worldBefore)} Gt`, inner: 62, outer: 108, pick: (c) => c.before, world: worldBefore },
  { key: String(TO), label: String(TO), total: `${fr(worldAfter)} Gt`, inner: 116, outer: 168, pick: (c) => c.after, world: worldAfter },
];
const wedges = [];
RING.forEach((ring, ri) => {
  const named = order.map((c) => ({ key: c.code, name: NAMES[c.code], value: ring.pick(c) }));
  const rest = ring.world - named.reduce((s, n) => s + n.value, 0);
  const slices = [...named, { key: "rest", name: "tous les autres", value: rest }];
  let a = 0;
  slices.forEach((s, i) => {
    const span = (s.value / ring.world) * Math.PI * 2;
    const other = RING[1 - ri];
    const otherValue =
      s.key === "rest"
        ? other.world - order.reduce((t, c) => t + other.pick(c), 0)
        : other.pick(order.find((c) => c.code === s.key));
    wedges.push({
      key: s.key,
      name: s.name,
      ring: ri,
      from: a,
      to: a + span,
      tone: i,
      detail:
        `${s.name} · ${ring.label} : ${fr((s.value / ring.world) * 100)} % du CO₂ mondial ` +
        `(${fr(s.value)} Gt sur ${fr(ring.world)}) · en ${other.label} : ` +
        `${fr((otherValue / other.world) * 100)} % (${fr(otherValue)} Gt)`,
    });
    a += span;
  });
});

const facts = beatFacts(
  order.map((c) => ({ key: c.code, label: NAMES[c.code], value: shareAfter(c) })),
  { subject: NAMES.CHN, declaredSequence: "% du CO₂ mondial" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `En ${FROM} les États-Unis pesaient ${fr(shareBefore(usa))} % du CO₂ mondial et la Chine ${fr(shareBefore(chn))} % ; en ${TO} ils ont échangé`;
const caveat =
  `Deux anneaux concentriques : le CO₂ mondial en ${FROM} au centre, en ${TO} à l'extérieur, ` +
  `partagé entre les six plus gros émetteurs de ${TO} et tout le reste. Deux camemberts côte à côte ` +
  `laisseraient croire que les deux touts sont égaux ; ici ils partagent un centre et une échelle ` +
  `angulaire, et leurs totaux sont ÉCRITS au milieu plutôt que dessinés.`;
const centreNote = [`${FROM} : ${fr(worldBefore)} Gt`, `${TO} : ${fr(worldAfter)} Gt`, `+${fr(growth, 0)} %`];
const readingLine =
  `Lecture : survolez, touchez ou tabulez une part pour lire le pays, sa part de l'année, les Gt ` +
  `derrière elle et ce que le même pays pesait l'autre année. Un angle est l'encodage le moins ` +
  `lisible de la liste : on peut classer des parts, on ne peut pas en mesurer une.`;
const source = `Source : Global Carbon Budget 2025 · populations ${FROM} et ${TO}, via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${FROM} ${TO} ${order.map((c) => NAMES[c.code]).join(" ")} tous les autres`,
  annot: centreNote.join(" "),
  value: order.map((c) => `${fr(shareAfter(c))} %`).join(" "),
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
      component: DirectedDonutWeb,
      props: {
        wedges,
        rings: RING.map((r) => ({ key: r.key, label: r.label, total: r.total, inner: r.inner, outer: r.outer })),
        tones: HOW_MANY + 1,
        toneLabels: [...order.map((c) => NAMES[c.code]), "tous les autres"],
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, centreNote,
        alt:
          `Deux anneaux concentriques. Sur l'anneau intérieur (${FROM}), la part des États-Unis, ` +
          `${fr(shareBefore(usa))} %, est la plus large des six pays nommés ; celle de la Chine fait ` +
          `${fr(shareBefore(chn))} %. Sur l'anneau extérieur (${TO}), c'est l'inverse : la Chine ` +
          `occupe ${fr(shareAfter(chn))} % et les États-Unis ${fr(shareAfter(usa))} %. Au centre, les ` +
          `deux totaux mondiaux : ${fr(worldBefore)} puis ${fr(worldAfter)} Gt.`,
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
