/**
 * EVERY CONTROL CHANGES THE PICTURE — the web genre's census, over the pages it actually delivered.
 *
 * THE RULE THIS FILE HOLDS. A web beat's `BRIEF.md` states what the format earns:
 * `mapgen-symbol-web`'s says a still and a video can both SAY that the circles barely differ, and
 * neither can let a reader ask a circle what it is worth. That is prose, and until this file
 * nothing verified it — a page could swear it earns the format and ship a decorative tooltip. The
 * two sibling genres already hold the same line mechanically: `assertStates`
 * (`scrolly/assets/reveal.mjs`) refuses a card whose state equals the card before it,
 * `assertEventStates` (`chart-video/scripts/choreography.mjs`) an event whose state equals the
 * event before it. The web form of the sentence is in `chart-web/assets/interaction-plan.ts`:
 * A CONTROL WHOSE STATE, ONCE APPLIED, EQUALS THE DEFAULT STATE CHANGES NOTHING.
 *
 * WHY THE COMPARISON IS AGAINST THE DEFAULT AND NOT AGAINST THE STATE BEFORE. A choreography is a
 * sequence the author controls; an interaction is a space the reader explores. There is no "state
 * before" — the author does not know which control is touched, in what order, or whether any is —
 * so the only state every control is reached from is the one a reader who touches nothing is
 * looking at. The full reasoning, including the sibling rule that deliberately does NOT transfer
 * (two controls may legitimately produce the same state, because they answer two different
 * questions on two different channels), is in `chart-web/references/directed-interaction.md`.
 *
 * WHY THIS IS NOT THE ONLY PLACE IT FIRES. The guard runs at RENDER time, in `chart-web`'s
 * `renderWeb` and `map-web`'s `renderMapWeb`, so an author meets it while writing the beat rather
 * than in CI three sessions later. This file is the census over what is already committed — and the
 * wiring itself is asserted below, because a guard nobody calls is the failure this branch met
 * three times.
 *
 * THE LIST IS EXACT, on purpose, for the reason `web-entrance-is-an-addition.test.ts` gives for
 * `ENTRANCE_PENDING`: a page that ships a control changing nothing reddens this without anybody
 * remembering, and a page landing tomorrow reddens it too. Fixing an entry means deleting its line
 * here, in the same commit that fixes the beat.
 *
 * WHAT THIS PROVABLY DOES NOT CATCH, so it is not trusted past its reach.
 *
 *   1. WHETHER THE QUESTION IS THE READER'S. It can see that hovering a mark adds a reading the
 *      plate does not print. It cannot see whether that reading is the one a reader of THIS claim
 *      wants. That is the `BRIEF.md` half of the rule, and a person holds it.
 *   2. ZOOM. A bounded zoom changes the camera, not the set of readings. The arithmetic that CAN
 *      decide whether one changes anything already exists and is not duplicated here —
 *      `map-web`'s `separationHeadroom`, which is what `mapgen-symbol-web` used to decline a zoom
 *      its own geometry could not justify.
 *   3. THE ENTRANCE, which is motion rather than a question — `web-entrance-is-an-addition.test.ts`
 *      owns it, geometry twice.
 *   4. THE FIVE STANDALONE `proof/mapgen-*-web` RENDERERS. Each assembles its own page rather than
 *      calling the skill's, by design ("nothing here imports out of"), so the render-time guard
 *      does not reach them. They are held by this census alone until the walk through the type
 *      catalogue reaches them.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import {
  assertControlsChangeSomething,
  assertInteractionPlan,
  defaultPrintedText,
  filterOptionSlugs,
  shippedControls,
  stackNotes,
  stackOptionSlugs,
  tableCells,
} from "../../chart-web/assets/interaction-plan.ts";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

/**
 * THE PAGES THAT SHIP A CONTROL CHANGING NOTHING, named exactly — `<path> :: <control kind>`.
 *
 * Not a skip list and not a shrug. `mapgen-locator-web` (archived 2026-09-17) printed all eleven
 * organisation names on the map as direct labels and all three categories on its filter chips;
 * hovering a marker answered "<the label already on it> — <the category already on a chip>", and
 * its table repeated the same two columns a third time. A locator's own reading is POSITION, which
 * the map already gives — so the honest repairs are a reading the plate cannot carry (distance from
 * the common centre, the Wikidata identifier, the pair 13 m apart the frame cannot separate) or no
 * ask at all. Which one is an editorial call about that beat, made when the walk through
 * `chart-beat/references/types/` reaches the locator sheet, not a transformation applied here. No
 * kept beat exhibits this defect, so the list below is empty.
 */
