// beat.mjs for the worked example proof/web-diverging-stacked-electricity — "nuclear alone decides
// which way France leans", as an interactive page whose boundary between the two camps the reader
// moves. The camps lines are shorter than the proof's: the proof's two-line ones move the plot on a
// phone when a cut is chosen (its own page fails verify-web there), and the render now refuses them. Every number on the page is COMPUTED from data.json; the leans under every cut, the totals
// and each band's camp are computed by render-beat.mjs and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("Code"), col("Year")];
const YEAR_DRAWN = 2024;

// The ladder, left to right: ordered by renewability, combustion breaking the tie.
const LEVELS = [
  { label: "charbon et pétrole", cols: ["Coal", "Oil"] },
  { label: "gaz", cols: ["Gas"] },
  { label: "nucléaire", cols: ["Nuclear"] },
  { label: "biomasse", cols: ["Bioenergy"] },
  { label: "éolien, solaire, hydraulique", cols: ["Wind", "Solar", "Hydropower", "Other renewables"] },
];
const COLUMNS = LEVELS.flatMap((l) => l.cols);
const SOURCE_FR = { Coal: "charbon", Oil: "pétrole", Gas: "gaz", Nuclear: "nucléaire", Hydropower: "hydraulique", Wind: "éolien", Solar: "solaire", Bioenergy: "biomasse", "Other renewables": "autres renouvelables" };
// Alphabetical in French, and never re-sorted by result: the rows stay still while the cut moves.
const NAMES = { DEU: "Allemagne", FRA: "France", NOR: "Norvège", POL: "Pologne", SWE: "Suède", CHE: "Suisse" };

const columnShare = {};
const rows = Object.entries(NAMES).map(([code, name]) => {
  const r = table.rows.find((row) => row[CODE] === code && Number(row[YEAR]) === YEAR_DRAWN);
  if (!r) throw new Error(`${name} has no ${YEAR_DRAWN} row`);
  const total = COLUMNS.reduce((s, c) => s + Number(r[col(c)]), 0);
  columnShare[name] = Object.fromEntries(COLUMNS.map((c) => [c, (Number(r[col(c)]) / total) * 100]));
  return { name, shares: LEVELS.map((l) => l.cols.reduce((s, c) => s + columnShare[name][c], 0)) };
});
const share = (name, level) => rows.find((r) => r.name === name).shares[level];

// The same lean the render computes, for the sentences outside the control (standfirst, reading).
const lean = (left, straddle, name) =>
  rows.find((r) => r.name === name).shares.reduce((net, s, i) => net + (straddle && i === left ? 0 : i < left ? -s : s), 0);
