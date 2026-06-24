import { DEFAULT_BLUE, type MapSpec } from "./map-spec";

export interface MapPatch {
  title: string;
  type: string;
  metadata: {
    axes: Record<string, unknown>;
    visualize: Record<string, unknown>;
    describe: Record<string, unknown>;
  };
}

// NOTE (load-bearing): the choropleth gradient lives in `visualize.colorscale.colors`
// as `{ color, position }` stops. Including `colorscale.stops` (a STRING) alongside
// `colors` makes the renderer paint every region + the legend BLACK. So we deliberately
// emit `mode` + `interpolation` + `colors` and NEVER a `stops` string. Verified via real
// exported PNGs (see output-proof/).
export function specToMapMetadata(spec: MapSpec): MapPatch {
  const colors = spec.colorScale ?? DEFAULT_BLUE;

  const visualize: Record<string, unknown> = {
    basemap: spec.basemap,
    "map-key-attr": spec.mapKeyAttr,
    colorscale: {
      mode: "continuous",
      interpolation: "equidistant",
      colors,
    },
    tooltip: {
      enabled: true,
      title: "%REGION_NAME%",
      body: "%REGION_VALUE%",
    },
  };

  const describe: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": spec.source?.name ?? "",
    "source-url": spec.source?.url ?? "",
    "aria-description": spec.altInsight,
    "number-format": spec.numberFormat ?? "0,0.[00]",
  };

  return {
    title: spec.title,
    type: "d3-maps-choropleth",
    metadata: {
      axes: { keys: spec.regionKey, values: spec.valueColumn },
      visualize,
      describe,
    },
  };
}
