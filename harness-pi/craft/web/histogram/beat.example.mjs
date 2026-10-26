// beat.mjs for the worked example proof/web-histogram-carbon-footprint — "127 countries out of 213 emit
// less than 4 tonnes of CO₂ per person", as an interactive page. The observations come from
// data.json; render-beat.mjs bins them, counts the share under the threshold, computes the quantiles
// and every bin's reading, and hands them to the word functions, check() and alt().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR_COL, VALUE] = [col("Entity"), col("Code"), col("Year"), col("CO2 emissions per capita")];

const YEAR = 2023;
const UNIT = "t CO₂ par personne";
// The readings: one per country in 2023 (three-letter codes only — aggregates like "World" are not countries).
const observations = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(String(r[CODE])) && r[YEAR_COL] === YEAR && Number.isFinite(Number(r[VALUE])))
  .map((r) => ({ name: r[ENTITY], value: Number(r[VALUE]) }));
const highest = observations.reduce((a, b) => (b.value > a.value ? b : a));

const fr = (v, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  observations,
  // Bins two tonnes wide from 0; the threshold the takeaway counts (4) is a bin edge.
  binWidth: 2,
  threshold: 4,
  unit: UNIT,
  // A value of the variable as printed at a rule's foot and in the sentences.
  format: (v) => `${fr(v)} t`,
  // What a bin answers when it is hovered, tapped or tabbed to.
  detail: (b) =>
    `${b.isLast ? `${b.from} ${UNIT} et plus` : `de ${b.from} à moins de ${b.to} ${UNIT}`} · ` +
    `${b.count} pays (${fr(b.sharePct)} % du total) · ` +
    `${fr(b.cumulativePct)} % des pays sont sous ${b.isLast ? "ce palier et au-delà" : `${b.to} t`}` +
    (b.count ? ` · ${b.names.join(", ")}${b.others > 0 ? ` et ${b.others} autres` : ""}` : ""),
  // The two names on the plate: the claim's, at the threshold, and the median's, on its rule.
  claimNote: (s) => `${fr(s.share * 100)} % des pays sous ${s.threshold} t`,
  medianNote: (s) => `médiane ${fr(s.median)} t`,
  // The "measure against" control: coverage bands (quantiles of the observations) and their words.
  bands: [
    { p: 0.75, label: "3 sur 4", words: "Trois quarts" },
    { p: 0.9, label: "9 sur 10", words: "Neuf dixièmes" },
    { p: 0.99, label: "99 sur 100", words: "Quatre-vingt-dix-neuf centièmes" },
  ],
  levelLabel: "Mesurer contre",
  noneLabel: "La distribution seule",
  announce: (b) =>
    `${b.label} — ${`${b.words} des ${b.total} pays sous ${fr(b.value)} t`.toLowerCase()}, dans le palier ` +
    `${b.bin.isLast ? `${b.bin.from} et plus` : `${b.bin.from}–${b.bin.to}`} ${UNIT}`,
  note: (b) =>
    `${b.words} des ${b.total} pays sous ${fr(b.value)} t, dans le palier ${b.bin.isLast ? `${b.bin.from} et plus` : `${b.bin.from}–${b.bin.to}`} · ` +
    `${b.below} sous ce trait, ${b.above} au-dessus · ${fr(b.ratio)} fois la médiane (${fr(b.median)} t) · ` +
    `les ${b.above} restants s'étalent sur les ${fr(b.widthBeyond, 0)} % de largeur qui suivent`,
  title: "127 pays sur 213 émettent moins de 4 tonnes de CO₂ par personne",
  limits:
    `Un pays par observation, ${observations.length} en tout, rangés par paliers de 2 tonnes. Chaque ` +
    `palier est nommé par SES DEUX BORDS, et le dernier dit qu'il est ouvert : un axe gradué ` +
    `« 0 2 4 6 » laisse le lecteur deviner de quel côté de 4 tombe un pays qui émet exactement 4.`,
  reading:
    `Lecture : survolez, touchez ou tabulez un palier pour lire son intervalle, son effectif, sa part ` +
    `du total, la part cumulée jusqu'à son bord haut et les pays qui s'y trouvent. Choisissez une ` +
    `couverture pour dresser le seuil sous lequel tombe cette part des pays : les paliers ` +
    `entièrement au-delà se vident.`,
  source: `Source : Global Carbon Budget 2025, via Our World in Data · ${YEAR}, ${observations.length} pays`,
  alt: ({ count, total, share, median, bands }) =>
    `Un histogramme très déséquilibré vers la droite : ${total} pays rangés par paliers ` +
    `de 2 tonnes de CO₂ par personne en ${YEAR}. Les deux premiers paliers, colorés, ` +
    `contiennent ${count} pays — ${fr(share * 100)} % du total. La médiane est à ` +
    `${fr(median)} tonnes. La queue de droite s'étire jusqu'à ${fr(highest.value)} tonnes ` +
    `(${highest.name}), avec un ou deux pays par palier. Trois quarts des pays sont sous ` +
    `${fr(bands[0].value)} tonnes ; les ${bands[bands.length - 1].above} pays au-delà de ` +
    `${fr(bands[bands.length - 1].value)} tonnes occupent ${fr(bands[bands.length - 1].widthBeyond, 0)} % de la largeur.`,
  evidenceLevels: 2,
  // Given the counted figures: if the data moved, the render refuses.
  check({ count, total }) {
    if (count !== 127 || total !== 213) throw new Error(`${count} countries of ${total} are under 4 t, not 127 of 213`);
  },
};
