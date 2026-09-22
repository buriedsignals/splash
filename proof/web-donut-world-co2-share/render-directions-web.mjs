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
const TURN = Math.PI * 2;
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};
const REST = "rest";
const REST_NAME = "tous les autres";

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
// ASCII ordinals on purpose: the subset build refuses a page whose CSS names a face that cannot
// set a character it prints, and neither Open Sans nor Montserrat carries the superscript
// modifiers U+1D49 / U+02B3. "1er", not "1ᵉʳ".
const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);

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
const ranked = [...totals].sort((a, b) => b.after - a.after);
const chosen = ranked.slice(0, HOW_MANY);
for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} (${c.entity}) has no French name filed`);

// WHAT THE REMAINDER HIDES, derived rather than waved at: how many countries it holds and the
// biggest of them. "Tous les autres" is the largest wedge on both rings and it names nobody — the
// one reading a reader cannot get off this plate by looking harder.
const restCount = totals.length - HOW_MANY;
const biggestRest = ranked[HOW_MANY];
if (!biggestRest) throw new Error("the remainder holds no country, so it is not a remainder");
// The page is written in French and the frozen file is not: naming the biggest of the remainder
// off `entity` printed "Indonesia" in a French sentence. The same refusal the six named wedges get.
if (!NAMES[biggestRest.code])
  throw new Error(
    `${biggestRest.code} (${biggestRest.entity}) is the largest country inside "${REST_NAME}" and ` +
      `has no French name filed — the sentence naming it would print the frozen file's English`,
  );

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

/**
 * FOUR TONES, AND THE COUNT IS A MEASUREMENT RATHER THAN A TASTE. `pie-and-donut.md` says colour is
 * this form's only differentiator between adjacent parts; `rampForTones` shows that seven tones of
 * one hue clearing the 3:1 non-text floor do not exist on these grounds — the adjacent step would
 * be 1,14:1. So colour carries what it can carry, which is the claim: the two countries that
 * swapped, the rest of the named six, and the remainder that names nobody. Every wedge still gets
 * its NAME, in the legend row for its tone.
 */
const TONE_OF = { CHN: 0, USA: 1, IND: 2, RUS: 2, JPN: 2, IRN: 2, [REST]: 3 };
const legend = [0, 1, 2, 3].map((tone) => ({
  tone,
  members: [...order.map((c) => ({ key: c.code, name: NAMES[c.code] })), { key: REST, name: REST_NAME }].filter(
    (m) => TONE_OF[m.key] === tone,
  ),
}));
for (const row of legend)
  if (!row.members.length) throw new Error(`tone ${row.tone} names no wedge — a swatch for nobody`);

const wedges = [];
RING.forEach((ring, ri) => {
  const named = order.map((c) => ({ key: c.code, name: NAMES[c.code], value: ring.pick(c) }));
  const rest = ring.world - named.reduce((s, n) => s + n.value, 0);
  const slices = [...named, { key: REST, name: REST_NAME, value: rest }];
  let a = 0;
  slices.forEach((s) => {
    const span = (s.value / ring.world) * TURN;
    const other = RING[1 - ri];
    const otherValue =
      s.key === REST
        ? other.world - order.reduce((t, c) => t + other.pick(c), 0)
        : other.pick(order.find((c) => c.code === s.key));
    wedges.push({
      key: s.key,
      name: s.name,
      ring: ri,
      from: a,
      to: a + span,
      tone: TONE_OF[s.key],
      value: s.value,
      otherValue,
      detail:
        `${s.name} · ${ring.label} : ${fr((s.value / ring.world) * 100)} % du CO₂ mondial ` +
        `(${fr(s.value)} Gt sur ${fr(ring.world)}) · en ${other.label} : ` +
        `${fr((otherValue / other.world) * 100)} % (${fr(otherValue)} Gt)`,
    });
    a += span;
  });
});
const wedgeAt = (key, ring) => wedges.find((w) => w.key === key && w.ring === ring);

// Rank among the SEVEN parts of each ring, derived from the wedges the page draws rather than from
// a second sort of the source rows — a rank quoted off a list the reader is not looking at is a
// number nobody can check.
const rankIn = (ring) => {
  const sorted = wedges.filter((w) => w.ring === ring).sort((a, b) => b.value - a.value);
  return new Map(sorted.map((w, i) => [w.key, i + 1]));
};
const rankBefore = rankIn(0);
const rankAfter = rankIn(1);

