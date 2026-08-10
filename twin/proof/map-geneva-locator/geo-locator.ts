/**
 * The pure half of the locator beat: csv parsing, category colour, and a DETERMINISTIC
 * priority-ordered label declutter. No browser, no rasteriser.
 * See `map-beat/references/types/locator.md`.
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

/** @parity */
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

/** @parity */
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

/**
 * Edge-aware label side, from the marker's PROJECTED screen position — `references/types/locator.md`'s
 * accessibility trap: a priority declutter only guarantees a label doesn't collide with another
 * label, not that it stays inside the frame. A marker near the right edge (the World Economic
 * Forum's, in this beat's own study set) keeps a right-hand label by default and it runs off-canvas
 * unless this is checked against the frame, not the data.
 
 *  @parity */
export function labelSide(
  px: number,
  frameWidth: number,
  margin = 170,
): "left" | "right" {
  return px > frameWidth - margin ? "left" : "right";
}

export type MarkerPoint = { key: string; cx: number; cy: number };

/**
 * Nudges markers whose DRAWN positions are closer than `minSeparation` apart until every pair
 * clears it — a locator's own accessibility trap the label declutter above doesn't cover. Two
 * organisations can sit only metres apart in the real world (ILO and the International Social
 * Security Association in this beat's own data, ~13m) and land on the exact same pixel at map
 * scale. Left alone, whichever marker is drawn last silently paints over the other — a reader sees
 * ONE colour next to a label that names an organisation of the OTHER colour's category, misreporting
 * the very thing this map exists to show (caught by looking at the rendered PNG: the ILO label sat
 * beside a visibly orange marker). Deterministic and order-stable: run a fixed number of passes
 * rather than iterate to a convergence tolerance, and break an exact tie (dist === 0) with the
 * pair's own index order rather than anything random, so the same input always draws the same frame.
 
 *  @parity */
export function separateOverlappingMarkers<T extends MarkerPoint>(
  points: T[],
  minSeparation: number,
): T[] {
  const out = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!;
        const b = out[j]!;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const dist = Math.hypot(dx, dy);
        if (dist >= minSeparation) continue;
        const angle =
          dist > 0.01 ? Math.atan2(dy, dx) : (i - j) * 0.001 + Math.PI / 2;
        const push = (minSeparation - dist) / 2 + 0.01;
        a.cx -= Math.cos(angle) * push;
        a.cy -= Math.sin(angle) * push;
        b.cx += Math.cos(angle) * push;
        b.cy += Math.sin(angle) * push;
      }
    }
  }
  return out;
}

export type LabelBox = { x: number; y: number; width: number; height: number };

/**
 * Highest priority (lowest number) places first; a lower-priority label whose box would overlap an
 * already-placed one is dropped. Same input always produces the same shown/hidden set —
 * `references/types/locator.md`'s "the correct instability a static frame can't tolerate" —
 * because the map engine's own label culling is NOT used here.
 
 *  @parity */
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
