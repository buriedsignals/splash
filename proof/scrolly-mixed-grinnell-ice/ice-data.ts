/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/**
 * THIS BEAT'S OWN READING LAYER — three frozen inputs, and every figure the beat says out loud.
 *
 * The beat carries THREE media and therefore three kinds of evidence, and they answer three
 * different questions. Nothing here mixes them:
 *
 *   - `photographs.csv` supports facts about the SEQUENCE — how many frames, from which year to
 *     which, how long between two of them, who took each. **No ice is measured from a photograph.**
 *     Four pictures are not a survey, and the sibling beat `scrolly-image-grinnell-glacier` states
 *     the same refusal in the same words; this copy keeps it.
 *   - `geography.geojson` supports facts about PLACE and SIZE — how wide the park is, how wide the
 *     glacier's own outline is, how far the camera stood from what it photographed. All of it is
 *     arithmetic on real coordinates.
 *   - `reference-glaciers.csv` supports facts about the QUANTITY — metres of water equivalent lost,
 *     and the rate at which they were lost. It is a global series and is never described as a
 *     measurement of Grinnell, which it is not.
 *
 * A COPY, NOT AN IMPORT. `readPhotographs` / `deriveSequenceFacts` / `creditFor` below are this
 * beat's own copy of `proof/scrolly-image-grinnell-glacier/photograph-data.ts`, taken deliberately:
 * a beat's inputs and outputs live in its own folder, and nothing in this project imports across a
 * beat or a skill boundary. `scroll.test.ts` holds a PARITY check over the three functions rather
 * than a comment claiming they are the same.
 */

// ── The photographs ────────────────────────────────────────────────────────────────────────────

export type Photograph = {
  order: number;
  year: number;
  photographer: string;
  collection: string;
  licence: string;
  sourcePage: string;
  fileUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSha256: string;
  cropWidth: number;
  deliveredFile: string;
  deliveredWidth: number;
  deliveredHeight: number;
  deliveredSha256: string;
};

const PHOTO_HEADER =
  "order,year,photographer,collection,licence,source_page,file_url,original_width,original_height,original_sha256,crop_width,delivered_file,delivered_width,delivered_height,delivered_sha256";

export function readPhotographs(text: string): Photograph[] {
  const lines = parseCsvRows(text.trim());
  if (lines[0].join(",") !== PHOTO_HEADER)
    throw new Error(
      `photographs.csv header changed: expected\n  ${PHOTO_HEADER}\ngot\n  ${lines[0]}`,
    );
  const rows = lines.slice(1).map((line) => {
    const c = line;
    if (c.length !== 15)
      throw new Error(`expected 15 cells, got ${c.length}: ${line}`);
    return {
      order: Number(c[0]),
      year: Number(c[1]),
      photographer: c[2]!,
      collection: c[3]!,
      licence: c[4]!,
      sourcePage: c[5]!,
      fileUrl: c[6]!,
      originalWidth: Number(c[7]),
      originalHeight: Number(c[8]),
      originalSha256: c[9]!,
      cropWidth: Number(c[10]),
      deliveredFile: c[11]!,
      deliveredWidth: Number(c[12]),
      deliveredHeight: Number(c[13]),
      deliveredSha256: c[14]!,
    };
  });
  rows.sort((a, b) => a.order - b.order);
  return rows;
}

export type SequenceFacts = {
  frames: number;
  firstYear: number;
  lastYear: number;
  spanYears: number;
  gaps: number[];
  longestGap: { years: number; from: number; to: number };
  box: { width: number; height: number };
  photographers: string[];
};

export function deriveSequenceFacts(photographs: Photograph[]): SequenceFacts {
  if (photographs.length < 3)
    throw new Error(
      `a repeat-photography sequence needs at least three frames to read as a sequence rather than a before/after; got ${photographs.length}`,
    );
  const years = photographs.map((p) => p.year);
  for (let i = 1; i < years.length; i++)
    if (years[i]! <= years[i - 1]!)
      throw new Error(
        `photographs.csv is out of order: ${years[i - 1]} is followed by ${years[i]}. The scroll reads them in this order and the prose calls it time passing.`,
      );
  const box = {
    width: photographs[0]!.deliveredWidth,
    height: photographs[0]!.deliveredHeight,
  };
  for (const p of photographs)
    if (p.deliveredWidth !== box.width || p.deliveredHeight !== box.height)
      throw new Error(
        `${p.year} was delivered at ${p.deliveredWidth}×${p.deliveredHeight}, not the sequence's own ${box.width}×${box.height}. The frames must share one box or the comparison is between two different crops.`,
      );
  const gaps = years.slice(1).map((y, i) => y - years[i]!);
  let longestAt = 0;
  gaps.forEach((g, i) => {
    if (g > gaps[longestAt]!) longestAt = i;
  });
  return {
    frames: photographs.length,
    firstYear: years[0]!,
    lastYear: years[years.length - 1]!,
    spanYears: years[years.length - 1]! - years[0]!,
    gaps,
    longestGap: {
      years: gaps[longestAt]!,
      from: years[longestAt]!,
      to: years[longestAt + 1]!,
    },
    box,
    photographers: photographs.map((p) => p.photographer),
  };
}

