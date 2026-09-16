// Stamp a retraction into a PNG's own METADATA, so the warning travels with the file.
//
// The problem this solves. `proof/comparison/` and `proof/trial/` hold 21 PNGs that render figures
// no data in this tree supports — a migration series with its negative years in the wrong place and
// 1998 drawn below zero when the real series has it at +1,177, credited to the Federal Statistical
// Office. They are kept, deliberately: the comparative findings they support are about LAYOUT,
// which reads the same whatever series sits underneath, and one of them is the "before" half of
// COMPARISON.md's own before/after argument. A `SUPERSEDED.md` beside them records all of this.
//
// The residue that file cannot cover: lift one PNG out of its folder — drop it in a deck, mail it,
// paste it into a document — and it arrives with no warning at all, looking like evidence.
//
// The three obvious fixes each break something:
//   - Burn a banner into the pixels: destroys the artifact as a record of what was rendered, which
//     is the only reason it is still here.
//   - Rename with a `SUPERSEDED-` prefix: dangles every path in `AUDIT-2026-08-09.md` and in the
//     prose that cites them.
//   - Do nothing: a file that asserts a false number under a real institution's name travels free.
//
// A PNG `tEXt` chunk breaks none of them. The image bytes are untouched, the filename is untouched,
// every citation still resolves — and `exiftool`, macOS Preview's inspector, and any image library
// will show the retraction. It is not loud, and this file says so rather than overselling it: a
// reader who never opens the metadata never sees it. It is strictly better than nothing and
// strictly worse than a banner, which is the trade this artifact's dual role forces.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEYWORD = "Warning";

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function textChunk(keyword, text) {
  const data = Buffer.concat([Buffer.from(keyword, "latin1"), Buffer.from([0]), Buffer.from(text, "latin1")]);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write("tEXt", 4, "latin1");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from("tEXt", "latin1"), data])), 8 + data.length);
  return out;
}

/** Reads the chunk list without a PNG library — length, type, data, crc, repeating after the 8-byte signature. */
function chunks(buf) {
  const list = [];
  let i = 8;
  while (i < buf.length) {
    const length = buf.readUInt32BE(i);
    const type = buf.toString("latin1", i + 4, i + 8);
    list.push({ type, start: i, end: i + 12 + length });
    i += 12 + length;
    if (type === "IEND") break;
  }
  return list;
}

export function stamp(file, message) {
  const buf = readFileSync(file);
  if (buf.toString("latin1", 1, 4) !== "PNG") throw new Error(`${file} is not a PNG`);
  const list = chunks(buf);

  // Idempotent: re-running must not append a second copy. A stamp script that grows the file every
  // time it runs is a script nobody dares run twice, which defeats the point of having one.
  const existing = list.find((c) => {
    if (c.type !== "tEXt") return false;
    return buf.toString("latin1", c.start + 8, c.start + 8 + KEYWORD.length) === KEYWORD;
  });
  if (existing) {
    return { file, action: "already stamped" };
  }

  // Immediately before IEND — a tEXt chunk is legal anywhere after IHDR, and putting it last means
  // the image data's own bytes keep their exact offsets.
  const iend = list.find((c) => c.type === "IEND");
  const out = Buffer.concat([buf.subarray(0, iend.start), textChunk(KEYWORD, message), buf.subarray(iend.start)]);
  writeFileSync(file, out);
  return { file, action: "stamped", bytesAdded: out.length - buf.length };
}

export function readStamp(file) {
  const buf = readFileSync(file);
  for (const c of chunks(buf)) {
    if (c.type !== "tEXt") continue;
    const data = buf.subarray(c.start + 8, c.end - 4);
    const nul = data.indexOf(0);
    if (data.toString("latin1", 0, nul) === KEYWORD) return data.toString("latin1", nul + 1);
  }
  return null;
}

/** Remove a stamp — needed because the first run of this script stamped the wrong files. */
export function unstamp(file) {
  const buf = readFileSync(file);
  for (const c of chunks(buf)) {
    if (c.type !== "tEXt") continue;
    if (buf.toString("latin1", c.start + 8, c.start + 8 + KEYWORD.length) !== KEYWORD) continue;
    writeFileSync(file, Buffer.concat([buf.subarray(0, c.start), buf.subarray(c.end)]));
    return { file, action: "unstamped" };
  }
  return { file, action: "had no stamp" };
}

/**
 * The list of files to stamp is DERIVED from each folder's own `SUPERSEDED.md` verdict table, never
 * from "every PNG in the folder".
 *
 * That distinction is not tidiness — the first version of this script stamped all 21 PNGs, and four
 * of them (`1-CO2--*`) had been individually re-verified against the frozen data and found SOUND:
 * 1967 = 32.5270 against a rule at 32,5; 2024 = 32.0717 against "32,1"; series max 1973 at 46.2049.
 * Stamping those said something false about a correct artifact — the exact class this whole folder
 * exists to document, committed by the script written to document it. `beat-a-norway.png` is the
 * same story with a twist: its DATA and credit are sound and only its title is false, so a
 * "renders figures no data supports" stamp would also have been untrue of it.
 *
 * So the table is the source of truth, and a row must say SUPERSEDED in its Standing column to be
 * stamped. Adding a file to a folder no longer silently marks it.
 */
function supersededIn(dir) {
  const text = readFileSync(join(dir, "SUPERSEDED.md"), "utf8");
  const files = [];
  for (const line of text.split("\n")) {
    const row = /^\|\s*`([^`]+)`\s*\|(.*)\|/.exec(line);
    if (!row) continue;
    if (!/SUPERSEDED/.test(row[2])) continue;
    if (row[1].includes("*")) continue; // a glob row describes a group, never one file
    files.push(join(dir, row[1]));
  }
  return files;
}

if (import.meta.main) {
  const HERE = import.meta.dirname;
  const MESSAGE =
    "SUPERSEDED 2026-08-09. This image renders figures no data in this repository supports. " +
    "It is kept as a record of what was rendered, not as evidence of any number. " +
    "See SUPERSEDED.md in the folder this file came from, and use the corrected renders in " +
    "proof/migration/ and proof/life-expectancy/ instead.";

  const { readdirSync } = await import("node:fs");
  const dirs = ["comparison", "trial"].map((d) => join(HERE, d));
  const wanted = new Set(dirs.flatMap(supersededIn));

  for (const dir of dirs) {
    for (const name of readdirSync(dir)) {
      if (!name.toLowerCase().endsWith(".png")) continue;
      const file = join(dir, name);
      // Every PNG is visited, so a stamp on a file the table does not list is REMOVED rather than
      // merely skipped. Otherwise the first run's mistake would survive every later run.
      console.log(wanted.has(file) ? stamp(file, MESSAGE) : unstamp(file));
    }
  }
  const first = [...wanted][0];
  console.log(`\nread-back check on ${first}:\n${readStamp(first)}`);
}
