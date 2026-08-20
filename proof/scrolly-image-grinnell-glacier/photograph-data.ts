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
 * This beat's own reading layer — the sequence's metadata, and the facts derived from it.
 *
 * **What this beat can and cannot compute, stated first because it decides everything below.** The
 * beat's data is a set of PHOTOGRAPHS and their provenance. So every figure it says out loud is a
 * fact about the SEQUENCE — how many frames, from which year to which, how long between two of
 * them, who took each — and all of those are computed here from `photographs.csv`. Nothing here
 * measures the glacier. No ice area, no volume, no percentage lost is claimed anywhere in this beat,
 * because four photographs are not a measurement and this project's own rule is that a number a
 * reader sees has to be reproducible from the beat's own frozen data. What the photographs support
 * is what a reader can see in them, and that is what the prose says.
 */

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

const HEADER =
  "order,year,photographer,collection,licence,source_page,file_url,original_width,original_height,original_sha256,crop_width,delivered_file,delivered_width,delivered_height,delivered_sha256";

export function readPhotographs(text: string): Photograph[] {
  const lines = parseCsvRows(text.trim());
  if (lines[0].join(",") !== HEADER)
    throw new Error(
      `photographs.csv header changed: expected\n  ${HEADER}\ngot\n  ${lines[0]}`,
    );
  const rows = lines.slice(1).map((line) => {
    const c = line;
    if (c.length !== 15)
      throw new Error(`expected 15 cells, got ${c.length}: ${line}`);
    return {
      order: Number(c[0]),
      year: Number(c[1]),
      photographer: c[2],
      collection: c[3],
      licence: c[4],
      sourcePage: c[5],
      fileUrl: c[6],
      originalWidth: Number(c[7]),
      originalHeight: Number(c[8]),
      originalSha256: c[9],
      cropWidth: Number(c[10]),
      deliveredFile: c[11],
      deliveredWidth: Number(c[12]),
      deliveredHeight: Number(c[13]),
      deliveredSha256: c[14],
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
  /** Years between each consecutive pair, in order. */
  gaps: number[];
  longestGap: { years: number; from: number; to: number };
  /** The one box every frame was normalised to — the reason the sequence is comparable. */
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

  // Every frame must have been normalised to ONE box. If two were not, the reader would be
  // comparing two differently-framed photographs while the beat tells them the viewpoint is fixed
  // — which is the whole claim.
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

/**
 * The credit line a single frame carries at its own bottom margin — WHO took this photograph, for
 * whom, and when.
 *
 * The licence is deliberately NOT here. It is the same for all four and it is stated once in the
 * page header; repeating it per frame made this line 359px wide at 13px, which is 96% of a 375px
 * phone and wrapped to two lines that then ran off the bottom of the frame. Measured, not guessed.
 */
export function creditFor(p: Photograph): string {
  return `${p.photographer} · ${p.collection}, ${p.year}`;
}
