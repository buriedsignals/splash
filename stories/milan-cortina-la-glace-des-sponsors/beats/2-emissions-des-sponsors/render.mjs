import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import { RepartitionEmissions } from "./RepartitionEmissions.tsx";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const profile = JSON.parse(await readFile(join(STORY, "source", "profile.json"), "utf8"));
const csv = await readFile(join(STORY, "source", "data.csv"), "utf8");
const [header, ...rows] = parseCsvRows(csv.trim());
const cols = header;
const records = rows.map((r) => Object.fromEntries(r.map((v, i) => [cols[i], v])));

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
