// proof/scrolly-tmp-europe-lowcarbon/render-directions-scrolly.mjs — scrolly-tmp-europe-lowcarbon's own bar-and-column scrolly, rendered once per DIRECTION.
// SCAFFOLD: read skills/scrolly/references/types/bar-and-column.md for this type's own scroll gestures before writing
// the choreography, DirectedEuropeLowCarbonLeadersScrolly.tsx and bar-and-column-drive.mjs.
//
// ONE ART DIRECTION BY DEFAULT: composed from this beat's own PALETTE.md (or an ancestor's) and its own text,
// through composeDirections — a production run renders exactly one. --filed renders the three filed demo
// directions instead, for a catalogue proof only. --only <id> picks one of whichever set is rendered.
//
// Usage: bun proof/scrolly-tmp-europe-lowcarbon/render-directions-scrolly.mjs [--filed] [--only <id>]

import { readdirSync, readFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// FRICTION: the scaffold template assumes a beat lives directly under proof/<subject>/ (two levels
// above repo root). A story's own beats/<id>/ is FOUR levels above root
// (stories/<slug>/beats/<id>/), so the generated "../.." here and in the renderScrolly import below
// pointed two levels short of the repo root. Fixed locally for this beat; logged in
// cold-chart-friction.md rather than edited in the skill.
const DIRECTIONS = join(HERE, "../../../..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** The no-break space, written as its escape — number formatting helpers live at #shared/design-base/web.mjs. */
const NB = "\u00A0";
const SCAFFOLD_MARK = "SCAFFOLD";
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const FILED = process.argv.includes("--filed");

// ── the readings, and this beat's own assertions ─────────────────────────────────────────────────
// Reads the analyst's own beats/1/data.json (never the source CSV directly) and derives the ranked
// low-carbon share per country. LOW_CARBON groups nuclear with every renewable source, as stated in
// STORYBOARD.md's `limits`. Ukraine carries zero recorded generation across every source in this
// file (a wartime data gap) so its share is undefined and it is excluded — 40 of the 41 frozen rows.
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];

function loadSubject() {
  const raw = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
  const names = raw.columns.map((c) => c.name);
  const at = (row, name) => Number(row[names.indexOf(name)]) || 0;
  const measures = names.slice(3);
  const countries = raw.rows
    .map((row) => {
      const total = measures.reduce((sum, name) => sum + at(row, name), 0);
      const low = LOW_CARBON.reduce((sum, name) => sum + at(row, name), 0);
      return { entity: row[names.indexOf("entity")], code: row[names.indexOf("code")], total, share: total > 0 ? (100 * low) / total : null };
    })
    .filter((c) => c.share !== null)
    .sort((a, b) => b.share - a.share);
  if (countries.length !== 40) throw new Error(`${SCAFFOLD_MARK}: expected 40 rankable countries (41 frozen rows minus Ukraine's zero-generation row), got ${countries.length} — STORYBOARD.md's limits field no longer matches the data`);
  const cutRank = 10;
  const top = countries.slice(0, cutRank);
  const rest = countries.slice(cutRank);
  const restAvg = rest.reduce((s, c) => s + c.share, 0) / rest.length;
  return { countries, cutRank, top, rest, restAvg, below50: rest.filter((c) => c.share < 50).length };
}

const subject = loadSubject();

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const EYEBROW = "Electricity, 2024";
const title = ["Europe's most low-carbon power grids are far ahead of the rest", "Europe's low-carbon leaders, and the gap behind them"];
const prose = [
  [`In 2024, forty European countries generated electricity from a mix of fossil fuels, renewables and nuclear power. Ranked by how low-carbon each grid was, one group stands far apart.`],
  [`Every one of the ten leaders — from ${subject.top[0].entity} down to ${subject.top[9].entity} — generated at least ${Math.round(subject.top[9].share)}%${NB}of its electricity from hydro, wind, solar, bioenergy or nuclear power. ${subject.top[0].entity} and ${subject.top[1].entity} reached 100%.`],
  [`Below them, the drop is sharp: the other ${subject.rest.length} countries average just ${Math.round(subject.restAvg)}%, and ${subject.below50} of them — down to ${subject.countries[subject.countries.length - 1].entity} — generate less than half their power without fossil fuels.`],
];
const source = `Source${NB}: Ember${NB}/${NB}Our World in Data, electricity generation by source, 2024. Low-carbon${NB}=${NB}hydro, wind, solar, bioenergy, other renewables, nuclear. Ukraine excluded (no recorded generation in this file).`;
const words = {
  unit: `Low-carbon share of electricity generation, 2024${NB}(%)`,
  scope: `${subject.countries.length}${NB}countries ranked`,
  gap: `Top ten${NB}≥${NB}${Math.round(subject.top[9].share)}%${NB}·${NB}the rest average ${Math.round(subject.restAvg)}%`,
};
const alt = `A bar chart ranking ${subject.countries.length} European countries by the share of their 2024 electricity generated from low-carbon sources (hydro, wind, solar, bioenergy, nuclear). The top ten countries, led by ${subject.top[0].entity} and ${subject.top[1].entity} at 100%, all reach at least ${Math.round(subject.top[9].share)}%. The remaining ${subject.rest.length} countries average ${Math.round(subject.restAvg)}%, with ${subject.countries[subject.countries.length - 1].entity} lowest at ${Math.round(subject.countries[subject.countries.length - 1].share)}%.`;
if ([title.join(""), prose.flat().join(""), source, JSON.stringify(words), alt].some((s) => s.includes(SCAFFOLD_MARK)))
  throw new Error(`${SCAFFOLD_MARK}: scrolly-tmp-europe-lowcarbon still carries placeholder copy — write the title, prose, source, words and alt before rendering (render-directions-scrolly.mjs)`);

/** One state per card, numeric fields only (interpolated continuously between cards):
 *  reveal — every bar grows from a zero baseline (0 → 1);
 *  focus  — 0: uniform muted bars; 1: the top ten pull into the accent colour, the rest dim, and
 *           the cut-line + gap note appear (the "reorder / regroup" gesture bar-and-column.md asks for);
 *  note   — crossfades the two exclusive header notes (0 = scope, 1 = gap), see NOTES in the .tsx. */
const STATES = [
  { reveal: 0, focus: 0, note: 0 },
  { reveal: 1, focus: 0, note: 0 },
  { reveal: 1, focus: 1, note: 1 },
];
if (STATES.length !== prose.length) throw new Error(`${SCAFFOLD_MARK}: STATES carries ${STATES.length} states for ${prose.length} cards of prose — one state per card`);

// ── only past this point is the heavy machinery (the rasteriser, the design base, renderScrolly) loaded — a
// beat still carrying placeholder copy refuses above, without ever touching any of it. ──────────────────────
const { createElement } = await import("react");
const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
const { readPalette } = await import("#shared/chart-beat/colour.mjs");
const { readDirection } = await import("#shared/design-base/read-direction.mjs");
const { composeDirections, report } = await import("#shared/design-base/compose.mjs");
const { resolveDirectionFamilies } = await import("#shared/design-base/resolve-families.mjs");
const { webRegisters } = await import("#shared/design-base/web.mjs");
const { EYEBROW_TO_DISPLAY, gapOf, registerOf } = await import("#shared/design-base/register.mjs");
const { renderScrolly } = await import("../../../../skills/scrolly/scripts/render-scrolly.mjs");
const { DirectedEuropeLowCarbonLeadersScrolly } = await import("./DirectedEuropeLowCarbonLeadersScrolly.tsx");

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: words.unit,
  annot: "",
  value: Object.values(words).join(" "),
};

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort().map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 }; // SCAFFOLD: how many ranked levels of evidence BRIEF.md names
const composition = composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister });
console.log(report(composition, { beat: BEAT_FACTS }));
console.log("");

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const chosen = FILED
  ? filed.map((d) => ({ id: labelOf(d.id), direction: d }))
  : (() => {
      if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${report(composition, { beat: BEAT_FACTS })}`);
      return [{ id: labelOf(composition.offered[0].id), direction: composition.offered[0] }];
    })();
if (ONLY && !chosen.some((c) => c.id === ONLY)) throw new Error(`--only takes one of ${chosen.map((c) => c.id).join(", ")}`);
const toRender = chosen.filter((c) => !ONLY || c.id === ONLY);

const driver = await readFile(join(HERE, "bar-and-column-drive.mjs"), "utf8");
const refused = [];
for (const { id, direction: picked } of toRender) {
  const direction = resolveDirectionFamilies(picked, textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: `card-${i + 1}`, prose: p })),
      reveal: {
        element: createElement(DirectedEuropeLowCarbonLeadersScrolly, {
          countries: subject.countries,
          cutRank: subject.cutRank,
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyEuropeLowCarbonLeadersState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "en", // SCAFFOLD: the beat's own language
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