/** The credit one frame carries on the photograph's own bottom margin. The licence is stated once
 *  in the page header instead of on every frame — measured on the sibling beat at 13px it ran to
 *  359px, 96% of a 375px phone. */
export function creditFor(p: Photograph): string {
  return `${p.photographer} · ${p.collection}, ${p.year}`;
}

// ── The measured quantity ──────────────────────────────────────────────────────────────────────

export type Balance = {
  year: number;
  value: number;
  observations: number | null;
};

const BALANCE_HEADER =
  "Year,Mean cumulative mass balance,Number of observations";

/**
 * The reference-glacier series. One row per year, cumulative metres of water equivalent against the
 * first year of the record.
 *
 * A GAP IN THE YEARS IS REFUSED, because every rate this beat states divides by a year count and a
 * missing row would make that arithmetic quietly wrong rather than loudly absent.
 */
export function parseBalance(text: string): Balance[] {
  const lines = parseCsvRows(text.trim());
  if (lines[0]!.join(",") !== BALANCE_HEADER)
    throw new Error(
      `reference-glaciers.csv header changed: expected\n  ${BALANCE_HEADER}\ngot\n  ${lines[0]}`,
    );
  const rows = lines.slice(1).map((line) => {
    const c = line;
    if (c.length !== 3)
      throw new Error(`expected 3 cells, got ${c.length}: ${line}`);
    const value = Number(c[1]);
    if (!Number.isFinite(value))
      throw new Error(`unreadable mass balance on row: ${line}`);
    return {
      year: Number(c[0]),
      value,
      observations: c[2] === "" ? null : Number(c[2]),
    };
  });
  rows.sort((a, b) => a.year - b.year);
  for (let i = 1; i < rows.length; i++)
    if (rows[i]!.year !== rows[i - 1]!.year + 1)
      throw new Error(
        `the series jumps from ${rows[i - 1]!.year} to ${rows[i]!.year}; every rate this beat states assumes one row per year`,
      );
  return rows;
}

export function valueIn(series: Balance[], year: number): number {
  const row = series.find((r) => r.year === year);
  if (!row)
    throw new Error(
      `no reading for ${year} in the reference-glacier series (${series[0]!.year}–${series[series.length - 1]!.year})`,
    );
  return row.value;
}

// ── The place ──────────────────────────────────────────────────────────────────────────────────

export type Ring = [number, number][];
export type Shape = {
  key: string;
  name: string;
  osm: string;
  rings: Ring[];
  bbox: { west: number; south: number; east: number; north: number };
  /** The bounding box's own width and height on the ground, in kilometres. */
  widthKm: number;
  heightKm: number;
  centre: [number, number];
};
export type Geography = {
  park: Shape;
  glacier: Shape;
  viewpoint: { name: string; at: [number, number] };
};

const KM_PER_DEGREE_LAT = 110.574;
const KM_PER_DEGREE_LON_EQUATOR = 111.32;

