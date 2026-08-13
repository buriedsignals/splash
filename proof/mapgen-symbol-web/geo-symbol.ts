/**
 * The pure half of the proportional-symbol WEB beat: csv parsing, the year window, the sqrt radius
 * scale, draw order, the arc a point belongs to (the filter's own dimension), and the claim checks.
 * No browser, no rasteriser, no DOM.
 *
 * This is this beat's OWN copy — `proof/map-quake-symbol/geo-symbol.ts` (the static/video sibling on
 * the same file) and `skills/map-web/assets/geo-symbol.ts` (the format's seed) each carry their
 * own, and a beat never reaches into a sibling beat or out of a skill at runtime. What is new here,
 * and exists nowhere else, is `arcOf` — the filter dimension, DERIVED from each event's own
 * coordinates rather than typed into a column, so a row cannot be filed under an arc the map does
 * not put it in.
 *
 * The number formatter is `en`, on `en-GB`, because the page this feeds declares `lang="en"`. A
 * formatter takes its locale from the beat's own declared language, not from a function's
 * historical name — three copies of an `fr` in this tree once returned English numbers and reached
 * delivered artifacts.
 */


export type QuakeRow = {
  key: string;
  time: string;
  mag: number;
  lon: number;
  lat: number;
  place: string;
};

/** A row once the bake has projected it into the plate's own pixel space. */
export type ProjectedQuake = QuakeRow & { px: number; py: number; arc: string };

/** Minimal RFC4180-ish CSV parse: handles quoted fields with embedded commas, no embedded newlines. 
 *  @parity */
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

/** @parity */
export function quakesFromCsv(csv: string): QuakeRow[] {
  const rows = parseCsv(csv.trim() + "\n");
  const header = rows[0]!;
  const at = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0)
      throw new Error(`csv has no "${name}" column, got: ${header.join(",")}`);
    return i;
  };
  const timeAt = at("time");
  const magAt = at("mag");
  const lonAt = at("longitude");
  const latAt = at("latitude");
  const placeAt = at("place");
  return rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r, i) => ({
      key: `q${i}`,
      time: r[timeAt]!,
      mag: Number(r[magAt]),
      lon: Number(r[lonAt]),
      lat: Number(r[latAt]),
      place: r[placeAt]!,
    }));
}

/**
 * The calendar-year window the rows actually cover, read out of their own ISO timestamps. It exists
 * because this file's static sibling once CREDITED a window ("2005–2024") seven years wider than the
 * frozen data, whose last event is 2017-01-22. Anything the furniture says about the period comes
 * through here.
 
 *  @parity */
export function yearWindow(rows: { time: string }[]): {
  first: number;
  last: number;
  span: number;
  label: string;
} {
  if (rows.length === 0) throw new Error("no rows to take a window from");
  const years = rows.map((r) => {
    const year = Number(r.time.slice(0, 4));
    if (!Number.isInteger(year))
      throw new Error(
        `row time "${r.time}" does not start with a four-digit year`,
      );
    return year;
  });
  const first = Math.min(...years);
  const last = Math.max(...years);
  return { first, last, span: last - first, label: `${first}–${last}` };
}

/**
 * The radius scale: rooted at zero, radius ∝ √magnitude — an equal-AREA encoding
 * (`map-beat/references/types/proportional-symbol.md`, "don't linear-scale the radius").
 * Magnitude is itself logarithmic, which this scale does NOT correct for: it draws circles
 * proportional to the reported magnitude number, USGS's own convention, and this beat's caveat says
 * so in words rather than leaving a reader to assume the circles are proportional to energy.
 
 *  @parity */
export function radiusScale(maxValue: number, maxRadiusPx: number) {
  return (value: number) =>
    maxRadiusPx * Math.sqrt(Math.max(0, value) / maxValue);
}

/** Three round reference sizes for the legend, half-magnitude steps down from the rounded max. 
 *  @parity */
export function halfMagnitudeReferenceValues(maxMag: number, count = 3): number[] {
  const top = Math.round(maxMag * 2) / 2;
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.round((top - i * 0.5) * 10) / 10;
    if (v > 0) values.push(v);
  }
  return values;
}

/** Largest first, so later (smaller) circles paint on top and stay visible rather than buried. 
 *  @parity-exempt: sorts the field this beat's own points carry (`.mag` on a quake catalogue, `.value` on the general seed); the invariant is small-on-top, not the field name. */
export function drawOrder<T extends { mag: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.mag - a.mag);
}

/**
 * Every event, largest first — the order the accessible table and the keyboard's Home/End both use,
 * so "the first row" means the same thing whichever channel a reader picks.
 
 *  @parity-exempt: each beat reads its own data in its own order — value on a choropleth, population on a dot map, ascending priority on a locator. Four sorts, four beats, not four drifts. */
export function readingOrder<T extends { mag: number }>(rows: T[]): T[] {
  return drawOrder(rows);
}

/**
 * The order the HIT TARGETS are laid down in: SMALLEST first, so the largest events end up on top.
 *
 * This is the opposite of `drawOrder`, and it is a measured decision rather than a taste. Two events
 * in this file — Singkil (M8.6, 2005) and Sinabang (M7.8, 2010) — sit 0.30° apart, about 33 km. A
 * hit target is a fixed 28 CSS px across at every width this format ships, so at 1600px (where the
 * plate draws ~19 px per degree) their centres are ~6 px apart: whichever button is later in the DOM
 * covers the other's own centre, and `document.elementFromPoint` at that centre returns the covering
 * button. Painting the largest LAST means the covered point is always the smaller one — never the
 * M8.6 event the beat's own claim is measured against. The covered event keeps its place in the tab
 * order and in the accessible table, which is where its reading survives.
 */
