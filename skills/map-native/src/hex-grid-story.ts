// Beat derivation for hex-grid videos — the sibling of deriveDotDensityStory. title → establish
// (all cells) → reveal the HIGHEST cells (by aggregate, descending, capped) → takeaway. Cells are
// anonymous grid cells, so a reveal caption is value + rank ("18 points — the densest hexagon"). The
// camera STAYS framed on the data zone: a reveal expands the cell bbox to >= 50% of the full extent so
// it never over-zooms to a single cell (the locator camera lesson).
import type { Beat } from "./map-story";
import type { HexGridLayout } from "./hex-grid-geo";
import { bbox } from "@turf/turf";

export interface HexGridStoryMeta {
  title: string;
  description?: string;
  insight?: string;
}

const DEFAULT_MAX_REVEALS = 5;

// Expand a cell bbox so its span is at least `minFrac` of the full extent (centred on the cell).
function frameCell(
  cell: [number, number, number, number],
  full: [number, number, number, number],
  minFrac = 0.5,
): [number, number, number, number] {
  const [cw, cs, ce, cn] = cell;
  const [fw, fs, fe, fn] = full;
  const cx = (cw + ce) / 2,
    cy = (cs + cn) / 2;
  const halfW = Math.max((ce - cw) / 2, ((fe - fw) * minFrac) / 2);
  const halfH = Math.max((cn - cs) / 2, ((fn - fs) * minFrac) / 2);
  return [cx - halfW, cy - halfH, cx + halfW, cy + halfH];
}

export function deriveHexGridStory(
  layout: HexGridLayout,
  meta: HexGridStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const full = layout.bounds;
  const shapeWord = layout.binShape === "hex" ? "hexagon" : "cell";
  // The unit only applies to sum/mean — those aggregate the points' VALUE column, which the
  // unit describes (e.g. "kWh"). "count" aggregates the points THEMSELVES, already named by
  // the "points" word below; appending a value unit there would misdescribe the number.
  const unit = layout.valueUnit ?? "";
  const fmt = (v: number) =>
    layout.aggregate === "mean"
      ? `${v.toFixed(1)}${unit} avg`
      : layout.aggregate === "sum"
        ? `${Math.round(v)}${unit}`
        : `${Math.round(v)} points`;

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  // Rank cells by aggregate value, descending; ties broken by index for determinism.
  const ranked = layout.cells
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.value - a.c.value || a.i - b.i);

  ranked.slice(0, cap).forEach(({ c, i }, rank) => {
    const cellBbox = bbox(c.feature) as [number, number, number, number];
    const desc =
      rank === 0
        ? "the densest"
        : rank === 1
          ? "the 2nd densest"
          : `#${rank + 1}`;
    const value = fmt(c.value);
    const text = `${value} — ${desc} ${shapeWord}`;
    beats.push({
      kind: "reveal",
      camera: frameCell(cellBbox, full),
      highlight: [String(i)],
      dim: true,
      callout: { region: String(i), name: desc, value, text },
      copy: text,
    });
  });

  beats.push({
    kind: "takeaway",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}
