/**
 * THE PALETTE GUARD, RE-AIMED AT THE PATH THE CODE ACTUALLY TAKES.
 *
 * This file used to shell out to `two-palette-proof.mjs` on one hard-coded beat,
 * `static-electricity-mix-source`. That beat no longer exists — the catalogue's own pruning
 * (`chore(proof): keep exactly the catalogue's 160 current beats`) renamed and archived it — so the
 * probe went red for a reason that had nothing to do with the palette mechanism, and picking a new
 * beat to hard-code would have been arbitrary. Re-pointing it was refused. This is the repair.
 *
 * THE REAL PATH, CONFIRMED AGAINST THE CODE BEFORE WRITING A LINE HERE. No runner in `proof/` calls
 * `seriesInks` or reads `palette.accent` by that name — those are not this codebase's interface.
 * What every one of the 161 runners does is read its `PALETTE.md` (`readPalette`) and hand it,
 * together with a FILED DIRECTION (`readDirection`, one of `docs/design-base/directions/{creme,
 * nocturne,rapport}.md`), to `composeDirection` — `shared/design-base/compose.mjs`. That function
 * is the one and only place a beat's recorded hue is turned into the exact accent hex a renderer
 * paints with: the record owns the HUE, the direction owns the VALUE (`composeAccent`'s own
 * comment), and `composeDirection`'s result is what a correctly wired runner passes to its
 * component. THAT is where "the palette reaches the pixels" is decided — not at a call site, at a
 * pixel.
 *
 * SO THIS FILE MEASURES THE DELIVERED ARTIFACT, using `composeDirection` itself as the oracle for
 * what SHOULD be on the page — never as a stand-in for looking. For every beat that records a
 * palette: take whichever of `creme` / `nocturne` / `rapport` it actually shipped a render for, ask
 * `composeDirection` what accent that beat's own record composes to on that exact filed direction,
 * then read the COMMITTED render's own pixels (`readPixelPalette`, on the PNG already in the repo,
 * or a screenshot of the committed HTML for a scrolly/web beat — never bytes grepped from the
 * page, for the reason `compose.mjs` names at length: an HTML page inlines whole colour registries,
 * and a hex found in its source proves nothing about what a reader sees) and asks whether that exact
 * colour is actually IN the picture. Checking that a function was called would repeat exactly the
 * mistake this file is fixing; only the pixel answers.
 *
 * THE POPULATION IS WALKED, NEVER LISTED. Every directory directly under `proof/` that carries a
 * `PALETTE.md` is in it — 161 beats as of this writing, and a beat added or retired tomorrow moves
 * the count with no edit here. The guard against a walk that quietly finds nothing is its own test,
 * first below: an empty population must fail loudly, not report zero for zero and go green.
 *
 * WHAT IT FOUND, measured 2026-09-17: of 161 beats, only 6 draw the accent `composeDirection` says
 * their own record composes to — `static-flow-map-ukraine-protection`, `static-locator-
 * zaporizhzhia`, `web-flow-map-ukraine-protection`, `web-hex-grid-europe-protection`,
 * `static-histogram-europe-solar-spread`, `scrolly-heatmap-coal-share-europe` — every one of them a
 * runner that actually calls `composeDirection`. The other 155 call `composeDirections` (PLURAL)
 * only to print an offer report, then draw with `resolveDirectionFamilies(readDirection(...))`
 * straight off the filed direction — the exact defect `compose.mjs`'s own docstring names as
 * closed ("both now come out of this file, from the same call") and that the wiring in `proof/`
 * mostly never took up. That is a rewiring project across the catalogue's runners, not a beat-level
 * colour mistake, so it is recorded rather than fixed here:
 * `docs/splash/2026-09-17-palette-composition-not-wired-owed.md`. This file's assertion is left at
 * full strength — it stays red on those 155, named, on purpose.
 *
 * MUTATION-VERIFIED, 2026-09-17. This file only READS committed artifacts — it re-renders nothing —
 * so the mutation was made in place and reverted, not in a copy: `static-locator-zaporizhzhia`, one
 * of the 6 that pass, had its `PALETTE.md` accent changed from `#0B7A5E` to `#7A2E8E` (a hue nothing
 * in the committed render is drawn in). `bun test … -t static-locator-zaporizhzhia` against the
 * mutated file reported `expected: "#9517B6", found: false` (the record's new hue, walked by
 * `composeDirection`'s own water-hue guard, then correctly not found in the unchanged pixels) where
 * the unmutated tree reports `found: true`; `git checkout -- proof/static-locator-zaporizhzhia/
 * PALETTE.md` restored it, confirmed clean by `git status`. And the vacuity guard: `population()`
 * run against a directory with no beats returns `[]`, which fails `toBeGreaterThan(0)` rather than
 * silently generating zero per-beat tests and reporting an all-green suite of nothing.
 */
import { afterAll, describe, expect, it, setDefaultTimeout } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import { readPixelPalette } from "../../../scripts/design-base/pixel-palette.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirection } from "#shared/design-base/compose.mjs";
import { parsePalette } from "#shared/chart-beat/colour.mjs";

