/**
 * THE ENTRANCE IS AN ADDITION — it is never the thing that makes the graphic readable.
 *
 * B3.1 asked for "an entrance animation for the whole graphic" on the web genre, and when asked
 * what style, the owner answered *"dans le même style que la vidéo"*. So the web entrance replays
 * the video's own choreography (`chart-video/assets/timing.ts`'s five leading events, copied
 * into `chart-web/assets/entrance.ts` and rescaled) rather than inventing a second grammar.
 * This file is what stops that entrance from becoming a precondition for reading — which is the one
 * way an entrance can be a REGRESSION rather than a nicety, and the way that is a legal expectation
 * rather than a preference.
 *
 * WHY IT IS DRIVEN AND NOT READ. The failure mode this project has already met, on the scrolly, is
 * a reveal that is an OPACITY FADE OVER A FINISHED PICTURE — every check green, every attribute
 * present, and a reader watching a static chart get less transparent. Nothing in the markup
 * distinguishes it from a reveal that builds. So the reveal is measured as GEOMETRY, never read off
 * an attribute — by two independent instruments where the reveal is a CLIP, and by a third where it
 * is not (`verify-entrance.mjs` walks every mark's own painted extent; a bar family's reveal is not
 * a clip, and could not be, because a clip leaves every bar the same length mid-build):
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
 *      `doctrine/references/motion-grammar.md`'s first anti-pattern, with a CSS property
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
 *   7. (not in W3 either) THE PAGE SHIPS THE THING THAT STARTS IT — see the clause itself below.
 *   8. (not in W3 either, and the newest) THE PER-MARK REVEAL'S VOCABULARY IS COMPLETE. A `grow`
 *      layer — the bar family's reveal, one mark growing from its own baseline to its own value —
 *      carries an axis and a baseline, and on the `reveal` event it carries its own KEY.
 *      `entranceLayer` already refuses to build one without them; this reads them off the delivered
 *      FILE, because several beats here patch their own HTML after it is rendered, and because a
 *      `grow` that lost its `--e-sx` resolves its keyframe to `scale(1, 1)`: a mark drawn in full
 *      from the first millisecond, with every other clause here green. Keys are unique, and every
 *      layer gated on a mark's arrival names one that exists — that pairing is what makes the label
 *      rule checkable at all, in this file and in `verify-entrance.mjs`.
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
 * working tree). Recorded with their output in `chart-web/references/web-discipline.md`,
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
} from "../../chart-web/assets/entrance.ts";
import { render as renderSeed } from "../../chart-web/scripts/render-web.mjs";

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
 * Not a skip list and not a shrug: every one of these was a beat whose own composition had to decide
 * which of ITS marks is the subject and how its reveal moves, which is an editorial call per beat
 * and not a transformation that can be applied to sixteen files at once.
 *
 * **IT IS NOW EMPTY, and that is the point of keeping it.** Every chart × web page in this
 * repository carries an entrance, so the list states a fact rather than a debt — and a seventeenth
 * page landing tomorrow with no entrance reddens this guard without anybody having to remember.
 * Adding a name back to it is how a page opts out, and it costs a line of explanation each time.
 *
 * The editorial calls were not invented per beat either. The owner's answer was that each type
 * already has an arrival choreography in its own VIDEO beat, so every one of these was carried from
 * there — `vidy-pyramid-niger-population`, `video-population-growth-dumbbell`,
 * `vidy-boxplot-co2-by-continent`, `vidx-stacked-bar-swiss-electricity`,
 * `vidy-waterfall-germany-electricity-mix`, `vidx-scatter-income-life-expectancy`,
 * `vidx-grouped-bar-co2-per-capita`, `vidx-slope-child-mortality` — and each beat's own file names
 * the video it took its choreography from.
 */
