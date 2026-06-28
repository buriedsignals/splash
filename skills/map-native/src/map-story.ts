import type { ChoroplethLayout } from "./choropleth-geo";
import { regionBounds } from "./choropleth-geo";

export interface Beat {
  kind: "establish" | "reveal" | "takeaway";
  camera: [number, number, number, number]; // [w,s,e,n] mainland-framed bbox
  highlight: string[];
  dim: boolean;
  callout: { region: string; name: string; text: string } | null;
  copy: string;
}

export interface MapStoryMeta {
  title: string;
  insight: string;
  unit: string;
  valueLabel?: (v: number) => string;
}

export function deriveMapStory(
  layout: ChoroplethLayout,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
  meta: MapStoryMeta,
): Beat[] {
  const fmt =
    meta.valueLabel ??
    ((v: number) => `${Math.round(v)}${meta.unit ? meta.unit : ""}`);

  // Regions that actually have a value, sorted by ascending key for tie-stability.
  const withData = layout.joined
    .filter((j): j is { key: string; value: number } => j.value !== null)
    .sort((a, b) => a.key.localeCompare(b.key));

  // Pick the extremes deterministically: max value (first by key among ties), min value likewise.
  const maxRow = withData.reduce((best, j) =>
    j.value > best.value ? j : best,
  );
  const minRow = withData.reduce((best, j) =>
    j.value < best.value ? j : best,
  );

  const featByKey = new Map<string, GeoJSON.Feature>();
  for (const f of features.features) {
    const k = String(f.properties?.[joinKey]);
    if (!featByKey.has(k)) featByKey.set(k, f);
  }
  const nameOf = (key: string) =>
    String(featByKey.get(key)?.properties?.name ?? key);
  const cameraOf = (key: string) => {
    const f = featByKey.get(key);
    return f ? regionBounds(f) : layout.bounds;
  };
  const calloutText = (key: string, value: number) =>
    `${nameOf(key)} — ${fmt(value)}`;

  const beats: Beat[] = [];
  beats.push({
    kind: "establish",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });

  const revealKeys =
    maxRow.key === minRow.key ? [maxRow.key] : [maxRow.key, minRow.key];
  for (const key of revealKeys) {
    const value = withData.find((j) => j.key === key)!.value;
    beats.push({
      kind: "reveal",
      camera: cameraOf(key),
      highlight: [key],
      dim: true,
      callout: {
        region: key,
        name: nameOf(key),
        text: calloutText(key, value),
      },
      copy: calloutText(key, value),
    });
  }

  beats.push({
    kind: "takeaway",
    camera: layout.bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight,
  });

  return beats;
}
