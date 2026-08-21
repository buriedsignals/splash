/**
 * ROUND-FIVE FINDING T2: does the graphic fill the frame it was GIVEN, when that frame is fixed?
 *
 * `fills-its-frame` used to require `ships-standalone-html`, so the question was asked of the four
 * formats whose container varies and of none of the four whose frame is fixed and known at render
 * time. It now requires `materialises-a-beat` — the trait that describes the property rather than
 * its first instance — and this is this format's own half of that: `frameFillFraction` reads the
 * delivered PNG's own pixels, `graphicFillsItsFrame` decides, and the population is DERIVED from
 * `exampleRunnersFor` rather than typed here, so a beat committed tomorrow is measured without
 * anyone remembering to add it.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import {
  frameFillFraction,
  graphicFillsItsFrame,
  FLOOR_FRACTION,
  MARGIN_FRACTION,
  MEASURED_MIN_FRACTION,
} from "../scripts/detect-fills-its-frame.mjs";
import { exampleRunnersFor } from "../scripts/example-runners.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const NAME = "chart-beat";

/** A DELIVERED FRAME, by the naming convention every render ladder in this tree already writes to:
 *  a still, a video's final frame, a map's `render/static.png`, a seed's `preview.png`. */
const DELIVERED = /(-still|-final-frame|^static|^final-frame|^preview)\.png$/;
/** NOT a delivery: a baked basemap plate, a scrolly drive shot, a story's frozen source, the
 *  hand-over folder. Each is a real PNG a beat directory holds and none of them is the frame a
 *  reader is given. */
const NOT_A_DELIVERY = /^(plate|drive|source|export)/;

function deliveredPngsUnder(dir: string, out: string[] = [], depth = 0): string[] {
  if (!existsSync(dir) || depth > 2) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!NOT_A_DELIVERY.test(name)) deliveredPngsUnder(path, out, depth + 1);
    } else if (DELIVERED.test(name)) out.push(path);
  }
  return out;
}

/** Every fixed frame this format has actually delivered: its own seed render, plus every delivered
 *  frame beside a committed runner that calls this skill. Walked once — the discovery reads every
 *  committed runner in the tree, and four callers doing it four times is four walks. */
let discovered: string[] | null = null;
function deliveredFrames(): string[] {
  if (discovered) return discovered;
  discovered = discover();
  return discovered;
}

function discover(): string[] {
  const found = new Set<string>([join(SKILL, "assets", "preview.png")]);
  const { called } = exampleRunnersFor(TWIN, NAME);
  for (const runner of called)
    for (const png of deliveredPngsUnder(dirname(join(TWIN, runner)))) found.add(png);
  return [...found].filter((file) => existsSync(file)).sort();
}

describe("graphicFillsItsFrame — the drawing's own share of a fixed frame, measured", () => {
  it("says a frame under the floor is under it, and one exactly on it is not", () => {
    expect(graphicFillsItsFrame(0.1, 0.35).under).toBe(true);
    expect(graphicFillsItsFrame(0.35, 0.35).under).toBe(false);
  });

  it("states both numbers behind this format's floor, and the floor is their difference", () => {
    expect(MARGIN_FRACTION).toBeGreaterThan(0);
    expect(FLOOR_FRACTION).toBeCloseTo(MEASURED_MIN_FRACTION - MARGIN_FRACTION, 10);
  });

  it("reads 0 for a frame with nothing on it, which is under every floor", () => {
    // A 2x2 PNG of one flat colour: no ink, no box. Built here rather than committed, because the
    // thing being proved is the arithmetic's own edge and not a beat.
    expect(frameFillFraction(flatPng()).fraction).toBe(0);
  });

  it("reads a real delivered frame's box rather than the whole frame", () => {
    const frames = deliveredFrames();
    const found = frameFillFraction(readFileSync(frames[0]!));
    expect(`${frames[0]}: box ${found.box ? "read" : "absent"}`).toBe(`${frames[0]}: box read`);
    expect(found.fraction).toBeGreaterThan(0);
    expect(found.fraction).toBeLessThanOrEqual(1);
  });
});

describe("every fixed frame this format has delivered", () => {
  it("finds them by derivation rather than by a list, and finds enough to mean something", () => {
    expect(deliveredFrames().length).toBeGreaterThanOrEqual(40);
  });

  it("clears this format's own measured floor", () => {
    const offenders: string[] = [];
    for (const file of deliveredFrames()) {
      const { fraction } = frameFillFraction(readFileSync(file));
      const found = graphicFillsItsFrame(fraction, FLOOR_FRACTION);
      if (found.under)
        offenders.push(
          `${file.replace(`${TWIN}/`, "")}: ${(fraction * 100).toFixed(2)}% of its own frame, ` +
            `under this format's ${(FLOOR_FRACTION * 100).toFixed(2)}% floor`,
        );
    }
    expect(offenders).toEqual([]);
  }, 120000);
});

/** A 2x2 PNG of one flat colour, written by hand — signature, IHDR, one IDAT, IEND. */
function flatPng(): Uint8Array {
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc = (bytes: Uint8Array) => {
    let c = 0xffffffff;
    for (const b of bytes) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Uint8Array) => {
    const head = new Uint8Array(8);
    new DataView(head.buffer).setUint32(0, body.length);
    for (let i = 0; i < 4; i++) head[4 + i] = type.charCodeAt(i);
    const tail = new Uint8Array(4);
    const typed = new Uint8Array(4 + body.length);
    typed.set(head.subarray(4, 8));
    typed.set(body, 4);
    new DataView(tail.buffer).setUint32(0, crc(typed));
    return [head, body, tail];
  };
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2);
  view.setUint32(4, 2);
  ihdr[8] = 8;
  ihdr[9] = 2;
  // Two rows of RGB, each with its own filter byte, deflated with zlib's stored blocks.
  const raw = new Uint8Array([0, 20, 20, 20, 20, 20, 20, 0, 20, 20, 20, 20, 20, 20]);
  const deflated = new Uint8Array(deflateSync(Buffer.from(raw)));
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", deflated),
    ...chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
