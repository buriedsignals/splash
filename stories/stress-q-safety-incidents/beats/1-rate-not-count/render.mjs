// Renders beat 1 from the story's OWN frozen source -- never from numbers typed here.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "../../../../shared/chart-beat/render-still.mjs";
import { RateNotCount } from "./RateNotCount.tsx";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported -- no cross-skill runtime import.
 * Mirrors the same tokeniser other beats in this repository carry independently.
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

const csv = await readFile(join(STORY, "source", "data.csv"), "utf8");
const [header, ...rows] = parseCsvRows(csv.trim());
const records = rows.map((r) => Object.fromEntries(r.map((v, i) => [header[i], v])));

// The rate is DERIVED here, from the frozen residents column beside incidents -- the column
// nothing upstream of this beat (grounding, the profile, the format gate) ever reads. See the
// beat's own report for that finding.
const districts = records.map((r) => ({
  name: r.district,
  incidents: Number(r.incidents),
  residents: Number(r.residents),
  rate: (Number(r.incidents) / Number(r.residents)) * 100000,
}));

const centro = districts.find((d) => d.name === "Centro");
const worst = [...districts].sort((a, b) => b.rate - a.rate)[0];
if (worst.name === "Centro") {
  throw new Error("this beat exists because Centro is NOT the worst per capita -- the frozen data no longer supports that");
}

const { ground, accent } = readPalette(HERE, { stopAt: STORY });

const { pngPath, svgPath } = await renderStill({
  element: createElement(RateNotCount, {
    districts,
    title: `${worst.name} has the worst safety record per resident, not Centro`,
    limits: `${worst.rate.toFixed(1)} incidents per 100,000 residents in ${worst.name}, against ${centro.rate.toFixed(1)} in Centro`,
    caveat: `Centro recorded the most incidents in raw terms (${centro.incidents}) -- but not the highest rate.`,
    source: "Source: municipal safety incident report and district population estimates · as of 21 August 2026",
    alt: `A horizontal bar per district, sorted by incidents per 100,000 residents, zero baseline. ${worst.name} is longest at ${worst.rate.toFixed(1)} per 100,000, accented. Centro follows at ${centro.rate.toFixed(1)} per 100,000, annotated with its raw count of ${centro.incidents} -- the highest in the city, but not the highest rate. ${districts
      .filter((d) => d.name !== worst.name && d.name !== "Centro")
      .map((d) => `${d.name} ${d.rate.toFixed(1)} per 100,000`)
      .join("; ")}.`,
    ground,
    accent,
    subject: worst.name,
  }),
  width: 900,
  height: 560,
  outDir: join(HERE, "renders"),
  name: "still",
});
console.log(districts.map((d) => `${d.name}: ${d.rate.toFixed(1)} / 100k (raw ${d.incidents})`).join("\n"));
console.log(`worst per capita -> ${worst.name} (${worst.rate.toFixed(1)}), Centro raw-count leader at ${centro.rate.toFixed(1)}`);
console.log(`rendered -> ${pngPath}\n            ${svgPath}`);
