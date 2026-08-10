/**
 * THE ENTRANCE IS AN ADDITION — it is never the thing that makes the graphic readable.
 *
 * B3.1 asked for "an entrance animation for the whole graphic" on the web genre, and when asked
 * what style, the owner answered *"dans le même style que la vidéo"*. So the web entrance replays
 * the video's own choreography (`twin-chart-video/assets/timing.ts`'s five leading events, copied
 * into `twin-chart-web/assets/entrance.ts` and rescaled) rather than inventing a second grammar.
 * This file is what stops that entrance from becoming a precondition for reading — which is the one
 * way an entrance can be a REGRESSION rather than a nicety, and the way that is a legal expectation
 * rather than a preference.
 *
 * WHY IT IS DRIVEN AND NOT READ. The failure mode this project has already met, on the scrolly, is
 * a reveal that is an OPACITY FADE OVER A FINISHED PICTURE — every check green, every attribute
 * present, and a reader watching a static chart get less transparent. Nothing in the markup
 * distinguishes it from a reveal that builds. So the reveal is measured as GEOMETRY, twice, by two
 * independent instruments:
 *
 *   - the clip's own `scaleX`, read out of the computed transform matrix — exact, and the number
 *     the CSS is actually running;
 *   - HOW MANY OF THE BEAT'S OWN SEGMENTS ARE HIT-TESTABLE at their own midpoints, via
 *     `document.elementsFromPoint` at real client coordinates. Clipping affects hit-testing, so a
 *     segment the wipe has not reached yet is not in the stack. An opacity fade would report all
 *     ten segments hittable at every sample, from the first — which is exactly what the failure
 *     mode looks like from here.
 *
 * WHAT IS ASSERTED, per page that declares an entrance. The five clauses W3 specified
 * (`specs/W3-visual-mechanisms.md`, "B3.1 — an entrance animation"), plus one it did not:
 *
 *   1. WITH JAVASCRIPT DISABLED the settled page is complete — no element at opacity 0, the whole
 *      curve drawn, the subject at full size, and no `entered` class anywhere.
 *   2. UNDER `prefers-reduced-motion: reduce` the finished graphic appears with no intermediate
 *      state: `document.getAnimations()` is EMPTY (not "an animation that finishes instantly" — the
 *      keyframes live inside `@media (prefers-reduced-motion: no-preference)`, so under `reduce`
 *      there is nothing to resolve), and at the first sample after the figure enters view the wipe
 *      is already at 1 and every segment is already hit-testable.
 *   3. ONLY `opacity` AND `transform` ARE ANIMATED. Read off the page's own `@keyframes` blocks —
 *      never a layout property, never `stroke-dashoffset` (the form that was MEASURED not to work
 *      under this genre's `non-scaling-stroke`; see `render-web.mjs`'s `entranceCss`).
 *   4. AT LEAST THREE DISTINCT DELAYS, or no entrance at all. This is the clause that mechanically
 *      refuses the one-layer fade — "motion added for energy",
 *      `twin-doctrine/references/motion-grammar.md`'s first anti-pattern, with a CSS property
 *      attached. The vocabulary is borrowed from the video precisely so that the entrance carries
 *      the ARGUMENT's order, and an entrance with one delay carries no order at all.
 *   5. THE WHOLE ENTRANCE COMPLETES INSIDE `ENTRANCE_CEILING_MS`, measured on the layers the page
 *      actually ships rather than on the contract — half of a beat's delays are derived from its own
 *      geometry, so the contract passing is not the same claim.
 *   6. (not in W3) THE ORDER ON THE PAGE IS THE ORDER IN THE CONTRACT, and the LABEL RULE holds:
 *      no layer's delay precedes the delay of the event before it, and the conclusion — the
 *      subject's own value, in words — is measured to be invisible in a real browser while the mark
 *      it names is still arriving. That is `motion-grammar.md`'s "a label's reveal gates on its own
 *      mark", driven rather than derived from the numbers that were used to write it.
 *
 * AND THE HALF THAT IS NOT ABOUT MOTION AT ALL: a page that declares NO entrance must ship none of
 * its cost — no keyframes, no rules, not a line. That is the same gate the filter vocabulary earned
 * the hard way (`filters-are-declared-or-absent.test.ts`: 21 of 21 pages shipping styling for a
 * control none of them had), applied before this genre could repeat it.
 *
 * WHY THE PAGE IS PUT BELOW A FOLD. The trigger is the whole point of clause 4's sibling rule — an
 * embed can sit two screens down an article, and an entrance that plays on load plays to nobody. So
 * the harness reproduces an embed's real situation: the delivered file, byte for byte, with one
 * article-height spacer inserted at the top of its `<body>` and nothing else changed. If the
 * entrance fired on load rather than on view, the first sample after loading — taken BEFORE
 * scrolling — would already show the wipe advancing, and the assertion below says it must not.
 *
 * WHAT THIS PROVABLY DOES NOT CATCH.
 *
 *   1. WHETHER THE ORDER CHOSEN IS THE ARGUMENT'S ORDER. It can see that furniture precedes the
 *      reference precedes the marks; it cannot see whether the mark called "the subject" is the one
 *      the takeaway is about. That is a person watching it once, which is what the video genre also
 *      relies on.
 *   2. ONE ENGINE. Chrome. `transform-box`, `:has()` and `IntersectionObserver` are all Baseline;
 *      none is verified here on Safari or Firefox.
 *   3. WHETHER IT LOOKS GOOD. It reads matrices, rects and opacities. Squat, jittery or gaudy is
 *      not reachable from here, which is why `verify-entrance.mjs` writes frames a human opens.
 *   4. THE PAGES THAT HAVE NO ENTRANCE YET. `ENTRANCE_PENDING` names them exactly — see the census.
 *
 * MUTATIONS, each run in a COPY of the tree under `/tmp` and never here (several agents share this
 * working tree). Recorded with their output in `twin-chart-web/references/web-discipline.md`,
 * "The entrance", and reproduced in FEEDBACK-2026-08-10.md's B3.1 row.
 */

