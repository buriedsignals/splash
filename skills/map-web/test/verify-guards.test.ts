/**
 * THE FOUR GUARDS THIS FORMAT REACHES, on the two substrates it actually has.
 *
 * A map web beat ships ONE self-contained HTML file carrying a baked plate, its marks and a live
 * MapTiler layer over them, and it ships that plate as `plate/plate.png` beside a
 * `plate/geometry.json` recording the frame every point's pixel position was computed in. So two
 * guards read the page and two read the bake, and none of them needs a browser.
 *
 * WHY NOT `projectionDisagreements`, which the catalogue first pointed here. That decision compares
 * an `<img>`'s CSS `object-fit` against the `preserveAspectRatio` of the SVG over it. Measured across
 * the 23 non-scrolly HTML artifacts on disk: **`object-fit` appears in none of them** — it appears in
 * exactly two files in this whole tree, both scrolly IMAGE beats. This format composites its plate as
 * an `<image>` inside the marks' own SVG, in the marks' own coordinate system; there are not two
 * projections that could disagree. `plateMatchesGeometry` is the same defect reached by the mechanism
 * this format does have, and the catalogue carries them as two rows.
 *
 * THE POPULATION, measured 2026-08-19 — 5 beats declare `map / web` and every one carries a plate:
 *   5/5 have a plate whose aspect ratio is their projected frame's, to 0.000 %, at exactly 2.00×
 *   5/5 have a plate on the side of the ground their own `PALETTE.md` declares (0.661–0.840 under
 *       `#FFFFFF`)
 *   0/5 inline any asset twice
 *   0   dashed marks in the five pages — the `stroke-dashoffset:0` a text search finds in them is
 *       URL-encoded inside a `data:image/svg+xml,` attribution icon, not markup. The dash guard is
 *       a pure ratchet here, and the reader that feeds it is proved live in `chart-web`'s own walk
 *       (23 artifacts, 29 marks) against a byte-identical copy
 *
 * Four ratchets. Nothing is being repaired.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodePng } from "../scripts/compare-png.mjs";
import {
  duplicatedPayload,
  groundFromPalette,
  marksFromSource,
  plateFollowsGround,
  plateLuminance,
  plateMatchesGeometry,
  revealDashInScreenSpace,
  surfaceLuminance,
} from "../scripts/verify-guards.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

describe("a plate and the frame its marks were projected into", () => {
  it("refuses a plate whose aspect ratio is not the frame's", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1672, height: 960 }, frame: { width: 836, height: 520 } }),
    ).toMatchObject({ ok: false });
  });

  it("accepts the exact pairing every beat on disk has", () => {
    expect(
      plateMatchesGeometry({ plate: { width: 1672, height: 1040 }, frame: { width: 836, height: 520 } }),
    ).toMatchObject({ ok: true, scale: 2 });
  });
});

describe("a baked plate under a declared ground", () => {
  it("refuses a light plate under a dark ground, and the reverse", () => {
    expect(plateFollowsGround({ ground: 0.009, plate: 0.83 })).toBe(false);
    expect(plateFollowsGround({ ground: 0.95, plate: 0.014 })).toBe(false);
  });

  it("does not run at all on a ground it could not read", () => {
    expect(surfaceLuminance(groundFromPalette(""))).toBe(null);
    expect(plateFollowsGround({ ground: null, plate: 0.83 })).toBe(true);
  });
});

describe("what the shipped page carries", () => {
  it("names an asset inlined more than once", () => {
    const blob = "A".repeat(4096);
    expect(
      duplicatedPayload(`<img src="data:image/png;base64,${blob}"><img src="data:image/png;base64,${blob}">`),
    ).toEqual([{ copies: 2, bytes: 4096, wastedBytes: 4096 }]);
  });

  it("refuses a dash that measures its own path in screen space", () => {
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<path stroke-dasharray="1" stroke-dashoffset="0.4" pathLength="1" vector-effect="non-scaling-stroke"></path>`,
          "beat.html",
        ),
      ),
    ).toEqual(["beat.html:1 path"]);
  });

  it("leaves this format's own dashed furniture alone", () => {
    expect(
      revealDashInScreenSpace(
        marksFromSource(
          `<line stroke="#d1d1d1" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"></line>`,
          "beat.html",
        ),
      ),
    ).toEqual([]);
  });
});

/** Every beat declaring `map / web` in its own brief. Read from `BRIEF.md` rather than imported from
 *  `scripts/matrix.mjs`, which computes the same thing: a skill whose test reaches into a
 *  repository-level script is a skill that no longer travels on its own. */
