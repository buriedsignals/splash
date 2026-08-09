// The runner for the MAP scrolly beat: one year of earthquakes, one baked camera, FOUR different
// maps — raw dots, hexagons by count, proportional symbols for the largest events, and the same
// hexagons by their strongest event.
//
// This file is a CONSUMER of `twin-scrolly`: it imports the skill's own generic `renderScrolly`
// (the media-agnostic scaffold above its CONFIG marker) and builds its own `steps` array from its
// own frame components (`MapFrames.tsx`). Nothing under `twin-scrolly/` is edited by it.
//
// WHY THIS EARNS THE SCROLL. The vehicle's own rule is that a scrolly earns its keep by carrying
// media a single beat cannot assemble, and refuses "the same picture, stepped". Every step here is
// a DIFFERENT MAP of one dataset — a different encoding, a different question, a different answer —
// over one fixed camera that never moves, so the reader's eye stays on the same world while what is
// drawn on it changes. `mapmore-scrolly-danube`, the only map scrolly this project had, steps ONE
// encoding through a growing subset; this one steps four encodings through the same complete set.
//
// Usage:
//   bun proof/mapscrolly-quakes-three-ways/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  deriveFurniture,
  readPalette,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  parseCsv,
  quakePointsFromCsv,
  sequentialRamp,
} from "./geo-hex.ts";
import {
  deriveQuakeFacts,
  cellLonLat,
  ordinal,
} from "./quake-encodings.ts";
import {
  DotFrame,
  HexCountFrame,
  SymbolFrame,
  HexStrengthFrame,
  PROSE_LANE,
} from "./MapFrames.tsx";
import { renderScrolly } from "../../skills/twin-scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// The colours come from the answer recorded in PALETTE.md beside this beat — never a hex here.
const {
  ground,
  accent,
  origin,
  source: paletteSource,
} = readPalette(HERE, { stopAt: join(HERE, "..") });
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(
  argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"),
);

/** The one magnitude the symbol step draws down to. A knob, stated in the brief. */
const BIG_THRESHOLD = 6.5;
/** The largest circle the symbol step draws, in PLATE pixels (the plate is 836 wide). */
const MAX_SYMBOL_RADIUS = 26;
/**
 * The ends of both hex ramps, as a fraction of ground → ink. The sibling hex beat measured 0.14 for
 * a page-sized figure; a scrolly frame is the whole viewport and its lowest class has to stay
 * readable as a CELL against a basemap it now covers edge to edge, so the low end is lifted and the
 * high end pushed. Looked at, not reasoned: at 0.14/0.82 the lightest half of the field washed the
 * coastlines out without reading as data.
 */
const RAMP_ENDS = { from: 0.22, to: 0.94 };

// The page `renderScrolly` writes declares `lang="en"`, so the grouping separator is the English
// one — and it comes from `Intl`, never from a hand-rolled regex.
const group = new Intl.NumberFormat("en-US").format;
const one = (v) => v.toFixed(1);

function legendLabels(breaks, maxValue, fmt) {
  return [...breaks.map(fmt), fmt(maxValue)];
}

