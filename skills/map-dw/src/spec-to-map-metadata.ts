import {
  DEFAULT_BLUE,
  OKABE_ITO,
  type ChoroplethMapSpec,
  type LocatorMapSpec,
  type MapSpec,
  type SymbolMapSpec,
} from "./map-spec";
import { normalizeNumberFormat } from "../../dw-chart/src/chart-spec";
import { dwLocale } from "../../dw-chart/src/spec-to-metadata";

export interface MapPatch {
  title: string;
  type: string;
  /** DW chart language (BCP-47 regional, e.g. "fr-FR"). Datawrapper localizes the legend +
   *  tooltip number/date formatting from this field. Absent → DW default (en-US). */
  language?: string;
  metadata: {
    axes: Record<string, unknown>;
    visualize: Record<string, unknown>;
    describe: Record<string, unknown>;
    // Per-column format table. The choropleth LEGEND reads the value column's
    // `number-format` / `number-append` from HERE, not from `describe` — verified against
    // the published d3-maps-choropleth renderer (its label formatter reads
    // `data.column-format[valueColumn]`). NOT the hover tooltip: probed live, the
    // %REGION_VALUE% tooltip ignores number-append entirely (the unit is baked into the
    // tooltip template instead). Omitted for map types that carry no value column.
    data?: Record<string, unknown>;
    // The self-built, localized "Source : X" line for non-English deliverables (see
    // sourceNotes below) — DW's own "Source:" caption cannot be relocalized.
    annotate: { notes: string };
  };
}

// The single number-format token for a map's values: the caller's token (normalised the same
// way dw-chart does) or a GROUPED default ("0,0" = thousands grouping, ".[00]" = up to two
// optional decimals). The default must GROUP: Datawrapper's continuous choropleth legend
// otherwise formats its endpoints with its own default "0.[00]" (NO grouping), shipping a bare
// "17600" where a French deliverable needs "17 600" (localized by the chart `language`).
function resolveNumberFormat(numberFormat?: string): string {
  return numberFormat ? normalizeNumberFormat(numberFormat) : "0,0.[00]";
}

// Filled circle path used by locator-map point markers (DW's built-in "circle" icon).
const CIRCLE_ICON = {
  id: "circle",
  path: "M1000 350a500 500 0 1 0-1000 0 500 500 0 1 0 1000 0z",
  "horiz-adv-x": 1000,
  width: 700,
  height: 700,
};

// SOURCE-LABEL i18n (verified-bug fix). Datawrapper's own auto-rendered "Source:" caption
// prefix does NOT localize via the chart `language` field — verified LIVE against the real
// API (3 independently created charts, 2 chart types, both created-with and patched-after
// language:"fr-FR"/"fr"): the SAME chart correctly localized its OTHER auto-captions
// ("Created with Datawrapper" → "Créé avec Datawrapper"; the byline caption "Chart:" →
// "Graphique:") but kept rendering the literal English word "Source:" every time. This is
// a narrow, Datawrapper-side translation-key gap with no documented metadata override
// (confirmed against the full v3 OpenAPI chart schema: `language` — "Visualization language
// (output locale)" — is the ONLY locale field on a chart or its metadata; no export-time
// query param or nested field exists either). So for any language whose localized prefix
// differs from DW's own English default, we build the WHOLE "Source : X" line ourselves —
// the same fr/de/it table chart-native and map-native already use (their own
// src/core/locale.ts) — and ship it via `annotate.notes`, the one DW field that renders
// text verbatim with no auto-caption, instead of `describe.source-name` (whose
// un-relocalizable "Source:" prefix would otherwise still show in English ahead of it,
// duplicating the caption). English (DW's own default, where the native caption already
// reads correctly) keeps the native source-name/source-url path, so its clickable
// hyperlink in the interactive embed survives — only the genuinely-broken non-English
// case pays the "notes, no hyperlink" trade-off notes can't render.
// Exported: src/furniture-i18n.ts (the produce-time i18n gate) asserts the outgoing
// metadata against THESE exact label bytes — one table, never a re-typed literal.
export const SOURCE_LABELS: Record<string, string> = {
  fr: "Source :", // spaced colon (French typography)
  de: "Quelle:",
  it: "Fonte:",
  en: "Source:",
};

function sourceLabel(lang?: string): string {
  if (!lang) return SOURCE_LABELS.en;
  const base = lang.toLowerCase().split(/[-_]/)[0];
  return SOURCE_LABELS[base] ?? SOURCE_LABELS.en;
}

