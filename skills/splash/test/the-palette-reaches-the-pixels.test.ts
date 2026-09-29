/**
 * THE PALETTE GUARD, RE-AIMED AT THE PATH THE CODE ACTUALLY TAKES — TWICE NOW.
 *
 * v1 of this file shelled out to `two-palette-proof.mjs` on one hard-coded beat that the
 * catalogue's own pruning had since renamed and archived. Re-pointing it at a new beat was refused
 * as arbitrary, so v2 rewrote it to walk every beat under `proof/` and assert that `composeDirection`
 * (`shared/design-base/compose.mjs`) — the one place a beat's recorded hue becomes the accent hex a
 * renderer paints with — decides what the committed render actually shows.
 *
 * v2 WAS WRONG, IN THE SAME SHAPE AS v1: it asserted a PRODUCTION promise over a CATALOGUE corpus.
 * `proof/`'s own beats are not all production renders. `composeDirection`'s own doc says so:
 * "In production a beat has ONE direction, composed upstream in the editorial exchange. `proof/`
 * renders three only as a BENCH, to show that a rule is not lucky on one palette." A bench of a
 * FILED direction is not required to carry a newsroom's recorded accent at all — it exists to show
 * the direction's OWN type, space and inks generalise across beats, which is the whole reason a
 * beat's component takes `direction` as a parameter instead of hard-coding colours. Two pieces of
 * direct evidence, read before rewriting anything here:
 *
 *   - `skills/chart-beat/scripts/static-plumbing.mjs`, on the very flag this file now keys off:
 *     "`--filed` for every filed demo direction (a catalogue or demo proof, never a production
 *     render)."
 *   - `proof/static-histogram-europe-solar-spread/render-directions.mjs` itself, worked example:
 *     `if (FILED) { chosen = all.map(...); console.log("every filed demo direction (--filed): a
 *     catalogue proof, not a production render"); } else { chosen = composeDirections(...)
 *     .offered.slice(0, 1)... }` — the SAME file supports both, on a flag, and the default branch
 *     is the composed one.
 *
 * SO THIS FILE ASKS TWO DIFFERENT, DISJOINT QUESTIONS OF TWO DIFFERENT, DISCOVERED POPULATIONS —
 * never the wrong promise against the wrong corpus:
 *
 *   1. A COMPOSED beat's committed render must carry the accent `composeDirection` says its own
 *      `PALETTE.md` composes to. This is the promise v2 asserted; it is still true, now scoped to
 *      where it applies.
 *   2. A FILED beat's committed render must carry ITS OWN filed direction's own accent, unmodified
 *      — the complementary promise a catalogue proof actually owes: that a bench genuinely shows the
 *      direction it claims to, not some third, unexplained colour (a hard-coded value, a stale
 *      render, a component that silently ignores its own `direction` prop).
 *
 * WHICH POPULATION A BEAT IS IN IS DISCOVERED, NEVER LISTED, from what its own runner's source
 * structurally does with `composeDirections`'/`composeDirection`'s result — not from a flag that may
 * or may not have been passed at render time, which this file cannot observe after the fact, and not
 * from a hand-kept list, which is the exact mistake `seed-reads-a-recorded-palette.test.ts`'s own
 * header names as the standing counter-example. A beat is COMPOSED if its runner calls
 * `composeDirection(` (singular — the function `compose.mjs` names as "what a renderer calls instead
 * of taking `readDirection()`'s output to the paint") or slices `composeDirections(...).offered`
 * into what it renders (the `static-histogram-europe-solar-spread` shape above). Every other beat —
 * one that computes `composeDirections` only to print the offer `report()` and renders straight off
 * `resolveDirectionFamilies(readDirection(...))` regardless of any flag — is FILED. Comments are
 * stripped before matching, the same way `scripts/test-lanes.mjs` derives its own lanes off source.
 *
 * MEASURED 2026-09-17, over 161 beats: 5 composed (all five call `composeDirection(` directly:
 * `static-flow-map-ukraine-protection`, `static-locator-zaporizhzhia`,
 * `web-flow-map-ukraine-protection`, `web-hex-grid-europe-protection`, and one `.offered`-sliced,
 * `static-histogram-europe-solar-spread`) — all 5 carry the composed accent. 156 filed — 152 carry
 * their own filed accent; 4 do not, all video, all a chart family whose type draws its accent only
 * as a mixed ramp (`mix(accent, ink, …)` / `mix(accent, ground, …)`), never as a solid fill. The
 * SAME four types in the static genre do carry the pure filed accent (a legend swatch or a tracked
 * element's stroke, beside the ramp), so the ramp alone does not explain it; what differs is the
 * video genre's own `renders/creme-final-frame.png`, whose most frequent chromatic pixels sit tens
 * of RGB units darker and greyer than the accent (`video-marimekko-electricity-mix` tops out at
 * `#4F637F` / `#092145` against `#1757B6` — not an anti-aliasing gap). Why the exported final frame
 * falls short is NOT diagnosed: one hypothesis, unverified, is that it is captured before the last
 * interpolation settles, which would be those beats' own timing (`states.mjs` / `scene.mjs`), not
 * palette composition. This replaces a wrong 155-beat claim this file made before.
 *
 * RE-MEASURED 2026-09-29, and a composed beat has joined them. `static-histogram-europe-solar-spread`
 * no longer carries its composed accent (`#118448`, `composeDirection` of `creme` over its own
 * `PALETTE.md` accent `#1B7F4B`). Its committed `renders/creme.png` is the `--filed` output:
 * commit `cfd9ae652` (2026-09-23, the `--size` sweep) re-rendered it and added `nocturne.png` and
 * `rapport.png` beside it, and only the `--filed` branch writes three directions under the filed
 * labels. So `creme.png` now carries creme's own filed accent `#1757B6` (measured `#1755B3`), and
 * `nocturne.svg` / `rapport.svg` carry `#4FE0C0` / `#1F5C8B`, the filed accents, not the composed
 * `#4FE095` / `#1E8750`. The composed and filed branches of that runner write to the SAME file name
 * (`offered[0].id` is `creme`, so `labelOf` gives `creme` either way); the file cannot tell which
 * branch produced it, and this guard, which classifies the beat by its runner's source, asks it for
 * the composed accent. The original `3a8fa27aa` render carried `#118448` and passed.
 *
 * THOSE FIVE ARE OWED (see `OWED` below): named, pinned to what they show today, and held to it —
 * any other beat that loses its accent still fails, and an owed beat that regains it fails too
 * until its entry is deleted.
 *
 * MUTATION-VERIFIED, 2026-09-17, both halves, in place, reverted with `git checkout`:
 *   - composed: `static-locator-zaporizhzhia`'s `PALETTE.md` accent changed `#0B7A5E` → `#7A2E8E`;
 *     `bun test … -t static-locator-zaporizhzhia` went from `found: true` to `found: false`
 *     (`expected` moved to `#9517B6`, `composeDirection`'s own walk of the new hue); restored, `git
 *     status` clean.
 *   - filed: the filed direction's own record, `docs/design-base/directions/creme.md`, had its
 *     `- accent: #1757B6` line changed to `#7A2E8E`; `bun test … -t
 *     "static-lollipop-co2-per-person \\(filed\\)"` (a beat with no `composeDirection` call at all,
 *     the coordinator's own example) went from `found: true` to `found: false`; restored, `git
 *     status` clean.
 * And the vacuity guard: `population()` filtered by either predicate against an empty directory
 * returns `[]`, which fails `toBeGreaterThan(0)` on BOTH halves rather than silently generating zero
 * tests for one of them and reporting an all-green suite with a hole in it.
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
import puppeteer, { type Browser } from "puppeteer-core";
import { readPixelPalette } from "../../../scripts/design-base/pixel-palette.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirection } from "#shared/design-base/compose.mjs";
import { parsePalette } from "#shared/chart-beat/colour.mjs";

// A screenshot of each committed HTML page, plus reading a handful of PNGs already on disk. No
// re-render anywhere in this file. Roughly two minutes across 161 beats, mostly Chrome — which is
// why it lands in the heavy lane on its `puppeteer` import alone (`scripts/test-lanes.mjs`), never
// the default `bun test`. Run it by name.
setDefaultTimeout(60_000);

const TWIN = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(TWIN, "proof");
const DIRECTIONS_DIR = join(TWIN, "docs", "design-base", "directions");
const DIRECTION_IDS = ["creme", "nocturne", "rapport"] as const;

const WORK = mkdtempSync(join(tmpdir(), "palette-reaches-pixels-"));

/** Every beat that records a palette — walked, not listed. */
function allBeats(): string[] {
  if (!existsSync(PROOF)) return [];
  return readdirSync(PROOF, { withFileTypes: true })
    .filter(
      (e) => e.isDirectory() && existsSync(join(PROOF, e.name, "PALETTE.md")),
    )
    .map((e) => e.name)
    .sort();
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every `render-directions*.mjs` this beat has, concatenated and comment-stripped — the source a
 *  beat's own rendering behaviour is read off, the same way `test-lanes.mjs` reads its own lanes. */
function runnerSource(beat: string): string {
  const dir = join(PROOF, beat);
  return readdirSync(dir)
    .filter((f) => /^render-directions.*\.mjs$/.test(f))
    .map((f) => stripComments(readFileSync(join(dir, f), "utf8")))
    .join("\n");
}

/** A beat whose runner threads `composeDirections`'/`composeDirection`'s OWN result into what it
 *  renders — never a beat that merely computes it to print the offer report. See the header. */
function isComposed(beat: string): boolean {
  const src = runnerSource(beat);
  return /composeDirection\(/.test(src) || /\.offered\.slice\(/.test(src);
}

const composedBeats = allBeats().filter(isComposed);
const filedBeats = allBeats().filter((b) => !isComposed(b));

// ── OWED — THE RATCHET ──────────────────────────────────────────────────────────────────────────
//
// Recorded 2026-09-29, the day before a public release. Each is a REAL defect in a committed demo
// render under `proof/` that cannot be regenerated before that release (the header says what each
// one is and why). Every entry is pinned to the population, direction and expected accent measured
// that day, and to `found: false`:
//
//   - a beat NOT listed here fails exactly as before if its accent is missing — a new regression;
//   - a listed beat whose committed render now DOES carry its accent fails too, with a message to
//     delete its entry — the list cannot outlive its defects;
//   - a listed beat that has changed population, direction or expected accent fails as well: the
//     entry described a render that no longer exists, and a changed beat must be made to carry its
//     accent, not re-listed.
//
// THIS LIST MAY ONLY SHRINK. Never add to it to turn a new failure green; fix the render.
type Owed = {
  population: "composed" | "filed";
  direction: (typeof DIRECTION_IDS)[number];
  expected: string;
};
const OWED: Record<string, Owed> = {};

/** Holds one measured beat to the rule — or, if it is owed, to exactly the defect it was owed for. */
function holdToLedger(
  population: Owed["population"],
  measured: { beat: string; direction: string; expected: string; found: boolean },
): void {
  const owed = OWED[measured.beat];
  if (!owed) {
    expect(measured).toEqual({ ...measured, found: true });
    return;
  }
  expect(
    { population, direction: measured.direction, expected: measured.expected },
    `${measured.beat} is in OWED, but it is no longer the render that entry describes. A changed ` +
      `beat must carry its accent; make it do so and delete its OWED entry — never re-point it.`,
  ).toEqual({
    population: owed.population,
    direction: owed.direction,
    expected: owed.expected,
  });
  expect(
    measured.found,
    `${measured.beat}: its committed ${measured.direction} render now carries ${measured.expected} — ` +
      `the owed defect is fixed. Delete its entry from OWED in this file.`,
  ).toBe(false);
}

/** The one filed direction record behind each id, read once and reused. */
const directions = new Map(
  DIRECTION_IDS.map((id) => [
    id,
    readDirection(join(DIRECTIONS_DIR, `${id}.md`)),
  ]),
);

/** The first of `creme` / `nocturne` / `rapport` this beat actually shipped a render for — a PNG,
 *  a video's own final frame, or (a scrolly/web beat) the committed HTML page. */
function committedArtifact(
  beat: string,
): {
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

function channelsOf(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Two hexes close enough to call the same paint — wide enough for a rasteriser's own rounding,
 *  nowhere near wide enough to call two different hues the same colour. */
function closeHex(a: string, b: string, tolerance = 6): boolean {
  const ca = channelsOf(a);
  const cb = channelsOf(b);
  return ca.every((v, i) => Math.abs(v - cb[i]) <= tolerance);
}

async function accentFound(
  beat: string,
  expected: string,
): Promise<{ direction: string; found: boolean }> {
  const artifact = committedArtifact(beat);
  if (!artifact)
    throw new Error(
      `${beat} has no committed render under renders/ for any of ${DIRECTION_IDS.join(", ")}`,
    );
  const raster = await rasterOf(beat, artifact);
  const pixels = readPixelPalette(raster, { top: 200 });
  const found = [...pixels.chromatic, ...pixels.neutral].some((c) =>
    closeHex(c.hex, expected),
  );
  return { direction: artifact.id, found };
}

afterAll(async () => {
  await browser?.close();
  rmSync(WORK, { recursive: true, force: true });
});

describe("the recorded palette reaches the pixels, not just the source", () => {
  // THE PREMISE, PINNED, ON BOTH HALVES. A walk that matched nothing in either bucket would
  // generate zero `it`s for that bucket and the suite would report a vacuous pass — these are the
  // tests that stand between a broken walk and a green file with a hole in it.
  it("finds a non-empty population of composed-direction beats", () => {
    expect(composedBeats.length).toBeGreaterThan(0);
  });
  it("finds a non-empty population of filed-direction beats", () => {
    expect(filedBeats.length).toBeGreaterThan(0);
  });
  it("names, in OWED, only beats that exist in the population the entry states", () => {
    const stale = Object.entries(OWED)
      .filter(([beat, owed]) =>
        !(owed.population === "composed" ? composedBeats : filedBeats).includes(
          beat,
        ),
      )
      .map(([beat, owed]) => `${beat} (${owed.population})`);
    expect(
      stale,
      `OWED names beat(s) that are gone or have changed population — delete the entry: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  for (const beat of composedBeats) {
    it(`${beat} (composed): its recorded accent is in the pixels of its own committed render`, async () => {
      const palette = parsePalette(
        readFileSync(join(PROOF, beat, "PALETTE.md"), "utf8"),
        `${beat}/PALETTE.md`,
      );
      const artifact = committedArtifact(beat);
      if (!artifact)
        throw new Error(`${beat} has no committed render under renders/`);
      const expected = composeDirection({
        direction: directions.get(artifact.id)!,
        palette,
      }).accent;
      const { direction, found } = await accentFound(beat, expected);
      holdToLedger("composed", { beat, direction, expected, found });
    });
  }

  for (const beat of filedBeats) {
    it(`${beat} (filed): its committed render carries its own filed direction's accent`, async () => {
      const artifact = committedArtifact(beat);
      if (!artifact)
        throw new Error(`${beat} has no committed render under renders/`);
      const expected = directions.get(artifact.id)!.accent;
      const { direction, found } = await accentFound(beat, expected);
      holdToLedger("filed", { beat, direction, expected, found });
    });
  }
});
