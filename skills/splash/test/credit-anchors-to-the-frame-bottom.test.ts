/**
 * WHAT THIS GUARD CATCHES, AND WHAT IT PROVABLY DOES NOT.
 *
 * The credit belongs at the BOTTOM of the visual (owner feedback B1.1). Measured on 2026-08-10,
 * before this guard existed: **60 `const sourceBaseline =` / `const sourceTop =` definitions in 60
 * distinct `.tsx` files, and not one of them anchored to `height - PAD`.** Every one derived the
 * source's y from something ABOVE it — `titleBaseline`, `titleTop`, `subtitleTop`,
 * `limitsBaseline`, `caveatBaseline`, `noteBaseline` — so the source hung under the header on every
 * genre this project ships.
 *
 * Five of those 60 are the CRAFT SKILLS' OWN SEEDS, and a seed is what the next beat is copied
 * from. This guard walks the skills and asserts that every source anchor there names the frame's
 * own height with a subtraction, and names none of the header rungs. It DISCOVERS the components
 * by walking `skills/**&#47;*.tsx`; a craft skill added tomorrow is covered the moment its component
 * lands, with nobody remembering to wire it up.
 *
 * IT NOW COVERS THE BEATS TOO — and how the population is defined matters.
 *
 * When this guard was written it stopped at `skills/`, because 55 of the 60 anchors were beats
 * under `proof/` and pointing the walk there would have turned the suite red on ~52 shipped beats:
 * a migration, not a guard. That migration has since happened, genre by genre — static chart,
 * chart video, map static, map video — so the walk covers the beats as well.
 *
 * A BEAT is a directory holding a `BRIEF.md`. That is the tree's own marker, the same one
 * `claims-grounded-in-data.test.ts` and Guard C below use, and it is a RULE rather than a list: a
 * beat added tomorrow is covered the moment its brief lands, and nobody maintains an allowlist. A
 * PROBE workspace — a directory that ships measurements and verdicts rather than a beat, such as
 * `proof/portrait-aspect-probe/` — carries no brief and is therefore outside the population by
 * that rule, not by anyone remembering to skip it.
 *
 * THE RESIDUE, stated rather than hidden. Measured 2026-08-10: `PortraitHistogram.tsx` and
 * `PortraitRanking.tsx` in that probe workspace still anchor their credit to a header rung
 * (`PortraitLine.tsx`, written after the seeds moved, already anchors to `height - PAD` without
 * anyone asking). They are the last two of the sixty-odd, and they are outside this walk. And a
 * component sitting at the `proof/` ROOT rather than inside a beat folder — `proof/RankBars.tsx`
 * is the only one — is outside it too, though it is migrated.
 *
 * WHAT IT PROVABLY DOES NOT CATCH.
 *
 * 1. **That the glyph LANDS at the bottom.** It proves the EXPRESSION names the frame's bottom. A
 *    component could compute `height - PAD` and then draw the `<text>` at `y={12}`. The seed
 *    previews are re-rendered and opened for that; a rendered-SVG guard over the beats is worth
 *    building when the beats are migrated (the spec calls it Guard C) and would cover only the 17
 *    beats that ship an SVG beside their PNG.
 * 2. **A component that draws the source at a literal `y` with no named const.** Nothing here can
 *    see it, because there is no definition to read.
 * 3. **The two probe components and the one `proof/`-root component**, per the boundary above.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree at /tmp/twinmut, never in this one.
 * Baseline in the copy: 86 pass, 0 fail.
 *
 *   M-A1  a SHIPPED beat re-anchored to a header rung (`static-wind-vs-solar`, back to
 *         `limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 22`):
 *           (fail) … proof/static-wind-vs-solar/WindVsSolarBar.tsx should anchor its source …
 *           "sourceBaseline does not resolve to the frame's height with a subtraction: …"
 *           "sourceBaseline resolves to the header rung limitsBaseline"
 *           85 pass, 1 fail
 *
 *   M-A2  a NEW beat lands carrying the defect — `proof/fake-new-beat/{BRIEF.md,FakeBeat.tsx}`
 *         with `const sourceBaseline = titleBaseline + 26;`. This is the exact mutation the W2
 *         audit ran against the first draft of this guard and watched STAY GREEN, because the
 *         walk stopped at `skills/`. It now goes red:
 *           (fail) … proof/fake-new-beat/FakeBeat.tsx should anchor its source …
 *           "sourceBaseline resolves to the header rung titleBaseline"
 *
 *   M-A3  every `BRIEF.md` renamed, so the walk finds no beats and the whole block would
 *         otherwise go vacuously green:
 *           Expected: >= 50   Received: 5
 *           (fail) … should find every craft-skill component that positions a source line
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = join(SKILLS, "..");

/** The craft skills, walked whole. */
const SKILL_ROOT = "skills";
/** A beat is a directory that holds a `BRIEF.md`. Discovered, never listed — see the header. */
const BEAT_MARKER = "BRIEF.md";

