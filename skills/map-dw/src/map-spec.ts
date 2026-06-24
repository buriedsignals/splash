import { dataShape } from "../../dw-chart/src/csv";

export interface GradientStop {
  color: string; // hex
  position: number; // 0..1
}

// Light → Okabe-Ito blue, colorblind-safe sequential. Used when no colorScale is given.
export const DEFAULT_BLUE: GradientStop[] = [
  { color: "#deebf7", position: 0 },
  { color: "#0072B2", position: 1 },
];

export interface MapSpec {
  mapType: "choropleth"; // first cut; symbols/locator deferred
  basemap: string; // DW basemap id, e.g. "world-2019"
  mapKeyAttr: string; // basemap join key, e.g. "DW_STATE_CODE"
  regionKey: string; // data column with region codes → axes.keys
  valueColumn: string; // data column with values → axes.values
  data: string; // CSV text
  title: string; // the insight, sentence case
  intro?: string;
  colorScale?: GradientStop[]; // sequential light→dark stops
  numberFormat?: string;
  source?: { name: string; url?: string };
  altInsight: string; // WCAG: alt = the insight
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isStop(v: unknown): v is GradientStop {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as GradientStop).color === "string" &&
    typeof (v as GradientStop).position === "number"
  );
}

export function validateMapSpec(
  input: unknown,
):
  | { ok: true; spec: MapSpec; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input || typeof input !== "object")
    return { ok: false, errors: ["spec must be an object"] };
  const s = input as Record<string, unknown>;

  if (s.mapType !== "choropleth")
    errors.push('mapType must be "choropleth" (symbols/locator are deferred)');

  for (const f of [
    "basemap",
    "mapKeyAttr",
    "regionKey",
    "valueColumn",
    "title",
    "altInsight",
  ] as const) {
    if (typeof s[f] !== "string" || !(s[f] as string).trim())
      errors.push(`${f} is required`);
  }

  let columns: string[] = [];
  if (typeof s.data === "string" && s.data.includes(",")) {
    columns = dataShape(s.data).columns;
  } else {
    errors.push("data must be CSV text");
  }

  if (columns.length) {
    if (
      typeof s.regionKey === "string" &&
      s.regionKey.trim() &&
      !columns.includes(s.regionKey)
    )
      errors.push(
        `regionKey "${s.regionKey}" is not a column of the data [${columns.join(",")}]`,
      );
    if (
      typeof s.valueColumn === "string" &&
      s.valueColumn.trim() &&
      !columns.includes(s.valueColumn)
    )
      errors.push(
        `valueColumn "${s.valueColumn}" is not a column of the data [${columns.join(",")}]`,
      );
  }

  if (s.colorScale !== undefined) {
    if (!Array.isArray(s.colorScale) || s.colorScale.length < 2) {
      errors.push("colorScale must be an array of at least 2 stops");
    } else {
      let prev = -Infinity;
      for (const stop of s.colorScale) {
        if (!isStop(stop)) {
          errors.push("colorScale stop must be { color, position }");
          continue;
        }
        if (!HEX.test(stop.color))
          errors.push(`colorScale colour "${stop.color}" must be a hex value`);
        if (stop.position < 0 || stop.position > 1)
          errors.push(
            `colorScale position ${stop.position} must be within 0..1`,
          );
        if (stop.position < prev)
          errors.push("colorScale positions must be ascending");
        prev = stop.position;
      }
    }
  }

  if (typeof s.title === "string" && s.title.trim()) {
    const cols = columns.map((c) => c.toLowerCase());
    if (cols.includes(s.title.trim().toLowerCase()))
      warnings.push(
        "title looks like a label, not an insight — state what the data shows",
      );
  }

  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as MapSpec, warnings };
}
