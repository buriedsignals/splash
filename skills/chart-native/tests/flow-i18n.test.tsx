import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SankeyChart, type SankeyConfig } from "../src/SankeyChart";
import { ChordChart, type ChordConfig } from "../src/ChordChart";
import { flowWords, type Lang } from "../src/core/locale";
import sankeySample from "../assets/sample-data/sankey.json";
import chordSample from "../assets/sample-data/chord.json";

// ---------------------------------------------------------------------------
// THE FLOW FAMILY'S CONNECTIVE WORDS, IN FOUR LANGUAGES.
//
// Found by RENDERING the family in French and reading what `snap-a11y` printed back:
//   · sankey link, accessible name: "Solaire to Réseau: 16 part de l'électricité…"
//   · chord entity, tooltip:        "Eaux-Vives 39 out / most with Pâquis (50)…"
// Three English literals inside a French deliverable, reaching exactly the two readers who
// depend on them most — someone on a screen reader, and anyone hovering a ribbon.
//
// The render-time i18n gate could not have caught them: `furniture-i18n.mjs` checks the
// furniture OUTSIDE the `<svg>` (title, subtitle, the Source footer) precisely because the
// text INSIDE it is data, which may legitimately be in any language. An aria attribute and a
// tooltip's own DOM are neither, so they had no guard at all — this is it.
//
// MUTATION-VERIFIED: putting the literal `to` back in SankeyChart's aria-label reddened the
// sankey case for fr/de/it and left en green (which is the whole shape of the defect —
// English is the one language where the bug is invisible); the same for `out` / `most with`
// in ChordChart's tooltip.
// ---------------------------------------------------------------------------

const LANGS: Lang[] = ["fr", "de", "it", "en"];

const sankey = (lang: Lang) =>
  renderToStaticMarkup(
    createElement(SankeyChart, {
      config: { ...(sankeySample as unknown as SankeyConfig), lang },
      interactive: true,
    }),
  );

const chord = (lang: Lang) =>
  renderToStaticMarkup(
    createElement(ChordChart, {
      config: { ...(chordSample as unknown as ChordConfig), lang },
      interactive: true,
    }),
  );

describe("a flow chart says its connective words in the deliverable's language", () => {
  for (const lang of LANGS) {
    it(`sankey joins a link's two ends in ${lang}`, () => {
      const w = flowWords(lang);
      const aria = [...sankey(lang).matchAll(/aria-label="([^"]*)"/g)].map(
        (m) => m[1],
      );
      const links = aria.filter((a) => a.includes(` ${w.to} `));
      expect(links.length).toBeGreaterThan(0);
      // …and no OTHER language's word for it slipped through on the same render
      for (const other of LANGS.filter((l) => l !== lang)) {
        const ow = flowWords(other).to;
        if (ow === w.to) continue;
        expect(aria.some((a) => a.includes(` ${ow} `))).toBe(false);
      }
    });
  }

  // The chord's two words live in its TOOLTIP, which only exists once a mark is hovered —
  // `renderToStaticMarkup` cannot produce that, and asserting "no English appears in the
  // un-hovered markup" would pass whether the words were localized or not. So this reads the
  // component: the two strings must come from `flowWords`, and the literals must be gone.
  // The rendered proof of the same fact is `output-proof/chord/a11y.png` and the `snap-a11y`
  // transcript beside it, which is where the defect was found in the first place.
  it("chord's tooltip takes both its words from the locale table, not from literals", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "src", "ChordChart.tsx"),
      "utf8",
    );
    expect(src).toContain("const words = flowWords(config.lang)");
    expect(src).toContain("{words.outgoing}");
    expect(src).toContain("{words.mostWith}");
    // the literals the render caught, in the exact shape they had
    expect(src).not.toMatch(/\{Math\.round\(g\.value\)\} out</);
    expect(src).not.toContain("most with {");
  });

  it("every language has a full row — a missing word would fall back to English silently", () => {
    for (const lang of LANGS) {
      const w = flowWords(lang);
      expect(Object.values(w).every((v) => typeof v === "string" && v)).toBe(
        true,
      );
    }
    // and the four rows are genuinely different, so this is not four copies of English
    expect(new Set(LANGS.map((l) => flowWords(l).to)).size).toBe(4);
  });
});