function mapWebBeats(): { name: string; dir: string }[] {
  const found = [];
  for (const entry of readdirSync(PROOF, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(PROOF, entry.name);
    const brief = join(dir, "BRIEF.md");
    if (!existsSync(brief)) continue;
    const medium = (/\*\*Medium\s*\/\s*format:\*\*\s*([^.\n]+)/.exec(readFileSync(brief, "utf8"))?.[1] ?? "")
      .toLowerCase()
      .replace(/\*/g, "");
    if (/map/.test(medium) && /web/.test(medium)) found.push({ name: entry.name, dir });
  }
  return found;
}

describe("every map web beat on disk", () => {
  it("bakes a plate that describes the frame its own marks were projected into", () => {
    const beats = mapWebBeats();
    expect(beats.length).toBeGreaterThanOrEqual(4);
    const offenders: string[] = [];
    let checked = 0;
    for (const { name, dir } of beats) {
      const geometryPath = join(dir, "plate", "geometry.json");
      const platePath = join(dir, "plate", "plate.png");
      if (!existsSync(geometryPath) || !existsSync(platePath)) continue;
      const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
      if (!geometry.frame) continue;
      checked++;
      const png = decodePng(readFileSync(platePath));
      const verdict = plateMatchesGeometry({
        plate: { width: png.width, height: png.height },
        frame: geometry.frame,
      });
      if (!verdict.ok)
        offenders.push(
          `${name}: plate ${png.width}x${png.height} (${verdict.plateRatio.toFixed(4)}) against frame ` +
            `${geometry.frame.width}x${geometry.frame.height} (${verdict.frameRatio.toFixed(4)}) — ` +
            `${(verdict.drift * 100).toFixed(3)}% apart`,
        );
    }
    expect(checked).toBeGreaterThanOrEqual(4);
    expect(offenders).toEqual([]);
  });

  it("bakes it on the side of the ground it declares", () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const { name, dir } of mapWebBeats()) {
      const palette = join(dir, "PALETTE.md");
      const platePath = join(dir, "plate", "plate.png");
      if (!existsSync(palette) || !existsSync(platePath)) continue;
      const ground = surfaceLuminance(groundFromPalette(readFileSync(palette, "utf8")));
      if (ground == null) continue;
      checked++;
      const plate = plateLuminance(decodePng(readFileSync(platePath)));
      if (!plateFollowsGround({ ground, plate }))
        offenders.push(`${name}: ground luminance ${ground.toFixed(3)}, plate ${plate.toFixed(3)} — opposite sides`);
    }
    expect(checked).toBeGreaterThanOrEqual(4);
    expect(offenders).toEqual([]);
  });

  it("ships a page that inlines each asset once and dashes in the path's own units", () => {
    const offenders: string[] = [];
    let pages = 0;
    let marks = 0;
    for (const { name, dir } of mapWebBeats()) {
      const walk = (at: string): string[] =>
        readdirSync(at, { withFileTypes: true }).flatMap((entry) =>
          entry.isDirectory()
            ? walk(join(at, entry.name))
            : entry.name.endsWith(".html")
              ? [join(at, entry.name)]
              : [],
        );
      for (const file of walk(dir)) {
        const html = readFileSync(file, "utf8");
        if (/data-step|step-panel/.test(html)) continue;
        pages++;
        const mb = (n: number) => (n / (1024 * 1024)).toFixed(2);
        for (const found of duplicatedPayload(html))
          offenders.push(
            `${name}: ${found.copies} copies of one ${mb(found.bytes)} MB asset, ${mb(found.wastedBytes)} MB wasted`,
          );
        const found = marksFromSource(html, file.slice(TWIN.length + 1));
        marks += found.length;
        offenders.push(...revealDashInScreenSpace(found));
      }
    }
    expect(pages).toBeGreaterThanOrEqual(4);
    // NO FLOOR ON `marks`, and the reason is measured: this format's five pages carry ZERO dashed
    // elements. The five `stroke-dashoffset:0` strings a text search finds in them are URL-encoded
    // inside a `data:image/svg+xml,` attribution icon (`vector-effect:none;...;fill:%23000`), not
    // markup — the reader is right to see nothing. A floor here would be a number invented to look
    // rigorous. What keeps the reader honest is that it is BYTE-IDENTICAL to `chart-web`'s, which
    // walks 23 artifacts and 29 marks with a floor of its own, and `guard-copies-parity.test.ts`
    // refuses the two drifting apart.
    expect(marks).toBe(0);
    expect(offenders).toEqual([]);
  });
});