export function targetOrder<T extends { mag: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.mag - b.mag);
}

export type LabelPlacement = { side: "left" | "right"; dy: number };

/**
 * Edge-aware label side, computed from the symbol's PROJECTED screen position, not from the data —
 * a symbol near the frame edge needs its label flipped inward, and the map's own coordinate cannot
 * tell you that; only the projected pixel can. `margin` is passed as a fraction of the real frame by
 * the component, never left on a default tuned for one bake size.
 
 *  @parity-exempt: the flip margin and the vertical nudge are pixel constants tuned per frame size, and deriving them is W5 task T7's own work — until then this records that they are known to disagree. */
export function labelPlacement(
  px: number,
  py: number,
  frame: { width: number; height: number },
  margin = 130,
): LabelPlacement {
  const side = px > frame.width - margin ? "left" : "right";
  const dy = py < 26 ? 20 : py > frame.height - 20 ? -12 : 5;
  return { side, dy };
}

/** Whether a projected point actually lands inside the frame — nothing to cull (a point has no
 *  shape to thin), only to notice and report if the camera missed it. 
 *  @parity */
export function keepPoint(
  point: { px: number; py: number },
  frame: { width: number; height: number },
  margin = 20,
): boolean {
  return (
    point.px >= -margin &&
    point.px <= frame.width + margin &&
    point.py >= -margin &&
    point.py <= frame.height + margin
  );
}

/**
 * The filter's own dimension: which seismic arc an event sits on, DERIVED from its own coordinates.
 *
 * Deliberately not a column in the csv. A typed classification is a claim about every row that
 * nothing in the beat can check; a box test over the coordinates the map itself projects can only
 * ever disagree with the picture by being wrong in a way a reader can see. The boxes are named
 * regions, not a partition of the plane, so a row that falls in none of them THROWS rather than
 * landing in a silent "other" bucket — a new event added to this file has to be filed deliberately.
 */
const ARCS: { name: string; lon: [number, number]; lat: [number, number] }[] = [
  { name: "Sunda arc", lon: [92, 112], lat: [-12, 8] },
  { name: "Japan & Kuril arc", lon: [138, 160], lat: [24, 50] },
  { name: "Melanesian arc", lon: [148, 172], lat: [-16, 0] },
  { name: "Eastern China", lon: [96, 112], lat: [20, 40] },
];

export function arcOf(point: {
  lon: number;
  lat: number;
  place: string;
}): string {
  const hit = ARCS.filter(
    (arc) =>
      point.lon >= arc.lon[0] &&
      point.lon <= arc.lon[1] &&
      point.lat >= arc.lat[0] &&
      point.lat <= arc.lat[1],
  );
  if (hit.length === 1) return hit[0]!.name;
  if (hit.length === 0)
    throw new Error(
      `no arc contains ${point.place} at ${point.lon}, ${point.lat} — add a region box rather than letting the filter file it silently`,
    );
  throw new Error(
    `${point.place} at ${point.lon}, ${point.lat} falls in ${hit.length} arcs (${hit.map((a) => a.name).join(", ")}) — the boxes overlap`,
  );
}

/**
 * The distinct filter groups a study set carries, in a stable order — computed in ONE place, shared
 * by the component (which draws the `<fieldset>`) and the render script (which generates the
 * matching `:has()` CSS rule per group), so the two can never drift out of sync.
 
 *  @parity-exempt: groups by the field this beat's own points carry (`.arc` on a subduction catalogue, `.group` on the general seed). */
export function groupsOf(points: { arc: string }[]): string[] {
  return Array.from(new Set(points.map((p) => p.arc))).sort();
}

/**
 * A CSS-id-safe slug for a group name ("Sunda arc" → "sunda-arc"). Every mark, button and table row
 * carries the SLUG, and the slug is what the generated selector quotes: the raw name, HTML-escaped
 * into a CSS string, once turned `&` into five literal characters that matched no element, and one
 * filter emptied an entire map with nothing red anywhere.
 
 *  @parity */
export function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * How many times more energy the subject released than a comparison event, from the moment
 * magnitude scale's own definition (each whole step is 10^1.5× the energy). Used so the beat's
 * log-scale caveat carries a computed number instead of a remembered one.
 
 *  @parity */
export function energyRatio(subjectMag: number, comparisonMag: number): number {
  return 10 ** (1.5 * (subjectMag - comparisonMag));
}

/**
 * Check the confirmed superlative against the source: the subject must exceed every other event in
 * the study set, or this returns the events it does not exceed and the render throws naming them.
 
 *  @parity */
export function symbolClaimViolations({
  rows,
  subjectKey,
}: {
  rows: QuakeRow[];
  subjectKey: string;
}): string[] {
  const subject = rows.find((r) => r.key === subjectKey);
  if (!subject) throw new Error(`no row for subject ${subjectKey}`);
  const violations: string[] = [];
  for (const row of rows) {
    if (row.key === subject.key) continue;
    if (row.mag >= subject.mag)
      violations.push(
        `${row.place} (M${row.mag}) is not below the subject ${subject.place} (M${subject.mag})`,
      );
  }
  return violations;
}

/** The beat's own language is English (`lang="en"` on the page this feeds), so its numbers are
 *  English — the same `en` on `en-GB` `proof/web-co2-ranking/bar-geometry.ts` settled on. 
 *  @parity */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