// A screenshot of a committed HTML page, plus reading a handful of PNGs already on disk, per beat.
// No re-render anywhere in this file — the whole point is to measure what is ALREADY DELIVERED.
// Still slow enough across 161 beats (roughly two minutes, mostly Chrome) that it lands in the
// heavy lane on its `puppeteer` import alone (`scripts/test-lanes.mjs`), never the default `bun
// test`. Run it by name: `bun test skills/splash/test/the-palette-reaches-the-pixels.test.ts`.
setDefaultTimeout(60_000);

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");
const DIRECTIONS_DIR = join(TWIN, "docs", "design-base", "directions");
const DIRECTION_IDS = ["creme", "nocturne", "rapport"] as const;

// Its own workspace outside the repository, so a concurrent run of this file cannot see another
// run's screenshots, and a stray leftover cannot be read as this run's own artifact.
const WORK = mkdtempSync(join(tmpdir(), "palette-reaches-pixels-"));

/** Every beat that records a palette — walked, not listed. */
function population(): string[] {
  if (!existsSync(PROOF)) return [];
  return readdirSync(PROOF, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && existsSync(join(PROOF, e.name, "PALETTE.md")),
    )
    .map((e) => e.name)
    .sort();
}

/** The one filed direction record behind each id, read once and reused across all 161 beats. */
const directions = new Map(
  DIRECTION_IDS.map((id) => [
    id,
    readDirection(join(DIRECTIONS_DIR, `${id}.md`)),
  ]),
);

/** The first of `creme` / `nocturne` / `rapport` this beat actually shipped a render for — a PNG,
 *  a video's own final frame, or (a scrolly/web beat) the committed HTML page. */
function committedArtifact(beat: string): {
  id: (typeof DIRECTION_IDS)[number];
  kind: "png" | "html";
  path: string;
} | null {
  const rdir = join(PROOF, beat, "renders");
  if (!existsSync(rdir)) return null;
  for (const id of DIRECTION_IDS) {
    if (existsSync(join(rdir, `${id}-final-frame.png`)))
      return { id, kind: "png", path: join(rdir, `${id}-final-frame.png`) };
    if (existsSync(join(rdir, `${id}.png`)))
      return { id, kind: "png", path: join(rdir, `${id}.png`) };
    if (existsSync(join(rdir, `${id}.html`)))
      return { id, kind: "html", path: join(rdir, `${id}.html`) };
  }
  return null;
}

// ── a delivered web page is measured through the browser a reader uses ─────────────────────────
// A duplicate of the resolver in `scripts/two-palette-proof.mjs`, for the reason that file states
// about its own: this is a small helper and importing it would launch a browser the moment the
// import runs, on every test file in the tree.
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to photograph a delivered page with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

let browser: Browser | null = null;
async function screenshot(html: string, out: string): Promise<void> {
  browser ??= await puppeteer.launch({
    executablePath: resolveChrome(),
    args: ["--no-sandbox", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
    await page.goto(`file://${html}`, {
      waitUntil: "networkidle2",
      timeout: 60_000,
    });
    await new Promise((settle) => setTimeout(settle, 800));
    await page.screenshot({ path: out as `${string}.png`, fullPage: true });
  } finally {
    await page.close();
  }
}

/** The committed artifact, rasterised — a PNG read as is, an HTML page photographed once. */
async function rasterOf(
  beat: string,
  artifact: NonNullable<ReturnType<typeof committedArtifact>>,
): Promise<string> {
  if (artifact.kind === "png") return artifact.path;
  const out = join(WORK, `${beat}-${artifact.id}.png`);
  await screenshot(artifact.path, out);
  return out;
}

/** #rrggbb to its three channels. */
function channelsOf(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Two hexes close enough to call the same paint — a tolerance wide enough for a rasteriser's own
 *  rounding, and nowhere near wide enough to call two different hues the same colour (a real accent
 *  swap moves every channel by tens, not single digits). */
function closeHex(a: string, b: string, tolerance = 6): boolean {
  const ca = channelsOf(a);
  const cb = channelsOf(b);
  return ca.every((v, i) => Math.abs(v - cb[i]) <= tolerance);
}

afterAll(async () => {
  await browser?.close();
  rmSync(WORK, { recursive: true, force: true });
});

describe("the recorded palette reaches the pixels, not just the source", () => {
  const beats = population();

  // THE PREMISE, PINNED. A walk that matched nothing would generate zero `it`s below and the suite
  // would report a vacuous pass — this is the test that stands between a broken walk and a green
  // file with nothing in it.
  it("finds a non-empty population of beats that record a palette", () => {
    expect(beats.length).toBeGreaterThan(0);
  });

  for (const beat of beats) {
    it(`${beat}: its recorded accent is in the pixels of its own committed render`, async () => {
      const palette = parsePalette(
        readFileSync(join(PROOF, beat, "PALETTE.md"), "utf8"),
        `${beat}/PALETTE.md`,
      );
      const artifact = committedArtifact(beat);
      if (!artifact)
        throw new Error(
          `${beat} has no committed render under renders/ for any of ${DIRECTION_IDS.join(", ")}`,
        );

      const direction = directions.get(artifact.id)!;
      const expected = composeDirection({ direction, palette }).accent;

      const raster = await rasterOf(beat, artifact);
      const pixels = readPixelPalette(raster, { top: 200 });
      const found = [...pixels.chromatic, ...pixels.neutral].some((c) =>
        closeHex(c.hex, expected),
      );

      expect({ beat, direction: artifact.id, expected, found }).toEqual({
        beat,
        direction: artifact.id,
        expected,
        found: true,
      });
    });
  }
});