async function render() {
  const csv = await readFile(join(HERE, "quakes-density.csv"), "utf8");
  const quakes = quakePointsFromCsv(csv);

  // The catalogue's own year, read off the timestamps rather than taken from the file's name.
  const rows = parseCsv(csv);
  const timeColumn = rows[0].indexOf("time");
  if (timeColumn < 0)
    throw new Error("quakes-density.csv has no `time` column to read the year from");
  const years = [
    ...new Set(rows.slice(1).map((r) => r[timeColumn]?.slice(0, 4)).filter(Boolean)),
  ];
  if (years.length !== 1)
    throw new Error(
      `this beat says "one year of earthquakes"; the catalogue spans ${years.sort().join(", ")}`,
    );
  const year = years[0];

  const geometry = JSON.parse(
    await readFile(join(HERE, "plate", "geometry.json"), "utf8"),
  );
  const plateBuffer = await readFile(join(HERE, "plate", "plate.png"));
  const plate = `data:image/png;base64,${plateBuffer.toString("base64")}`;

  const points = geometry.points.map((p) => ({ px: p.px, py: p.py, i: p.i }));
  const facts = deriveQuakeFacts({
    quakes,
    points,
    frame: geometry.frame,
    corners: geometry.frameCorners,
    bigThreshold: BIG_THRESHOLD,
  });

  // One ramp language for BOTH hex frames, on purpose: same cells, same shading grammar, different
  // variable — which is what makes the change between step 2 and step 4 legible as a change in the
  // DATA rather than a change in the chart. Ground → ink, the one legitimate gradient on a map;
  // the accent is kept for the rings the prose names.
  const countRamp = sequentialRamp(
    ground,
    furniture.ink,
    facts.countBreaks.length + 1,
    RAMP_ENDS.from,
    RAMP_ENDS.to,
  );
  const magRamp = sequentialRamp(
    ground,
    furniture.ink,
    facts.magBreaks.length + 1,
    RAMP_ENDS.from,
    RAMP_ENDS.to,
  );

  const shared = { ground, ink: furniture.ink, muted: furniture.muted, accent };
  const busiest = facts.busiest.cell;
  const strongestCell = facts.strongest.cell;

  const steps = [
    {
      id: "events",
      prose: [
        `Every earthquake of magnitude ${one(facts.minMag)} and above the USGS catalogued in ${year}: ${group(facts.onFrame)} of them, one dot each. Nobody drew the plate boundaries — the dots did. What dots cannot do is let you count: on the busiest rims, hundreds sit on top of one another.`,
      ],
      frame: createElement(DotFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        points,
      }),
    },
    {
      id: "bins",
      prose: [
        `Binned into ${facts.cells.length} equal hexagons, the pile-up becomes countable — and it is more concentrated than the dots let you guess: ${facts.cellsHoldingHalf} of the ${facts.cells.length} cells hold half of all ${group(facts.onFrame)} events. The busiest, ringed, holds ${group(busiest.count)}, off ${facts.busiest.regions}.`,
      ],
      frame: createElement(HexCountFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        facts,
        ramp: countRamp,
        legendLabels: legendLabels(facts.countBreaks, busiest.count, group),
        ringed: [busiest],
      }),
    },
    {
      id: "biggest",
      prose: [
        `How many is not how strong. Only ${facts.bigEvents.length} of the year's earthquakes reached magnitude ${one(BIG_THRESHOLD)}, and sized by the energy that implies they pick out different coasts. The largest, magnitude ${one(facts.maxMag)}: the ${facts.strongestEvent.place}.`,
      ],
      frame: createElement(SymbolFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        facts,
        maxRadius: MAX_SYMBOL_RADIUS,
      }),
    },
    {
      id: "strength",
      prose: [
        `Shade the same ${facts.cells.length} hexagons by their strongest event instead of their count and the ring moves: the cell holding that magnitude ${one(facts.maxMag)}, off ${facts.strongest.regions}, is only the ${ordinal(facts.strongest.rankByCount)} busiest of the year — ${group(strongestCell.count)} events against the leader's ${group(busiest.count)}.`,
      ],
      frame: createElement(HexStrengthFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        facts,
        ramp: magRamp,
        legendLabels: legendLabels(facts.magBreaks, facts.maxMag, one),
        // ONE ring per frame, and this is the beat's own scroll affordance: between step 2 and
        // step 4 the ring JUMPS, on a camera that never moves, from the cell with the most events
        // to the cell with the strongest one. Ringing both here would leave the paragraph's own
        // word "ring" ambiguous — which is the defect this project logged against a sibling hex
        // beat, a highlighted hexagon with nothing said about it.
        ringed: [strongestCell],
      }),
    },
  ];

  const title = `The same ${group(facts.onFrame)} earthquakes, four maps, four different answers`;
  const source =
    `Earthquakes of magnitude ${one(facts.minMag)} and above, worldwide, ${year}: USGS Earthquake Catalog ` +
    `(earthquake.usgs.gov). Basemap © MapTiler © OpenStreetMap contributors, baked once at ` +
    `${geometry.frame.width}×${geometry.frame.height} and embedded — the delivered file makes no request and carries no key. ` +
    `${group(facts.offFrame)} of the ${group(facts.catalogued)} catalogued events fall poleward of this frame ` +
    `(${Math.abs(Math.round(facts.latRange.south))}°S–${Math.round(facts.latRange.north)}°N) and are not drawn. ` +
    `Colours recorded in ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    outDir,
    name: "quakes-four-maps.html",
    proseLane: PROSE_LANE,
  });

  const busiestAt = cellLonLat(busiest, geometry.frameCorners, geometry.frame);
  const strongestAt = cellLonLat(
    strongestCell,
    geometry.frameCorners,
    geometry.frame,
  );
  console.log(
    `map-scrolly → ${outPath}  [${steps.length} steps, ${group(facts.onFrame)}/${group(facts.catalogued)} on frame, ` +
      `${facts.cells.length} cells at size ${facts.hexSize.toFixed(2)}, panel contrast ${panelContrast.toFixed(2)}:1]\n` +
      `  busiest ${group(busiest.count)} (${facts.busiest.regions}) at ${busiestAt.lat.toFixed(1)}, ${busiestAt.lon.toFixed(1)} — margin over second ${facts.busiest.marginOverSecond}\n` +
      `  strongest M${one(facts.maxMag)} (${facts.strongest.regions}) at ${strongestAt.lat.toFixed(1)}, ${strongestAt.lon.toFixed(1)} — rank by count ${facts.strongest.rankByCount}, ${group(strongestCell.count)} events\n` +
      `  count breaks ${facts.countBreaks.join(", ")} · magnitude breaks ${facts.magBreaks.map(one).join(", ")} · ${facts.bigEvents.length} events at M${one(BIG_THRESHOLD)}+`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