/** The header rungs a source anchor may never be derived from: naming any of them means the credit
 *  hangs under the header, which is the defect. */
const HEADER_RUNGS = [
  "titleBaseline",
  "titleTop",
  "subtitleTop",
  "subtitleBaseline",
  "limitsBaseline",
  "caveatBaseline",
  "caveatTop",
  "noteBaseline",
];

function* tsxFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* tsxFiles(path);
    else if (entry.name.endsWith(".tsx")) yield path;
  }
}

/** Every `const sourceBaseline = …;` / `const sourceTop = …;`, with its right-hand side read to
 *  the terminating semicolon so a multi-line expression is judged whole. */
function sourceAnchors(src: string): { name: string; expression: string }[] {
  const found: { name: string; expression: string }[] = [];
  const re = /const\s+(sourceBaseline|sourceTop|sourceBottom)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const end = src.indexOf(";", m.index);
    if (end < 0) continue;
    found.push({
      name: m[1]!,
      expression: src.slice(m.index + m[0].length, end).trim(),
    });
  }
  return found;
}

function beatDirs(): string[] {
  const proof = join(TWIN, "proof");
  if (!existsSync(proof)) return [];
  return readdirSync(proof, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(proof, e.name))
    .filter((d) => existsSync(join(d, BEAT_MARKER)));
}

const COMPONENTS = [
  ...tsxFiles(join(TWIN, SKILL_ROOT)),
  ...beatDirs().flatMap((d) => [...tsxFiles(d)]),
]
  .map((path) => ({ path, label: relative(TWIN, path) }))
  .filter(({ path }) => sourceAnchors(readFileSync(path, "utf8")).length > 0)
  .sort((a, b) => a.label.localeCompare(b.label));

describe("the credit is anchored to the frame's bottom, discovered rather than listed", () => {
  it("should find every craft-skill component that positions a source line", () => {
    // If the walk breaks, every assertion below goes vacuously green. Measured 2026-08-10: five
    // components across three craft skills, plus 54 beat components under `proof/`.
    expect(COMPONENTS.length).toBeGreaterThanOrEqual(50);
    const labels = COMPONENTS.map((c) => c.label);
    for (const expected of [
      "skills/chart-beat/assets/ChartSeed.tsx",
      "skills/chart-video/assets/EmissionsVideo.tsx",
      "skills/chart-web/assets/ChartWebSeed.tsx",
      "skills/map-beat/assets/Co2MapStill.tsx",
      "skills/map-beat/assets/Co2MapVideo.tsx",
      // and one beat per genre, so a walk that silently stopped covering `proof/` is caught
      "proof/static-wind-vs-solar/WindVsSolarBar.tsx",
      "proof/vidz-bump-emitter-rank/BumpVideo.tsx",
      "proof/map-quake-symbol/QuakeSymbolStill.tsx",
      "proof/mapvid-locator-geneva/LocatorVideo.tsx",
    ]) {
      expect([expected, labels.includes(expected)]).toEqual([expected, true]);
    }
  });

  for (const { path, label } of COMPONENTS) {
    it(`${label} should anchor its source to the frame's bottom, not to a header rung`, () => {
      const anchors = sourceAnchors(readFileSync(path, "utf8"));
      const byName = new Map(anchors.map((a) => [a.name, a.expression]));
      const offenders: string[] = [];
      for (const { name, expression } of anchors) {
        // A `sourceTop` derived from `sourceBottom` is the wrapped-block case: the LAST line lands
        // on the margin and the first is walked back up by the leading. That is the rule, not a
        // violation — but it is only the rule if `sourceBottom` ITSELF names the frame's bottom,
        // so the chain is FOLLOWED rather than trusted. (Not following it was a real hole: a
        // mutation putting `sourceBottom = titleTop + 30` back on the header rung passed the first
        // draft of this guard silently, because nothing ever read that definition.)
        const resolved =
          /\bsourceBottom\b/.test(expression) && name !== "sourceBottom"
            ? (byName.get("sourceBottom") ?? expression)
            : expression;
        const anchoredToBottom =
          /\b(height|FRAME\.height)\b/.test(resolved) && resolved.includes("-");
        if (!anchoredToBottom)
          offenders.push(
            `${name} does not resolve to the frame's height with a subtraction: ${resolved}`,
          );
        for (const rung of HEADER_RUNGS)
          if (new RegExp(`\\b${rung}\\b`).test(resolved))
            offenders.push(`${name} resolves to the header rung ${rung}`);
      }
      expect([label, offenders]).toEqual([label, []]);
    });
  }
});

