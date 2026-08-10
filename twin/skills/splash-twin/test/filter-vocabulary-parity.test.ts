/**
 * THE FILTER VOCABULARY IS ONE VOCABULARY, IN EVERY GENRE THAT CAN CARRY A CONTROL.
 *
 * `assets/filter.ts` is duplicated per skill and never imported across them — the twin's method
 * (`no-cross-skill-imports.test.ts`), which buys copy-pasteability and pays for it with the risk
 * of silent drift. This file is that payment: the copies are compared byte for byte past their own
 * first line (the path comment, the one line that is allowed to differ), AND every rule is
 * exercised through BOTH imports, so a copy that was edited in one skill and not the other reddens
 * whichever half moved.
 *
 * Written the same day the vocabulary was: before it, `twin-map-web` derived its filter from
 * whether points happened to carry more than one `group`, and `twin-chart-web` hard-wired one
 * story's `#period-early`/`#period-late` into the genre's stylesheet — two mechanisms, neither
 * declarable by a beat, one of which shipped dead CSS in 21 of 21 committed pages.
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as chartFilter from "../../twin-chart-web/assets/filter.ts";
import * as mapFilter from "../../twin-map-web/assets/filter.ts";

const HERE = new URL(".", import.meta.url).pathname;
const COPIES = [
  join(HERE, "../../twin-chart-web/assets/filter.ts"),
  join(HERE, "../../twin-map-web/assets/filter.ts"),
];

/** Both live modules, so every assertion below runs twice against two separate instances. */
const IMPLEMENTATIONS: [string, typeof chartFilter][] = [
  ["twin-chart-web", chartFilter],
  ["twin-map-web", mapFilter],
];

/** A study set with a subject, three regions and a value, so a category, a series and a threshold
 *  option can all be declared over the SAME data — the reduction the vocabulary claims. */
const DRAWN = ["paris", "madrid", "berlin", "warsaw", "lisbon"];

const BY_REGION = {
  label: "Filter by region",
  allLabel: "All regions",
  unit: "metro areas",
  options: [
    { label: "Western Europe", keys: ["paris", "madrid", "lisbon"] },
    { label: "Central & Northern Europe", keys: ["berlin", "warsaw"] },
  ],
};

/** Nested bands: the threshold case, which is why `data-filter` is a token list and not one slug. */
const BY_SIZE = {
  label: "Filter by size",
  allLabel: "Every size",
  unit: "metro areas",
  options: [
    { label: "Above 3 M", keys: ["paris", "madrid", "berlin"] },
    { label: "Above 8 M", keys: ["paris"] },
  ],
};

describe("the two copies are one file", () => {
  it("differ only in their own path comment", () => {
    const [chart, map] = COPIES.map((p) => readFileSync(p, "utf8").split("\n"));
    expect(chart[0]).toBe("// twin/skills/twin-chart-web/assets/filter.ts");
    expect(map[0]).toBe("// twin/skills/twin-map-web/assets/filter.ts");
    expect(map.slice(1).join("\n")).toBe(chart.slice(1).join("\n"));
  });

  it("neither copy names a genre's own class or id prefix — the scope is an argument", () => {
    for (const path of COPIES) {
      const source = readFileSync(path, "utf8");
      // The doc-comment names both genres deliberately (it explains what it is vendored into);
      // the CODE must not, or one copy would draw the other genre's control.
      const code = source
        .split("\n")
        .filter(
          (line) =>
            !line.trimStart().startsWith("//") &&
            !line.trimStart().startsWith("*"),
        )
        .join("\n");
      for (const forbidden of [
        ".chart-figure",
        ".map-web-page",
        "chart-filter",
        "mw-filter",
      ])
        expect(code).not.toContain(forbidden);
    }
  });
});