const [fossil, renewable] = [lean(2, false, "France"), lean(3, false, "France")];

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fr(Math.abs(v))}`;
const WORDS = ["aucun", "un", "deux", "trois", "quatre", "cinq", "six"];
const CAMP = { left: "à gauche", right: "à droite", centre: "à cheval sur le centre" };
const announce = (c) => `${c.label} — ${c.deepestLeft.name} penche ${signed(c.deepestLeft.net)} points, ${c.furthestRight.name} ${signed(c.furthestRight.net)}`;

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  levels: LEVELS.map((l) => l.label),
  rows,
  subject: "France",
  cutLabel: "La coupure",
  cuts: [
    { label: "le nucléaire à cheval", left: 2, straddle: true, sides: { left: "fossile", right: "renouvelable" }, camps: "fossile · nucléaire à cheval · renouvelable", announce },
    {
      label: "ce qui n'est pas fossile", left: 2, sides: { left: "combustibles fossiles", right: "tout le reste" }, camps: "combustibles fossiles · tout le reste", announce,
      note: (c) => {
        const ahead = c.leans.filter((l) => l.net > c.subject.net).sort((a, b) => b.net - a.net);
        return `Si la coupure ne sépare que les combustibles fossiles du reste, la ${c.subject.name} monte à ${signed(c.subject.net)} points — mais ${WORDS[ahead.length]} pays la devancent encore : ` +
          `${ahead.map((l) => `${l.name} ${signed(l.net)}`).join(", ")}. Compter le nucléaire comme le solaire ne met pas la ${c.subject.name} en tête.`;
      },
    },
    {
      label: "ce qui est renouvelable", left: 3, sides: { left: "non renouvelable", right: "renouvelable" },
      camps: "non renouvelable · renouvelable (directive)", announce,
      note: (c) => {
        const next = [...c.leans].sort((a, b) => a.net - b.net)[1];
        return `Au sens de la directive européenne, le nucléaire n'est pas renouvelable : la ${c.subject.name} bascule à ${signed(c.subject.net)} points et devient le pays des ` +
          `${c.leans.length} qui penche LE PLUS à gauche — devant la ${next.name} (${signed(next.net)}), dont ${fr(c.rows.find((r) => r.name === next.name).shares["charbon et pétrole"])} % ` +
          `du courant vient du charbon et du pétrole. Pas un chiffre n'a changé : c'est la définition qui a bougé.`;
      },
    },
    {
      label: "éolien, solaire et hydraulique seuls", left: 4, sides: { left: "le reste", right: "éolien, solaire, hydraulique" },
      camps: "le reste · éolien, solaire, hydraulique", announce,
      note: (c) =>
        `Si l'on retire aussi la biomasse, renouvelable par la loi mais brûlée, l'Allemagne traverse le centre à son tour : ${signed(c.byName.Allemagne.net)} après ` +
        `${signed(lean(3, false, "Allemagne"))}. Ses ${fr(share("Allemagne", 3))} % de biomasse faisaient à eux seuls la différence.`,
    },
  ],
  // A camp's total, printed in the gutters.
  format: (v) => `${fr(v)} %`,
  // What one band answers: the row, the rung, its share, what is inside it, and the camp this cut puts it in.
  detail: (b) => {
    const cols = LEVELS[b.levelIndex].cols;
    const inside = cols.length > 1
      ? ` · ${cols.map((c) => ({ name: SOURCE_FR[c], pct: columnShare[b.name][c] })).filter((p) => p.pct >= 0.5).sort((x, y) => y.pct - x.pct).map((p) => `${p.name} ${fr(p.pct)} %`).join(", ")}`
      : "";
    return `${b.name} · ${b.level} · ${fr(b.share)} % du mix${inside} · ${CAMP[b.camp]} sous cette coupure · le pays penche ${signed(b.net)} points`;
  },
  netLegend: "le net de chaque pays",
  title: "Le nucléaire décide seul de quel côté penche la France",
  limits:
    `Part du courant de chaque pays en ${YEAR_DRAWN}, sur une échelle ordonnée à cinq barreaux. La France en tire ${fr(share("France", 2))} % du nucléaire, ` +
    `contre ${fr(share("France", 0) + share("France", 1))} % de fossile. Les cinq barreaux font 100 % sous chacune des quatre coupures.`,
  reading:
    `Lecture : déplacez la coupure. Rien n'est ajouté ni retiré — chaque barreau garde sa part et change de côté, et la France passe de ${signed(fossil)} à ` +
    `${signed(renewable)} points. Survolez ou tabulez une bande pour son contenu.`,
  source: `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · ${YEAR_DRAWN}`,
  alt:
    `Six barres horizontales, une par pays, dans l'ordre alphabétique, penchées de part et d'autre d'une ligne centrale fixe. Chaque barre empile cinq barreaux ordonnés : ` +
    `charbon et pétrole, gaz, nucléaire, biomasse, puis éolien, solaire et hydraulique. Par défaut le fossile part à gauche, le renouvelable à droite et le nucléaire est à cheval ` +
    `sur le centre : la France a une bande centrale de ${fr(share("France", 2))} %, plus large que ses quatre autres barreaux réunis. Un contrôle déplace la coupure entre les ` +
    `deux camps sans rien changer aux parts : si le nucléaire compte comme non renouvelable, la France passe de ${signed(fossil)} à ${signed(renewable)} points et devient le ` +
    `pays qui penche le plus à gauche des six, devant la Pologne (${signed(lean(3, false, "Pologne"))}).`,
  evidenceLevels: 5,
  check() {
    const wings = share("France", 0) + share("France", 1) + share("France", 3) + share("France", 4);
    if (!(share("France", 2) > wings)) throw new Error(`France's nuclear band (${fr(share("France", 2))}) is no longer larger than its four other rungs together (${fr(wings)})`);
    if (!(fossil > 0 && renewable < 0)) throw new Error(`France no longer changes side between the two cuts (${signed(fossil)}, ${signed(renewable)})`);
    const deepest = rows.map((r) => r.name).sort((a, b) => lean(3, false, a) - lean(3, false, b))[0];
    if (deepest !== "France") throw new Error(`${deepest}, not France, leans furthest left under the renewable reading`);
  },
};