import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";

import {
  ENTRANCE_CEILING_MS,
  ENTRANCE_ORDER,
} from "../../twin-chart-web/assets/entrance.ts";
import { render as renderSeed } from "../../twin-chart-web/scripts/render-web.mjs";

/** A DUPLICATE of `filters-are-declared-or-absent.test.ts`'s own `resolveChrome`, for the reason
 *  that one gives for duplicating `verify-interaction.mjs`'s: importing either runs it. */
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
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

setDefaultTimeout(600_000);

const TWIN = join(new URL(".", import.meta.url).pathname, "../../..");

/**
 * The chart × web pages that do NOT carry an entrance yet, named exactly.
 *
 * Not a skip list and not a shrug: every one of these is a beat whose own composition has to decide
 * which of ITS marks is the subject and where its reveal's head is, which is an editorial call per
 * beat and not a transformation that can be applied to sixteen files at once — the same reason
 * `twin-map-web`'s three pages are named in `LEGACY_MAP_VOCABULARY` rather than migrated by a
 * script. The list is EXACT, so migrating one reddens this guard until the name is removed, and a
 * seventeenth page landing tomorrow with no entrance reddens it without anybody remembering.
 */
const ENTRANCE_PENDING = [
  "proof/co2-suisse/co2.html",
  "proof/web-co2-decline-slope/co2-decline-slope.html",
  "proof/web-co2-ranking/dist/co2-ranking.html",
  "proof/web-income-life-expectancy/income-life-expectancy.html",
  "proof/webx-carbon-footprint/carbon-footprint.html",
  "proof/webx-electricity-mix/electricity-mix.html",
  "proof/webx-germany-bridge/germany-bridge.html",
  "proof/webx-life-expectancy/life-expectancy.html",
  "proof/webx-wind-vs-solar/wind-vs-solar.html",
  "proof/webx-world-population/world-population.html",
  "proof/weby-boxplot-france-co2-decades/boxplot-france-co2-decades.html",
  "proof/weby-dumbbell-life-expectancy-gains/dumbbell-life-expectancy-gains.html",
  "proof/weby-lollipop-co2-per-capita/lollipop-co2-per-capita.html",
  "proof/weby-population-pyramid-switzerland/population-pyramid-switzerland.html",
  "proof/weby-small-multiples-co2-per-capita/small-multiples-co2-per-capita.html",
  "proof/webz-diverging-bar-eu-per-capita/diverging-bar-eu-per-capita.html",
];