/**
 * THE YARDSTICK. Seven options — the six named countries and the remainder — and each lays a
 * reference on BOTH rings, which `assertLevelDeclaration` requires and which is exactly the pairing
 * this beat needs: the wedges are laid out in 2023 order, so one country sits at a different angle
 * on each ring and nothing on the plate walks the eye from one to the other.
 *
 * THE COORDINATE IS AN ANGLE, the third `LevelMark` variant. A donut has no flat band and no
 * upright one: a horizontal rule at one y names TWO wedges, mirrored about the vertical axis, which
 * is the half-answer the vocabulary already refuses one axis over. The angle declared is where the
 * reference band ENDS — the country's own wedge start on this ring, swept by the share it held in
 * the other year — and the component re-derives it from the drawn wedges and refuses a drift.
 */
// A RANK THAT DID NOT MOVE IS NOT A MOVEMENT. "Tous les autres" is first on both rings, and the
// first build printed "elle passe du 1er au 1er rang" — a sentence that says nothing while looking
// like it says something.
const rankMove = (key) =>
  rankBefore.get(key) === rankAfter.get(key)
    ? `reste au ${ordinal(rankAfter.get(key))} rang`
    : `passe du ${ordinal(rankBefore.get(key))} au ${ordinal(rankAfter.get(key))} rang`;

const levelOptionFor = (key, name) => {
  const here = [wedgeAt(key, 0), wedgeAt(key, 1)];
  const pct = [ (here[0].value / RING[0].world) * 100, (here[1].value / RING[1].world) * 100 ];
  const factor = pct[1] / pct[0];
  const movement =
    factor >= 1
      ? `sa part est multipliée par ${fr(factor, factor >= 10 ? 0 : 1)}`
      : `sa part tombe à ${fr(factor * 100, 0)} % de ce qu'elle était`;
  // THE TRAP THIS FORM SETS, SAID OUT LOUD WHERE IT IS TRUE AND NOWHERE ELSE: the whole grew by
  // half, so a share can fall while the tonnes behind it rise, and a share chart that does not
  // carry its absolutes can be read backwards in silence.
  const crossed =
    pct[1] < pct[0] && here[1].value > here[0].value
      ? ` — et sa part baisse pendant que ses tonnes MONTENT, parce que le tout a grandi de moitié`
      : "";
  const hides =
    key === REST
      ? ` Ce sont ${restCount} pays ; le plus gros d'entre eux, ${NAMES[biggestRest.code]}, en pèse ` +
        `${fr(shareAfter(biggestRest))} % du monde à lui seul en ${TO}.`
      : "";
  return {
    key,
    label: name,
    // The two shares, already formatted, for the chip the chosen band draws on the plot. The
    // browser never formats a number — the same rule the notes and the hover answers are held to.
    share: [`${fr(pct[0])} %`, `${fr(pct[1])} %`],
    announce:
      `${name} — ${fr(pct[0])} % du CO₂ mondial en ${FROM}, ${fr(pct[1])} % en ${TO}`,
    note:
      `${name} : ${fr(pct[0])} % du CO₂ mondial en ${FROM} (${fr(here[0].value)} Gt sur ` +
      `${fr(RING[0].world)}) et ${fr(pct[1])} % en ${TO} (${fr(here[1].value)} Gt sur ` +
      `${fr(RING[1].world)}) — ${movement}${crossed}, et elle ${rankMove(key)} des sept parts de ` +
      `l'anneau.${hides}`,
    marks: RING.map((ring, ri) => {
      const other = here[1 - ri];
      const end = here[ri].from + (other.to - other.from);
      return { series: ring.key, angle: ((end % TURN) + TURN) % TURN };
    }),
  };
};
const levels = {
  label: "Suivre un pays",
  // THE UNTOUCHED OPTION IS THE PLATE, in the plate's own words.
  noneLabel: "Les deux anneaux",
  options: [
    ...order.map((c) => levelOptionFor(c.code, NAMES[c.code])),
    levelOptionFor(REST, "Tous les autres"),
  ],
};

