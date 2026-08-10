/**
 * THE WALKING GUARD FOR THE FILTER VOCABULARY.
 *
 * Two things the owner asked for, and neither is checkable by reading code:
 *
 *   1. **A beat that declares no filter ships no filter** — no markup, no CSS rule, no listener.
 *      Not a flag that hides a control that still exists. Measured the day this file was written,
 *      before the vocabulary landed: **21 of 21 committed chart x web pages carried 12 lines of
 *      `.chart-filter` styling and 3 `#period-early`/`#period-late` rules, and NOT ONE contained a
 *      `<fieldset class="chart-filter">`.** That is the defect this file's census half exists for,
 *      and it is why the census runs over the DELIVERED files rather than over the renderers.
 *   2. **Filtering a value hides everything that value drew** — its mark, its label, its hit target,
 *      its table row, together. The known instance is B6.18b: on a symbol map a filter hid the marks
 *      and left their labels on the map, in one beat, fixed in that beat. This file makes it
 *      structural by DRIVING it: every committed page that has a filter is opened in a real browser,
 *      every option is clicked, and every element belonging to every excluded datum is required to
 *      have no client rect.
 *
 * WHY DRIVEN, AND WHY IT WALKS RATHER THAN SAMPLES. Two lessons already paid for in this tree:
 *
 *   - **`display` is not visibility.** A rule that computes to `display: none` on an element whose
 *     ancestor was re-shown, a rule that loses a specificity fight, an `!important` from the live
 *     layer — all of them read "none" from `getComputedStyle` on the wrong box while the reader sees
 *     the label. `getClientRects().length` is geometry the browser actually laid out, and that is
 *     the only thing this file believes.
 *   - **A sampled probe reported 25/25 clean on a scrolly the owner watched fail.** So this walks:
 *     every page x every option x every datum x every element carrying that datum, at two viewport
 *     widths. No sampling, anywhere.
 *
 * THE ORPHAN-LABEL CHECK, which is the one that would have caught B6.18b without being told about
 * it. An element drawn from a datum that carries NO vocabulary attributes is invisible to any markup
 * scan — it has no `data-key` to find. So before filtering, this file records each datum's own
 * NAME as rendered (the text inside the elements that do carry its key), and after filtering it
 * asserts that name is not the full text of any visible element anywhere on the page. A label left
 * behind is found by looking for the word, not by trusting an attribute the defect consists of
 * missing.
 *
 * WHAT IT DELIBERATELY DOES NOT REACH, stated so it is not trusted past it. Map pages are driven
 * WITHOUT a MapTiler key, which is how they sit in the repository (R1b), so what is driven is the
 * baked fallback layer and the CSS vocabulary over it — the layer B6.18b lived in. The LIVE half of
 * a mark (the MapLibre `setFilter`) is the other half of the same vocabulary and is guarded by
 * `map-web/scripts/verify-live-map.mjs`, which spends tile quota and therefore does not belong
 * in a suite that runs on every commit.
 *
 * THE MUTATIONS THAT REDDEN IT — a guard that cannot go red is worse than none. All four were run
 * in a copy of the tree under `/tmp` (`/private/tmp/filter-mutation`), never in this tree, against
 * a baseline of 30 pass / 0 fail:
 *
 *   1. delete the `[data-filter]:not(…)` line from `filter.ts`'s `filterCss` → 2 fail; the driven
 *      walk reports every excluded datum "still has a client rect", and the census loses the rules.
 *   2. drop `attrsFor` from the scatter's `.point-label` ONLY, leaving its dot and leader line
 *      correctly tagged → the markup scan is structurally blind to it (the element carries no
 *      `data-key` to look up) and the driven walk reddens with *"Switzerland belongs to a datum
 *      this option excludes and is still drawn"*. This is the mutation that proves the driven half
 *      is not redundant with the build-time half.
 *   3. write `data-key` by hand without the vocabulary → the BUILD refuses, before any file is
 *      written: *"an element drawn from "AFG" carries no data-filter, so a narrowed view would
 *      leave it behind while its siblings disappear"*.
 *   4. restore one page from before this chantier (dead `.chart-filter` CSS, no control) → the
 *      census fails naming `.chart-filter` and `#period-* dimming`. On the whole tree as it stood
 *      that morning this half was 21 fail / 4 pass.
 */

