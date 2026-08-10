// Renders beat 1 from the story's OWN frozen source — never from numbers typed here.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { GlaceDesSponsors } from "./GlaceDesSponsors.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

const profile = JSON.parse(await readFile(join(STORY, "source", "profile.json"), "utf8"));
const csv = await readFile(join(STORY, "source", "data.csv"), "utf8");
const [header, ...rows] = csv.trim().split(/\r?\n/);
const cols = header.split(",");
const records = rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [cols[i], v])));

const parts = records.map((r) => ({
  actor: r.acteur,
  value: Number(r.glace_fondue_mt),
  isSubject: r.acteur.startsWith("Jeux"),
}));

// Every reader-facing number below is derived from the beat's own frozen data.
const column = profile.columns.find((c) => c.name === "glace_fondue_mt");
const total = parts.reduce((s, p) => s + p.value, 0);
if (total !== column.sum) throw new Error(`the bar totals ${total}, the frozen profile says ${column.sum}`);
const games = parts.find((p) => p.isSubject);
const sponsorShare = Math.round(((total - games.value) / total) * 100);

const { ground, accent } = readPalette(HERE, { stopAt: STORY });

const { pngPath, svgPath } = await renderStill({
  element: createElement(GlaceDesSponsors, {
    parts,
    title: "Les sponsors des JO de Milan Cortina font fondre plus de glace que les Jeux eux-mêmes",
    limits:
      "Les 9 Mt de Stellantis + ITA Airways sont dérivées par soustraction, pas publiées par les entreprises.",
    source: "Source : bilans carbone publiés par les organisateurs et les sponsors · au 10 août 2026",
    alt: `Une seule barre de ${total} millions de tonnes de glace fondue, découpée en ${parts.length} parts : ${parts
      .map((p) => `${p.actor}, ${p.value} Mt`)
      .join(" ; ")}. La part des Jeux eux-mêmes, ${games.value} Mt, est accentuée : elle représente ${Math.round(
      (games.value / total) * 100,
    )} % du total, contre ${sponsorShare} % pour les trois sponsors réunis.`,
    ground,
    accent,
  }),
  width: 900,
  height: 560,
  outDir: join(HERE, "renders"),
  name: "still",
});
console.log(`total ${total} Mt · Jeux ${games.value} Mt (${Math.round((games.value / total) * 100)} %) · sponsors ${sponsorShare} %`);
console.log(`rendered -> ${pngPath}\n            ${svgPath}`);
