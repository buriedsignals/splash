/**
 * THE SEAM BETWEEN THE GATE'S DECISION AND THE DELIVERED FILE.
 *
 * The defect this file exists to hold shut, stated once: gate 2c took a size and **nothing
 * downstream read it**. A journalist could pin `size: portrait` on a `chart/static` slot, pass the
 * gate, and receive an 1800x1120 PNG, because `renderStill` asserted the element's drawn frame
 * against the `width`/`height` it was HANDED — and both came from the same two literals in the
 * beat's own `render.mjs`. They agreed by construction. Measured across the corpus: 0 of 17 chart
 * statics, 0 of 19 chart videos and 0 of 18 chart webs drew at a size from the table.
 *
 * So there are three separate things to hold, and they are separate on purpose:
 *
 *   1. **The decision arrives.** `readPinnedSize` reads the beat's own record and THROWS naming
 *      every path it looked at, rather than defaulting. `readPalette`'s failure mode on a new axis.
 *   2. **The file carries it.** `assertDeliveredSize` reads the artifact's own bytes. This is the
 *      only reading the code that wrote the file cannot make agree with itself.
 *   3. **The reader can read it.** `assertTypeFloor` and `assertWithinStage` measure the RENDERED
 *      markup, because a scale can be right and a token still left bare — the seed's `GAP_NOTE` at
 *      a literal 12px is the worked example, and it survived a whole three-size render because it
 *      collided with nothing and was clipped by nothing.
 *
 * THE MUTATIONS, run in an rsync of the tree under `/tmp/w4c3mut/` with `node_modules` symlinked,
 * never in this working tree (invariant 4). Baseline 25 pass / 0 fail.
 *
 *   `readPinnedSize` returns "landscape" when the BRIEF pins none   RED — 24/1
 *   `assertTypeFloor` compares against a raw 12, not `minTypePx`    RED — 22/3. The whole
 *        mobile-first argument as one mutation: 16px clears the raw 12 and fails the 36 a
 *        1080-wide frame read at 360 dp actually needs, and 12 is the number a reader would
 *        reach for from the sources without doing the arithmetic.
 *   `assertWithinStage` returns early for every size                RED — 22/3
 *   `formForSize` clamps an unmeasured type with a borrowed range   RED — 23/2
 *   `formForSize` transposes the histogram too                      RED — 24/1
 *   `assertPlotAspect` never refuses a ratio                        RED — 27/1
 *   it drops the no-area check and divides anyway                   RED — 27/1
 *   its refusal names a smaller type instead of a rung              RED — 27/1. "Make it smaller"
 *        is the rule that fails at the moment it is needed, so the refusal is asserted to name the
 *        ladder and asserted NOT to name the type.
 *   `assertDeliveredSize`'s message drops the pinned dimensions     RED — 24/1. A refusal that
 *        does not say what was expected sends the reader back to the code that wrote the file,
 *        which is the reading this whole seam exists to stop trusting.
 *
 *   `assertWithinStage` measures the baseline, not the ascent      GREEN — 25/0, and recorded as
 *        the known blind spot rather than closed by tightening a number nobody measured. The
 *        0.75 cap-height estimate is deliberately generous, so it refuses LESS, never more; a run
 *        whose baseline is inside the band and whose cap height is not sits inside that slack.
 *        The honest close is a measured ink box, which is `three-sizes-no-collision.test.ts`'s
 *        machinery, not a bigger constant here.
 */
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  SIZES,
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  parseBriefFrontMatter,
  readPinnedSize,
  readPngSize,
  sizeFor,
  stageFor,
  viewedAtCssPx,
} from "../scripts/sizes.mjs";
import {
  BAND_SCALE_TYPES,
  MEASURED_ASPECT,
  REMOVAL_LADDER,
  assertPlotAspect,
  assertTypeMayEnter,
  formForSize,
} from "../scripts/type-at-size.mjs";

const fsInject = { readFile, dirname, join };

/** A plot rectangle of a given aspect, for the cases that are about the VERDICT and not the shape. */
const flatFor = (aspect: number) => ({ left: 0, right: 100 * aspect, top: 0, bottom: 100 });