const CHANGES_NOTHING: string[] = [];

/** Every delivered web page in the tree. Walked from the filesystem rather than from `git ls-files`
 *  so this census stays in the FAST lane (`scripts/test-lanes.mjs` reads a spawned `git` as a
 *  heavy tell) — measured the day it was written: the walk and `git ls-files` name the same 152
 *  `.html` files, byte for byte. */
function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "drive"
    )
      continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile() && entry.name.endsWith(".html")) yield path;
  }
}

type Page = { label: string; html: string };

function webPages(): Page[] {
  const out: Page[] = [];
  for (const root of ["proof", "skills"]) {
    const dir = join(ROOT, root);
    if (!existsSync(dir)) continue;
    for (const path of walk(dir)) {
      const html = readFileSync(path, "utf8");
      // The two frames this genre delivers in: `chart-web`'s figure and `map-web`'s page.
      if (
        !html.includes('class="chart-figure"') &&
        !html.includes("map-web-page")
      )
        continue;
      out.push({ label: relative(ROOT, path), html });
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

const PAGES = webPages();
const CONTROLS = PAGES.flatMap((page) =>
  shippedControls(page.html).map((control) => ({ page: page.label, control })),
);

describe("the census: what the committed web corpus does when a reader asks", () => {
  // THE POPULATION, ASSERTED BEFORE ANYTHING IS CONCLUDED FROM IT. Three guards on this branch went
  // green for months because their own walk missed the files they were written to hold, so the
  // floors below are deliberately close to the measured counts (143 pages, 154 controls).
  it("found web pages to walk at all — a rename must not empty this census", () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(120);
  });

  it("found controls on them — a discovery that matches nothing must not read as a clean corpus", () => {
    expect(CONTROLS.length).toBeGreaterThanOrEqual(140);
  });

  it("found each kind of control the corpus actually ships", () => {
    // EXACT, like every other list in this file. `stack` arrived with
    // `proof/web-bar-top-emitters-2024`, which replaced its fixed bracket with a radio group the
    // reader stacks any column's followers against (`chart-web/assets/stack.ts`) — a kind this
    // census could not see until `shippedControls` learned to measure it, which is the point of
    // adding a kind here rather than letting a new control ship unmeasured.
    //
    // `level` arrived the same way, with `proof/web-grouped-bar-wind-vs-solar`: its static sibling
    // POINTS at the one country where solar beats wind, and the web beat deleted that callout and
    // gave the reader a yardstick instead — any country's own two levels laid flat across the other
    // five (`chart-web/assets/level.ts`).
    //
    // `cutoff` arrived the same way, with `proof/web-calendar-heatmap-geneva`: its claim — "31
    // consecutive days at or above 20 °C" — is a reading off the data AND a line its author drew,
    // and the web beat lets the reader move that line and watch the run redrawn around it
    // (`chart-web/assets/cutoff.ts`). None of the three kinds already here could carry it: a filter
    // makes the marks outside its set LEAVE, and on a calendar heatmap the filtered dimension IS the
    // encoded one; a level's primitive is a rule at a coordinate, and this plot has no coordinate
    // for 20 °C.
    const kinds = new Set(CONTROLS.map((entry) => entry.control.kind));
    expect([...kinds].sort()).toEqual([
      "ask",
      "cutoff",
      "filter",
      "level",
      "stack",
      "table",
    ]);
  });

  it("names every control that changes nothing, exactly", () => {
    const dead = CONTROLS.filter((entry) => entry.control.changes === 0).map(
      (entry) => `${entry.page} :: ${entry.control.kind}`,
    );
    expect(dead.sort()).toEqual([...CHANGES_NOTHING].sort());
  });

  it("every page ships at least one control — a web beat with none is a still with a stylesheet", () => {
    const bare = PAGES.filter(
      (page) => shippedControls(page.html).length === 0,
    ).map((p) => p.label);
    expect(bare).toEqual([]);
  });

  it.each(
    PAGES.filter(
      (page) =>
        !shippedControls(page.html).some(
          (control) =>
            control.changes === 0 &&
            CHANGES_NOTHING.includes(`${page.label} :: ${control.kind}`),
        ),
    ).map((page) => [page.label, page] as const),
  )("%s — every control it ships changes the picture", (_label, page) => {
    expect(() =>
      assertControlsChangeSomething(page.html, page.label),
    ).not.toThrow();
  });
});

describe("the guard is wired where an author meets it, not only here", () => {
  // A GUARD NOBODY CALLS IS THE FAILURE THIS BRANCH MET THREE TIMES. The call site is asserted from
  // the renderer's own source, so deleting it reddens this file rather than quietly disarming the
  // rule for every beat rendered after.
  it.each([
    ["skills/chart-web/scripts/render-web.mjs"],
    ["skills/map-web/scripts/render-web.mjs"],
  ])(
    "%s calls assertInteractionPlan on the page it is about to write",
    (path) => {
      const source = readFileSync(join(ROOT, path), "utf8");
      expect(source).toContain("assertInteractionPlan(draft");
    },
  );
});

// ------------------------------------------------------------------------------------------------
// The guard's own arithmetic, pinned on pages small enough to read. Each case below is a mutation
// that was run against the real corpus before it was written down here.
// ------------------------------------------------------------------------------------------------

const page = (body: string) =>
  `<!doctype html><html><body><div class="chart-figure">${body}</div></body></html>`;

describe("defaultPrintedText — what the reader sees before touching anything", () => {
  it("counts the words the page prints", () => {
    expect(defaultPrintedText(page("<p>Bern 4,1 t</p>"))).toContain(
      "Bern 4,1 t",
    );
  });

  it("does NOT count an SVG <title>, which is a native tooltip and not print", () => {
    // Measured: `proof/mapgen-choropleth-web` carries a `<title>` on all 41 shapes. Counting those
    // as printed made the one channel any of those 41 values are on look dead.
    expect(
      defaultPrintedText(page("<circle><title>Bern 4,1 t</title></circle>")),
    ).not.toContain("Bern");
  });

  it("does NOT count a disclosure's body, which a control opens", () => {
    const html = page(
      "<details><summary>Table of values</summary><table><tr><td>Bern 4,1 t</td></tr></table></details>",
    );
    expect(defaultPrintedText(html)).toContain("Table of values");
    expect(defaultPrintedText(html)).not.toContain("Bern");
  });
});

describe("tableCells — a table's readings, not its furniture", () => {
  it("reads the cells", () => {
    const html = page(
      "<details><summary>s</summary><table><tr><td>Bern</td><td>4,1 t</td></tr></table></details>",
    );
    expect(tableCells(html)).toEqual(["Bern", "4,1 t"]);
  });

  it("drops the <caption>, because a caption is about the control rather than in it", () => {
    // Without this, `proof/mapgen-locator-web`'s table — eleven rows, every one already printed on
    // the map — passed on the strength of its own caption alone.
    const html = page(
      "<details><summary>s</summary><table><caption>Every organisation behind the map</caption><tr><td>Bern</td></tr></table></details>",
    );
    expect(tableCells(html)).toEqual(["Bern"]);
  });
});

describe("filterOptionSlugs — the options the page ships", () => {
  it("finds them whichever order the attributes are written in", () => {
    // A REAL DEFECT, caught while writing this file. The first form required `type="radio"` to
    // precede `id=`; `chart-web` writes `<input id="chart-filter-africa" type="radio" …>` and
    // `map-web` writes them the other way round, so it found four of the corpus's five filters and
    // reported the fifth page as having no control at all.
    const chartOrder = page(
      '<input id="chart-filter-africa" type="radio" name="chart-filter"/>',
    );
    const mapOrder = page(
      '<input type="radio" id="mw-filter-un-system" name="mw-filter"/>',
    );
    expect(filterOptionSlugs(chartOrder)).toEqual(["africa"]);
    expect(filterOptionSlugs(mapOrder)).toEqual(["un-system"]);
  });

  it("does not count the unfiltered option, which narrows nothing by definition", () => {
    expect(
      filterOptionSlugs(page('<input id="chart-filter-all" type="radio"/>')),
    ).toEqual([]);
  });
});

describe("stackOptionSlugs and stackNotes — the second control the format can generate", () => {
  it("finds the options whichever order the attributes are written in", () => {
    expect(
      stackOptionSlugs(
        page('<input id="chart-stack-chn" type="radio" name="chart-stack"/>'),
      ),
    ).toEqual(["chn"]);
    expect(
      stackOptionSlugs(page('<input type="radio" id="chart-stack-usa"/>')),
    ).toEqual(["usa"]);
  });

  it("does not count the untouched option, which is the plate itself", () => {
    expect(
      stackOptionSlugs(page('<input id="chart-stack-none" type="radio"/>')),
    ).toEqual([]);
  });

  it("does not mistake a filter's radios for a stack's, or the other way round", () => {
    const both = page(
      '<input id="chart-filter-africa" type="radio"/><input id="chart-stack-chn" type="radio"/>',
    );
    expect(filterOptionSlugs(both)).toEqual(["africa"]);
    expect(stackOptionSlugs(both)).toEqual(["chn"]);
  });

  it("reads the sentence each option reveals", () => {
    expect(
      stackNotes(page('<p data-stack-note="chn">6 pays &middot; 12,45 Gt</p>')),
    ).toEqual([{ slug: "chn", text: "6 pays &middot; 12,45 Gt" }]);
  });

  it("does NOT count that sentence as printed — it is revealed by :checked, like a filter's note", () => {
    const html = page(
      '<p>Chine 12,29</p><p data-stack-note="chn">6 pays &middot; 12,45 Gt</p>',
    );
    expect(defaultPrintedText(html)).toContain("Chine 12,29");
    expect(defaultPrintedText(html)).not.toContain("12,45");
  });

  const stacked = (note: string, printed: string) =>
    page(
      `<p>${printed}</p><input id="chart-stack-chn" type="radio"/><p data-stack-note="chn">${note}</p>`,
    );

  it("passes a stack whose sentence carries a reading the plate does not print", () => {
    expect(() =>
      assertControlsChangeSomething(
        stacked("6 pays &middot; 12,45 Gt", "Chine 12,29 Gt"),
      ),
    ).not.toThrow();
  });

  it("refuses a stack whose every sentence is already printed", () => {
    expect(() =>
      assertControlsChangeSomething(
        stacked("Chine 12,29 Gt", "Chine 12,29 Gt"),
      ),
    ).toThrow(/changes nothing/);
  });

  it("refuses a stack that reveals no sentence at all — a hundred moved columns are not a reading", () => {
    // The mutation this case was written from: strip every `data-stack-note` from the delivered
    // page and leave the radios and all 62 transform rules in place. A guard that counted rules
    // would stay green; this one reddens, because a reader who cannot read the count and the total
    // has been shown a picture and told nothing.
    expect(() =>
      assertControlsChangeSomething(
        page('<p>Chine</p><input id="chart-stack-chn" type="radio"/>'),
      ),
    ).toThrow(/changes nothing/);
  });
});

describe("assertControlsChangeSomething — the mechanical refusal", () => {
  const asks = (answer: string, printed: string) =>
    page(`<p>${printed}</p><circle data-detail="${answer}"></circle>`);

  it("passes an ask that answers with a reading the plate does not print", () => {
    expect(() =>
      assertControlsChangeSomething(asks("Bern · 4,1 t · rank 12", "Bern")),
    ).not.toThrow();
  });

  it("refuses an ask whose every answer is already printed", () => {
    expect(() =>
      assertControlsChangeSomething(asks("Bern · 4,1 t", "Bern 4,1 t")),
    ).toThrow(/changes nothing/);
  });

  it("names the reference and the repertoire in the refusal, so an author knows what to reach for", () => {
    expect(() => assertControlsChangeSomething(asks("Bern", "Bern"))).toThrow(
      /directed-interaction\.md/,
    );
  });

  it("refuses a filter option that keeps every element the page drew", () => {
    const html = page(
      '<input id="chart-filter-all" type="radio"/><input id="chart-filter-europe" type="radio"/>' +
        '<circle data-key="a" data-filter="europe" data-detail="Austria · 6,2 t"></circle>' +
        '<circle data-key="b" data-filter="europe" data-detail="Belgium · 7,2 t"></circle>',
    );
    expect(() => assertControlsChangeSomething(html)).toThrow(
      /the unfiltered view under a second name/,
    );
  });

  it("refuses a filter whose options are keyed to the LEGACY map vocabulary and keep everything", () => {
    // A REAL VACUITY, caught by mutation. `filter.ts` writes `data-filter`; the map beats rendered
    // before it was vendored write `data-group`. Of the five committed pages that ship a filter, ONE
    // writes `data-filter` and FOUR write `data-group` — so the first form of this check, which read
    // `data-filter` alone, reported all four as alive without measuring anything, and a mutant that
    // tagged every element with every option passed it.
    const html = page(
      '<input type="radio" id="mw-filter-all"/><input type="radio" id="mw-filter-sunda-arc"/>' +
        '<circle data-group="sunda-arc" data-detail="Aceh · M8.6"></circle>' +
        '<circle data-group="sunda-arc" data-detail="Nias · M8.4"></circle>',
    );
    expect(() => assertControlsChangeSomething(html)).toThrow(
      /the unfiltered view under a second name/,
    );
  });

  it("refuses a filter whose options tag no element at all — chips over a picture they cannot reach", () => {
    const html = page(
      '<input type="radio" id="mw-filter-all"/><input type="radio" id="mw-filter-sunda-arc"/>' +
        '<circle data-detail="Aceh · M8.6"></circle>',
    );
    expect(() => assertControlsChangeSomething(html)).toThrow(
      /carries the filter vocabulary/,
    );
  });

  it("refuses a page that ships no control at all", () => {
    expect(() => assertControlsChangeSomething(page("<p>Bern</p>"))).toThrow(
      /no reader control at all/,
    );
  });
});

describe("assertInteractionPlan — the interaction is written before the code", () => {
  const shipped = page(
    '<p>Bern</p><circle data-detail="Bern · 4,1 t · rank 12"></circle>',
  );
  const plan = {
    earns:
      "a still can rank these marks and cannot let a reader ask one what it is worth",
    controls: [
      {
        question: "What is this mark worth?",
        gesture: "ask-a-mark" as const,
        changes: "the mark answers with its value and its rank",
        // The free parameter, added when it became a required atom of a declaration: a plate
        // settles which readings it prints, and this page hands that back one mark at a time.
        parameter: "which mark is in question",
        authorPicked: "Bern",
        readerPicks: "every mark" as const,
        heldStill: [".chart-plot"],
      },
    ],
  };

  it("accepts a plan that matches the page", () => {
    expect(() => assertInteractionPlan(shipped, plan)).not.toThrow();
  });

  it("lets a beat that has not written one yet through the declaration half", () => {
    // The corpus predates this rule and the walk that closes it goes type by type. What is NEVER
    // optional is the mechanical half, which runs for every beat either way.
    expect(() => assertInteractionPlan(shipped, null)).not.toThrow();
  });

  it("refuses a control described as a mechanism instead of the reader's question", () => {
    const bad = {
      ...plan,
      controls: [{ ...plan.controls[0], question: "hover detail" }],
    };
    expect(() => assertInteractionPlan(shipped, bad)).toThrow(
      /READER'S OWN QUESTION/,
    );
  });

  it("refuses a gesture that is not in the repertoire", () => {
    const bad = {
      ...plan,
      controls: [{ ...plan.controls[0], gesture: "sparkle" as never }],
    };
    expect(() => assertInteractionPlan(shipped, bad)).toThrow(
      /not in the\s+repertoire|not in the repertoire/,
    );
  });

  it("refuses a control that does not say what changes in the picture", () => {
    const bad = {
      ...plan,
      controls: [{ ...plan.controls[0], changes: "it updates" }],
    };
    expect(() => assertInteractionPlan(shipped, bad)).toThrow(
      /WHAT CHANGES IN THE PICTURE/,
    );
  });

  it("refuses a page that ships a control the plan never declared", () => {
    const withTable = shipped.replace(
      "</div>",
      "<details><summary>Table</summary><table><tr><td>Bern 4,1 t rank 12</td></tr></table></details></div>",
    );
    expect(() => assertInteractionPlan(withTable, plan)).toThrow(
      /the plan declares no control for it/,
    );
  });

  it("refuses a plan that promises a control the render does not build", () => {
    const bad = {
      ...plan,
      controls: [
        ...plan.controls,
        {
          question: "Which of these are in Europe?",
          gesture: "filter-to-a-subset" as const,
          changes: "every mark outside Europe leaves the frame",
          // A COMPLETE declaration of a control the page does not ship: the refusal under test is
          // "promised and not built", so this control must clear every other refusal to reach it.
          parameter: "the subset the frame is measured over",
          authorPicked: "every country",
          readerPicks: ["every country", "Europe only"],
          heldStill: [".chart-plot"],
        },
      ],
    };
    expect(() => assertInteractionPlan(shipped, bad)).toThrow(
      /the page ships none/,
    );
  });
});