const ENTRANCE_PENDING: string[] = [];

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
    dataPath: join(TWIN, "skills/chart-web/assets/sample-data/rainfall.json"),
    outDir: dir,
  });
  return {
    label: "skills/chart-web (seed, rendered)",
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

/**
 * `data-entrance` and `data-entrance-motion`, paired with the delay written on the SAME element.
 *
 * READ PER TAG, NOT BY ADJACENCY, and that is a correction the first migrated beat earned. The
 * first version of this function matched
 * `data-entrance="…" data-entrance-motion="…" style="…"` as one run, which silently required the
 * three attributes to be neighbours. They are not: a layer that also carries a `className` — which
 * every LABEL does, because it needs `.note` or `.end-label` to be styled at all — renders as
 * `data-entrance=… data-entrance-motion=… class=… style=…`, and the run does not match.
 *
 * Measured on `proof/webx-life-expectancy/life-expectancy.html` the day it was migrated: **12 real
 * layers on the page, 9 seen**. The three invisible ones were the reference label, the crossing
 * label and THE CONCLUSION — which is to say clause 6, the rule that the page's order is the
 * contract's order, was running on everything except the layer whose lateness the rule exists to
 * forbid. A guard that reads two thirds of a page is not a weaker guard, it is a guard that reports
 * green on the third that matters.
 *
 * So the tag is scanned as a tag: from `<` to the `>` that is not inside a quoted value, then each
 * attribute read out of it independently and in any order.
 */
function layers(
  html: string,
): { event: string; motion: string; delay: number }[] {
  const out: { event: string; motion: string; delay: number }[] = [];
  for (const tag of tagsCarrying(html, "data-entrance-motion")) {
    const event = /\sdata-entrance="([a-z]+)"/.exec(tag);
    const motion = /\sdata-entrance-motion="([a-z]+)"/.exec(tag);
    const delay = /--e-delay:\s*(\d+)ms/.exec(tag);
    out.push({
      // A layer carrying a motion and NO event is a real defect — it animates without belonging to
      // the argument — so it is reported as an unknown event rather than skipped.
      event: event ? event[1] : "(no data-entrance)",
      motion: motion ? motion[1] : "(none)",
      delay: delay ? Number(delay[1]) : NaN,
    });
  }
  return out;
}

/** Every open tag in the document containing `attribute`, quote-aware so a `>` inside an attribute
 *  value (a `translate(…)` in a style, a `>` in an `aria-label`) cannot end a tag early. */
function tagsCarrying(html: string, attribute: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < html.length; i++) {
    if (html[i] !== "<") continue;
    if (!/[a-zA-Z]/.test(html[i + 1] ?? "")) continue;
    let quote: string | null = null;
    let end = i + 1;
    for (; end < html.length; end++) {
      const c = html[end];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === ">") break;
    }
    const tag = html.slice(i, end + 1);
    // The stylesheet's own `[data-entrance-motion="fade"]` selectors live inside a `<style>` tag,
    // which this scan would otherwise hand back as one enormous "layer".
    if (tag.includes(attribute) && !tag.startsWith("<style")) out.push(tag);
    i = end;
  }
  return out;
}

/** The properties each named `@keyframes chart-entrance-<motion>` block touches, per motion.
 *
 *  Needed because the union is not enough: a mutation swapped `chart-entrance-pop`'s own
 *  `from { scale: 0 }` for `from { opacity: 0 }` and every clause stayed green — the page still
 *  animated only allowed properties, the marks still arrived one at a time, and a scatter that pops
 *  had silently become a scatter that fades. Each motion IS a property; that is what makes it a
 *  motion rather than a name. */
function animatedPropertiesByMotion(html: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const re = /@keyframes\s+chart-entrance-([a-z]+)\s*\{([\s\S]*?)\}\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const props = new Set<string>();
    for (const decl of m[2].split(";")) {
      const name = decl.split(":")[0]?.trim().replace(/^.*\{/, "").trim();
      if (name && !/^\d|^from$|^to$|^$/.test(name)) props.add(name);
    }
    found.set(m[1], [...props]);
  }
  return found;
}

/** What each motion IS, as the property it moves. `wipe`, `land` and `grow` are all `transform`
 *  because they are all a scale about a stated origin; `pop` is the INDIVIDUAL `scale` property, so
 *  it composes with an element's own `transform` instead of replacing it. */
