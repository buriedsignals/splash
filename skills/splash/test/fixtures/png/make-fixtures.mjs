// Writes the PNG fixtures `compare-png.test.ts` decodes — one per shape of PNG the decoder claims to
// read. Run: `bun skills/splash/test/fixtures/png/make-fixtures.mjs`
//
// WHY FIXTURES ON DISK AND NOT PNGs BUILT IN THE TEST. The test already builds 8-bit RGB/RGBA images
// with its own encoder, and that round-trip cannot catch a bug the decoder SHARES with that encoder —
// measured: a broken Paeth predictor stayed green until the fixture stopped being a linear gradient.
// Every file written here is decoded twice in the suite, once by `decodePng` and once by Chrome's own
// image decoder, and the two must agree pixel for pixel. Chrome is the independent implementation;
// this file only has to emit valid PNG.
//
// The shapes: bit depths 1, 2, 4, 8 and 16; colour types 0 (greyscale), 2 (RGB), 3 (palette),
// 4 (greyscale + alpha) and 6 (RGBA); `tRNS` on greyscale, on RGB and on a palette; and Adam7
// interlacing. That is the set Chrome reads and the browser-based comparator this one replaced could
// therefore read — nothing is meant to be narrower than what came before.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

let TABLE = null;
function crc32(buf) {
  if (!TABLE) {
    TABLE = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const byte of buf) c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** Pack one scanline's samples at `depth` bits each, MSB first, into whole bytes. */
function packRow(samples, depth) {
  if (depth === 16) {
    const out = Buffer.alloc(samples.length * 2);
    samples.forEach((v, i) => out.writeUInt16BE(v, i * 2));
    return out;
  }
  if (depth === 8) return Buffer.from(samples);
  const perByte = 8 / depth;
  const out = Buffer.alloc(Math.ceil(samples.length / perByte));
  samples.forEach((v, i) => {
    const at = Math.floor(i / perByte);
    const shift = 8 - depth * ((i % perByte) + 1);
    out[at] |= (v & ((1 << depth) - 1)) << shift;
  });
  return out;
}

/** The seven Adam7 passes as [xStart, yStart, xStep, yStep]. */
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

/**
 * @param sample (x, y) -> array of `CHANNELS[colorType]` sample values, already in `depth`'s range
 */
function encode({ width, height, depth, colorType, sample, palette, trns, interlace = 0 }) {
  const channels = CHANNELS[colorType];
  const rows = [];
  const emit = (xs, ys) => {
    for (const y of ys) {
      const samples = [];
      for (const x of xs) samples.push(...sample(x, y));
      // Filter 0 throughout: this file's job is valid PNG in every SHAPE, and the filters already
      // have their own round-trip and their own real-file cross-check through `map-web`'s preview.
      rows.push(Buffer.concat([Buffer.from([0]), packRow(samples, depth)]));
    }
  };
  if (!interlace) {
    emit(
      Array.from({ length: width }, (_, x) => x),
      Array.from({ length: height }, (_, y) => y),
    );
  } else {
    for (const [x0, y0, dx, dy] of ADAM7) {
      const xs = [];
      for (let x = x0; x < width; x += dx) xs.push(x);
      const ys = [];
      for (let y = y0; y < height; y += dy) ys.push(y);
      if (!xs.length || !ys.length) continue;
      emit(xs, ys);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;
  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
  ];
  if (palette) parts.push(chunk("PLTE", Buffer.from(palette.flat())));
  if (trns) parts.push(chunk("tRNS", Buffer.from(trns)));
  parts.push(chunk("IDAT", deflateSync(Buffer.concat(rows))));
  parts.push(chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

const W = 12;
const H = 8;
const max = (depth) => (1 << Math.min(depth, 16)) - 1;
const wave = (x, y, depth) => Math.round(((Math.sin(x * 1.1) + Math.cos(y * 0.9) + 2) / 4) * max(depth));

const FIXTURES = {
  "grey-1bit.png": { depth: 1, colorType: 0, sample: (x, y) => [(x + y) % 2] },
  "grey-2bit.png": { depth: 2, colorType: 0, sample: (x, y) => [(x + 2 * y) % 4] },
  "grey-4bit.png": { depth: 4, colorType: 0, sample: (x, y) => [(x * 3 + y) % 16] },
  "grey-8bit.png": { depth: 8, colorType: 0, sample: (x, y) => [wave(x, y, 8)] },
  "grey-16bit.png": { depth: 16, colorType: 0, sample: (x, y) => [wave(x, y, 16)] },
  "grey-alpha-8bit.png": {
    depth: 8,
    colorType: 4,
    sample: (x, y) => [wave(x, y, 8), (x * 20) % 256],
  },
  "grey-alpha-16bit.png": {
    depth: 16,
    colorType: 4,
    sample: (x, y) => [wave(x, y, 16), (x * 5000) % 65536],
  },
  "grey-trns-8bit.png": {
    depth: 8,
    colorType: 0,
    sample: (x, y) => [(x * 21) % 256],
    // The greyscale sample that is fully transparent, as a 16-bit big-endian value.
    trns: [0x00, 0x2a],
  },
  "rgb-16bit.png": {
    depth: 16,
    colorType: 2,
    sample: (x, y) => [wave(x, y, 16), 65535 - wave(x, y, 16), (x * 4000) % 65536],
  },
  "rgba-16bit.png": {
    depth: 16,
    colorType: 6,
    sample: (x, y) => [wave(x, y, 16), (y * 8000) % 65536, (x * 4000) % 65536, (x * 6000) % 65536],
  },
  "rgb-trns-8bit.png": {
    depth: 8,
    colorType: 2,
    sample: (x, y) => [(x * 17) % 256, (y * 31) % 256, 128],
    trns: [0x00, 0x11, 0x00, 0x1f, 0x00, 0x80],
  },
  "palette-8bit.png": {
    depth: 8,
    colorType: 3,
    sample: (x, y) => [(x + y) % 6],
    palette: [
      [17, 119, 51],
      [51, 34, 136],
      [204, 102, 119],
      [221, 204, 119],
      [136, 34, 85],
      [68, 170, 153],
    ],
  },
  "palette-4bit-trns.png": {
    depth: 4,
    colorType: 3,
    sample: (x, y) => [(x * 2 + y) % 6],
    palette: [
      [17, 119, 51],
      [51, 34, 136],
      [204, 102, 119],
      [221, 204, 119],
      [136, 34, 85],
      [68, 170, 153],
    ],
    // Entry 0 fully transparent, entry 1 half — tRNS may be shorter than the palette.
    trns: [0, 128],
  },
  "palette-1bit.png": {
    depth: 1,
    colorType: 3,
    sample: (x, y) => [(x * y) % 2],
    palette: [
      [255, 255, 255],
      [11, 122, 117],
    ],
  },
  "rgba-8bit-interlaced.png": {
    depth: 8,
    colorType: 6,
    interlace: 1,
    sample: (x, y) => [(x * 19) % 256, (y * 29) % 256, (x * y * 7) % 256, 255 - ((x * 11) % 200)],
  },
  "palette-8bit-interlaced.png": {
    depth: 8,
    colorType: 3,
    interlace: 1,
    sample: (x, y) => [(x + 2 * y) % 6],
    palette: [
      [17, 119, 51],
      [51, 34, 136],
      [204, 102, 119],
      [221, 204, 119],
      [136, 34, 85],
      [68, 170, 153],
    ],
  },
  "grey-4bit-interlaced.png": {
    depth: 4,
    colorType: 0,
    interlace: 1,
    sample: (x, y) => [(x * 3 + y * 5) % 16],
  },
};

for (const [name, spec] of Object.entries(FIXTURES)) {
  const png = encode({ width: W, height: H, ...spec });
  writeFileSync(join(HERE, name), png);
  console.log(`${name.padEnd(30)} ${png.length} bytes`);
}
