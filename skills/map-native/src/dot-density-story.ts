// Beat derivation for dot-density videos — the sibling of deriveLocatorStory. title → establish
// (all dots in view) → reveal the DENSEST regions (dots per area, descending, capped) → takeaway.
// Same Beat shape as the other types. The dot scatter is unchanged; the video just moves the camera.
import type { Beat, RevealMode } from "./map-story";
import type { DotDensityLayout } from "./dot-density-geo";
import type { StagedEntrance } from "./core/staged-reveal";
import { regionBounds } from "./choropleth-geo";
import { area } from "@turf/turf";

export interface DotDensityStoryMeta {
  title: string;
  description?: string;
  insight?: string;
  unit?: string;
}

const DEFAULT_MAX_REVEALS = 5;

function formatCompact(v: number): string {
  const abs = Math.abs(v);
  const trim = (s: string) => (s.endsWith(".0") ? s.slice(0, -2) : s);
  if (abs >= 1e9) return trim((v / 1e9).toFixed(1)) + "B";
  if (abs >= 1e6) return trim((v / 1e6).toFixed(1)) + "M";
  if (abs >= 1e3) return trim((v / 1e3).toFixed(1)) + "k";
  return String(Math.round(v));
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

  // Rank regions by dot density (total dots / area), descending. Ties broken by key for determinism.
  const ranked = layout.regions
    .map((r) => {
      const totalCount = r.groups.reduce((s, g) => s + g.count, 0);
      const a = Math.max(1e-9, area(r.feature));
      const name = String(r.feature.properties?.name ?? r.key);
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
    const valText = `${formatCompact(x.totalCount * layout.dotValue)}${unit ? " " + unit : ""}`;
    const text =
      layout.hasCategories && x.dominant
        ? `${x.name} — ${valText}, mostly ${x.dominant}`
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

/**
 * Builds the per-frame `circle-opacity` (data-driven MapLibre expression, or a flat number)
 * for the `dot-density-dots` layer — the STIPPLE-IN twist: the fill channel is the dots
 * themselves, not a bloom fill layer, so each subject region's dot opacity is driven directly
 * off its own `stagedByKey` entrance envelope (0 → overshoot → 1) instead of jumping straight
 * from dim to full at the beat boundary. Pure — no map/DOM access, unit-testable.
 *
 * - `context`: title/establish/takeaway (no dim/highlight) → every dot at full opacity (1).
 *   A reveal beat → the ONE highlighted region's dots stipple in via its own staged fillOpacity
 *   (kept simple: only the current beat's subject blends, not every previously-visited one),
 *   every other region held at `dimOpacity`.
 * - `sequential`: nothing is lit from the base map. Every region that has EVER triggered
 *   (past or present reveal beat) shows its own staged fillOpacity (0 while not yet entered,
 *   ramping 0→1 once its beat starts, holding at 1 after); anything never triggered is 0.
 */
export function buildDotOpacityExpression(
  mode: RevealMode,
  beat: Pick<Beat, "dim" | "highlight">,
  stagedMap: Map<string, StagedEntrance>,
  dimOpacity: number,
): unknown {
  if (mode === "sequential") {
    const expr: unknown[] = ["case"];
    for (const [key, staged] of stagedMap) {
      expr.push(["==", ["get", "__region"], key], staged.fillOpacity);
    }
    expr.push(0); // default: not (yet) a reveal subject
    return expr;
  }

  if (beat.dim && beat.highlight.length > 0) {
    const highlightKey = beat.highlight[0];
    const staged = stagedMap.get(highlightKey);
    const opacity = staged ? staged.fillOpacity : 1;
    return [
      "case",
      ["==", ["get", "__region"], highlightKey],
      opacity,
      dimOpacity,
    ];
  }

  return 1;
}