const MOTION_PROPERTY: Record<string, string> = {
  fade: "opacity",
  wipe: "transform",
  land: "transform",
  grow: "transform",
  pop: "scale",
};

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
      // `scale` joins the two, and it is not a loosening: it is the INDIVIDUAL transform property,
      // composited exactly as `transform` is and just as incapable of moving anything else on the
      // page. It exists here for a measured reason — this genre's scatter draws its dots as HTML
      // spans already carrying `transform: translate(-50%, -50%)`, and a keyframe animating
      // `transform` REPLACES that, flying the whole cloud in from its dots' corners. What stays
      // refused is the same list: never a layout property, never `stroke-dashoffset`.
      const illegal = animated.filter(
        (p) => p !== "opacity" && p !== "transform" && p !== "scale",
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

      // 7 (not in W3 either) — THE PAGE SHIPS THE THING THAT STARTS IT.
      //
      // Every clause above reads the page's markup and its stylesheet, and all of them pass on a
      // page whose entrance never runs, because the class that unlocks the whole
      // `@media (prefers-reduced-motion: no-preference)` block is added by SCRIPT. Measured on the
      // first non-line beat migrated: the trigger lived inside `interaction.mjs`, seven beats in
      // this repository replace that script wholesale with their own hover mechanic, and
      // `verify-entrance.mjs` sat for five seconds waiting for an `entered` class nothing was going
      // to add. Declared layers, correct delays, keyframes in the right query, guard green, entrance
      // absent. So the trigger is now its own emitted block (`assets/entrance-trigger.mjs`, after
      // the beat's own script so a patcher cannot eat it) and this is the clause that says it is
      // there — checked by its BEHAVIOUR, the class it adds and the observed margin, not by a
      // filename a rename would quietly break.
      if (!html.includes('classList.add("entered")'))
        failures.push(
          "the page declares an entrance and ships nothing that adds the `entered` class — every " +
            "keyframe here is unreachable and the reader sees the settled page",
        );
      if (!html.includes("rootMargin"))
        failures.push(
          "the page adds `entered` without an IntersectionObserver margin — an entrance that plays " +
            "on load plays to nobody, and an embed sits below an article's fold",
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

      // 8 (not in W3) — THE PER-MARK REVEAL'S OWN VOCABULARY, checked on the delivered page.
      //
      // `entrance.ts`'s `entranceLayer` refuses to build a `grow` layer without an axis, a baseline
      // and — on the reveal — a key. That is a build-time throw in a component; this is the same
      // rules read off the FILE, because a page is patched after it is rendered (three beats in this
      // repository swap their own script into it, one rewrites its `<html lang>`) and because a
      // `grow` whose `--e-sx`/`--e-sy` went missing resolves its keyframe to `scale(1, 1)`: a mark
      // drawn in full from the first millisecond, with every other clause here green.
      const motionOf = new Set(declared.map((l) => l.motion));
      for (const motion of motionOf)
        if (!["fade", "wipe", "land", "grow", "pop"].includes(motion))
          failures.push(
            `data-entrance-motion="${motion}" is not one of the five motions the stylesheet defines`,
          );
      const byMotion = animatedPropertiesByMotion(html);
      for (const motion of motionOf) {
        const props = byMotion.get(motion);
        if (props === undefined) {
          failures.push(
            `the page uses the ${motion} motion and ships no @keyframes chart-entrance-${motion}`,
          );
          continue;
        }
        const expected = MOTION_PROPERTY[motion];
        if (expected !== undefined && !props.includes(expected))
          failures.push(
            `@keyframes chart-entrance-${motion} moves ${props.join(", ") || "nothing"} and not ` +
              `${expected} — a motion IS the property it moves, and swapping one for another is a ` +
              `silent downgrade every other clause here passes`,
          );
      }

      const growTags = tagsCarrying(html, 'data-entrance-motion="grow"');
      for (const tag of tagsCarrying(html, 'data-entrance-motion="pop"'))
        if (/\sdata-entrance="reveal"/.test(tag) && !/\sdata-entrance-key="/.test(tag))
          failures.push(
            "a pop mark on the reveal carries no data-entrance-key — it is one of the readings " +
              "the argument is about, and without a key it sits outside every per-mark check",
          );
      for (const tag of growTags) {
        const key = /\sdata-entrance-key="([^"]*)"/.exec(tag);
        const event = /\sdata-entrance="([a-z]+)"/.exec(tag);
        for (const variable of ["--e-sx", "--e-sy", "--e-ox", "--e-oy"])
          if (!new RegExp(`${variable}:`).test(tag))
            failures.push(
              `a grow layer (${event?.[1] ?? "?"}${key ? ` ${key[1]}` : ""}) ships no ${variable} — ` +
                `its keyframe resolves to scale(1, 1) and the mark is drawn in full from the first ` +
                `millisecond`,
            );
        if (event?.[1] === "reveal" && !key)
          failures.push(
            "a grow mark on the reveal carries no data-entrance-key — it is one of the readings " +
              "the argument is about, and without a key it sits outside every per-mark check",
          );
      }
      // A mark's own name is what pairs it with the layers gated on its arrival, so a duplicate or a
      // dangling name silently turns the label rule off for the pair it belongs to. Read off EVERY
      // tag that carries one and not only the `grow` ones: two of the video beats this genre replays
      // reveal their marks by fading each one in on its own clock, because a dumbbell's mark is a
      // range and a box's is five numbers — neither is a length that grows from a baseline — and
      // those marks declare themselves the same way.
      const markKeys = tagsCarrying(html, "data-entrance-key")
        .map((tag) => /\sdata-entrance-key="([^"]*)"/.exec(tag)?.[1])
        .filter((k): k is string => k !== undefined);
      if (new Set(markKeys).size !== markKeys.length)
        failures.push(
          `two marks share a data-entrance-key: ${markKeys.join(", ")}`,
        );
      for (const tag of tagsCarrying(html, "data-entrance-label")) {
        const names = /\sdata-entrance-label="([^"]*)"/.exec(tag)?.[1];
        if (names !== undefined && !markKeys.includes(names))
          failures.push(
            `a layer is gated on the arrival of "${names}", which no mark declares — the label ` +
              `rule cannot be checked on it, in this test or in a browser`,
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
