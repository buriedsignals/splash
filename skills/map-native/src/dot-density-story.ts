// Beat derivation for dot-density videos — the sibling of deriveLocatorStory. title → establish
// (all dots in view) → reveal the DENSEST regions (dots per area, descending, capped) → takeaway.
// Same Beat shape as the other types. The dot scatter is unchanged; the video just moves the camera.
import {
  applyMapArc,
  type Beat,
  type MapArcBeat,
  type RevealMode,
} from "./map-story";
import type { DotDensityLayout } from "./dot-density-geo";
import type { StagedEntrance } from "./core/staged-reveal";
import { regionBounds } from "./choropleth-geo";
import { area } from "@turf/turf";
import { localizeDecimal, localizeNumberString } from "./core/locale";
import { storyCopy } from "../../../lib/core/story-copy";

export interface DotDensityStoryMeta {
  title: string;
  description?: string;
  insight?: string;
  unit?: string;
  lang?: string;
  // Journalist-confirmed claim-arc override (S2) — see map-story.ts mapArcErrors. Anchors on
  // `regionKey` values (rows[].{regionKey} — the same shape choropleth uses). When present +
  // non-empty, the reveal beats follow the arc (applyMapArc) instead of the density-ranked
  // selection below; absent/empty leaves today's density-ranked walk byte-identical.
  arcBeats?: MapArcBeat[];
}

const DEFAULT_MAX_REVEALS = 5;

/** A region's display name: the basemap's own `name`, falling through to the join key when it
 *  is missing OR blank. The blank rung is the point — see the call sites. */
function regionName(r: { feature: GeoJSON.Feature; key: string }): string {
  const raw = r.feature.properties?.name;
  return raw !== undefined && String(raw).trim() !== "" ? String(raw) : r.key;
}

function formatCompact(v: number, lang?: string): string {
  const abs = Math.abs(v);
  const trim = (s: string) => (s.endsWith(".0") ? s.slice(0, -2) : s);
  if (abs >= 1e9)
    return localizeDecimal(trim((v / 1e9).toFixed(1)) + "B", lang);
  if (abs >= 1e6)
    return localizeDecimal(trim((v / 1e6).toFixed(1)) + "M", lang);
  if (abs >= 1e3)
    return localizeDecimal(trim((v / 1e3).toFixed(1)) + "k", lang);
  return localizeNumberString(String(Math.round(v)), lang);
}