// True when DW's own native "Source:" caption already reads correctly for `lang` (i.e.
// there is nothing to relocalize) — English or an unrecognised tag, which falls back to
// English furniture anyway.
function usesNativeSourceCaption(lang?: string): boolean {
  return sourceLabel(lang) === SOURCE_LABELS.en;
}

// The self-built localized source line for `annotate.notes` — used ONLY when the DW
// native caption is unlocalizable (see the note above). Empty when there is no source, or
// when the native caption already covers it (English/absent lang).
function sourceNotes(spec: {
  source?: { name: string; url?: string };
  lang?: string;
}): string {
  if (usesNativeSourceCaption(spec.lang)) return "";
  if (!spec.source?.name) return "";
  return `${sourceLabel(spec.lang)} ${spec.source.name}`;
}

// Normalise `numberFormat` the same way dw-chart does for value labels/axes (see
// dw-chart/src/chart-spec.ts normalizeNumberFormat): a printf/Python-style mistake
// (".0f%") is NOT recognised by Datawrapper's numeral.js parser — it silently falls
// back to a plain unformatted number, so the legend renders "15…70" instead of
// "15%…70%". Indistinguishable from the field having been dropped along the way.
// Fixing it here (once) closes the gap for every mapType that carries numberFormat.
function describeBlock(spec: {
  intro?: string;
  source?: { name: string; url?: string };
  altInsight: string;
  numberFormat?: string;
  unit?: string;
  lang?: string;
}): Record<string, unknown> {
  const nativeSource = usesNativeSourceCaption(spec.lang);
  const block: Record<string, unknown> = {
    intro: spec.intro ?? "",
    "source-name": nativeSource ? (spec.source?.name ?? "") : "",
    "source-url": nativeSource ? (spec.source?.url ?? "") : "",
    "aria-description": spec.altInsight,
    "number-format": resolveNumberFormat(spec.numberFormat),
  };
  // The value unit is a literal SUFFIX Datawrapper appends to auto-formatted numbers (the
  // LEGEND) WITHOUT multiplying — the same mechanism the Academy recommends for showing "%"
  // on already-percentage data. Verified: number-append is a real describe field. It does
  // NOT reach the %REGION_VALUE% hover tooltip (probed live) — choroplethMetadata bakes the
  // unit into the tooltip template for that.
  if (spec.unit) block["number-append"] = spec.unit;
  return block;
}

// NOTE (load-bearing, choropleth): the gradient lives in `visualize.colorscale.colors`
// as `{ color, position }` stops. Including `colorscale.stops` (a STRING) alongside
// `colors` makes the renderer paint every region + the legend BLACK. So we deliberately
// emit `mode` + `interpolation` + `colors` and NEVER a `stops` string. Verified via real
// exported PNGs (see output-proof/).
// The per-column format the choropleth LEGEND reads (verified against the published
// renderer): the grouped number-format + the literal unit suffix. This is what puts a
// thousands separator (and the unit) on the legend endpoints — `describe.number-format`
// alone never reaches them. The hover tooltip reads NEITHER (probed live): its unit is
// baked into the tooltip body template in choroplethMetadata.
function valueColumnFormat(
  numberFormat: string,
  unit?: string,
): Record<string, unknown> {
  const col: Record<string, unknown> = {
    type: "number",
    "number-format": numberFormat,
  };
  if (unit) col["number-append"] = unit;
  return col;
}