describe("the pinned size reaching the producer", () => {
  it("should read the size out of the beat's own BRIEF, not out of the render script", async () => {
    const dir = await mkdtemp(join(tmpdir(), "twin-size-"));
    await writeFile(
      join(dir, "BRIEF.md"),
      "---\nsize: portrait\n---\n\n# Beat\n",
    );
    expect(await readPinnedSize(dir, fsInject)).toBe("portrait");
  });

  it("should find the brief by walking UP, so a nested render script still reaches it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "twin-size-"));
    await writeFile(join(dir, "BRIEF.md"), "---\nsize: square\n---\n");
    const nested = join(dir, "probe", "arm");
    await mkdir(nested, { recursive: true });
    expect(await readPinnedSize(nested, fsInject)).toBe("square");
  });

  it("should throw naming every path it looked at, rather than defaulting, when no brief exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "twin-size-"));
    const nested = join(dir, "a", "b");
    await mkdir(nested, { recursive: true });
    let message = "";
    try {
      await readPinnedSize(nested, fsInject);
    } catch (e) {
      message = (e as Error).message;
    }
    // The `readPalette` shape: the refusal is a list of places, so the fix is one edit away.
    expect(message).toContain("BRIEF.md");
    expect(message).toContain(nested);
    expect(message).not.toContain("defaulting to");
  });

  it("should throw when the brief exists but pins nothing — silence is not landscape", async () => {
    const dir = await mkdtemp(join(tmpdir(), "twin-size-"));
    await writeFile(
      join(dir, "BRIEF.md"),
      "# Beat\n\nChannel: article web, 900 x 560.\n",
    );
    let message = "";
    try {
      await readPinnedSize(dir, fsInject);
    } catch (e) {
      message = (e as Error).message;
    }
    // That prose line is exactly what the corpus carried, and it is what checked nothing.
    expect(message).toContain("pins no size");
    expect(message).toContain("landscape, square, portrait");
  });

  it("should refuse a size the toolchain does not export, from the brief as from anywhere else", async () => {
    const dir = await mkdtemp(join(tmpdir(), "twin-size-"));
    await writeFile(join(dir, "BRIEF.md"), "---\nsize: feed\n---\n");
    expect(readPinnedSize(dir, fsInject)).rejects.toThrow(
      /landscape, square, portrait/,
    );
  });

  it("should parse front matter without dragging in a YAML dependency, and answer null without it", () => {
    expect(
      parseBriefFrontMatter("---\nsize: portrait\ntype: histogram\n---\nbody"),
    ).toEqual({
      size: "portrait",
      type: "histogram",
    });
    expect(parseBriefFrontMatter("# no front matter")).toBeNull();
  });
});

describe("the delivered file carrying the size", () => {
  it("should refuse a PNG whose own IHDR disagrees with the pinned row", () => {
    const png = new Uint8Array(33);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const view = new DataView(png.buffer);
    view.setUint32(16, 1800);
    view.setUint32(20, 1120);
    // 1800x1120 is not a hypothetical: it is what the corpus's own delivered statics measured,
    // a 900x560 element rasterised at `fitTo: width * 2`.
    expect(() => assertDeliveredSize(readPngSize(png), "landscape")).toThrow(
      /1800x1120/,
    );
    expect(() => assertDeliveredSize(readPngSize(png), "landscape")).toThrow(
      /1920x1080/,
    );
  });

  it("should hold for all three sizes, with no exemption for the default one", () => {
    for (const name of Object.keys(SIZES)) {
      const row = sizeFor(name);
      expect(
        assertDeliveredSize({ width: row.width, height: row.height }, name),
      ).toEqual(row);
      expect(() =>
        assertDeliveredSize({ width: row.width, height: row.height - 2 }, name),
      ).toThrow();
      expect(() =>
        assertDeliveredSize({ width: row.width + 2, height: row.height }, name),
      ).toThrow();
    }
  });
});

