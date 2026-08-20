// Renders beat 1 from the story's OWN frozen source — never from numbers typed here.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import { GlaceDesSponsors } from "./GlaceDesSponsors.tsx";

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
