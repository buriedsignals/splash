// Beat derivation for dot-density videos — the sibling of deriveLocatorStory. title → establish
// (all dots in view) → reveal the DENSEST regions (dots per area, descending, capped) → takeaway.
// Same Beat shape as the other types. The dot scatter is unchanged; the video just moves the camera.
import type { Beat } from "./map-story";
import type { DotDensityLayout } from "./dot-density-geo";
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
