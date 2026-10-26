// beat.mjs for the worked example proof/web-dot-strip-lowcarbon-spread — X
// points, its ceiling by 2", as an interactive page whose ladder changes what the axis counts. Every
// number on the page is COMPUTED from data.json; the rails' statistics, the ranks and the falls are
// computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];
const FROM = 2000;
const TO = 2024;
const NUCLEAR = "nuclear_generation__twh";
const HYDRO = "hydro_generation__twh";
const BIO = ["bioenergy_stacked_generation__twh", "other_renewables_generation__twh"];
const WIND_SOLAR = ["solar_generation__twh", "wind_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
const ALL = [NUCLEAR, HYDRO, ...BIO, ...WIND_SOLAR, ...FOSSIL];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", ITA: "Italie", GBR: "Royaume-Uni", POL: "Pologne", SWE: "Suède", NOR: "Norvège",
  CHE: "Suisse", AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique", FIN: "Finlande", DNK: "Danemark", PRT: "Portugal", CZE: "Tchéquie",
  GRC: "Grèce", IRL: "Irlande",
};

const codes = [...new Set(table.rows.map((r) => r[CODE]))];
const codeOf = Object.fromEntries(codes.map((c) => [NAMES[c] ?? c, c]));
const rowOf = (name, state) => {
  const r = table.rows.find((row) => row[CODE] === codeOf[name] && Number(row[YEAR]) === Number(state));
  if (!r) throw new Error(`${name} has no ${state} row`);
  return r;
};
const sum = (name, state, cols) => cols.reduce((s, c) => s + Number(rowOf(name, state)[col(c)]), 0);
const units = codes.map((c) => ({ name: NAMES[c] ?? c, code: c }));
const names = units.map((u) => u.name);

