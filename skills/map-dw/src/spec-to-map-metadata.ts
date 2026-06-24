import {
  DEFAULT_BLUE,
  OKABE_ITO,
  type ChoroplethMapSpec,
  type LocatorMapSpec,
  type MapSpec,
  type SymbolMapSpec,
} from "./map-spec";

export interface MapPatch {
  title: string;
  type: string;
  metadata: {
    axes: Record<string, unknown>;
    visualize: Record<string, unknown>;
    describe: Record<string, unknown>;
  };
}

// Filled circle path used by locator-map point markers (DW's built-in "circle" icon).
const CIRCLE_ICON = {
  id: "circle",
  path: "M1000 350a500 500 0 1 0-1000 0 500 500 0 1 0 1000 0z",
  "horiz-adv-x": 1000,
  width: 700,
  height: 700,
};

function describeBlock(spec: {
  intro?: string;
  source?: { name: string; url?: string };
  altInsight: string;
  numberFormat?: string;
}): Record<string, unknown> {
  return {
    intro: spec.intro ?? "",
    "source-name": spec.source?.name ?? "",
    "source-url": spec.source?.url ?? "",
    "aria-description": spec.altInsight,
    "number-format": spec.numberFormat ?? "0,0.[00]",
  };
}

// NOTE (load-bearing, choropleth): the gradient lives in `visualize.colorscale.colors`
// as `{ color, position }` stops. Including `colorscale.stops` (a STRING) alongside
// `colors` makes the renderer paint every region + the legend BLACK. So we deliberately
// emit `mode` + `interpolation` + `colors` and NEVER a `stops` string. Verified via real
// exported PNGs (see output-proof/).
function choroplethMetadata(spec: ChoroplethMapSpec): MapPatch {
  const colors = spec.colorScale ?? DEFAULT_BLUE;
  return {
    title: spec.title,
    type: "d3-maps-choropleth",
    metadata: {
      axes: { keys: spec.regionKey, values: spec.valueColumn },
      visualize: {
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
      },
      describe: describeBlock(spec),
    },
  };
}

// NOTE (load-bearing, symbol): proportional circles are placed by lat/lon, NOT a region
// join. The value→SIZE binding is `axes.area` — the field the spike was missing (it set
// `axes.keys/values` choropleth-style and got the basemap but NO circles). `axes.values`
// drives COLOUR. The colour scale uses the same `colorscale` block as choropleth (and the
// same "no `stops` string" rule). `map-type-set:true` keeps DW from re-defaulting the type.
// Verified via real exported PNGs.
//
// NOTE (load-bearing, symbol tooltip): symbol maps reference DATA COLUMNS, NOT %REGION% (that
// is choropleth-only). The hover tooltip uses DW mustache tokens `{{ column }}` in `title`/`body`,
// and EACH referenced column MUST be declared in `tooltip.fields` ({ token: column }) or the
// token renders blank. Title = the place label (labelColumn, else the size column); body = the
// size column. Symbols are drawn on a CANVAS (no <circle> in the DOM) — hover is by pixel
// position. Verified LIVE in a browser: hovering Paris showed a "{{ city }} / {{ population }}"
// tooltip box (screenshot, not just metadata). See output-proof/.
function symbolMetadata(spec: SymbolMapSpec): MapPatch {
  const colors = spec.colorScale ?? DEFAULT_BLUE;
  const colorCol = spec.colorColumn ?? spec.sizeColumn;
  const labelCol = spec.labelColumn ?? spec.sizeColumn;
  const fields: Record<string, string> = { [spec.sizeColumn]: spec.sizeColumn };
  if (labelCol !== spec.sizeColumn) fields[labelCol] = labelCol;
  return {
    title: spec.title,
    type: "d3-maps-symbols",
    metadata: {
      axes: {
        lat: spec.latColumn,
        lon: spec.lonColumn,
        area: spec.sizeColumn, // SIZE
        values: colorCol, // COLOUR
      },
      visualize: {
        basemap: spec.basemap,
        "map-type-set": true,
        colorscale: {
          mode: "continuous",
          interpolation: "equidistant",
          colors,
        },
        tooltip: {
          enabled: true,
          title: `{{ ${labelCol} }}`,
          body: `{{ ${spec.sizeColumn} }}`,
          fields,
        },
      },
      describe: describeBlock(spec),
    },
  };
}

// NOTE (load-bearing, locator framing): DW's `view.fit:true` does NOT reliably frame to the
// markers — it rendered the WHOLE WORLD (caught only by looking at the PNG, never by a test).
// So we always compute an explicit center + zoom from the markers' bounding box (40% padding),
// zoom = min over the lng/lat spans of log2(world-span / marker-span). This frames the pins.
function fitView(markers: { lng: number; lat: number }[]): {
  center: [number, number];
  zoom: number;
} {
  const lngs = markers.map((m) => m.lng);
  const lats = markers.map((m) => m.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const center: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ];
  // 40% padding so pins are not flush to the frame; floor the span for single-point maps.
  const padLng = (maxLng - minLng) * 0.4 || 0.1;
  const padLat = (maxLat - minLat) * 0.4 || 0.1;
  const spanLng = Math.max(maxLng - minLng + 2 * padLng, 0.01);
  const spanLat = Math.max(maxLat - minLat + 2 * padLat, 0.01);
  // 360° of longitude / ~170° of usable latitude span the world at zoom 0.
  const zoom = Math.min(Math.log2(360 / spanLng), Math.log2(170 / spanLat), 16);
  return { center, zoom };
}

// NOTE (load-bearing, locator): markers live in `metadata.visualize.markers` as point
// objects (type:"point", coordinates:[lng,lat], icon, markerColor, title) — there is NO
// data table and NO value join. Colours cycle Okabe-Ito (CVD-safe) unless a marker sets
// its own. View is computed from the markers (see fitView) unless an explicit one is given.
function locatorMetadata(spec: LocatorMapSpec): MapPatch {
  const markers = spec.markers.map((m, i) => ({
    id: `m${i + 1}`,
    type: "point",
    title: m.label,
    coordinates: [m.lng, m.lat],
    anchor: "bottom-left",
    scale: 1,
    markerColor: m.color ?? OKABE_ITO[i % OKABE_ITO.length],
    markerSymbol: "",
    icon: CIRCLE_ICON,
    text: { color: "#333333", fontSize: 14, halo: "#ffffff" },
    visible: true,
    // Enable the hover tooltip so the marker `title` shows on hover. Verified LIVE: with
    // `enabled:false` no tooltip appeared; with `enabled:true` hovering a pin spawns a
    // `tooltip-text-wrapper` element with the title (zero before hover, one after). See output-proof/.
    tooltip: { enabled: true },
  }));

  const framed = spec.view ?? fitView(spec.markers);
  const visualize: Record<string, unknown> = {
    markers,
    view: {
      center: framed.center,
      zoom: framed.zoom,
      height: 400,
      fit: false,
      pitch: 0,
    },
  };

  return {
    title: spec.title,
    type: "locator-map",
    metadata: {
      axes: {},
      visualize,
      describe: describeBlock({ ...spec, numberFormat: undefined }),
    },
  };
}

export function specToMapMetadata(spec: MapSpec): MapPatch {
  switch (spec.mapType) {
    case "choropleth":
      return choroplethMetadata(spec);
    case "symbol":
      return symbolMetadata(spec);
    case "locator":
      return locatorMetadata(spec);
  }
}