/**
 * GUARD C — the glyph, not the expression.
 *
 * The guard above proves a component's source ANCHOR names the frame's bottom. It cannot prove the
 * `<text>` lands there: a component could compute `height - PAD` and then draw at `y={12}`. This
 * one reads the COMMITTED SVG a beat ships and measures the credit's own `y` against that file's
 * own `viewBox` height — the same measurement the W2 audit made by hand, which is what produced
 * its "14 of 17 static beats still draw the source in the top quarter" line.
 *
 * WHAT COUNTS AS A BEAT, and why that is not an exemption list. The population is every `.svg`
 * under a directory that holds a `BRIEF.md` — the tree's own definition of a beat, the same one
 * `claims-grounded-in-data.test.ts` and the audits use. A probe workspace that ships measurements
 * rather than a beat (`proof/portrait-aspect-probe/`) has no `BRIEF.md` and is therefore outside
 * the population by the tree's rule, not by anybody remembering to skip it. A beat added tomorrow
 * is inside it the moment its `BRIEF.md` lands.
 *
 * WHAT IT PROVABLY DOES NOT CATCH. Only the genres that ship an SVG beside their PNG — the mp4 and
 * the HTML genres are not covered here (Guard A covers their expression; the HTML genres would
 * need a DOM-ORDER check, never a byte-offset one, which the audit records as a measurement that
 * reports "bottom" and is wrong on a scrolly page). And it reads the credit's FIRST line: a
 * component drawing its wrapped credit downward off the frame would still pass, which is why the
 * arithmetic in every migrated component walks a wrapped block UPWARD from the margin.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree at /tmp/twinmut, never in this one:
 *
 *   M-C1  `proof/static-wind-vs-solar/…-still.svg`, the credit `<text y>` 500 -> 118 (a header
 *         value):
 *           (fail) … static-wind-vs-solar-still.svg should draw its credit in the bottom eighth
 *           "Source: Ember, Energy Institute — Statis…" is drawn at y=118 of a 560-high viewBox
 *           (0.211 down the frame; the bottom eighth starts at 0.875)
 *           34 pass, 1 fail
 *
 *   M-C2  every `BRIEF.md` renamed, so the walk finds no beats and the whole block would
 *         otherwise go vacuously green:
 *           (fail) … should find the beats that ship an SVG
 *           Expected: >= 24   Received: 0
 *           6 pass, 1 fail
 */
const BOTTOM_EIGHTH = 0.875;

/** A credit line, in any language this tree's beats are written in. The `<text>` content is the
 *  discriminator — never a class name, never a file name. */
const CREDIT_OPENERS = /^\s*(Source|Sources|Quelle|Fonte|Fuente)\b/i;

function* beatSvgs(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* beatSvgs(path);
    else if (entry.name.endsWith(".svg")) yield path;
  }
}

