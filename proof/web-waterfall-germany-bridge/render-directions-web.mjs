// twin/proof/web-waterfall-germany-bridge/render-directions-web.mjs
//
// Germany's electricity between 2015 and 2024 as a bridge, rendered once per FILED DIRECTION.
//
// CONSERVATION IS CHECKED BEFORE ANYTHING IS DRAWN: the moves must sum to the difference between the
// two declared levels. A bridge that does not reconcile is a bar chart with connectors.
//
// AND IT IS CHECKED ONCE PER COUNTERFACTUAL. The page lets the reader take one contribution back
// out, so three more closing levels exist that the measured arithmetic never covered. Each one is
// walked here — opening level, every remaining move in order — and the number the option PRINTS is
// the number that walk produced. The component then re-walks the same bridge against the steps it is
// about to draw, because a total formatted in this file and a bar scaled in that one are two
// derivations of one number, and the tree has paid for that shape before.
//
// Usage:  bun proof/web-waterfall-germany-bridge/render-directions-web.mjs

import { readdirSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { assertWithdrawChangesThePicture } from "../../skills/chart-web/assets/withdraw.ts";
import { DirectedWaterfallWeb } from "./DirectedWaterfallWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Énergie · Allemagne";
const CODE = "DEU";
const FROM = 2015;
const TO = 2024;
const UNIT = "TWh";
// `the` is the pill's own words and `hollow` the clause the revealed sentence ends on — both typed
// per group rather than assembled, because French agreement is not a string operation: "les
// renouvelables restent dessinées" and "le fossile reste dessiné" differ in two places.
const GROUPS = [
  { key: "renewables", name: "renouvelables", the: "les renouvelables", hollow: "les renouvelables restent dessinées en creux", columns: ["Wind", "Solar", "Hydropower", "Bioenergy", "Other renewables"] },
  { key: "nuclear", name: "nucléaire", the: "le nucléaire", hollow: "le nucléaire reste dessiné en creux", columns: ["Nuclear"] },
  { key: "fossil", name: "fossile", the: "le fossile", hollow: "le fossile reste dessiné en creux", columns: ["Coal", "Gas", "Oil"] },
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
  the: g.the,
  hollow: g.hollow,
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
const movement = moves.reduce((s, m) => s + Math.abs(m.value), 0);
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
  // WITHOUT THIS ONE MOVE, WHERE DOES THE BRIDGE LAND? Walked, not subtracted: the opening level
  // plus every OTHER move, in order, which is the same arithmetic the drawn bridge performs.
  const without = ordered.reduce((level, z) => (z === m ? level : level + z.value), totalBefore);
  steps.push({
    key: m.key,
    name: m.name,
    kind: m.value >= 0 ? "up" : "down",
    from,
    to: cursor,
    label: signed(m.value),
    // THE ANSWER IS TRUE IN EVERY STATE OF THE PAGE, and that is a decision this build made rather
    // than inherited. The previous form said "part de 485 et arrive à 393" — a RUNNING LEVEL, which
    // is exactly what the control now moves, and `data-detail` is a build-time string no CSS
    // rewrites. So the picture carries every running level and the answer carries only what a
    // withdrawal cannot change: the step's own size, its share of all movement, and the total it
    // would leave behind. The last of those is the control's own number, so a keyboard reader who
    // never touches the radios still gets all three readings.
    detail:
      `${m.name} · ${signed(m.value)} ${UNIT} entre ${FROM} et ${TO} · ` +
      `${fr((Math.abs(m.value) / movement) * 100)} % de l'ensemble des mouvements · ` +
      `retirez-la du pont et ${TO} arrive à ${fr(without)} ${UNIT} au lieu de ${fr(totalAfter)}`,
    without,
  });
}
steps.push({
  key: "end",
  name: `${TO}`,
  kind: "level",
  from: 0,
  to: totalAfter,
  label: fr(totalAfter),
  detail:
    `${TO} · niveau d'arrivée · ${fr(totalAfter)} ${UNIT} produits, soit ${signed(net)} depuis ${FROM} · ` +
    `retirez une marche et cette barre se recalcule`,
});
if (Math.abs(cursor - totalAfter) > 0.01)
  throw new Error(`the bridge lands on ${fr(cursor, 2)} and the declared level is ${fr(totalAfter, 2)}`);

// ── what the reader may take out ──────────────────────────────────────────────────────────────
// In the bridge's own order, so the pills read left to right the way the steps do. The words are
// here and the geometry is the component's: how far each downstream step re-steps and where the
// closing level lands are questions only the thing that owns the scale can answer.
const withdrawPlan = {
  // The beat's own word for a step, and two characters shorter than "une contribution": the legend
  // shares its row with the pills, so its width is plot height on a 375px screen.
  label: "Retirer une marche",
  // "Aucune", not "Le pont complet": read with the legend it belongs to — "Retirer une marche :
  // Aucune" — it says the same thing in a third of the width, and the width of this row is plot
  // height at 375px.
  noneLabel: "Aucune",
  options: ordered.map((m, i) => {
    const following = ordered.length - 1 - i;
    const without = steps.find((s) => s.key === m.key).without;
    return {
      key: m.key,
      // The pill names the BAND, in the same word printed under it, and not "le fossile": at 375px
      // the control is four pills plus a legend on a 343px line, and three characters a pill is the
      // difference between two wrapped rows and three — which this format's window-fit rule pays for
      // in plot height. `announce` still contains it, which is the constraint that matters.
      label: m.name,
      announce: plain(
        `Sans ${m.the} : ${TO} arrive à ${fr(without)} ${UNIT} au lieu de ${fr(totalAfter)}`,
      ),
      note: plain(
        `Sans ${m.the} (${signed(m.value)} ${UNIT}), ${TO} arrive à ${fr(without)} ${UNIT} — ` +
          `${signed(without - totalBefore)} depuis ${FROM} au lieu de ${signed(net)}. ` +
          (following > 0
            ? `${following === 1 ? "La marche suivante repart" : `Les ${following} marches suivantes repartent`} du nouveau niveau ; ${m.hollow}.`
            : `C'était la dernière marche : seul le niveau d'arrivée change ; ${m.hollow}.`),
      ),
      restated: fr(without),
      restatedValue: without,
    };
  }),
};

const facts = beatFacts(
  moves.map((m) => ({ key: m.key, label: m.name, value: m.value })),
  { subject: "renouvelables", declaredSequence: UNIT },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE SCALE HAS TO HOLD A BAR THE PLATE NEVER DRAWS. Without the fossil decline the closing level
// lands ABOVE the opening one, so the ceiling is derived from every level this page can reach —
// measured and counterfactual — and not from the two the still draws. `withdraw.ts` refuses an
// option whose recomputed bar would leave the frame; this is what keeps it from having to.
const reach = Math.max(
  totalBefore,
  totalAfter,
  ...withdrawPlan.options.map((o) => o.restatedValue),
);
const ceiling = Math.ceil(reach / 100) * 100;
const yTicks = Array.from({ length: ceiling / 100 + 1 }, (_, i) => i * 100);

const grew = moves.find((m) => m.value > 0);
const fell = moves.filter((m) => m.value < 0);
const title = `L'électricité allemande a perdu ${fr(Math.abs(net))} TWh entre ${FROM} et ${TO} : ${fell.map((m) => `${m.name} ${signed(m.value)}`).join(", ")} contre ${grew.name} ${signed(grew.value)}`;
const caveat =
  `Un pont entre DEUX NIVEAUX NOMMÉS : la production totale de ${FROM} à gauche, celle de ${TO} à ` +
  `droite, les mouvements par groupe de sources entre les deux. Le SENS d'une marche porte le ` +
  `signe ; la couleur le répète. Les marches se somment exactement à l'écart entre les niveaux — ` +
  `vérifié pour les quatre ponts de cette page.`;
// WHAT THE READING LINE SAYS, AND WHAT IT STOPPED SAYING. Its first form spelled out all four
// things a withdrawal does to the picture — and every one of them is already in the sentence the
// chosen option reveals, two rows above, where a reader meets it at the moment it is true. Three
// wrapped lines of the same words cost 45px of plot height at 375px, which this format's window-fit
// rule takes out of the geometry. The line names the two gestures; the control explains itself.
const readingLine =
  `Lecture : retirez une marche, le pont se recalcule. Survolez ou tabulez une marche pour sa ` +
  `valeur et le total qu'elle laisserait.`;
const source = `Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · Allemagne, ${FROM} et ${TO}`;

// A REGISTER'S DECLARED TEXT IS WHAT THE PAGE'S OWN FACES ARE SUBSETTED FROM, so a glyph the page
// can display and no register names is a glyph the delivered file cannot draw. The control's own
// words — the legend, the four pills, the three sentences it reveals — are new words on this page
// and they go in, alongside the counterfactual totals the value register now has to carry.
const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${withdrawPlan.label} ${withdrawPlan.noneLabel} ${withdrawPlan.options
    .map((o) => `${o.label} ${o.announce} ${o.note}`)
    .join(" ")}`,
  axis: `${yTicks.join(" ")} ${steps.map((s) => s.name).join(" ")}`,
  annot: `${FROM} ${fr(totalBefore)} ${TO} ${fr(totalAfter)} ${withdrawPlan.label} ${withdrawPlan.options
    .map((o) => o.note)
    .join(" ")}`,
  value: [
    ...steps.map((s) => s.label),
    ...withdrawPlan.options.map((o) => o.restated),
  ].join(" "),
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
  let outPath = null;
  try {
    ({ outPath } = await renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedWaterfallWeb,
      props: {
        steps, withdrawPlan, yTicks, unit: UNIT,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine,
        alt:
          `Un pont : une barre pleine à ${fr(totalBefore)} TWh pour ${FROM}, puis trois marches — ` +
          moves.map((m) => `${m.name} ${signed(m.value)}`).join(", ") +
          ` — et une barre pleine à ${fr(totalAfter)} TWh pour ${TO}. Les marches descendantes sont ` +
          `plus longues que la montante, et le pont arrive ${fr(Math.abs(net))} TWh plus bas qu'il ` +
          `n'était parti. Un choix au-dessus du graphique retire une des trois marches : elle se ` +
          `vide, les suivantes repartent du nouveau niveau et la barre de ${TO} se redessine.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    }));
    // THE CONTROL CHANGES THE PICTURE, MEASURED ON THE PAGE THAT WAS JUST WRITTEN. `renderWeb` runs
    // `assertInteractionPlan`, whose census discovers a filter, a stack and a yardstick by their own
    // radio ids and knows nothing of this vocabulary's — so the refusal ships with the vocabulary
    // instead of being squatted onto another one's name. A page that fails it is removed rather than
    // left on disk, because a written file is a file somebody will open.
    assertWithdrawChangesThePicture(
      await readFile(outPath, "utf8"),
      withdrawPlan,
      `renders/${id}.html`,
    );
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    if (outPath) await unlink(outPath).catch(() => {});
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
