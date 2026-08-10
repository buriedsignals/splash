import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import { RepartitionEmissions } from "./RepartitionEmissions.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const profile = JSON.parse(await readFile(join(STORY, "source", "profile.json"), "utf8"));
const csv = await readFile(join(STORY, "source", "data.csv"), "utf8");
const [header, ...rows] = csv.trim().split(/\r?\n/);
const cols = header.split(",");
const records = rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [cols[i], v])));

const parts = records.map((r) => ({
  actor: r.acteur,
  value: Number(r.emissions_tco2e) / 1000,
  isSubject: r.acteur.startsWith("Jeux"),
}));
const column = profile.columns.find((c) => c.name === "emissions_tco2e");
const total = parts.reduce((s, p) => s + p.value, 0);
if (Math.round(total * 1000) !== column.sum) throw new Error(`bar totals ${total * 1000}, profile says ${column.sum}`);
const games = parts.find((p) => p.isSubject);
const { ground, accent } = readPalette(HERE, { stopAt: STORY });

const { pngPath } = await renderStill({
  element: createElement(RepartitionEmissions, {
    parts,
    title: "Sur les 2,23 millions de tonnes de CO2, les Jeux n'en déclarent que 930 000",
    limits: "Les 600 000 t de Stellantis + ITA Airways sont dérivées par soustraction, pas publiées.",
    source: "Source : bilans carbone publiés par les organisateurs et les sponsors · au 10 août 2026",
    alt: `Une seule barre de ${Math.round(total)} milliers de tonnes équivalent CO2, découpée en ${parts.length} parts : ${parts
      .map((p) => `${p.actor}, ${Math.round(p.value)} kt`)
      .join(" ; ")}. La part des Jeux eux-mêmes, ${Math.round(games.value)} kt, est accentuée : ${Math.round((games.value / total) * 100)} % du total.`,
    ground,
    accent,
  }),
  width: 900,
  height: 560,
  outDir: join(HERE, "renders"),
  name: "still",
});
console.log(`rendered -> ${pngPath}`);