import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";

/** A DUPLICATE of `map-web/scripts/verify-interaction.mjs`'s own `resolveChrome`, for the same
 *  reason that one duplicates `bake-plate.mjs`'s: importing either runs it. This machine has no
 *  puppeteer-managed Chrome download, so the installed browser is what every driven check in this
 *  tree actually uses. */
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

// Launching Chrome once and walking every page x every option x every datum at two widths is
// minutes, not seconds — the same budget `map-web/test/canon.test.ts` already spends on
// `verify-interaction.mjs`.
setDefaultTimeout(600_000);

const TWIN = join(new URL(".", import.meta.url).pathname, "../../..");

/** Every self-contained web page git tracks — the DELIVERED files, which is where the dead CSS was.
 *  Read from git rather than a hand-written list, so a beat added next week is walked without
 *  anyone remembering to add it (the audits' recurring finding: a guard that reads a list only ever
 *  checks the list). */
function trackedWebPages(): string[] {
  const out = execFileSync("git", ["-C", TWIN, "ls-files", "*.html"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return (
    out
      .split("\n")
      .filter(Boolean)
      // A scrolly is a different genre with a different contract (`map-web-discipline.md`: a map on a
      // scrolly has no controls at all) and is out of this chantier's scope by instruction.
      .filter((p) => !p.includes("scrolly") && !p.includes("/drive/"))
  );
}

type Page = {
  path: string;
  html: string;
  /** The control's own markup: a fieldset carrying this genre's filter class. */
  hasControl: boolean;
  /** The vocabulary on the drawn elements. */
  hasAttrs: boolean;
  /** The generated hiding rules. */
  hasRules: boolean;
  /** The narrowing note. */
  hasNotes: boolean;
  /** Still on the mechanism the vocabulary replaces — see `LEGACY_MAP_VOCABULARY`. */
  legacy: boolean;
};

/**
 * THE ONE PART OF THE TREE THIS GUARD MEASURES BUT DOES NOT YET HOLD TO THE VOCABULARY, named page
 * by page rather than described.
 *
 * `map-web` still runs the mechanism the vocabulary replaces: a filter derived from whether
 * points happen to carry more than one `group`, hidden by four hand-written selectors over
 * `data-group`. Migrating it was the last step of this chantier and it was NOT taken, because every
 * file it needs — `MapWebSeed.tsx`, `render-web.mjs`, `live-map.mjs`, `map-web-discipline.md` — was
 * being written by another session at the time, and a clobbered hour costs more than an honest gap.
 *
 * So these three pages are driven on their OWN vocabulary (`data-group`) instead of skipped: the
 * walk below reads whichever attribute a page carries, so B6.18b's class is checked on them today.
 * What they are exempt from is the narrowing NOTE, which the legacy mechanism has no notion of.
 *
 * **This list is exact, and that is what makes the gap self-closing**: migrating a page reddens this
 * test until its path is removed, and adding a NEW page on the legacy mechanism reddens it too.
 */
const LEGACY_MAP_VOCABULARY = [
  "proof/mapgen-locator-web/locator.html",
  "proof/mapgen-symbol-web/quake-symbol.html",
  "skills/map-web/output-proof/population.html",
];

const PAGES: Page[] = trackedWebPages().map((path) => {
  const html = readFileSync(join(TWIN, path), "utf8");
  return {
    path,
    html,
    hasControl: /<fieldset class="(?:chart-filter|mw-filter)"/.test(html),
    hasAttrs: / data-filter="/.test(html),
    hasRules: /\[data-filter\]:not\(\[data-filter~=/.test(html),
    hasNotes: / data-filter-note="/.test(html),
    legacy: / data-group="/.test(html),
  };
});

describe("the census: a page has a whole filter or none of one", () => {
  it("found pages to walk at all", () => {
    // Anti-vacuity, twice over: this file passes trivially in a tree with no web pages in it, and it
    // passes trivially again if every page happens to be on the same side of the question.
    expect(PAGES.length).toBeGreaterThan(10);
    expect(PAGES.filter((p) => p.hasControl).length).toBeGreaterThan(0);
    expect(PAGES.filter((p) => !p.hasControl).length).toBeGreaterThan(0);
  });

  it("names every page still on the legacy map vocabulary, exactly", () => {
    expect(
      PAGES.filter((p) => p.legacy)
        .map((p) => p.path)
        .sort(),
    ).toEqual([...LEGACY_MAP_VOCABULARY].sort());
  });

  it.each(PAGES.map((p) => [p.path, p] as const))("%s", (_path, page) => {
    if (page.legacy) {
      // Held to its OWN mechanism's coherence, not to the vocabulary's: a control, the attribute it
      // keys off, and a rule that hides by it.
      expect({
        control: page.hasControl,
        rules: /\[data-group="[^"]+"\]\) \{ display: none/.test(page.html),
      }).toEqual({ control: true, rules: true });
    } else if (page.hasControl) {
      expect({
        rules: page.hasRules,
        attrs: page.hasAttrs,
        notes: page.hasNotes,
      }).toEqual({
        rules: true,
        attrs: true,
        notes: true,
      });
    } else {
      // The exact shape of the defect: styling and dimming rules for a control the page does not
      // have. `.chart-filter`/`.mw-filter`/`.filter-note` in the stylesheet, `#…-early:checked`
      // selectors, `data-period`/`data-group` residue — any of them is dead weight in a delivered
      // file and a control a reader cannot operate.
      const residue = [
        [".chart-filter", /\.chart-filter[\s{,:]/],
        [".mw-filter", /\.mw-filter[\s{,:]/],
        [".filter-note", /\.filter-note[\s{,:]/],
        ["#period-* dimming", /#period-(?:early|late):checked/],
        ["data-filter attributes", / data-filter[="]/],
        ["a filter hiding rule", /\[data-filter[~\]]/],
      ].filter(([, re]) => (re as RegExp).test(page.html));
      expect(residue.map(([name]) => name)).toEqual([]);
    }
  });
});

/** One page's vocabulary, read out of the page itself rather than out of the renderer that made it:
 *  key -> the option slugs it belongs to, plus the NAME it renders under. */
type Vocabulary = {
  options: { id: string; slug: string }[];
  keys: { key: string; slugs: string[]; names: string[] }[];
};

async function readVocabulary(
  page: import("puppeteer").Page,
  attr: string,
): Promise<Vocabulary> {
  return page.evaluate((a: string) => {
    const radios = [
      ...document.querySelectorAll<HTMLInputElement>(
        "fieldset input[type=radio]",
      ),
    ];
    const byKey = new Map<string, { slugs: string[]; names: Set<string> }>();
    for (const el of document.querySelectorAll<HTMLElement>(
      `[data-key][${a}]`,
    )) {
      const key = el.getAttribute("data-key")!;
      const slugs = (el.getAttribute(a) ?? "").split(/\s+/).filter(Boolean);
      const entry = byKey.get(key) ?? { slugs, names: new Set<string>() };
      // The datum's own rendered NAME — what the orphan check looks for once this datum is filtered
      // away. Numbers and very short strings are skipped: "3.9" legitimately reappears in a legend
      // that does not move under a filter, and a false red would train someone to ignore this file.
      const text = (el.textContent ?? "").trim();
      if (text && text.length >= 3 && !/^[\d\s.,%+-]+$/.test(text))
        entry.names.add(text);
      const label = el.getAttribute("aria-label")?.trim();
      if (label && label.length >= 3 && !/^[\d\s.,%+-]+$/.test(label))
        entry.names.add(label);
      byKey.set(key, entry);
    }
    return {
      options: radios
        // A radio with no `value` attribute reports `"on"`, which is the browser's default and not
        // a slug at all — the legacy map control has no `value`, so every option read as `"on"` and
        // a whole driven run was meaningless while looking busy. The id is the reliable source: the
        // slug is what follows this genre's own filter prefix.
        .map((r) => ({
          id: r.id,
          slug:
            r.value && r.value !== "on"
              ? r.value
              : r.id.replace(/^(?:chart-filter|mw-filter)-/, ""),
        }))
        .filter((o) => o.id),
      keys: [...byKey.entries()].map(([key, v]) => ({
        key,
        slugs: v.slugs,
        names: [...v.names],
      })),
    };
  }, attr);
}

/** What is actually laid out, for one key and for one word. `getClientRects()` is geometry the
 *  browser produced, not a style value that can be read off the wrong box. */
async function visibility(page: import("puppeteer").Page, key: string) {
  return page.evaluate((k) => {
    const els = [
      ...document.querySelectorAll<HTMLElement>(
        `[data-key="${CSS.escape(k)}"]`,
      ),
    ];
    return {
      total: els.length,
      visible: els.filter((e) => e.getClientRects().length > 0).length,
    };
  }, key);
}

/**
 * THE ORPHAN HALF, and it is the only part of this file that can see an element the vocabulary
 * never reached — the `<span>Switzerland</span>` a component typed by hand beside a dot it tagged
 * properly. B6.18b is exactly that shape, and a markup scan is structurally blind to it: the defect
 * consists of an attribute not being there, so there is nothing to look the element up by.
 *
 * The rule, and its two clauses matter equally:
 *
 *   - a visible leaf whose whole text is a SUBSTRING of a hidden datum's own accessible name
 *     ("Switzerland" inside "Switzerland: $63,323 GDP per capita, 83.2 years life expectancy") is a
 *     candidate. Substring rather than equality, because a label prints the datum's NAME while the
 *     accessible name prints the name AND the value — the first draft of this check compared them
 *     for equality and stayed green on a deliberately orphaned label, which is recorded here rather
 *     than tidied away.
 *   - it is only reported if that same text is NOT a substring of any name belonging to a datum the
 *     option KEEPS. That is what stops a word shared with something still on screen — a legend
 *     entry, a shared country name, an axis title — from reading as an orphan.
 *
 * Numbers and strings under three characters are skipped: "3.9" legitimately reappears in a legend
 * that does not move under a filter, and a false red here would train someone to ignore this file.
 */
async function orphanTexts(
  page: import("puppeteer").Page,
  hiddenNames: string[],
  keptNames: string[],
) {
  return page.evaluate(
    ({ hidden, kept }) => {
      const found = new Set<string>();
      // THE CONTROL AND THE LEGEND ARE NOT ORPHANS. A chip reading "UN system" is visible precisely
      // when that group is excluded — that is what a filter chip IS — and a size legend's reference
      // label ("M8.0") deliberately does not move under a filter, because a legend that shrank with
      // the selection would tell a reader the marks had been resized. Both are substrings of an
      // excluded datum's accessible name, so both read as orphans until they are excluded here.
      // Measured: without this clause the two legacy map pages reported 33 orphans, every one of
      // them furniture — including a `<th scope="col">Organisation` in the accessible table's own
      // header, which is why `thead` is in the list while `tbody` deliberately is not (a row header
      // there IS a datum's name and must be checked).
      const FURNITURE = "fieldset, legend, thead, [data-filter-note], [class*='legend'], figcaption";
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        if (el.children.length > 0) continue; // leaves only: an ancestor's text is its children's
        if (el.getClientRects().length === 0) continue;
        if (el.closest(FURNITURE)) continue;
        const text = (el.textContent ?? "").trim();
        if (text.length < 3 || /^[\d\s.,%+\-–—]+$/.test(text)) continue;
        if (!hidden.some((name) => name.includes(text))) continue;
        if (kept.some((name) => name.includes(text))) continue;
        found.add(text);
      }
      return [...found];
    },
    { hidden: hiddenNames, kept: keptNames },
  );
}

const WIDE = { width: 1280, height: 900 };
const PHONE = { width: 375, height: 812 };

describe("driven: a filtered value disappears whole", () => {
  const withFilter = PAGES.filter((p) => p.hasControl);

  it.each(withFilter.map((p) => [p.path, p] as const))(
    "%s",
    async (path, subject) => {
      // The legacy map pages are driven on THEIR OWN attribute rather than skipped, so B6.18b's
      // class is checked on them today; what they are exempt from is the narrowing note, which the
      // mechanism they still run has no notion of.
      const attr = subject.legacy ? "data-group" : "data-filter";
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: resolveChrome(),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const failures: string[] = [];
    try {
      for (const viewport of [WIDE, PHONE]) {
        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.goto(`file://${join(TWIN, path)}`, { waitUntil: "load" });
        const where = `${viewport.width}x${viewport.height}`;

        const vocabulary = await readVocabulary(page, attr);
        if (vocabulary.keys.length === 0)
          failures.push(
            `${where}: the page has a control and no datum carries the vocabulary`,
          );

        // THE DEFAULT STATE IS THE WHOLE CLAIM — nothing argument-bearing behind the control. Every
        // datum must be DRAWN, which is "at least one of its elements has a box" and deliberately
        // not "all of them do": measured on `proof/mapgen-locator-web`, nine of eleven markers ship
        // a `.point-label` at `display: none` in the unfiltered state, because that beat declutters
        // its label layer on purpose. Asserting every element would call a real editorial decision
        // a defect, which is how a guard gets ignored.
        for (const { key } of vocabulary.keys) {
          const v = await visibility(page, key);
          if (v.visible === 0)
            failures.push(
              `${where}: unfiltered, "${key}" is not drawn at all — none of its ${v.total} elements has a box`,
            );
        }

        // EVERY option, EVERY datum, EVERY element. No sampling.
        for (const option of vocabulary.options) {
          // A REAL click on the CHIP a reader sees, not on the input the CSS moves out of sight —
          // clicking the visually-hidden `<input>` directly would pass in a world where the pill is
          // covered by something and no reader could ever select it. `page.mouse.click` at the
          // label's own centre is what a pointer does; falling back to the input's own `.click()`
          // only when the label has no box at all (a genre that draws the radio bare).
          const box = await page.evaluate((id) => {
            const input = document.getElementById(id) as HTMLInputElement;
            const chip = (input.closest("label") ?? input) as HTMLElement;
            const r = chip.getBoundingClientRect();
            if (r.width < 1 || r.height < 1) return null;
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }, option.id);
          if (box) await page.mouse.click(box.x, box.y);
          else
            await page.evaluate((id) => {
              (document.getElementById(id) as HTMLInputElement).click();
            }, option.id);
          const isAll = await page.evaluate(
            (id) => id.replace(/^(?:chart-filter|mw-filter)-/, "") === "all",
            option.id,
          );

          for (const datum of vocabulary.keys) {
            const kept = isAll || datum.slugs.includes(option.slug);
            const v = await visibility(page, datum.key);
            if (kept && v.visible === 0)
              failures.push(
                `${where} / "${option.slug}": "${datum.key}" is in this option and not one of its ${v.total} elements is drawn`,
              );
            if (!kept && v.visible > 0)
              failures.push(
                `${where} / "${option.slug}": "${datum.key}" is filtered out and ${v.visible} of its ${v.total} elements still have a client rect`,
              );
          }

          // THE ORPHAN HALF, run once per option over the whole page rather than once per datum:
          // a word belonging to a datum this option excludes, still drawn, with the mark it names
          // gone. One DOM walk instead of one per datum keeps a 164-country page to seven walks.
          {
            const hiddenNames = vocabulary.keys
              .filter((d) => !(isAll || d.slugs.includes(option.slug)))
              .flatMap((d) => d.names);
            const keptNames = vocabulary.keys
              .filter((d) => isAll || d.slugs.includes(option.slug))
              .flatMap((d) => d.names);
            for (const text of await orphanTexts(page, hiddenNames, keptNames))
              failures.push(
                `${where} / "${option.slug}": ${JSON.stringify(text)} belongs to a datum this option excludes and is still drawn`,
              );
          }

          // THE READER-FACING CONSEQUENCE: a narrowed view says so, and the whole view does not.
          const note = await page.evaluate(() => {
            const shown = [
              ...document.querySelectorAll<HTMLElement>("[data-filter-note]"),
            ].filter((e) => e.getClientRects().length > 0);
            return shown.map((e) => (e.textContent ?? "").trim());
          });
          if (isAll && note.length > 0)
            failures.push(
              `${where}: the unfiltered view prints a narrowing note — ${note.join(" / ")}`,
            );
          if (!isAll && !subject.legacy && note.length !== 1)
            failures.push(
              `${where} / "${option.slug}": ${note.length} narrowing notes are drawn, wanted exactly one`,
            );
        }
        await page.close();
      }
    } finally {
      await browser.close();
    }
      expect(failures).toEqual([]);
    },
  );
});
