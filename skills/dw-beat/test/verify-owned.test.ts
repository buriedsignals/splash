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
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import {
  GUARDS,
  assertExportedSurface,
  planExportSurface,
  credentialNamesRead,
  credentialReadsWithoutAlias,
  csvSplitByHand,
  groundForBeat,
  groundFromPalette,
  pageLanguageMatchesStory,
  plateFollowsGround,
  plateLuminance,
  surfaceLuminance,
} from "../scripts/verify-owned.mjs";
import { resolve } from "node:path";

const SKILL = resolve(import.meta.dirname, "..");
import { produce } from "../scripts/produce.mjs";

/** The five calls `produce` makes, answered without a network — `produce.test.ts`'s own fake, kept
 *  here rather than imported, because importing a test file re-registers its suite. */
function fakeDatawrapper({ pngBytes }: { pngBytes: Uint8Array }) {
  // Every call, in order — so a test can assert not only what came back but that NOTHING was asked
  // for at all, which is the whole of round-five finding Y2's fix.
  const calls: { url: string; method: string }[] = [];
  const fetchFn = async (url: string | URL, init: RequestInit = {}) => {
    const u = String(url);
    calls.push({ url: u, method: init.method ?? "GET" });
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
  return { fetchFn, calls };
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
    expect(GUARDS).toEqual([
      "plateFollowsGround",
      "csvSplitByHand",
      "pageLanguageMatchesStory",
      "credentialReadsWithoutAlias",
    ]);
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

  /**
   * FINDING 5 (round-three stress): `format: "interactive"` used to return before this guard
   * existed at all — the white-on-dark mismatch refused on `stress-i-median-wages` (a real
   * `format: "static"` run) shipped silently the very next day on `stress-n-chomage-cantons` (a
   * real `format: "web"` run), recorded `state: "local-complete"`. This branch delivers an iframe
   * page, not an owned PNG, so it owns no bytes of its own to measure — but a published chart can
   * be exported as a PNG through the same `exportChartPng` call the static branch already makes,
   * and that export is what this branch measures. It is never written to disk; only the iframe
   * page is delivered.
   */
  //
  // ROUND-FIVE FINDING Y2 MOVED THE MOMENT. That refusal fired after the chart was created,
  // uploaded to and PUBLISHED — `DATAWRAPPER.json` recorded `state: "prepared"` because a live
  // chart genuinely existed by then. A Datawrapper embed follows the reader's own colour scheme
  // and cannot be asked for a surface at all (measured on the published page for `cc6eK`:
  // `<meta name="color-scheme" content="light dark">`), so the answer never depended on anything
  // the network was going to say. It is given before the first call now, and NOTHING is created.
  it("refuses the web branch on a dark ground before it creates anything at all", async () => {
    const { beatDir, root } = storyTree("story", "#16191B");
    const { fetchFn, calls } = fakeDatawrapper({
      pngBytes: flatPng(1920, 1080, [255, 255, 255]),
    });
    await expect(
      produce(
        { ...spec, format: "web" },
        {
          storiesRoot: root,
          storyId: "a-story",
          outputId: "the-beat",
          token: "t",
          fetchFn,
        },
      ),
    ).rejects.toThrow(/cannot be asked for a surface/);
    expect(calls).toHaveLength(0);
    expect(existsSync(join(beatDir, "renders", "chart.html"))).toBe(false);
    expect(existsSync(join(beatDir, "DATAWRAPPER.json"))).toBe(false);
  });

  // The static branch is the one that CAN be asked, so a dark-ground newsroom is served rather than
  // refused: the export request carries `dark=true`, measured live on chart `cc6eK` to come back on
  // a #252525 plate against #ffffff without it.
  it("asks the delegate for the dark surface when the story's ground is dark", async () => {
    const { root } = storyTree("story", "#16191B");
    const { fetchFn, calls } = fakeDatawrapper({
      pngBytes: flatPng(1920, 1080, [24, 24, 24]),
    });
    const result = await produce(spec, {
      storiesRoot: root,
      storyId: "a-story",
      outputId: "the-beat",
      size: "landscape",
      token: "t",
      fetchFn,
    });
    expect(readFileSync(result.pngPath).length).toBeGreaterThan(0);
    const exportCall = calls.find((call) => call.url.includes("/export/png"));
    expect(exportCall.url).toContain("dark=true");
  });

  it("asks for no surface at all when the story declared a light ground", async () => {
    const { root } = storyTree("story", "#FFFFFF");
    const { fetchFn, calls } = fakeDatawrapper({
      pngBytes: flatPng(1920, 1080, [255, 255, 255]),
    });
    await produce(spec, {
      storiesRoot: root,
      storyId: "a-story",
      outputId: "the-beat",
      size: "landscape",
      token: "t",
      fetchFn,
    });
    const exportCall = calls.find((call) => call.url.includes("/export/png"));
    expect(exportCall.url).not.toContain("dark");
  });

  it("writes the web branch's iframe page when the story's ground and the exported probe agree", async () => {
    const { beatDir, root } = storyTree("story", "#FFFFFF");
    const { fetchFn } = fakeDatawrapper({
      pngBytes: flatPng(1920, 1080, [255, 255, 255]),
    });
    const result = await produce(
      { ...spec, format: "web" },
      {
        storiesRoot: root,
        storyId: "a-story",
        outputId: "the-beat",
        token: "t",
        fetchFn,
      },
    );
    expect(result.htmlPath).toBe(join(beatDir, "renders", "chart.html"));
    expect(readFileSync(result.htmlPath, "utf8")).toContain("<iframe");
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
    expect(
      pageLanguageMatchesStory(
        '<html lang="fr-FR"><head></head></html>',
        "fr-FR",
      ),
    ).toBe(true);
  });

  it("refuses a page whose <html lang> is a different language than recorded", () => {
    expect(
      pageLanguageMatchesStory('<html lang="en"><head></head></html>', "fr-FR"),
    ).toBe(false);
  });

  it("refuses a page with no <html lang> attribute at all", () => {
    expect(
      pageLanguageMatchesStory("<html><head></head></html>", "fr-FR"),
    ).toBe(false);
  });
});

