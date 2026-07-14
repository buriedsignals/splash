// Pure point-based core for the locator / markers map — no MapTiler, no React.
// Unlike symbol-geo, markers are UNIFORM size (no value encoding); the only per-marker
// visual variable is category → colour. Mirrors the choropleth/symbol geo-core shape.
import { QUALITATIVE } from "./route-geo";
import { shortWayLongitudeExtent } from "./core/longitude";

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
  // Newsroom house palette (profile merge). When set, category markers cycle it FIRST and fall
  // back to Okabe-Ito beyond its length; the uncategorized single colour becomes the house
  // primary (brandPalette[0]). Absent → today's Okabe-Ito path, unchanged.
  brandPalette?: string[];
}): LocatorGeometry {
  const markers = config.markers;
  if (!markers.length)
    throw new Error("locatorGeometry: no markers — nothing to map");

  const house =
    config.brandPalette && config.brandPalette.length > 0
      ? config.brandPalette
      : undefined;
  // Category i → the house palette when within its length, else Okabe-Ito (cycled) for the
  // overflow — so a house palette shorter than the category count still assigns distinct hues.
  const categoryColor = (i: number): string =>
    house && i < house.length
      ? house[i]
      : QUALITATIVE[(house ? i - house.length : i) % QUALITATIVE.length];
  // The single colour for a category-less map: the house primary when set, else Okabe-Ito[0].
  const soloColor = house ? house[0] : QUALITATIVE[0];

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
  categories.forEach((c, i) => colorOf.set(c, categoryColor(i)));

  const placed: PlacedMarker[] = markers.map((m) => ({
    ...m,
    color:
      m.category && colorOf.has(m.category)
        ? (colorOf.get(m.category) as string)
        : hasCategories
          ? NEUTRAL
          : soloColor,
  }));

  const lons = markers.map((m) => m.lon);
  const lats = markers.map((m) => m.lat);
  // Antimeridian-aware west/east (see core/longitude.ts): reduces to {min,max} for data
  // that does not straddle the dateline, but for Pacific-spanning markers `east` may
  // exceed +180 (unwrapped) so fitBounds/cameraForBounds centre on the true midpoint
  // instead of the empty back-side of the globe. Mirrors deriveSymbolStory.
  const { west, east } = shortWayLongitudeExtent(lons);
  const bounds: [number, number, number, number] = [
    west,
    clampLat(Math.min(...lats)),
    east,
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