// Written in `BRIEF.md` before any of this was built and carried here so the prose and the render
// cannot drift: `assertInteractionPlan` matches every declared gesture against a control the markup
// actually ships, and every shipped control against a declaration.
const interaction = {
  earns:
    "Une image fixe peut dessiner deux anneaux et AFFIRMER que deux pays ont échangé. Elle ne peut " +
    "pas laisser le lecteur demander lequel des sept a bougé, de combien, ni dans quel sens les " +
    "tonnes sont parties pendant que la part partait dans l'autre — la Russie tombe de 6,0 à 4,7 % " +
    "du monde alors que ses tonnes montent de 1,5 à 1,7 Gt. Ici le lecteur pose la part d'une " +
    "année sur l'anneau de l'autre et voit les deux arcs se manquer.",
  controls: [
    {
      question:
        "La Chine et les États-Unis ont échangé, d'accord — et la Russie ? Et l'Inde ? Et ce gros " +
        "morceau qui ne nomme personne ?",
      gesture: "find-your-own-case",
      changes:
        "Le pays choisi prend le cerne sur SES DEUX parts à la fois, une par anneau — c'est la " +
        "première fois que la paire peut être trouvée, puisque les parts sont rangées dans l'ordre " +
        "de 2023 et qu'un même pays tombe donc à un angle différent sur chaque anneau. Puis une " +
        "bande de référence part du début de sa propre part et balaie la part qu'il pesait " +
        "l'AUTRE année : celle de la Chine en 2023 déborde largement sa bande de 2000, celle des " +
        "États-Unis n'atteint pas la sienne. Et la phrase sous le contrôle porte quatre lectures " +
        "qu'aucun arc ne dessine — les deux parts, les deux totaux en Gt, le facteur entre elles, " +
        "et le rang d'où le pays part et où il arrive parmi les sept parts de l'anneau.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel pays est suivi d'un anneau à l'autre",
      authorPicked: "none",
      readerPicks: ["none", "chn", "usa", "ind", "rus", "jpn", "irn", "rest"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "32,9 % de quoi, au juste ?",
      gesture: "ask-a-mark",
      changes:
        "Chaque part — le reste du monde compris — répond avec son pays, sa part de l'année, les " +
        "Gt derrière elle et ce que le même pays pesait l'autre année. Un angle est l'encodage le " +
        "moins lisible de la liste : on peut classer des parts, on ne peut pas en mesurer une.",
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel secteur est en question",
      authorPicked: "la Chine",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

const facts = beatFacts(
  order.map((c) => ({ key: c.code, label: NAMES[c.code], value: shareAfter(c) })),
  { subject: NAMES.CHN, declaredSequence: "% du CO₂ mondial" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// THE HEADLINE, AND ITS LENGTH IS A FORMAT DECISION. A web beat has to fit the window it opens in
// at 375 px, and on `nocturne` — the direction with the largest display register — the longer
// phrasing this beat shipped ran to eight lines and pushed the source line off the screen. Same
// claim, same two numbers, the static sibling's own ending.
const title = `En ${FROM}, États-Unis ${fr(shareBefore(usa))} % du CO₂ mondial et Chine ${fr(shareBefore(chn))} % ; en ${TO}, l'inverse`;
const caveat =
  `Deux anneaux concentriques : le CO₂ mondial en ${FROM} au centre, en ${TO} à l'extérieur. ` +
  `Deux camemberts côte à côte laisseraient croire que les deux touts sont égaux ; ici les ` +
  `totaux sont ÉCRITS au milieu.`;
const centreNote = [`${FROM} : ${fr(worldBefore)} Gt`, `${TO} : ${fr(worldAfter)} Gt`, `+${fr(growth, 0)} %`];
const readingLine =
  `Lecture : choisissez un pays pour le suivre d'un anneau à l'autre ; survolez, touchez ou ` +
  `tabulez une part pour les Gt derrière elle. Quatre tons pour sept parts : au-dessus du ` +
  `plancher de contraste, une teinte n'en porte pas plus. Chaque part est nommée en légende.`;
const source = `Source : Global Carbon Budget 2025 · populations ${FROM} et ${TO}, via Our World in Data`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body:
    `${caveat} ${readingLine} ${source} ${levels.label} ${levels.noneLabel} ` +
    `${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
  axis: `${FROM} ${TO} ${order.map((c) => NAMES[c.code]).join(" ")} ${REST_NAME}`,
  annot: `${centreNote.join(" ")} ${levels.options.map((o) => o.label).join(" ")}`,
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
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      component: DirectedDonutWeb,
      props: {
        wedges,
        rings: RING.map((r) => ({ key: r.key, label: r.label, total: r.total, inner: r.inner, outer: r.outer })),
        legend,
        levels,
        interaction,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, centreNote,
        alt:
          `Deux anneaux concentriques. Sur l'anneau intérieur (${FROM}), la part des États-Unis, ` +
          `${fr(shareBefore(usa))} %, est la plus large des six pays nommés ; celle de la Chine fait ` +
          `${fr(shareBefore(chn))} %. Sur l'anneau extérieur (${TO}), c'est l'inverse : la Chine ` +
          `occupe ${fr(shareAfter(chn))} % et les États-Unis ${fr(shareAfter(usa))} %. Au centre, les ` +
          `deux totaux mondiaux : ${fr(worldBefore)} puis ${fr(worldAfter)} Gt.`,
        direction,
        treatments: offered.map((t) => t.id),
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
