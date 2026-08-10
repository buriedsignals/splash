import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deriveFurniture,
  contrast,
  measureText,
  readImageMeta,
  readOrientation,
  checkOrientation,
  fitBox,
  toDataUri,
  checkWeight,
  WEIGHT_LIMIT_BYTES,
} from "../scripts/render-still.mjs";
import { imageBeatLayout, ImageBeatSeed } from "../assets/ImageBeatSeed.tsx";

const SAMPLE = join(import.meta.dirname, "..", "assets", "sample-data");

// ---- rasteriser copy: same rule the sibling skills' own copies carry ----

describe("deriveFurniture / contrast — this skill's own copy", () => {
  it("should pick the ink pole that measures higher, not the one a luminance threshold would pick", () => {
    const { ink } = deriveFurniture("#808080");
    expect(ink).toBe("#000000");
    expect(contrast("#000000", "#808080")).toBeGreaterThan(
      contrast("#FFFFFF", "#808080"),
    );
  });

  it("should always produce a muted tone clearing 4.5:1 against the ground", () => {
    for (const ground of [
      "#FFFFFF",
      "#000000",
      "#808080",
      "#F2E9DC",
      "#1A1A2E",
      "#0B7A75",
    ]) {
      const { muted } = deriveFurniture(ground);
      expect(contrast(muted, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("should throw on a ground that is not #rrggbb", () => {
    expect(() => deriveFurniture("white")).toThrow();
  });
});

describe("measureText — this skill's own copy", () => {
  it("should throw when the options argument is missing or a bare number", () => {
    // @ts-expect-error deliberately calling with the wrong shape
    expect(() => measureText("Solar 7.2 %", 40)).toThrow();
  });

  it("should measure a non-empty string wider than an empty one", () => {
    expect(
      measureText("A caption of some length", { fontSize: 15 }),
    ).toBeGreaterThan(measureText("", { fontSize: 15 }));
  });
});

// ---- genre-specific additions: no sibling in chart-beat's own copy ----

describe("readImageMeta", () => {
  it("should read a real sample PNG's own intrinsic size from its IHDR chunk", async () => {
    const bytes = await readFile(join(SAMPLE, "lot-1-before.png"));
    const meta = readImageMeta(bytes);
    expect(meta).toEqual({
      format: "png",
      mime: "image/png",
      width: 900,
      height: 560,
    });
  });

  it("should read the mismatched sample's own portrait size", async () => {
    const bytes = await readFile(join(SAMPLE, "lot-2-during.png"));
    const meta = readImageMeta(bytes);
    expect(meta.width).toBe(560);
    expect(meta.height).toBe(900);
  });

  it("should read a hand-built minimal JPEG's SOF0 dimensions", () => {
    const jpeg = buildJpegSof0(200, 100); // width 200, height 100
    const meta = readImageMeta(jpeg);
    expect(meta).toEqual({
      format: "jpeg",
      mime: "image/jpeg",
      width: 200,
      height: 100,
    });
  });

  it("should throw on bytes that are neither a PNG nor a JPEG", () => {
    expect(() =>
      readImageMeta(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])),
    ).toThrow();
  });
});

describe("readOrientation / checkOrientation", () => {
  it("should read a non-normal EXIF orientation tag out of a hand-built JPEG", () => {
    const jpeg = buildJpegWithOrientation(6); // 6 = rotated 90deg CW
    expect(readOrientation(jpeg)).toBe(6);
  });

  it("should throw, naming the file, on a non-normal orientation", () => {
    const jpeg = buildJpegWithOrientation(6);
    expect(() => checkOrientation(jpeg, "sideways.jpg")).toThrow(
      /sideways\.jpg/,
    );
    expect(() => checkOrientation(jpeg, "sideways.jpg")).toThrow(
      /orientation is 6/,
    );
  });

  it("should accept a JPEG whose EXIF orientation is normal (1)", () => {
    const jpeg = buildJpegWithOrientation(1);
    expect(readOrientation(jpeg)).toBe(1);
    expect(() => checkOrientation(jpeg, "upright.jpg")).not.toThrow();
  });

  it("should return null, and not throw, for a JPEG with no EXIF segment at all", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x00]);
    expect(readOrientation(jpeg)).toBeNull();
    expect(() => checkOrientation(jpeg, "no-exif.jpg")).not.toThrow();
  });

  it("should return null for a PNG (no EXIF orientation concept)", async () => {
    const bytes = await readFile(join(SAMPLE, "lot-1-before.png"));
    expect(readOrientation(bytes)).toBeNull();
  });
});