type Subject = { label: string; html: string };

/** Every committed chart × web page, discovered from git rather than listed — the delivered files,
 *  which is where dead CSS and missing behaviour both live. */
function committedChartWebPages(): Subject[] {
  const out = execFileSync("git", ["-C", TWIN, "ls-files", "*.html"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((p) => !p.includes("/drive/"))
    .map((p) => ({ label: p, html: readFileSync(join(TWIN, p), "utf8") }))
    .filter((s) => s.html.includes('class="chart-figure"'));
}

/** The skill's own seed, rendered on the fly the way `verify-web.mjs` renders it — it ships no
 *  committed HTML, and it is the one page this chantier delivered, so it must be walked. */
async function renderedSeed(): Promise<Subject> {
  const dir = await mkdtemp(join(tmpdir(), "entrance-seed-"));
  const { outPath } = await renderSeed({
    dataPath: join(
      TWIN,
      "skills/twin-chart-web/assets/sample-data/rainfall.json",
    ),
    outDir: dir,
  });
  return {
    label: "skills/twin-chart-web (seed, rendered)",
    html: readFileSync(outPath, "utf8"),
  };
}

const declaresEntrance = (html: string) =>
  /\sdata-entrance-motion="/.test(html);

/** Every `--e-delay`/`--e-dur` pair the page ships, in milliseconds. */
function layerTimings(html: string): { delay: number; duration: number }[] {
  const out: { delay: number; duration: number }[] = [];
  const re = /--e-delay:\s*(\d+)ms;\s*--e-dur:\s*(\d+)ms/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)))
    out.push({ delay: Number(m[1]), duration: Number(m[2]) });
  return out;
}

/** `data-entrance` and `data-entrance-motion`, paired with the delay written on the same element. */
function layers(
  html: string,
): { event: string; motion: string; delay: number }[] {
  const out: { event: string; motion: string; delay: number }[] = [];
  const re =
    /data-entrance="([a-z]+)"\s+data-entrance-motion="([a-z]+)"\s+style="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const delay = /--e-delay:\s*(\d+)ms/.exec(m[3]);
    out.push({
      event: m[1],
      motion: m[2],
      delay: delay ? Number(delay[1]) : NaN,
    });
  }
  return out;
}

/** The properties every `@keyframes chart-entrance-*` block in the page touches. */
function animatedProperties(html: string): string[] {
  const props = new Set<string>();
  const re = /@keyframes\s+chart-entrance-[a-z]+\s*\{([\s\S]*?)\}\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)))
    for (const decl of m[1].split(";")) {
      const name = decl.split(":")[0]?.trim().replace(/^.*\{/, "").trim();
      if (name && !/^\d|^from$|^to$|^$/.test(name)) props.add(name);
    }
  return [...props];
}

// ---------------------------------------------------------------------------------------------

const COMMITTED = committedChartWebPages();
const SEED = await renderedSeed();
const ALL: Subject[] = [...COMMITTED, SEED];
const WITH_ENTRANCE = ALL.filter((s) => declaresEntrance(s.html));

describe("the census: which chart × web pages carry an entrance", () => {
  it("found pages to walk at all — a rename must not empty this guard", () => {
    expect(COMMITTED.length).toBeGreaterThanOrEqual(15);
  });

  it("names every page that does not carry one yet, exactly", () => {
    const without = ALL.filter((s) => !declaresEntrance(s.html)).map(
      (s) => s.label,
    );
    expect(without.sort()).toEqual([...ENTRANCE_PENDING].sort());
  });

  it("the seed carries one — the premise of every driven check below", () => {
    expect([SEED.label, declaresEntrance(SEED.html)]).toEqual([
      SEED.label,
      true,
    ]);
  });

  // THE GATE THE FILTER VOCABULARY PAID FOR. A page that declares no entrance must not ship its
  // stylesheet: 21 of 21 pages once shipped a filter's chrome with no filter in them.
  it.each(
    ALL.filter((s) => !declaresEntrance(s.html)).map(
      (s) => [s.label, s] as const,
    ),
  )(
    "%s declares no entrance and therefore ships none of its cost",
    (label, subject) => {
      const dead = [
        [
          "@keyframes chart-entrance",
          /@keyframes\s+chart-entrance/.test(subject.html),
        ],
        ["a .entered rule", /\.chart-figure\.entered/.test(subject.html)],
        ["--e-delay", subject.html.includes("--e-delay")],
      ].filter(([, present]) => present);
      expect([label, dead.map(([what]) => what)]).toEqual([label, []]);
    },
  );
});

