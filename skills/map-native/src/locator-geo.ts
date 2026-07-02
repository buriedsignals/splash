// Pure point-based core for the locator / markers map — no MapTiler, no React.
// Unlike symbol-geo, markers are UNIFORM size (no value encoding); the only per-marker
// visual variable is category → colour. Mirrors the choropleth/symbol geo-core shape.
import { QUALITATIVE } from "./route-geo";

export interface LocatorMarker {
  lon: number;
  lat: number;
  label: string;
  category?: string;
  note?: string;
  priority?: number;
}
export interface LocatorLegendEntry {
  category: string;
  color: string;
}
export interface PlacedMarker extends LocatorMarker {
  color: string;
}
export interface LocatorGeometry {
  markers: PlacedMarker[];
  bounds: [number, number, number, number]; // [west, south, east, north]
  categories: string[];
  legend: LocatorLegendEntry[];
  markerStyle: "dot" | "pin" | "icon";
  hasCategories: boolean;
}

const MARKER_STYLES = ["dot", "pin", "icon"] as const;
const NEUTRAL = "#8a8a8a"; // uncategorized marker colour when a category scheme is in play

function clampLat(v: number): number {
  return Math.max(-85, Math.min(85, v));
}

export function locatorGeometry(config: {
  markers: LocatorMarker[];
  markerStyle?: string;
}): LocatorGeometry {
  const markers = config.markers;
  if (!markers.length)
    throw new Error("locatorGeometry: no markers — nothing to map");

  // Distinct categories, sorted for deterministic colour assignment.
  const categories = [
    ...new Set(
      markers
        .map((m) => m.category)
        .filter((c): c is string => !!c && c.trim().length > 0),
    ),
  ].sort();
  const hasCategories = categories.length > 0;

  const colorOf = new Map<string, string>();
  categories.forEach((c, i) =>
    colorOf.set(c, QUALITATIVE[i % QUALITATIVE.length]),
  );

  const placed: PlacedMarker[] = markers.map((m) => ({
    ...m,
    color:
      m.category && colorOf.has(m.category)
        ? (colorOf.get(m.category) as string)
        : hasCategories
          ? NEUTRAL
          : QUALITATIVE[0],
  }));

  const lons = markers.map((m) => m.lon);
  const lats = markers.map((m) => m.lat);
  const bounds: [number, number, number, number] = [
    Math.min(...lons),
    clampLat(Math.min(...lats)),
    Math.max(...lons),
    clampLat(Math.max(...lats)),
  ];

  const legend: LocatorLegendEntry[] = categories.map((c) => ({
    category: c,
    color: colorOf.get(c) as string,
  }));

  const markerStyle = (MARKER_STYLES as readonly string[]).includes(
    config.markerStyle ?? "",
  )
    ? (config.markerStyle as "dot" | "pin" | "icon")
    : "dot";

  return {
    markers: placed,
    bounds,
    categories,
    legend,
    markerStyle,
    hasCategories,
  };
}