export function deriveDotDensityStory(
  layout: DotDensityLayout,
  meta: DotDensityStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const cap = Math.max(1, opts.maxReveals ?? DEFAULT_MAX_REVEALS);
  const unit = meta.unit ?? "";
  const allBounds = layout.bounds;

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  if (meta.arcBeats?.length) {
    // Journalist-confirmed claim-arc override — the reveals follow the ARC order, not the
    // density-ranked selection below. mapArcErrors (run at the gate) has already validated
    // every arcBeat's region against the data rows' own regionKey values — but the gate has
    // no basemap, and computeDotDensity permits a partial join (a row with no matching
    // basemap feature simply never makes it into `layout.regions`, see dot-density-geo.ts).
    // So a region present in the data but absent from `layout.regions` resolves to null here,
    // and applyMapArc throws defensively — never a silently dropped/misplaced beat.
    const regionByKey = new Map(layout.regions.map((r) => [r.key, r]));
    beats.push(
      ...applyMapArc(meta.arcBeats, (key) => {
        const r = regionByKey.get(key);
        if (!r) return null;
        const totalCount = r.groups.reduce((s, g) => s + g.count, 0);
        // A BLANK basemap name falls through to the key, exactly as a missing one does: `??`
        // alone stopped at "" and the caption rendered "— 40k people", opening on a bare
        // separator (the mirror of the locator hole — see symbol-story.ts's own note).
        const name = regionName(r);
        // Same value formatting the density-ranked walk below uses (formatCompact + unit) —
        // the callout's VALUE, never the callout's TEXT (that is the journalist's own claim).
        const value = `${formatCompact(totalCount * layout.dotValue, meta.lang)}${unit ? " " + unit : ""}`;
        return {
          camera: regionBounds(r.feature),
          highlight: [r.key],
          name,
          value,
        };
      }),
    );
  } else {
    // Rank regions by dot density (total dots / area), descending. Ties broken by key for determinism.
    const ranked = layout.regions
      .map((r) => {
        const totalCount = r.groups.reduce((s, g) => s + g.count, 0);
        const a = Math.max(1e-9, area(r.feature));
        // A BLANK basemap name falls through to the key, exactly as a missing one does: `??`
        // alone stopped at "" and the caption rendered "— 40k people", opening on a bare
        // separator (the mirror of the locator hole — see symbol-story.ts's own note).
        const name = regionName(r);
        let dominant: string | null = null;
        if (layout.hasCategories && r.groups.length) {
          const top = r.groups.reduce((best, g) =>
            g.count > best.count ? g : best,
          );
          dominant =
            layout.legend.find((l) => l.color === top.color)?.category ?? null;
        }
        return { r, name, totalCount, density: totalCount / a, dominant };
      })
      .filter((x) => x.totalCount > 0)
      .sort((a, b) => b.density - a.density || (a.r.key < b.r.key ? -1 : 1));

    for (const x of ranked.slice(0, cap)) {
      const valText = `${formatCompact(x.totalCount * layout.dotValue, meta.lang)}${unit ? " " + unit : ""}`;
      // "mostly" is furniture (the CATEGORY it introduces is data, and stays verbatim) —
      // inline it shipped an English adverb into every non-English dot-density caption.
      const text =
        layout.hasCategories && x.dominant
          ? `${x.name} — ${valText}, ${storyCopy(meta.lang).mostly(x.dominant)}`
          : `${x.name} — ${valText}`;
      beats.push({
        kind: "reveal",
        camera: regionBounds(x.r.feature),
        highlight: [x.r.key],
        dim: true,
        callout: { region: x.r.key, name: x.name, value: valText, text },
        copy: text,
      });
    }
  }

  beats.push({
    kind: "takeaway",
    camera: allBounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}

// Per-dot stipple-in: how far (in the region's own 0→1 entrance-progress units) a dot's fade
// is delayed behind the region's leading edge, scaled by its `__dotOrder` ∈ [0,1) (see
// DotDensityStory.tsx, where each dot is tagged with a deterministic per-region ordering).
// Modest span → reads as a fast ripple across the region's dots, not a slow drip.
export const STAGGER_SPAN = 0.25;

/**
 * A MapLibre data-driven expression that remaps a region's own entrance progress
 * (`regionProgress` — the region's staged `fillEnvelope` this frame, the RAW curve: the DOT
 * layer stages with fillTarget=1, so this value ranges 0 → 1.25 overshoot → 1, see
 * `stagedByKey`/`stagedEntrance`. It is a PROGRESS here, not an opacity — which is exactly
 * why it reads the envelope and not the clamped `fillOpacity`) into a PER-DOT opacity, an
 * opacity that IS clamped below: each dot's ramp is delayed by
 * `__dotOrder * STAGGER_SPAN` and rescaled (same delayed-start, same-end) so every dot still
 * lands on exactly `regionProgress` once the region settles (`regionProgress === 1`) —
 * dots with a higher `__dotOrder` lag behind dots with a lower one while ramping, and all
 * converge to full together at settle. Pure — a fixed JS number folded in, only `__dotOrder`
 * is data-driven.
 */
function staggeredDotOpacityExpr(regionProgress: number): unknown[] {
  const delay: unknown[] = ["*", ["get", "__dotOrder"], STAGGER_SPAN];
  // Bounded BOTH ways. The remap's numerator carries the region's overshoot, and dividing
  // by a shrinking `1 - delay` amplifies it further — a late-ordered dot could reach ~1.4
  // mid-bloom. `circle-opacity` is a [0,1] channel: the GPU saturated the excess, so the
  // out-of-range value was invisible rather than harmless. Clamping here says so.
  return [
    "min",
    1,
    ["max", 0, ["/", ["-", regionProgress, delay], ["-", 1, delay]]],
  ];
}

/**
 * Builds the per-frame `circle-opacity` (data-driven MapLibre expression, or a flat number)
 * for the `dot-density-dots` layer — the STIPPLE-IN twist: the fill channel is the dots
 * themselves, not a bloom fill layer, so each subject region's dot opacity is driven directly
 * off its own `stagedByKey` entrance envelope (0 → overshoot → 1) instead of jumping straight
 * from dim to full at the beat boundary. On top of that, an entering region's dots don't fade
 * in uniformly — `staggeredDotOpacityExpr` staggers each dot by its own `__dotOrder`, so the
 * region stipples in as a quick ripple rather than a flat fade. Pure — no map/DOM access,
 * unit-testable.
 *
 * - `context`: title/establish/takeaway (no dim/highlight) → every dot at full opacity (1).
 *   A reveal beat → the ONE highlighted region's dots stipple in via its own staged fillOpacity,
 *   staggered per-dot (kept simple: only the current beat's subject blends, not every
 *   previously-visited one), every other region held at `dimOpacity`.
 * - `sequential`: nothing is lit from the base map. Every region that has EVER triggered
 *   (past or present reveal beat) shows its own staged fillOpacity, staggered per-dot (0 while
 *   not yet entered, rippling 0→1 once its beat starts, holding at 1 after); anything never
 *   triggered is `closing` — 0 for the whole walk, and on an EXPLAINER story's takeaway the
 *   ramp that brings the rest of the map back (see explainerCloseProgress). A region with no
 *   dots reads as a region with no people, not as "not a subject", so a takeaway about where
 *   the population sits needs the distribution it sat inside. Defaults to 0, which is what
 *   every caller had before, so omitting it renders byte-identical.
 */
export function buildDotOpacityExpression(
  mode: RevealMode,
  beat: Pick<Beat, "dim" | "highlight">,
  stagedMap: Map<string, StagedEntrance>,
  dimOpacity: number,
  closing = 0,
): unknown {
  if (mode === "sequential") {
    const expr: unknown[] = ["case"];
    for (const [key, staged] of stagedMap) {
      expr.push(
        ["==", ["get", "__region"], key],
        staggeredDotOpacityExpr(staged.fillEnvelope),
      );
    }
    expr.push(closing); // default: not (yet) a reveal subject
    return expr;
  }

  if (beat.dim && beat.highlight.length > 0) {
    const highlightKey = beat.highlight[0];
    const staged = stagedMap.get(highlightKey);
    if (!staged) {
      // No entrance data for this subject (shouldn't normally happen) — show it fully,
      // unstaggered: there is no progress to ripple over.
      return ["case", ["==", ["get", "__region"], highlightKey], 1, dimOpacity];
    }
    return [
      "case",
      ["==", ["get", "__region"], highlightKey],
      staggeredDotOpacityExpr(staged.fillEnvelope),
      dimOpacity,
    ];
  }

  return 1;
}