/** Great-circle distance, in kilometres. The two points this beat measures between are 1 km apart,
 *  where a flat approximation and a spherical one agree to millimetres — the spherical one is used
 *  anyway so the function does not have to be re-read if a future step measures something wider. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371.0088;
  const p1 = (a[1] * Math.PI) / 180;
  const p2 = (b[1] * Math.PI) / 180;
  const dp = p2 - p1;
  const dl = ((b[0] - a[0]) * Math.PI) / 180;
  const x =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function ringsOf(geometry: { type: string; coordinates: unknown }): Ring[] {
  const out: Ring[] = [];
  const walk = (node: unknown, depth: number): void => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number") return;
    if (
      Array.isArray(node[0]) &&
      typeof (node[0] as unknown[])[0] === "number"
    ) {
      out.push(node as Ring);
      return;
    }
    for (const child of node) walk(child, depth + 1);
  };
  walk(geometry.coordinates, 0);
  return out;
}

export function readGeography(text: string): Geography {
  const parsed = JSON.parse(text) as {
    features: {
      properties: { key: string; name: string; osm: string };
      geometry: { type: string; coordinates: unknown };
    }[];
  };
  const byKey = new Map(parsed.features.map((f) => [f.properties.key, f]));
  const shape = (key: string): Shape => {
    const feature = byKey.get(key);
    if (!feature)
      throw new Error(`geography.geojson carries no feature keyed "${key}"`);
    const rings = ringsOf(feature.geometry);
    if (rings.length === 0)
      throw new Error(
        `"${key}" has no rings; nothing can be drawn or measured from it`,
      );
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (const ring of rings)
      for (const [lon, lat] of ring) {
        if (lon < west) west = lon;
        if (lon > east) east = lon;
        if (lat < south) south = lat;
        if (lat > north) north = lat;
      }
    const midLat = (south + north) / 2;
    return {
      key,
      name: feature.properties.name,
      osm: feature.properties.osm,
      rings,
      bbox: { west, south, east, north },
      widthKm:
        (east - west) *
        KM_PER_DEGREE_LON_EQUATOR *
        Math.cos((midLat * Math.PI) / 180),
      heightKm: (north - south) * KM_PER_DEGREE_LAT,
      centre: [(west + east) / 2, (south + north) / 2],
    };
  };
  const viewpointFeature = byKey.get("viewpoint");
  if (!viewpointFeature)
    throw new Error(`geography.geojson carries no feature keyed "viewpoint"`);
  return {
    park: shape("park"),
    glacier: shape("glacier"),
    viewpoint: {
      name: viewpointFeature.properties.name,
      at: viewpointFeature.geometry.coordinates as [number, number],
    },
  };
}

// ── The facts the beat says out loud ───────────────────────────────────────────────────────────

export type Facts = {
  sequence: SequenceFacts;
  /** The photograph years the measured series actually covers — the first is 18 years before the
   *  record begins, which the prose says rather than glosses. */
  coveredYears: number[];
  balanceFrom: number;
  balanceTo: number;
  balanceTotal: number;
  /** Between the earliest photograph year the series covers and the last one. */
  spanFrom: number;
  spanTo: number;
  spanLoss: number;
  /** Metres of water equivalent per decade, over the first and last quarter-century of the record. */
  earlyRate: number;
  lateRate: number;
  rateRatio: number;
  lateFrom: number;
  earlyTo: number;
  observationsLastYear: number | null;
  parkWidthKm: number;
  glacierWidthKm: number;
  glacierShareOfPark: number;
  viewpointDistanceKm: number;
  parkName: string;
  glacierName: string;
  viewpointName: string;
};

/** A quarter-century, in years. Both rate windows are this long so the two figures the last step
 *  compares are the same kind of number — a rate over 25 years against a rate over 25 years. */
export const RATE_WINDOW = 25;

export function deriveFacts(
  photographs: Photograph[],
  series: Balance[],
  geography: Geography,
): Facts {
  const sequence = deriveSequenceFacts(photographs);
  const balanceFrom = series[0]!.year;
  const balanceTo = series[series.length - 1]!.year;
  const coveredYears = photographs
    .map((p) => p.year)
    .filter((y) => y >= balanceFrom && y <= balanceTo);
  if (coveredYears.length < 2)
    throw new Error(
      `only ${coveredYears.length} of the ${photographs.length} photograph years fall inside the measured series ` +
        `(${balanceFrom}–${balanceTo}); this beat's fifth and sixth steps compare a run of the record to the photographs`,
    );
  const spanFrom = coveredYears[0]!;
  const spanTo = coveredYears[coveredYears.length - 1]!;
  const earlyTo = balanceFrom + RATE_WINDOW;
  const lateFrom = balanceTo - RATE_WINDOW;
  const earlyRate =
    ((valueIn(series, earlyTo) - valueIn(series, balanceFrom)) / RATE_WINDOW) *
    10;
  const lateRate =
    ((valueIn(series, balanceTo) - valueIn(series, lateFrom)) / RATE_WINDOW) *
    10;
  return {
    sequence,
    coveredYears,
    balanceFrom,
    balanceTo,
    balanceTotal: valueIn(series, balanceTo),
    spanFrom,
    spanTo,
    spanLoss: valueIn(series, spanFrom) - valueIn(series, spanTo),
    earlyRate,
    lateRate,
    rateRatio: lateRate / earlyRate,
    lateFrom,
    earlyTo,
    observationsLastYear: series[series.length - 1]!.observations,
    parkWidthKm: geography.park.widthKm,
    glacierWidthKm: geography.glacier.widthKm,
    glacierShareOfPark: geography.glacier.widthKm / geography.park.widthKm,
    viewpointDistanceKm: distanceKm(
      geography.viewpoint.at,
      geography.glacier.centre,
    ),
    parkName: geography.park.name,
    glacierName: geography.glacier.name,
    viewpointName: geography.viewpoint.name,
  };
}

/** One decimal, and two — the two roundings every reader-facing figure in this beat uses. */
export function t1(n: number): string {
  return n.toFixed(1);
}
export function t2(n: number): string {
  return n.toFixed(2);
}