/**
 * FINDING 2 (round-two stress, added to this wave by the coordinator): a credential read by its
 * canonical name with no declared alias list is the exact gap that let a real, present token under
 * the root's own name (DATAWRAPPER_API_TOKEN) read back as "not set" — this is the guard,
 * `doctrine/references/guard-catalogue.json`'s `credential-alias-reconciled`, carried byte for byte
 * by every producing skill that reads a provider credential (`splash/test/guard-copies-parity.test.ts`).
 */
describe("credentialReadsWithoutAlias", () => {
  it("says nothing about a canonical name that declares its own alias list", () => {
    const source =
      'const DATAWRAPPER_TOKEN_ALIASES = ["DATAWRAPPER_API_TOKEN"];\nconst t = env.DATAWRAPPER_TOKEN;';
    expect(credentialNamesRead(source)).toEqual(["DATAWRAPPER_TOKEN"]);
    expect(credentialReadsWithoutAlias(source)).toEqual([]);
  });

  it("refuses a canonical name read with no alias list anywhere in the source", () => {
    const source =
      'const token = process.env.DATAWRAPPER_TOKEN;\nif (!token) throw new Error("no token");';
    expect(credentialReadsWithoutAlias(source)).toEqual(["DATAWRAPPER_TOKEN"]);
  });

  it("this skill's whole own source carries no credential read without a declared alias", () => {
    const dirs = [join(SKILL, "scripts"), join(SKILL, "assets")];
    let combined = "";
    for (const dir of dirs) {
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) {
        if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
        if (/^(verify|detect)-.*\.mjs$/.test(name)) continue;
        combined += readFileSync(join(dir, name), "utf8") + "\n";
      }
    }
    expect(credentialReadsWithoutAlias(combined)).toEqual([]);
  });
});

// ROUND-FIVE FINDING Y2 — THE REFUSAL WAS RIGHT AND ITS PLACEMENT WAS THE DEFECT.
//
// The run that earned this created chart `yNwL8`, uploaded 186 rows, patched the metadata,
// PUBLISHED it, exported the PNG, and only then threw:
//
//   the delegated export came back on the opposite side from the ground this story declared:
//   ground #16191B (luminance 0.009), export luminance 0.991
//
// `runPreflight` said `datawrapper {available: true}`; the producer gate offered "Datawrapper or
// custom?" without mentioning the surface at all; and `proposePalette` for this newsroom offers
// ONLY dark-ground options, so a Buried Signals story cannot record a palette that producer could
// honour. A live chart now exists on the account for a delivery the journalist was never told
// could not be made.
//
// Two things changed. The surface is now DECIDED before anything is created — `planExportSurface`
// runs on the beat's own declared ground, and throws there rather than after publication. And the
// delegate is ASKED for the matching surface instead of being left to pick: measured live on chart
// `cc6eK`, `GET /export/png?dark=true` comes back on a #252525 plate (luminance 0.018) against
// #ffffff (0.991) without it. A dark-ground newsroom can use this path now.
describe("the surface question, asked before anything exists on the account", () => {
  it("asks for the dark surface when the story's ground is dark", () => {
    const { beatDir } = storyTree("story", "#16191B");
    const plan = planExportSurface(beatDir, "static");
    expect(plan?.dark).toBe(true);
    expect(plan?.ground).toBe("#16191B");
  });

  it("asks for the light surface when the story's ground is light", () => {
    const { beatDir } = storyTree("story", "#FFFFFF");
    expect(planExportSurface(beatDir, "static")?.dark).toBe(false);
  });

  it("says nothing when the beat's story declared no ground at all", () => {
    const { beatDir } = storyTree("nowhere");
    expect(planExportSurface(beatDir, "static")).toBe(null);
  });

  // #999999 measures 0.319, between DARK_SIDE (0.25) and LIGHT_SIDE (0.6) — the band where
  // `plateFollowsGround` deliberately declines to have an opinion.
  it("says nothing for a ground on neither side, exactly as plateFollowsGround does", () => {
    const { beatDir } = storyTree("story", "#999999");
    expect(planExportSurface(beatDir, "static")).toBe(null);
  });

  // The web branch delivers a PUBLISHED EMBED, not an owned PNG, and a Datawrapper embed follows
  // the READER's operating-system colour scheme — measured on the published page for chart
  // `cc6eK`: `<meta name="color-scheme" content="light dark">` with a `prefers-color-scheme`
  // stylesheet. There is no surface to ask for, so a dark-ground story is told so HERE, with
  // nothing yet created, instead of after the chart is live.
  it("refuses a web beat whose story declared a dark ground, naming what it cannot promise", () => {
    const { beatDir } = storyTree("story", "#16191B");
    expect(() => planExportSurface(beatDir, "web")).toThrow(
      /reader's own colour scheme|cannot be asked for a surface/i,
    );
  });

  it("allows a web beat on a light ground — the embed's own default side", () => {
    const { beatDir } = storyTree("story", "#FFFFFF");
    expect(planExportSurface(beatDir, "web")?.dark).toBe(false);
  });
});