// The ladder: each rung's part is the previous one minus one named group, over the same whole.
const LADDER = [
  { label: "le bas-carbone", cols: [NUCLEAR, HYDRO, ...BIO, ...WIND_SOLAR] },
  { label: "sans le nucléaire", stripped: "le nucléaire", cols: [HYDRO, ...BIO, ...WIND_SOLAR] },
  { label: "ni l'hydraulique", stripped: "le nucléaire et l'hydraulique", cols: [...BIO, ...WIND_SOLAR] },
  { label: "ni la bioénergie", stripped: "le nucléaire, l'hydraulique et la bioénergie", cols: [...WIND_SOLAR] },
];
const share = (rung, name, state) => (sum(name, state, LADDER[rung].cols) / sum(name, state, ALL)) * 100;
const lane = (rung, state) => {
  const v = names.map((n) => ({ name: n, value: share(rung, n, state) })).sort((a, b) => a.value - b.value);
  return { floor: v[0], ceiling: v.at(-1), span: v.at(-1).value - v[0].value };
};
const [before, after] = [lane(0, FROM), lane(0, TO)];
const floorRise = after.floor.value - before.floor.value;
const ceilingRise = after.ceiling.value - before.ceiling.value;
const closed = before.span - after.span;
const [lastFrom, lastTo] = [lane(3, FROM), lane(3, TO)];
// The two accented cases are derived: the floor of the first state, and the furthest fall down the ladder.
const subject = before.floor.name;
const falls = names.map((n) => ({ name: n, fall: share(0, n, TO) - share(3, n, TO) })).sort((a, b) => b.fall - a.fall);
const faller = falls[0].name;

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const announce = (o) => `${o.label} — écart ${fr(o.from.span)} points en ${FROM}, ${fr(o.to.span)} en ${TO}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  units,
  from: FROM,
  to: TO,
  whole: (name, state) => sum(name, state, ALL),
  ladderLabel: "L'axe mesure",
  rungs: [
    { label: LADDER[0].label, part: (n, s) => sum(n, s, LADDER[0].cols), announce },
    {
      label: LADDER[1].label, stripped: LADDER[1].stripped, part: (n, s) => sum(n, s, LADDER[1].cols), announce,
      note: (o) =>
        `Sans le nucléaire, l'écart ne se referme plus du tout : ${fr(o.from.span)} points en ${FROM}, ${fr(o.to.span)} en ${TO}. Le plafond change de pays — ` +
        `${o.from.ceiling.name} en ${FROM}, ${o.to.ceiling.name} en ${TO} — et la France tombe de ${fr(share(0, "France", TO))} % à ${fr(o.value("France", TO))} %.`,
    },
    {
      label: LADDER[2].label, stripped: LADDER[2].stripped, part: (n, s) => sum(n, s, LADDER[2].cols), announce,
      note: (o) =>
        `Sans l'hydraulique non plus, il ne reste que ce qui a été bâti depuis. En ${FROM} les ${units.length} tiennent dans ${fr(o.from.span)} points, parce que ` +
        `personne n'avait encore rien construit ; en ${TO} ils s'étalent sur ${fr(o.to.span)}. L'écart est ${WORDS[Math.round(o.to.span / o.from.span)]} fois plus grand qu'au départ, ` +
        `au lieu d'être un quart plus petit.`,
    },
    {
      label: LADDER[3].label, stripped: LADDER[3].stripped, part: (n, s) => sum(n, s, LADDER[3].cols), announce,
      note: (o) =>
        `Le vent et le soleil seuls : ${fr(o.from.span)} points d'écart en ${FROM}, ${fr(o.to.span)} en ${TO}. ${o.falls[0].name} y perd ${fr(o.falls[0].fall)} points ` +
        `par rapport au bas-carbone, la plus forte chute des ${units.length} ; ${o.falls.at(-1).name} en perd ${fr(o.falls.at(-1).fall)}, la plus faible. ` +
        `La convergence appartenait au parc hérité, pas à celui qu'on construit.`,
    },
  ],
  subject,
  alsoLit: [faller],
  // The row of statistics heading each rail.
  stats: (s) => `plancher ${fr(s.floor.value)} % · milieu ${fr(s.median)} % · plafond ${fr(s.ceiling.value)} % · écart ${fr(s.span)} points`,
  // What one dot answers.
  detail: (m) =>
    m.rungIndex === 0
      ? `${m.name} · ${m.state} : ${fr(m.value)} % · ${m.otherState} : ${fr(m.otherValue)} % · rang ${m.rank} sur ${m.count} en ${m.state}, ${m.otherRank} en ${m.otherState}`
      : `${m.name} · ${m.state} : ${fr(m.value)} % · ${fr(m.lessThanBase)} points de moins qu'avec ${m.stripped} · ${m.otherState} : ${fr(m.otherValue)} % · ` +
        `rang ${m.rank} sur ${m.count} en ${m.state}`,
  title: "Le plancher européen est monté de 30 points, le plafond de 2",
  limits:
    "Deux rails, deux dates : chaque pastille est un pays, sa position la part de son électricité que la définition choisie compte. Le dénominateur ne bouge jamais. " +
    "Un rail se lit comme une FORME, jamais comme la trajectoire d'un pays.",
  reading:
    "Lecture : chaque cran retire une source de plus, donc une pastille ne peut que reculer. Survolez, touchez ou tabulez-en une pour le pays, ce qu'il vaut sous cette " +
    "définition et ce que les sources retirées lui valent.",
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${FROM} et ${TO}`,
  alt:
    `Deux rails horizontaux gradués de 0 à 100 %. Sur celui de ${FROM}, ${units.length} pastilles s'étalent de ${fr(before.floor.value)} % à ${fr(before.ceiling.value)} % ; ` +
    `sur celui de ${TO}, elles se resserrent entre ${fr(after.floor.value)} % et ${fr(after.ceiling.value)} %. Le plancher monte de ${fr(floorRise)} points, le plafond de ` +
    `${fr(ceilingRise)}, et l'écart entre les deux se referme de ${fr(closed)} points. Les pastilles de la ${subject}, plancher aux deux dates, et de la ${faller} sont colorées. ` +
    `Un contrôle change ce que l'axe mesure : sans le nucléaire ni l'hydraulique, l'écart de ${TO} vaut ${fr(lastTo.span)} points contre ${fr(lastFrom.span)} en ${FROM} — ` +
    `il s'ouvre au lieu de se refermer.`,
  evidenceLevels: 3,
  check() {
    if (Math.round(floorRise) !== 30) throw new Error(`the floor rose ${fr(floorRise)} points, not 30`);
    if (Math.round(ceilingRise) !== 2) throw new Error(`the ceiling rose ${fr(ceilingRise)} points, not 2`);
    if (!(closed / before.span > 0.2 && closed / before.span < 0.3)) throw new Error(`the spread closed by ${fr((closed / before.span) * 100)} %, not about a quarter`);
    if (!(lastTo.span > lastFrom.span)) throw new Error("the last rung no longer opens the spread");
    if (!(falls[0].fall > falls[1].fall + 5)) throw new Error("two countries fall about as far down the ladder; the second accent would be arbitrary");
  },
};