describe("the type floor — the whole mobile-first argument, as an assertion", () => {
  it("should put the floor where 12 CSS px lands once the frame is scaled to the phone", () => {
    // 1 frame px = 360/1080 CSS px full-bleed on the narrowest phone Android calls "compact".
    expect(viewedAtCssPx("portrait")).toBe(360);
    expect(viewedAtCssPx("square")).toBe(360);
    expect(viewedAtCssPx("landscape")).toBe(900);
    for (const name of ["portrait", "square", "landscape"]) {
      const row = sizeFor(name);
      const cssPx = (row.minTypePx * viewedAtCssPx(name)) / row.width;
      expect([name, cssPx >= 11.9 && cssPx < 13]).toEqual([name, true]);
    }
  });

  it("should refuse the shipped table's own old portrait type, and name what a reader would get", () => {
    // The table shipped `typeScale: 1.2` at portrait — `width / 900`, an apparent-size-preserving
    // number for an ARTICLE COLUMN — which put the axis labels at 16px and the source at 17px.
    const svg = `<svg width="1080" height="1920"><text font-size="16">2016</text></svg>`;
    let message = "";
    try {
      assertTypeFloor(svg, "portrait");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("16px");
    expect(message).toContain("5.3 CSS px");
    expect(message).toContain("36px floor");
  });

  it("should pass the same markup at landscape and fail it at portrait", () => {
    // The identical run, at two sizes, is the cleanest statement that the floor is about the
    // READING and not about the number.
    const svg = `<svg><text font-size="29">Source: Global Carbon Budget</text></svg>`;
    expect(assertTypeFloor(svg, "landscape")).toEqual(sizeFor("landscape"));
    expect(() => assertTypeFloor(svg, "portrait")).toThrow(/29px/);
  });

  it("should count every offending run, so one refusal names the whole problem", () => {
    const svg = `<svg><text font-size="12">a</text><text font-size="12">b</text><text font-size="20">c</text></svg>`;
    expect(() => assertTypeFloor(svg, "portrait")).toThrow(/12px x2/);
  });
});

describe("the platform's safe band as a budget", () => {
  it("should reserve a band for portrait and the whole frame for the other two", () => {
    // Meta publishes 14% top / 35% bottom for Stories and Reels; a feed post is not overlaid.
    expect(stageFor("portrait")).toEqual({
      top: 269,
      bottom: 1248,
      height: 979,
      reserved: true,
    });
    expect(stageFor("square")).toEqual({
      top: 0,
      bottom: 1080,
      height: 1080,
      reserved: false,
    });
    expect(stageFor("landscape")).toEqual({
      top: 0,
      bottom: 1080,
      height: 1080,
      reserved: false,
    });
    // 979 is 51% of the frame, which is the number the whole budget rests on.
    expect(Math.round((979 / 1920) * 100)).toBe(51);
  });

  it("should refuse a credit pinned to the frame's bottom margin, where the progress bar sits", () => {
    // The seed pinned its source to `height - PAD`. At portrait that is 1800, inside the 672px
    // Meta reserves — a COVERED credit, which is an attribution failure and not a cosmetic one,
    // and which no clipping counter can see because nothing is clipped.
    const svg = `<svg><text y="1800" font-size="42">Source: Global Carbon Budget</text></svg>`;
    let message = "";
    try {
      assertWithinStage(svg, "portrait");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("Source: Global Carbon Budget");
    expect(message).toContain("269-1248");
    expect(message).toContain("COVERED");
  });

  it("should refuse a title drawn in the platform's own top reserve", () => {
    const svg = `<svg><text y="140" font-size="72">Six in ten countries</text></svg>`;
    expect(() => assertWithinStage(svg, "portrait")).toThrow(
      /Six in ten countries/,
    );
  });

  it("should say nothing at the sizes that reserve nothing", () => {
    const svg = `<svg><text y="1070" font-size="29">Source</text></svg>`;
    expect(assertWithinStage(svg, "landscape").reserved).toBe(false);
    expect(assertWithinStage(svg, "square").reserved).toBe(false);
  });

  it("should report the rotated runs it could not measure rather than passing them silently", () => {
    const svg =
      `<svg><text y="1800" transform="rotate(-90 40 1800)" font-size="42">Mt</text>` +
      `<text y="1300" font-size="42">below the band</text></svg>`;
    let message = "";
    try {
      assertWithinStage(svg, "portrait");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("1 rotated run(s) were not measured");
  });
});

describe("whether a type can enter a size at all", () => {
  it("should transpose the band-scale types at a tall frame, and say what it costs", () => {
    for (const type of BAND_SCALE_TYPES) {
      const form = formForSize(type, "portrait");
      expect([type, form.verdict]).toEqual([type, "transpose"]);
      expect(form.cost).toContain("reads as a border");
    }
  });

  it("should NOT transpose a type whose category axis is a continuum", () => {
    // "rotating a scatterplot would violate conventions of reading direction… Line charts also
    // resist rotation" — Horak et al. §2.4.2. The probe deliberately rendered no transposed arm
    // for the histogram for the same reason.
    for (const type of ["histogram", "line", "scatter"]) {
      expect([type, formForSize(type, "portrait").verdict]).not.toEqual([
        type,
        "transpose",
      ]);
    }
  });

  it("should clamp only the types whose aspect range was actually rendered and measured", () => {
    for (const [type, range] of Object.entries(MEASURED_ASPECT)) {
      // `ranking-columns` is the one measured range that is deliberately unreachable: `ranking` is
      // a band-scale type, so it takes the twin FORM and this range is never consulted. It is kept
      // because it was measured, not because it is used.
      if (BAND_SCALE_TYPES.includes(type)) continue;
      const form = formForSize(type, "portrait");
      expect([type, form.verdict]).toEqual([type, "clamp"]);
      expect(form.aspect).toEqual({ min: range.min, max: range.max });
      expect(form.from).toContain("portrait-aspect-probe");
    }
    // And the one range the probe itself distrusts travels with its own warning, because a caller
    // that lands exactly on 0.8 has satisfied a floor learned from an already-stretched render.
    expect(formForSize("line", "portrait").suspect).toContain(
      "already stretched",
    );
  });

  it("should REFUSE an unmeasured type rather than borrow a range", () => {
    const form = formForSize("beeswarm", "portrait");
    expect(form.verdict).toBe("refuse");
    expect(form.reason).toContain("no aspect range has been measured");
    // The refusal names the method, so reversing it is a probe run and not a debate.
    expect(form.reason).toContain("stretch arm");
  });

  it("should offer the sizes that DO work in the same breath as the refusal", () => {
    let message = "";
    try {
      assertTypeMayEnter("beeswarm", "portrait");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("cannot be drawn at portrait");
    expect(message).toContain("It ships at: landscape");
  });

  it("should let everything through at landscape, which is the frame this corpus was accepted at", () => {
    for (const type of [
      ...BAND_SCALE_TYPES,
      "histogram",
      "line",
      "scatter",
      "beeswarm",
      "map",
    ]) {
      expect([type, formForSize(type, "landscape").verdict]).toEqual([
        type,
        "as-is",
      ]);
    }
  });

  it("should give the map its own reason, because its aspect is a camera decision", () => {
    expect(formForSize("map", "portrait").reason).toContain("camera");
  });

  it("should refuse a plot stretched out of the shape its type argues in", () => {
    // The probe's finding #1 as an assertion, and the one thing no counter in this project could
    // see: zero clipped runs and zero collisions while a distribution's shape was destroyed.
    // The live case that produced this guard, measured: `static-carbon-footprint-spread` at
    // 1080x1080 with its type at the phone's floor left the plot 915 x 30 — the header and the
    // credit had taken the frame — and the delivered PNG measured exactly the pinned size.
    const flat = { left: 82, right: 997, top: 700, bottom: 730 };
    let message = "";
    try {
      assertPlotAspect(flat, "histogram", "square");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("30.50:1");
    expect(message).toContain("1.1:1 to 2.9:1");
    // It names the LADDER, not a smaller number — what recovers a plot is removing what is above it.
    expect(message).toContain("R2");
    expect(message).not.toMatch(/reduce the (type|font)/i);
  });

  it("should refuse a plot with no area at all before it refuses its ratio", () => {
    // The real first reading of the live case: `plot.bottom - plot.top` came back NEGATIVE, which
    // an aspect ratio cannot describe and which a division would have turned into a plausible
    // number with a minus sign on it.
    expect(() =>
      assertPlotAspect({ left: 82, right: 997, top: 700, bottom: 688 }, "histogram", "square"),
    ).toThrow(/no area/);
  });

  it("should accept a plot inside its type's own measured range, at the size it was measured at", () => {
    // 2.35:1 is this beat's own native landscape plot, and the range's own upper end is 2.9.
    const native = { left: 0, right: 940, top: 0, bottom: 400 };
    expect(assertPlotAspect(native, "histogram", "square").verdict).toBe("clamp");
    // …and it says nothing at all where the verdict is not `clamp`: a transposed ranking is
    // row-driven and HAS no aspect to hold, and landscape is the frame this corpus was accepted at.
    expect(assertPlotAspect(flatFor(30), "ranking", "portrait").verdict).toBe("transpose");
    expect(assertPlotAspect(flatFor(30), "histogram", "landscape").verdict).toBe("as-is");
  });

  it("should never carry a rung that makes something smaller", () => {
    // The ladder's one structural rule, asserted rather than trusted to prose: "make it smaller" is
    // the rule that fails at exactly the moment it is needed, so every rung removes something.
    for (const rung of REMOVAL_LADDER) {
      expect([
        rung.rung,
        /smaller|reduce the size|shrink/i.test(rung.what),
      ]).toEqual([rung.rung, false]);
    }
    expect(REMOVAL_LADDER[0].rung).toBe("R0");
    expect(REMOVAL_LADDER.at(-1)!.what).toContain("refuse");
  });
});
