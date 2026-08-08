// Beat derivation for cartogram videos/scrolly. title → establish (full extent) → reveal the
// HIGHEST regions by value (descending, capped) → takeaway. Each reveal highlights one region by
// its id so components can dim non-highlighted cells. The camera stays framed on the data zone:
// a reveal expands the cell bbox to >= 50% of the full extent (same frameCell rule as hex-grid).
import {
  applyMapArc,
  closingCaption,
  deriveTakeawayCopy,
  type Beat,
  type MapArcBeat,
} from "./map-story";
import type { CartogramLayout } from "./cartogram-geo";
import { bbox } from "@turf/turf";
import { labelWithUnit, localizeValueLabel } from "./core/locale";
import { storyCopy } from "../../../lib/core/story-copy";

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
  const valueOf = (v: number) =>
    labelWithUnit(fmt(v), layout.valueUnit, meta.lang);
  const copy = storyCopy(meta.lang);

  // Value-descending, ONE sort, two readers: the ranked walk below slices its reveals off the
  // front, and the closer reads both ends. Same comparator (and same index tie-break) the walk
  // always used, so the reveal order is byte-identical.
  const ranked = layout.cells
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.value - a.c.value || a.i - b.i);

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
          value: valueOf(c.value),
        };
      }),
    );
  } else {
    ranked.slice(0, cap).forEach(({ c }, rank) => {
      const cellBbox = bbox(c.feature) as [number, number, number, number];
      // Furniture, so it comes out of the locale table — inline it was three English
      // literals that shipped verbatim into every French, German and Italian cartogram.
      const rankDesc = copy.rankOfHighest(rank + 1);
      // Display value with its unit. Through `labelWithUnit`, like every other surface:
      // bare concatenation reads "16%" correctly and "157détenus" wrong, and only the second
      // kind of unit ever showed the defect.
      const value = valueOf(c.value);
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

  // A cartogram is named cells with one number each — the same shape a choropleth is, so it
  // closes on the same sentence (`deriveTakeawayCopy`): the cell that dominates, the one that
  // trails, and the gap between them. Read off ALL the cells, not the capped walk: every tile is
  // drawn, so the smallest is on screen whether or not the walk reached it.
  //
  // Measured before this: with no `insight` the copy was "", and the page closed on the figure's
  // DESCRIPTION — its own opening card, verbatim.
  const leader = ranked[0]?.c;
  const trail = ranked[ranked.length - 1]?.c;
  beats.push({
    kind: "takeaway",
    camera: full,
    highlight: [],
    dim: false,
    callout: null,
    copy: closingCaption(
      meta.insight,
      meta.title,
      leader && trail
        ? deriveTakeawayCopy({
            pattern: "magnitude",
            maxName: leader.name,
            maxValue: leader.value,
            maxLabel: valueOf(leader.value),
            minName: trail.name,
            minValue: trail.value,
            minLabel: valueOf(trail.value),
            lang: meta.lang,
          })
        : "",
    ),
  });

  return beats;
}
