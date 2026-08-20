/**
 * WHAT IS STILL CHECKABLE WHEN THE RENDERING IS SOMEONE ELSE'S.
 *
 * Every other producing skill in this tree writes the geometry it verifies. This one does not: it
 * sends a spec to Datawrapper and takes back an artefact. So most of the catalogue is not weak here,
 * it is UNREACHABLE — there are no marks to carry a dash, no reveal to arrive anywhere, no plate
 * baked beside a geometry file. The catalogue records each of those with its reason rather than as
 * debt, and this file covers the one guard that survives delegation.
 *
 * IT SURVIVES BECAUSE THE ARTEFACT IS OWNED. The PNG this skill takes back is written into the beat
 * directory and delivered from there, and it comes back on whatever surface Datawrapper decided to
 * paint — a surface this producer never asks for, since `spec` requires an accent (`color`) and has
 * no field for a ground. A story whose `PALETTE.md` records `ground: "#16191B"` therefore gets a
 * white chart delivered into a dark article, which is exactly the defect `plate-follows-theme` was
 * earned by, reached by this format's own mechanism: not a plate baked on the wrong side, but an
 * export rendered on a side nobody was asked about.
 *
 * The decision is `scrolly`'s, `map-beat`'s and `map-web`'s, byte for byte —
 * `splash/test/guard-copies-parity.test.ts` holds all four copies to the same text. Only the
 * MEASUREMENT is this skill's own: the surface is the exported PNG rather than a baked plate, and
 * the decision cannot tell the difference between them, which is the point of copying it.
 */
import { describe, expect, it } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import {
  GUARDS,
  assertExportedSurface,
  csvSplitByHand,
  groundForBeat,
  groundFromPalette,
  pageLanguageMatchesStory,
  plateFollowsGround,
  plateLuminance,
  surfaceLuminance,
} from "../scripts/verify-owned.mjs";
import { produce } from "../scripts/produce.mjs";

/** The five calls `produce` makes, answered without a network — `produce.test.ts`'s own fake, kept
 *  here rather than imported, because importing a test file re-registers its suite. */
function fakeDatawrapper({ pngBytes }: { pngBytes: Uint8Array }) {
  const fetchFn = async (url: string | URL, init: RequestInit = {}) => {
    const u = String(url);
    if (u === "https://api.datawrapper.de/v3/charts" && init.method === "POST")
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    if (u === "https://api.datawrapper.de/v3/charts/aBcDe/data")
      return new Response(null, { status: 204 });
    if (
      u === "https://api.datawrapper.de/v3/charts/aBcDe" &&
      init.method === "PATCH"
    )
      return new Response(JSON.stringify({ id: "aBcDe" }), { status: 200 });
    if (u === "https://api.datawrapper.de/v3/charts/aBcDe/publish")
      return new Response(
        JSON.stringify({ publicUrl: "//datawrapper.dwcdn.net/aBcDe/1/" }),
        {
          status: 200,
        },
      );
    if (u.startsWith("https://api.datawrapper.de/v3/charts/aBcDe/export/png"))
      return new Response(pngBytes, { status: 200 });
    throw new Error(`fakeDatawrapper: unexpected call to ${u}`);
  };
  return { fetchFn };
}

const SPEC = {
  takeaway: "Emissions fell",
  limits: "Territorial emissions only.",
  credit: "Global Carbon Budget",
  effectiveDate: "2024 data",
  language: "fr-FR",
  color: "#0B7A75",
  chartType: "d3-lines",
  format: "static",
  data: [
    { year: 1950, co2Mt: 10.25 },
    { year: 2024, co2Mt: 32.07 },
  ],
};

/** A real, decodable 8-bit RGB PNG of one flat colour.
 *
 *  `produce.test.ts`'s `fakePng` is a header and three arbitrary bytes, which was enough while only
 *  the IHDR was read. It is not enough now: a fake that cannot be decoded is a fake that would hide
 *  the guard reading it — the same reasoning that made that header conformant in the first place. */