const BEAT_SVGS = (
  existsSync(join(TWIN, "proof"))
    ? readdirSync(join(TWIN, "proof"), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => join(TWIN, "proof", e.name))
        .filter((d) => existsSync(join(d, "BRIEF.md")))
        .flatMap((d) => [...beatSvgs(d)])
    : []
)
  .map((path) => ({ path, label: relative(TWIN, path) }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** Every `<text …>…</text>` whose content opens with a credit word, with the `y` it is drawn at. */
function creditTexts(svg: string): { y: number; text: string }[] {
  const found: { y: number; text: string }[] = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const y = /\by="([\d.]+)"/.exec(m[1]!);
    if (!y) continue;
    const text = m[2]!.replace(/<[^>]*>/g, "").trim();
    if (CREDIT_OPENERS.test(text)) found.push({ y: Number(y[1]), text });
  }
  return found;
}

describe("the credit LANDS at the frame's bottom in the committed artifact", () => {
  it("should find the beats that ship an SVG", () => {
    // Without this the whole block goes vacuously green if the walk breaks. Measured 2026-08-10:
    // 28 SVGs across the beat folders, and every one of them carries a credit `<text>`. The floor
    // is set below the measurement on purpose — a beat removed should not redden this, a broken
    // walk should.
    expect(BEAT_SVGS.length).toBeGreaterThanOrEqual(24);
    const withCredit = BEAT_SVGS.filter(
      ({ path }) => creditTexts(readFileSync(path, "utf8")).length > 0,
    );
    expect(withCredit.length).toBeGreaterThanOrEqual(20);
  });

  for (const { path, label } of BEAT_SVGS) {
    it(`${label} should draw its credit in the bottom eighth of its own viewBox`, () => {
      const svg = readFileSync(path, "utf8");
      const credits = creditTexts(svg);
      if (credits.length === 0) return; // a plate, a legend, a fragment: nothing to place
      const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      expect([label, box === null]).toEqual([label, false]);
      const height = Number(box![2]);
      const offenders = credits
        .filter(({ y }) => y < height * BOTTOM_EIGHTH)
        .map(
          ({ y, text }) =>
            `"${text.slice(0, 40)}…" is drawn at y=${y} of a ${height}-high viewBox ` +
            `(${(y / height).toFixed(3)} down the frame; the bottom eighth starts at ${BOTTOM_EIGHTH})`,
        );
      expect([label, offenders]).toEqual([label, []]);
    });
  }
});

/**
 * GUARD B — the DOM order of a delivered HTML page.
 *
 * The spec (W2 §3.7) ordered three guards. A is above, C is above, and B was never written — the
 * W2 audit ran it by hand instead, in minutes, and it is what established that the 17 fluid web
 * beats are genuinely already correct rather than assumed to be, and that the scrolly pages are
 * not. Doing it by hand once is what leaves a residue nobody re-measures.
 *
 * IT READS DOM ORDER, NEVER A BYTE OFFSET, and the audit's own near-miss is why. Comparing the
 * credit's byte offset against the FIRST `<svg>` reports "bottom" on a scrolly page and is wrong:
 * the first `<svg>` there is an inline glyph far above the track. A byte offset is the same class
 * of evidence as a hex grepped out of a bundle. So the two things asked here are structural:
 *
 *   - the credit is not INSIDE the page header — `<header>…</header>` containing it is exactly the
 *     placement B1.1 reverses, and it is how the scrolly seed still draws it;
 *   - the credit comes after the visual it credits — after the last `</svg>` on the page.
 *
 * THE RESIDUE IS RECORDED, NOT SKIPPED. Five delivered map-web pages still inherit the one
 * un-migrated seed (`MapWebSeed`/`render-web.mjs`, W2 §3.4.5). The scrolly seed has been migrated:
 * its source now follows the track. Listing the remaining pages here rather than narrowing the
 * population means a sixth page cannot join them quietly, and the day the seed is migrated this
 * turns red and asks for its rows to be struck.
 *
 * THE MUTATIONS THAT REDDEN IT, run in a copy of the tree under /tmp, never in this one. Baseline
 * in the copy: 116 pass, 0 fail.
 *
 *   M-B1  a correct page moves its credit into a `<header>` (`webx-wind-vs-solar`):
 *           + "its .chart-source sits INSIDE <header> — the placement B1.1 reverses",
 *           (fail) … proof/webx-wind-vs-solar/wind-vs-solar.html should draw its credit after the
 *                  visual and outside the page header
 *           115 pass, 1 fail
 *
 *   M-B2  a RESIDUE page is fixed and its row is left behind (`mapgen-symbol-web`, credit moved to
 *         the end of the body). The first draft of this guard stayed GREEN here, because the
 *         excused branch discarded its own finding — which is the shape of a guard that cannot go
 *         red, in the file that exists to stop them:
 *           + "it is recorded as residue (map-web seed, §3.4.5) and is now CORRECT — strike its
 *              row from CREDIT_NOT_AT_THE_BOTTOM so the next regression here is caught",
 *           115 pass, 1 fail
 */
const CREDIT_NOT_AT_THE_BOTTOM: Record<string, string> = {
  // W2 §3.4.5 — the map × web seed renders `<p class="mw-source">` as the second child, under the
  // title. Five delivered pages inherit it.
  "proof/mapgen-choropleth-web/render/choropleth.html": "map-web seed, §3.4.5",
  "proof/mapgen-dot-web/dot-population.html": "map-web seed, §3.4.5",
  "proof/mapgen-hexgrid-web/hex-grid.html": "map-web seed, §3.4.5",
  "proof/mapgen-locator-web/locator.html": "map-web seed, §3.4.5",
  "proof/mapgen-symbol-web/quake-symbol.html": "map-web seed, §3.4.5",
};

/** A credit node: a block element whose class list carries a credit token. The class LIST is
 *  tokenised, never substring-matched — `class="source"` and `class="chart-source"` are both
 *  credits and `class="sourced-from-elsewhere"` is not. */
const CREDIT_CLASS = /(^|\s)(chart-source|source|mw-source|credit)(\s|$)/;

function creditNode(html: string): { at: number; className: string } | null {
  for (const m of html.matchAll(
    /<(?:p|div|figcaption|span)\b[^>]*\bclass="([^"]*)"[^>]*>/g,
  ))
    if (CREDIT_CLASS.test(m[1]!)) return { at: m.index!, className: m[1]! };
  return null;
}

