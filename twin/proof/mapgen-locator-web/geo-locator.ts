/**
 * The pure half of the locator-web beat: csv parsing, a deterministic priority assignment, category
 * colour, and a DETERMINISTIC priority-ordered label declutter. No browser, no rasteriser.
 *
 * This is this beat's OWN copy — never an import of `proof/map-geneva-locator/geo-locator.ts` (a
 * beat's pure core is its own; see `mapmore-flow-danube/geo-flow.ts`'s own header for why: each
 * beat directory has to build after being read on its own, and nothing under `proof/` may import
 * across beats). Same real data, same real geography, same deterministic rules — written fresh.
 *
 * See `twin-map-beat/references/types/locator.md`.
 */

export type OrgRow = {
  key: string;
  name: string;
  lon: number;
  lat: number;
  category: string;
  wikidataQid: string;
  priority: number;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Priority: UN system first, then other intergovernmental bodies, then everything else — each
 * group internally alphabetical. Declared here, not implicit in file order, so the declutter below
 * is reproducible from the data alone. A CATEGORY drives colour; PRIORITY (a separate, explicit
 * field) drives which labels survive when markers crowd — `references/types/locator.md`'s "the
 * correct lever for importance is a declared priority field", never the marker's own size.
 */
const CATEGORY_RANK: Record<string, number> = {
  "UN system": 0,
  "Other intergovernmental": 1,
  "Other international body": 2,
};

export function orgsFromCsv(csv: string): OrgRow[] {
  const rows = parseCsv(csv.trim() + "\n");
  const header = rows[0]!;
  const at = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0)
      throw new Error(`csv has no "${name}" column, got: ${header.join(",")}`);
    return i;
  };
  const nameAt = at("name");
  const lonAt = at("lon");
  const latAt = at("lat");
  const categoryAt = at("category");
  const qidAt = at("wikidata_qid");

  const parsed = rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r, i) => ({
      key: `o${i}`,
      name: r[nameAt]!,
      lon: Number(r[lonAt]),
      lat: Number(r[latAt]),
      category: r[categoryAt]!,
      wikidataQid: r[qidAt]!,
    }));

  return [...parsed]
    .sort(
      (a, b) =>
        (CATEGORY_RANK[a.category] ?? 9) - (CATEGORY_RANK[b.category] ?? 9) ||
        a.name.localeCompare(b.name),
    )
    .map((row, i) => ({ ...row, priority: i }));
}

export const CATEGORY_ORDER = [
  "UN system",
  "Other intergovernmental",
  "Other international body",
];

/** Okabe–Ito, the CVD-safe qualitative palette this project cycles categorical colour from. A
 *  locator draws NO value channel (`references/types/locator.md`: "no magnitude, no rate, no
 *  gradient") — category is the only thing colour is allowed to carry here. */
export const CATEGORY_COLOUR: Record<string, string> = {
  "UN system": "#0072B2",
  "Other intergovernmental": "#E69F00",
  "Other international body": "#009E73",
};

/**
 * Edge-aware label side, from the marker's PROJECTED screen position — `references/types/locator.md`'s
 * accessibility trap: a priority declutter only guarantees a label doesn't collide with another
 * label, not that it stays inside the frame. A marker near the right edge (the World Economic
 * Forum's, in this beat's own study set) keeps a right-hand label by default and it runs off-canvas
 * unless this is checked against the frame, not the data.
 */
export function labelSide(
  px: number,
  frameWidth: number,
  margin = 170,
): "left" | "right" {
  return px > frameWidth - margin ? "left" : "right";
}

export type LabelBox = { x: number; y: number; width: number; height: number };

/**
 * Highest priority (lowest number) places first; a lower-priority label whose box would overlap an
 * already-placed one is dropped. Same input always produces the same shown/hidden set —
 * `references/types/locator.md`'s "the correct instability a static frame can't tolerate" —
 * because the map engine's own label culling is NOT used here.
 */
export function declutterLabels<T extends { key: string; priority: number }>(
  points: T[],
  boxOf: (point: T) => LabelBox,
): Set<string> {
  const ordered = [...points].sort((a, b) => a.priority - b.priority);
  const placed: LabelBox[] = [];
  const shown = new Set<string>();
  const overlaps = (a: LabelBox, b: LabelBox) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

  for (const point of ordered) {
    const box = boxOf(point);
    if (placed.some((p) => overlaps(p, box))) continue;
    placed.push(box);
    shown.add(point.key);
  }
  return shown;
}

/** Every point, priority order — the same order the accessible table and the keyboard's Home/End
 *  both use, so "the first row" means the same thing whichever the reader picks. */
export function readingOrder<T extends { priority: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.priority - b.priority);
}

/** The newsroom's readers write a decimal comma — duplicated rather than imported for the reason
 *  stated at the top of this file (a beat's pure core is its own). Unused by a locator's marks
 *  themselves (no value to format), kept only in case a caption needs a count formatted the same
 *  way the rest of this project's numbers are. */
export function fr(value: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