describe("the markup half: what a page that declares an entrance must already say", () => {
  it.each(WITH_ENTRANCE.map((s) => [s.label, s] as const))(
    "%s",
    (label, subject) => {
      const html = subject.html;
      const failures: string[] = [];
      const timings = layerTimings(html);
      const declared = layers(html);

      // 4 — at least three distinct delays, or no entrance at all. The clause that refuses the
      // one-layer fade.
      const distinct = new Set(timings.map((t) => t.delay));
      if (distinct.size < 3)
        failures.push(
          `${distinct.size} distinct delay(s) across ${timings.length} layer(s) — an entrance with ` +
            `fewer than three is one fade with extra attributes, which is motion added for energy`,
        );

      // 5 — the ceiling, measured on the layers the page ships.
      const last = Math.max(0, ...timings.map((t) => t.delay + t.duration));
      if (last > ENTRANCE_CEILING_MS)
        failures.push(
          `the last layer finishes at ${last}ms, past the ${ENTRANCE_CEILING_MS}ms ceiling`,
        );

      // 3 — only opacity and transform.
      const animated = animatedProperties(html);
      const illegal = animated.filter(
        (p) => p !== "opacity" && p !== "transform",
      );
      if (animated.length === 0)
        failures.push(
          "no @keyframes chart-entrance-* block in the page at all",
        );
      if (illegal.length > 0)
        failures.push(
          `${illegal.join(", ")} is animated — only opacity and transform may be, never a layout ` +
            `property and never stroke-dashoffset`,
        );

      // The keyframes are UNREACHABLE under reduce, structurally: everything is inside the
      // no-preference query. Checked by counting braces from the query's opening to the last
      // keyframe rather than by trusting the source's shape.
      const query = html.indexOf(
        "@media (prefers-reduced-motion: no-preference)",
      );
      const lastKeyframe = html.lastIndexOf("@keyframes chart-entrance");
      const lastRule = html.lastIndexOf(".chart-figure.entered");
      if (query < 0 || lastKeyframe < query || lastRule < query)
        failures.push(
          "a chart-entrance keyframe or rule sits outside @media (prefers-reduced-motion: " +
            "no-preference) — under `reduce` it would still resolve",
        );

      // 6 — the order on the page is the contract's order.
      const rank = new Map(
        ENTRANCE_ORDER.map((name, i) => [name as string, i]),
      );
      for (const layer of declared) {
        if (!rank.has(layer.event))
          failures.push(
            `data-entrance="${layer.event}" is not one of the five events`,
          );
      }
      const byEvent = new Map<string, number[]>();
      for (const layer of declared)
        byEvent.set(layer.event, [
          ...(byEvent.get(layer.event) ?? []),
          layer.delay,
        ]);
      const ordered = [...byEvent.entries()].sort(
        (a, b) => (rank.get(a[0]) ?? 0) - (rank.get(b[0]) ?? 0),
      );
      for (let i = 1; i < ordered.length; i++) {
        const [previousName, previousDelays] = ordered[i - 1];
        const [name, delays] = ordered[i];
        if (Math.min(...delays) < Math.min(...previousDelays))
          failures.push(
            `${name} has a layer at ${Math.min(...delays)}ms, before ${previousName}'s first at ` +
              `${Math.min(...previousDelays)}ms — the entrance does not carry the argument's order`,
          );
      }

      // Two of these files can land in one article, and `url(#id)` takes the FIRST match in document
      // order — so a shared id would make one figure's entrance drive the other's clip.
      const ids = [...html.matchAll(/<clipPath id="([^"]+)"/g)].map(
        (m) => m[1],
      );
      if (new Set(ids).size !== ids.length)
        failures.push(`duplicate clipPath id(s): ${ids.join(", ")}`);
      for (const id of ids)
        if (!html.includes(`url(#${id})`))
          failures.push(`clipPath ${id} is defined and never referenced`);

      expect([label, failures]).toEqual([label, []]);
    },
  );
});