function flatPng(
  width: number,
  height: number,
  [r, g, b]: [number, number, number],
): Uint8Array {
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, body: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([length, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  return Uint8Array.from(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

function palette(ground: string) {
  return `---\nground: "${ground}"\naccent: "#0B7A75"\norigin: newsroom\n---\n\nRecorded for this test.\n`;
}

/** A stories root laid out the way `resolveDatawrapperBeatIdentity` requires. */
function storyTree(where: "beat" | "story" | "nowhere", ground = "#16191B") {
  // realpath, because macOS hands out /var/... for a /private/var/... directory and `produce`
  // canonicalises the root it is given.
  const root = realpathSync(mkdtempSync(join(tmpdir(), "dw-owned-")));
  const storyDir = join(root, "a-story");
  const beatDir = join(storyDir, "beats", "the-beat");
  mkdirSync(beatDir, { recursive: true });
  if (where === "beat")
    writeFileSync(join(beatDir, "PALETTE.md"), palette(ground));
  if (where === "story")
    writeFileSync(join(storyDir, "PALETTE.md"), palette(ground));
  return { root, storyDir, beatDir };
}

describe("the guard a delegated producer still carries", () => {
  it("declares the catalogue guards this format can reach", () => {
    expect(GUARDS).toEqual(["plateFollowsGround", "csvSplitByHand", "pageLanguageMatchesStory"]);
  });

  it("does not hand-split the csv it fetches for the CO2 proof", () => {
    const source = readFileSync(
      join(import.meta.dirname, "..", "scripts", "prove-co2.mjs"),
      "utf8",
    );
    expect(csvSplitByHand(source)).toEqual([]);
  });

  it("refuses an export on the opposite side from the ground the story declared", () => {
    const dark = surfaceLuminance("#16191B")!;
    const light = surfaceLuminance("#FFFFFF")!;
    expect(plateFollowsGround({ ground: dark, plate: light })).toBe(false);
    expect(plateFollowsGround({ ground: light, plate: light })).toBe(true);
    expect(plateFollowsGround({ ground: dark, plate: 0.02 })).toBe(true);
  });

  it("says nothing when there is nothing to compare", () => {
    expect(plateFollowsGround({ ground: null, plate: 0.9 })).toBe(true);
    expect(plateFollowsGround({ ground: 0.9, plate: null })).toBe(true);
  });

  it("measures the surface a delegated export actually came back on", () => {
    const white = {
      width: 8,
      height: 8,
      data: new Uint8Array(8 * 8 * 4).fill(255),
    };
    const black = {
      width: 8,
      height: 8,
      data: new Uint8Array(8 * 8 * 4).fill(0),
    };
    expect(plateLuminance(white)).toBeCloseTo(1, 5);
    expect(plateLuminance(black)).toBeCloseTo(0, 5);
  });

  it("reads the ground out of the beat's own PALETTE.md", () => {
    const { beatDir } = storyTree("beat", "#16191B");
    expect(groundForBeat(beatDir)?.ground).toBe("#16191B");
    expect(groundForBeat(beatDir)?.source).toBe(join(beatDir, "PALETTE.md"));
  });

  it("reads a ground recorded once at the story root, the way every other beat does", () => {
    const { storyDir, beatDir } = storyTree("story", "#FFFFFF");
    expect(groundForBeat(beatDir)?.ground).toBe("#FFFFFF");
    expect(groundForBeat(beatDir)?.source).toBe(join(storyDir, "PALETTE.md"));
  });

  it("returns null, never a default, when no ground was declared anywhere above the beat", () => {
    const { beatDir } = storyTree("nowhere");
    expect(groundForBeat(beatDir)).toBe(null);
    expect(groundFromPalette("no front matter here")).toBe(null);
  });

  it("names both numbers and the file it read the ground from when it refuses", () => {
    const { beatDir } = storyTree("beat", "#16191B");
    expect(() =>
      assertExportedSurface(flatPng(4, 4, [255, 255, 255]), beatDir),
    ).toThrow(/ground .*0\.009.*export .*1\.000/s);
    expect(() =>
      assertExportedSurface(flatPng(4, 4, [255, 255, 255]), beatDir),
    ).toThrow(/PALETTE\.md/);
  });

  it("accepts an export on the same side, and one with no ground to disagree with", () => {
    const dark = storyTree("beat", "#16191B");
    expect(
      assertExportedSurface(flatPng(4, 4, [20, 22, 25]), dark.beatDir),
    ).toMatchObject({
      side: "dark",
    });
    const none = storyTree("nowhere");
    expect(
      assertExportedSurface(flatPng(4, 4, [255, 255, 255]), none.beatDir),
    ).toBe(null);
  });
});

describe("the guard runs inside produce, not only inside a test", () => {
  const spec = SPEC;

  it("refuses to write a white export into a story that declared a dark ground", async () => {
    const { beatDir, root } = storyTree("story", "#16191B");
    const { fetchFn } = fakeDatawrapper({
      pngBytes: flatPng(1920, 1080, [255, 255, 255]),
    });
    await expect(
      produce(spec, {
        storiesRoot: root,
        storyId: "a-story",
        outputId: "the-beat",
        size: "landscape",
        token: "t",
        fetchFn,
      }),
    ).rejects.toThrow(/opposite side/);
    expect(existsSync(join(beatDir, "renders", "chart.png"))).toBe(false);
  });

  it("writes the export when the story's ground and the artefact agree", async () => {
    const { beatDir, root } = storyTree("story", "#FFFFFF");
    const { fetchFn } = fakeDatawrapper({
      pngBytes: flatPng(1920, 1080, [255, 255, 255]),
    });
    const result = await produce(spec, {
      storiesRoot: root,
      storyId: "a-story",
      outputId: "the-beat",
      size: "landscape",
      token: "t",
      fetchFn,
    });
    expect(result.pngPath).toBe(join(beatDir, "renders", "chart.png"));
    expect(readFileSync(result.pngPath).length).toBeGreaterThan(0);
  });
});

/**
 * FINDING 1 (stress round two): the delivered iframe page's own `<html lang>` used to fall back to
 * `"en"` the instant `spec.language` sanitised to nothing — this is the guard on the DELIVERED page,
 * `doctrine/references/guard-catalogue.json`'s `page-declares-story-language`, the same decision
 * `chart-web`, `map-web` and `scrolly` carry byte for byte (`splash/test/guard-copies-parity.test.ts`).
 */
describe("pageLanguageMatchesStory", () => {
  it("agrees when the page's own <html lang> matches the recorded language", () => {
    expect(pageLanguageMatchesStory('<html lang="fr-FR"><head></head></html>', "fr-FR")).toBe(true);
  });

  it("refuses a page whose <html lang> is a different language than recorded", () => {
    expect(pageLanguageMatchesStory('<html lang="en"><head></head></html>', "fr-FR")).toBe(false);
  });

  it("refuses a page with no <html lang> attribute at all", () => {
    expect(pageLanguageMatchesStory("<html><head></head></html>", "fr-FR")).toBe(false);
  });
});