function choroplethMetadata(spec: ChoroplethMapSpec): MapPatch {
  const colors = spec.colorScale ?? DEFAULT_BLUE;
  const numberFormat = resolveNumberFormat(spec.numberFormat);
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
        // The continuous color legend formats its min/max endpoint labels with
        // `legends.color.labelFormat` (DW's default is "0.[00]" — NO thousands grouping, the
        // bare-"17600" bug). Set the grouped token; the chart `language` localizes the group
        // separator (fr → narrow no-break space "17 600", en → comma "17,600").
        legends: { color: { labelFormat: numberFormat } },
        // TOOLTIP UNIT (verified-bug fix, probed LIVE): `number-append` reaches the legend
        // endpoints but NOT the %REGION_VALUE% hover tooltip — a published rainfall map with
        // unit " mm" stored the append in describe + column-format yet hovered a bare "624".
        // So the unit is baked into the tooltip body TEMPLATE, the same mechanism the symbol
        // map uses after its FORMAT() token. No double-unit risk: the append never renders here.
        tooltip: {
          enabled: true,
          title: "%REGION_NAME%",
          body: `%REGION_VALUE%${spec.unit ?? ""}`,
        },
      },
      describe: describeBlock(spec),
      data: {
        "column-format": {
          [spec.valueColumn]: valueColumnFormat(numberFormat, spec.unit),
        },
      },
      annotate: { notes: sourceNotes(spec) },
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
// is choropleth-only). The hover tooltip uses DW mustache tokens in `title`/`body`, and EACH
// referenced column MUST be declared in `tooltip.fields` ({ token: column }) or the token renders
// blank. Title = the place label (labelColumn, else the size column); body = the size column.
// Symbols are drawn on a CANVAS (no <circle> in the DOM) — hover is by pixel position. Verified
// LIVE in a browser: hovering Paris showed a "{{ city }} / {{ population }}" tooltip box.
// NUMBER GROUPING (bug #5): a raw `{{ column }}` token is substituted VERBATIM (no thousands
// grouping — a bare "2100"). The numeric SIZE value therefore goes through DW's tooltip FORMAT()
// expression (`{{ FORMAT(col, "0,0.[00]") }}`), which applies the grouped numeral token; the chart
// `language` localizes the separator. A non-numeric label column stays a raw token. See output-proof/.
function symbolMetadata(spec: SymbolMapSpec): MapPatch {
  const colors = spec.colorScale ?? DEFAULT_BLUE;
  const colorCol = spec.colorColumn ?? spec.sizeColumn;
  const labelCol = spec.labelColumn ?? spec.sizeColumn;
  const numberFormat = resolveNumberFormat(spec.numberFormat);
  const fields: Record<string, string> = { [spec.sizeColumn]: spec.sizeColumn };
  if (labelCol !== spec.sizeColumn) fields[labelCol] = labelCol;
  // The tooltip body references a DATA COLUMN. A raw `{{ column }}` mustache token is substituted
  // VERBATIM (no thousands grouping — verified live: it showed a bare "2100"). So the numeric
  // SIZE value is wrapped in Datawrapper's tooltip FORMAT() expression (value first, numeral
  // token second — Datawrapper Academy "How to customize tooltips"), which applies the grouped
  // token; the chart `language` (set from spec.lang) then localizes the group separator
  // (fr → "2 100"). RENDER-VERIFIED against a live export. The unit is baked as a literal suffix
  // AFTER the value — `number-append` only touches auto-formatted numbers, never a mustache token.
  const unitSuffix = spec.unit ?? "";
  const sizeToken = `{{ FORMAT(${spec.sizeColumn}, "${numberFormat}") }}`;
  // The title is the place label. When it falls back to the numeric SIZE column (no labelColumn),
  // group it too (else the title reads a bare number). A real label column is non-numeric text —
  // keep it a RAW mustache token so FORMAT() is never applied to a string.
  const titleToken =
    labelCol === spec.sizeColumn ? sizeToken : `{{ ${labelCol} }}`;
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
        // The visible legend on a symbol map is the continuous COLOUR gradient (the size scale
        // is not drawn as a separate legend by default). Its min/max endpoint labels default to
        // DW's un-grouped "0.[00]" — the bare-"4000000" bug. Set the grouped token; the chart
        // `language` localizes the separator (fr → "4 000 000"). Same key + RENDER-VERIFIED fix
        // as the choropleth color legend.
        legends: { color: { labelFormat: numberFormat } },
        tooltip: {
          enabled: true,
          title: titleToken,
          body: `${sizeToken}${unitSuffix}`,
          fields,
        },
      },
      describe: describeBlock(spec),
      annotate: { notes: sourceNotes(spec) },
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
      annotate: { notes: sourceNotes(spec) },
    },
  };
}

export function specToMapMetadata(spec: MapSpec): MapPatch {
  const patch = dispatch(spec);
  // Thread the deliverable language → DW regional locale, so Datawrapper localizes the
  // legend + tooltip numbers (fr-FR groups thousands with a narrow no-break space). Absent
  // ⇒ no `language` key (produce omits it; DW keeps its en-US default).
  if (spec.lang) patch.language = dwLocale(spec.lang);
  return patch;
}

function dispatch(spec: MapSpec): MapPatch {
  switch (spec.mapType) {
    case "choropleth":
      return choroplethMetadata(spec);
    case "symbol":
      return symbolMetadata(spec);
    case "locator":
      return locatorMetadata(spec);
  }
}