describe.each(IMPLEMENTATIONS)("%s", (_name, F) => {
  describe("no declaration means nothing at all", () => {
    it("emits no CSS", () => {
      expect(F.filterCss(null, { scope: ".x", idPrefix: "f" })).toBe("");
      expect(F.filterCss(undefined, { scope: ".x", idPrefix: "f" })).toBe("");
    });
    it("emits no options and no notes", () => {
      expect(F.filterOptionsForMarkup(null, "f")).toEqual([]);
      expect(F.filterNotes(null, DRAWN)).toEqual([]);
    });
    it("hands out no attributes, so no element carries a residue", () => {
      const index = F.buildFilterIndex(null, DRAWN);
      expect(index.size).toBe(0);
      expect(F.attrsFor(index, "paris")).toEqual({});
    });
    it("refuses markup that carries the attribute anyway", () => {
      const index = F.buildFilterIndex(null, DRAWN);
      expect(() =>
        F.assertOneVocabulary('<circle data-filter="west"></circle>', index),
      ).toThrow(/declares no filter/);
      expect(() =>
        F.assertOneVocabulary("<circle></circle>", index),
      ).not.toThrow();
    });
  });

  describe("a declaration becomes one index every reader shares", () => {
    it("maps each datum to the options it belongs to, in declaration order", () => {
      const index = F.buildFilterIndex(BY_REGION, DRAWN);
      expect(index.get("paris")).toEqual(["western-europe"]);
      expect(index.get("warsaw")).toEqual(["central-northern-europe"]);
      expect([...index.keys()].sort()).toEqual([...DRAWN].sort());
    });

    it("gives a datum in nested bands every band it is in — the threshold case", () => {
      const index = F.buildFilterIndex(BY_SIZE, DRAWN);
      expect(index.get("paris")).toEqual(["above-3-m", "above-8-m"]);
      expect(index.get("berlin")).toEqual(["above-3-m"]);
      expect(index.get("warsaw")).toEqual([]);
      expect(F.attrsFor(index, "paris")).toEqual({
        "data-key": "paris",
        "data-filter": "above-3-m above-8-m",
      });
    });

    it("slugs an ampersand away, because a raw name in a selector once emptied a whole map", () => {
      expect(F.slugOf("Central & Northern Europe")).toBe(
        "central-northern-europe",
      );
      expect(
        F.filterCss(BY_REGION, { scope: ".s", idPrefix: "f" }),
      ).not.toContain("&amp;");
    });
  });

  describe("the CSS is one rule per option over [data-filter]", () => {
    const css = F.filterCss(BY_REGION, { scope: ".s", idPrefix: "f" });

    it("hides everything not in the checked option, whatever kind of element it is", () => {
      expect(css).toContain(
        '.s:has(#f-western-europe:checked) [data-filter]:not([data-filter~="western-europe"]) { display: none; }',
      );
    });

    it("names no element type, so a kind nobody has drawn yet is covered by construction", () => {
      for (const selector of [
        ".pt",
        ".point-label",
        "circle",
        "tbody tr",
        ".seg",
      ])
        expect(
          css
            .split("\n")
            .filter((l) => !l.trimStart().startsWith("/*"))
            .join("\n"),
        ).not.toContain(selector);
    });

    it("matches a token, so a datum in two bands survives either one", () => {
      const bands = F.filterCss(BY_SIZE, { scope: ".s", idPrefix: "f" });
      expect(bands).toContain('[data-filter~="above-8-m"]');
      expect(bands).not.toContain('[data-filter="above-8-m"]');
    });

    it("reveals only the checked option's own note", () => {
      expect(css).toContain(".s [data-filter-note] { display: none; }");
      expect(css).toContain(
        '.s:has(#f-western-europe:checked) [data-filter-note="western-europe"] { display: revert; }',
      );
    });
  });

  describe("a narrowed view names itself, with numbers off the beat's own data", () => {
    it("counts the option against everything drawn", () => {
      expect(F.filterNotes(BY_REGION, DRAWN)).toEqual([
        {
          slug: "western-europe",
          text: "Showing Western Europe — 3 of 5 metro areas.",
        },
        {
          slug: "central-northern-europe",
          text: "Showing Central & Northern Europe — 2 of 5 metro areas.",
        },
      ]);
    });
    it("gives the unfiltered option no note — it is not a subset of anything", () => {
      expect(
        F.filterNotes(BY_REGION, DRAWN).some((n) => n.slug === "all"),
      ).toBe(false);
      expect(F.filterOptionsForMarkup(BY_REGION, "f")[0]).toEqual({
        id: "f-all",
        slug: "all",
        label: "All regions",
        isAll: true,
      });
    });
  });

  describe("the declarations it refuses, each because the control would lie", () => {
    const refuses = (declaration: unknown, pattern: RegExp) =>
      expect(() => F.buildFilterIndex(declaration as never, DRAWN)).toThrow(
        pattern,
      );

    it("one option is not a choice", () =>
      refuses(
        { ...BY_REGION, options: [BY_REGION.options[0]] },
        /at least two options/,
      ));
    it("an option that keeps nothing", () =>
      refuses(
        {
          ...BY_REGION,
          options: [{ label: "Nowhere", keys: [] }, BY_REGION.options[0]],
        },
        /keeps none of the 5 drawn data/,
      ));
    it("an option that keeps everything — the unfiltered view under a second name", () =>
      refuses(
        {
          ...BY_REGION,
          options: [{ label: "Everywhere", keys: DRAWN }, BY_REGION.options[0]],
        },
        /keeps every one of the 5 drawn data/,
      ));
    it("an option naming a datum the beat does not draw", () =>
      refuses(
        {
          ...BY_REGION,
          options: [
            { label: "Elsewhere", keys: ["oslo"] },
            BY_REGION.options[0],
          ],
        },
        /key\(s\) the beat does not draw \(oslo\)/,
      ));
    it("an option that slugs to the reserved unfiltered id", () =>
      refuses(
        {
          ...BY_REGION,
          options: [{ label: "All", keys: ["paris"] }, BY_REGION.options[0]],
        },
        /reserved id of the unfiltered option/,
      ));
    it("two options that slug alike", () =>
      refuses(
        {
          ...BY_REGION,
          options: [
            { label: "Nord-Ost", keys: ["berlin"] },
            { label: "Nord/Ost", keys: ["warsaw"] },
          ],
        },
        /both slug to "nord-ost"/,
      ));
    it("a control with no words of its own", () =>
      refuses({ ...BY_REGION, label: "  " }, /must be the beat's own words/));
  });

  describe("the markup is read back, so a half-tagged datum cannot ship", () => {
    const index = F.buildFilterIndex(BY_REGION, DRAWN);
    const tagged = (key: string, tag = "circle") => {
      const a = F.attrsFor(index, key);
      return `<${tag} data-key="${a["data-key"]}" data-filter="${a["data-filter"]}"></${tag}>`;
    };

    it("passes when every element from a datum carries the vocabulary", () => {
      expect(() =>
        F.assertOneVocabulary(
          DRAWN.map(
            (k) => tagged(k) + tagged(k, "text") + tagged(k, "tr"),
          ).join(""),
          index,
        ),
      ).not.toThrow();
    });

    it("refuses the label that was left behind when its mark was hidden — B6.18b's own shape", () => {
      const markup =
        DRAWN.map((k) => tagged(k)).join("") +
        '<text data-key="paris">Paris</text>';
      expect(() => F.assertOneVocabulary(markup, index)).toThrow(
        /drawn from "paris" carries no data-filter/,
      );
    });

    it("refuses a stale slug typed by hand", () => {
      const markup =
        DRAWN.map((k) => tagged(k)).join("") +
        '<text data-key="warsaw" data-filter="western-europe">Warsaw</text>';
      expect(() => F.assertOneVocabulary(markup, index)).toThrow(
        /the vocabulary says/,
      );
    });

    it("refuses a key that is not in the study set", () => {
      expect(() =>
        F.assertOneVocabulary(
          '<circle data-key="oslo" data-filter="western-europe"></circle>',
          index,
        ),
      ).toThrow(/not one of the 5 drawn data/);
    });

    it("refuses a control drawn over a picture that carries nothing", () => {
      expect(() =>
        F.assertOneVocabulary("<svg><circle></circle></svg>", index),
      ).toThrow(/NOT ONE element in the markup carries data-key/);
    });

    it("refuses attrsFor on a datum the beat does not draw", () => {
      expect(() => F.attrsFor(index, "oslo")).toThrow(
        /nothing was drawn for the key "oslo"/,
      );
    });
  });
});