function insideHeader(html: string, at: number): boolean {
  for (const m of html.matchAll(/<header\b[^>]*>/g)) {
    const close = html.indexOf("</header>", m.index!);
    if (m.index! < at && close > at) return true;
  }
  return false;
}

function* beatHtml(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* beatHtml(path);
    else if (entry.name.endsWith(".html")) yield path;
  }
}

/**
 * A BEAT NOBODY HAS COMMITTED YET IS NOT JUDGED HERE. Seven sessions share this worktree, and the
 * residue table above is a record about committed pages: reddening six other sessions because one
 * of them has an in-flight beat is how a check becomes a thing people learn to work around. The
 * page enters this population the moment its beat is committed, and it is judged then. Same rule,
 * same reason, as `scripts/matrix.mjs --check` and the edge census in
 * `interaction-promises-are-kept.test.ts`.
 */
const UNTRACKED_BEATS = new Set(
  Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--others",
      "--directory",
      "--exclude-standard",
      "proof/",
    ],
    { cwd: TWIN },
  )
    .stdout.toString()
    .split("\n")
    .filter((line) => /^proof\/[^/]+\/$/.test(line.trim()))
    .map((line) => line.trim().slice(0, -1)),
);

const BEAT_HTML = beatDirs()
  .flatMap((d) => [...beatHtml(d)])
  .map((path) => ({ path, label: relative(TWIN, path) }))
  .filter(
    ({ label }) =>
      ![...UNTRACKED_BEATS].some((dir) => label.startsWith(`${dir}/`)),
  )
  .sort((a, b) => a.label.localeCompare(b.label));

describe("the credit sits under the visual in a delivered HTML page", () => {
  it("should find the delivered pages, and hold a residue row for each page that is not there yet", () => {
    // Without this the whole block goes vacuously green if the walk breaks. Measured 2026-08-11:
    // 29 delivered pages under beat folders, 18 correct, 11 residue.
    expect(BEAT_HTML.length).toBeGreaterThanOrEqual(25);
    const labels = BEAT_HTML.map((h) => h.label);
    // A residue row for a page that no longer exists is a stale exemption, and it hides the next
    // regression. It reddens here.
    expect(
      Object.keys(CREDIT_NOT_AT_THE_BOTTOM).filter((f) => !labels.includes(f)),
    ).toEqual([]);
  });

  for (const { path, label } of BEAT_HTML) {
    it(`${label} should draw its credit after the visual and outside the page header`, () => {
      const html = readFileSync(path, "utf8");
      const credit = creditNode(html);
      if (!credit) return; // a fragment, a plate: nothing to place
      const problems: string[] = [];
      if (insideHeader(html, credit.at))
        problems.push(
          `its .${credit.className} sits INSIDE <header> — the placement B1.1 reverses`,
        );
      else if (credit.at < html.lastIndexOf("</svg>"))
        problems.push(
          `its .${credit.className} is written before the visual closes — the credit is above the graphic`,
        );
      // A recorded residue page is allowed to be wrong in the two ways above and in no other, and
      // it is NOT allowed to be right: a row that has become stale hides the next regression on
      // that page, so it reddens and asks to be struck.
      const excused = CREDIT_NOT_AT_THE_BOTTOM[label];
      const report = excused
        ? problems.length === 0
          ? [
              `it is recorded as residue (${excused}) and is now CORRECT — strike its row from ` +
                `CREDIT_NOT_AT_THE_BOTTOM so the next regression here is caught`,
            ]
          : []
        : problems;
      expect([label, report]).toEqual([label, []]);
    });
  }
});
