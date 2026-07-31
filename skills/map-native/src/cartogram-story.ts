// Beat derivation for cartogram videos/scrolly. title → establish (full extent) → reveal the
// HIGHEST regions by value (descending, capped) → takeaway. Each reveal highlights one region by
// its id so components can dim non-highlighted cells. The camera stays framed on the data zone:
// a reveal expands the cell bbox to >= 50% of the full extent (same frameCell rule as hex-grid).
import { applyMapArc, type Beat, type MapArcBeat } from "./map-story";
import type { CartogramLayout } from "./cartogram-geo";
import { bbox } from "@turf/turf";
import { localizeValueLabel } from "./core/locale";

export interface CartogramStoryMeta {
  title: string;
  description?: string;
  insight?: string;
  lang?: string;
  // Journalist-confirmed claim-arc override (S2) — see map-story.ts mapArcErrors.
  // Anchors on cell ids (`layout.cells[].id`, the data's `values[].id`). When present +
  // non-empty, the reveal beats follow the arc (applyMapArc) instead of the value-ranked
  // walk below; absent/empty leaves today's ranked walk byte-identical.
  arcBeats?: MapArcBeat[];
}

const DEFAULT_MAX_REVEALS = 5;

// Expand a cell bbox so its span is at least `minFrac` of the full extent (centred on the cell).
// Copied verbatim from hex-grid-story — this is the shared "never over-zoom a single cell" rule.
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

export function deriveCartogramStory(
  layout: CartogramLayout,
  meta: CartogramStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const full = layout.bounds;

  const fmt = (v: number) => localizeValueLabel(v, meta.lang);

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

  if (meta.arcBeats?.length) {
    // Journalist-confirmed claim-arc override — the reveals follow the ARC order, not the
    // value-ranked selection below. mapArcErrors (run at the gate) has already validated
    // every arcBeat's region against the cells' own ids, so this lookup cannot miss
    // (applyMapArc throws defensively if one somehow did). The camera uses the SAME
    // frameCell(cellBbox, full, 0.5) box a ranked reveal uses — never the full extent.
    const cellById = new Map(layout.cells.map((c) => [c.id, c]));
    beats.push(
      ...applyMapArc(meta.arcBeats, (id) => {
        const c = cellById.get(id);
        if (!c) return null;
        const cellBbox = bbox(c.feature) as [number, number, number, number];
        return {
          camera: frameCell(cellBbox, full, 0.5),
          highlight: [c.id],
          name: c.name,
          value: `${fmt(c.value)}${layout.valueUnit}`,
        };
      }),
    );
  } else {
    // Rank cells by value descending; tie-break by index for determinism.
    const ranked = layout.cells
      .map((c, i) => ({ c, i }))
      .sort((a, b) => b.c.value - a.c.value || a.i - b.i);

    ranked.slice(0, cap).forEach(({ c }, rank) => {
      const cellBbox = bbox(c.feature) as [number, number, number, number];
      const rankDesc =
        rank === 0
          ? "the highest"
          : rank === 1
            ? "the 2nd highest"
            : `#${rank + 1}`;
      // Display value with its unit (e.g. "16%") — mirrors ChoroplethMap's callout
      // formatting (`${shownValue}${valueUnit}`).
      const value = `${fmt(c.value)}${layout.valueUnit}`;
      const text = `${value} ${layout.valueLabel} — ${rankDesc} — ${c.name}`;
      beats.push({
        kind: "reveal",
        camera: frameCell(cellBbox, full, 0.5),
        highlight: [c.id],
        dim: true,
        callout: { region: c.id, name: c.name, value, text },
        copy: text,
      });
    });
  }

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