describe("fitBox — letterbox math, never crop or stretch", () => {
  it("should letterbox a wider-than-box image top and bottom, centred, at full box width", () => {
    const result = fitBox(
      { width: 1000, height: 400 },
      { width: 800, height: 400 },
    );
    expect(result.drawWidth).toBe(800);
    expect(result.drawHeight).toBe(320);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(40);
  });

  it("should letterbox a taller-than-box (portrait) image left and right, centred, at full box height — the mismatched sample's own case", () => {
    const result = fitBox(
      { width: 400, height: 1000 },
      { width: 800, height: 400 },
    );
    expect(result.drawWidth).toBe(160);
    expect(result.drawHeight).toBe(400);
    expect(result.offsetX).toBe(320);
    expect(result.offsetY).toBe(0);
  });

  it("should draw an already-matching aspect ratio at the full box with no bars", () => {
    const result = fitBox(
      { width: 800, height: 400 },
      { width: 800, height: 400 },
    );
    expect(result).toEqual({
      drawWidth: 800,
      drawHeight: 400,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("should never stretch — drawWidth/drawHeight always keep the intrinsic aspect ratio", () => {
    const intrinsic = { width: 733, height: 219 };
    const box = { width: 400, height: 500 };
    const result = fitBox(intrinsic, box);
    expect(result.drawWidth / result.drawHeight).toBeCloseTo(
      intrinsic.width / intrinsic.height,
      6,
    );
  });

  it("should throw on a non-positive intrinsic size", () => {
    expect(() =>
      fitBox({ width: 0, height: 100 }, { width: 800, height: 400 }),
    ).toThrow();
  });
});

describe("toDataUri", () => {
  it("should round-trip the exact bytes it was given", () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 255, 0]);
    const uri = toDataUri(bytes, "image/png");
    expect(uri.startsWith("data:image/png;base64,")).toBe(true);
    const b64 = uri.slice("data:image/png;base64,".length);
    const roundTripped = new Uint8Array(Buffer.from(b64, "base64"));
    expect([...roundTripped]).toEqual([...bytes]);
  });
});

describe("checkWeight", () => {
  it("should not throw under the ceiling", () => {
    expect(() =>
      checkWeight([
        { label: "a.jpg", bytes: new Uint8Array(1024) },
        { label: "b.jpg", bytes: new Uint8Array(1024) },
      ]),
    ).not.toThrow();
  });

  it("should throw over the ceiling, naming the largest file first", () => {
    const big = {
      label: "huge.jpg",
      bytes: new Uint8Array(WEIGHT_LIMIT_BYTES),
    };
    const small = { label: "tiny.jpg", bytes: new Uint8Array(1024) };
    let message = "";
    try {
      checkWeight([small, big]);
      throw new Error("expected checkWeight to throw");
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain("huge.jpg");
    // the largest offender is named before the smaller one
    expect(message.indexOf("huge.jpg")).toBeLessThan(
      message.indexOf("tiny.jpg"),
    );
  });
});

// ---- the seed's own pure layout + the required-input checks that live inside it ----

const okPhoto = (overrides: Partial<Record<string, unknown>> = {}) => ({
  dataUri: "data:image/png;base64,iVBORw0KGgo=",
  intrinsicWidth: 900,
  intrinsicHeight: 560,
  alt: "A bare dirt lot behind a fence.",
  credit: "Photo: sample",
  ...overrides,
});

describe("imageBeatLayout", () => {
  it("should throw with fewer than two photos", () => {
    expect(() => imageBeatLayout([okPhoto()], "A title")).toThrow(
      /at least two/,
    );
  });

  it("should throw, naming the position, when a photo has no alt text", () => {
    expect(() =>
      imageBeatLayout([okPhoto({ alt: "" }), okPhoto()], "A title"),
    ).toThrow(/photo 1 of 2 has no alt text/);
  });

  it("should throw, naming the photo's own alt, when a photo has no credit", () => {
    expect(() =>
      imageBeatLayout([okPhoto(), okPhoto({ credit: "   " })], "A title"),
    ).toThrow(
      /photo 2 of 2 \("A bare dirt lot behind a fence\."\) has no credit/,
    );
  });

  it("should derive a taller frame for a longer caption than a shorter one, all else equal", () => {
    const short = imageBeatLayout(
      [okPhoto({ caption: "Short." }), okPhoto({ caption: "Short." })],
      "A title",
    );
    const long = imageBeatLayout(
      [
        okPhoto({
          caption:
            "A caption long enough that, wrapped at this frame's own content width, it runs onto a second line and pushes everything below it further down the frame.",
        }),
        okPhoto({ caption: "Short." }),
      ],
      "A title",
    );
    expect(long.height).toBeGreaterThan(short.height);
  });

  it("should treat an absent caption and an empty-string caption the same (no caption line)", () => {
    const noCaption = imageBeatLayout([okPhoto(), okPhoto()], "A title");
    const emptyCaption = imageBeatLayout(
      [okPhoto({ caption: "" }), okPhoto({ caption: "   " })],
      "A title",
    );
    expect(noCaption.height).toBe(emptyCaption.height);
  });

  it("should place photos in the caller's own order, never re-sorted", () => {
    const layout = imageBeatLayout(
      [
        okPhoto({ alt: "first" }),
        okPhoto({ alt: "second" }),
        okPhoto({ alt: "third" }),
      ],
      "A title",
    );
    expect(layout.blocks.map((b) => b.alt)).toEqual([
      "first",
      "second",
      "third",
    ]);
    // and each block sits strictly below the one before it
    for (let i = 1; i < layout.blocks.length; i++) {
      expect(layout.blocks[i].boxTop).toBeGreaterThan(
        layout.blocks[i - 1].boxTop,
      );
    }
  });
});

describe("ImageBeatSeed — rendered markup", () => {
  it("should paint only with the ground and its derived furniture — a closed palette, not a blacklist", () => {
    const ground = "#FFFFFF";
    const { ink, muted, grid } = deriveFurniture(ground);
    const allowed = new Set(
      [ground, ink, muted, grid].map((h) => h.toUpperCase()),
    );
    const svg = renderToStaticMarkup(
      createElement(ImageBeatSeed, {
        photos: [okPhoto({ alt: "one" }), okPhoto({ alt: "two" })],
        title: "A title",
        ground,
      }),
    );
    const found = svg.match(/#[0-9a-fA-F]{6}/g) ?? [];
    expect(found.length).toBeGreaterThan(0);
    for (const hex of found) {
      expect(allowed.has(hex.toUpperCase())).toBe(true);
    }
  });

  it("should carry an alt text <desc> per photo, on the wrapping <g>, not on <image> itself", () => {
    const svg = renderToStaticMarkup(
      createElement(ImageBeatSeed, {
        photos: [okPhoto({ alt: "Alt one." }), okPhoto({ alt: "Alt two." })],
        title: "A title",
        ground: "#FFFFFF",
      }),
    );
    expect(svg).toContain("<desc>Alt one.</desc>");
    expect(svg).toContain("<desc>Alt two.</desc>");
    expect((svg.match(/role="img"/g) ?? []).length).toBe(2);
  });

  it("should print every photo's own credit line as visible text, not only as alt text", () => {
    const svg = renderToStaticMarkup(
      createElement(ImageBeatSeed, {
        photos: [
          okPhoto({ credit: "Photo: A. Journalist/Newsroom" }),
          okPhoto(),
        ],
        title: "A title",
        ground: "#FFFFFF",
      }),
    );
    expect(svg).toContain("Photo: A. Journalist/Newsroom");
  });
});

// ---- tiny hand-built JPEG fixtures, used only by the tests above ----

function u16be(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff];
}

/** The smallest JPEG this skill's own `readImageMeta` needs: SOI + one SOF0 marker carrying
 *  width/height, nothing else (no EXIF, no scan data — `readImageMeta` never reads past SOF0). */
function buildJpegSof0(width: number, height: number): Uint8Array {
  const payload = [
    0x08, // precision
    ...u16be(height),
    ...u16be(width),
    0x01, // one component
    0x01,
    0x22,
    0x00, // component id, sampling, quant table
  ];
  const bytes = [
    0xff,
    0xd8, // SOI
    0xff,
    0xc0, // SOF0
    ...u16be(2 + payload.length),
    ...payload,
  ];
  return new Uint8Array(bytes);
}

/** SOI + one APP1 EXIF segment carrying exactly one IFD0 entry, the Orientation tag (0x0112),
 *  little-endian TIFF header — the smallest JPEG `readOrientation` needs, no SOF/SOS required
 *  because the function returns as soon as it has parsed the EXIF segment. */
function buildJpegWithOrientation(orientation: number): Uint8Array {
  const tiff = [
    0x49,
    0x49, // "II" little-endian
    0x2a,
    0x00, // 42
    0x08,
    0x00,
    0x00,
    0x00, // offset to IFD0: 8
    // IFD0
    0x01,
    0x00, // 1 entry
    0x12,
    0x01, // tag 0x0112 (Orientation), little-endian
    0x03,
    0x00, // type 3 = SHORT
    0x01,
    0x00,
    0x00,
    0x00, // count 1
    orientation & 0xff,
    (orientation >> 8) & 0xff,
    0x00,
    0x00, // value, left-justified
    0x00,
    0x00,
    0x00,
    0x00, // next IFD offset: none
  ];
  const app1Payload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]; // "Exif\0\0" + TIFF
  const bytes = [
    0xff,
    0xd8, // SOI
    0xff,
    0xe1, // APP1
    ...u16be(2 + app1Payload.length),
    ...app1Payload,
  ];
  return new Uint8Array(bytes);
}
