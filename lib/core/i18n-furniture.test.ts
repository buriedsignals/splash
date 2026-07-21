import { describe, it, expect } from "bun:test";
import * as core from "./i18n-furniture";
// Canonical implementations this module is extracted from — dw-chart's and map-dw's
// furniture-i18n.ts are near-identical mirrors: same invariant, same structure, ONE
// genuine wording divergence (dw-chart says "a non-English chart must carry...",
// map-dw says "a non-English map must carry...") — everything else, including every
// byte a test actually asserts on, is identical. Core uses the neutral "deliverable"
// (verified below to change no test-observable behaviour on either side); `norm()`
// papers over just that one word so the rest of each message is compared byte-exact.
import {
  localizedSourceViolations as dwViolations,
  assertLocalizedSourceMetadata as dwAssert,
} from "../../skills/dw-chart/src/furniture-i18n";
import {
  type DwPatch,
  SOURCE_LABELS as dwSourceLabels,
} from "../../skills/dw-chart/src/spec-to-metadata";
import {
  localizedSourceViolations as mdViolations,
  assertLocalizedSourceMetadata as mdAssert,
} from "../../skills/map-dw/src/furniture-i18n";
import {
  type MapPatch,
  SOURCE_LABELS as mdSourceLabels,
} from "../../skills/map-dw/src/spec-to-map-metadata";

function norm(s: string): string {
  return s.replace(/\bnon-English (chart|map|deliverable)\b/g, "non-English X");
}
function normAll(msgs: string[]): string[] {
  return msgs.map(norm);
}

function dwPatch(overrides: {
  sourceName?: string;
  sourceUrl?: string;
  notes?: string;
}): DwPatch {
  return {
    title: "t",
    type: "d3-lines",
    metadata: {
      describe: {
        "source-name": overrides.sourceName ?? "",
        "source-url": overrides.sourceUrl ?? "",
      },
      visualize: {},
      annotate: { notes: overrides.notes ?? "" },
    },
  };
}

function mapPatch(overrides: {
  sourceName?: string;
  sourceUrl?: string;
  notes?: string;
}): MapPatch {
  return {
    title: "t",
    type: "d3-maps-choropleth",
    metadata: {
      axes: {},
      visualize: {},
      describe: {
        "source-name": overrides.sourceName ?? "",
        "source-url": overrides.sourceUrl ?? "",
      },
      annotate: { notes: overrides.notes ?? "" },
    },
  };
}

const LANGS = [undefined, "fr", "de", "it", "en", "fr-CH", "pt"];

// Tier 2: SOURCE_LABELS used to be a THIRD physical copy of this exact table (inlined
// here, plus dw-chart's and map-dw's own spec-to-*.ts each declaring it locally). Now
// core is the single source and both skills re-export it — locking that in as an
// identity check (not just equal values: the SAME object), so a future edit can't
// silently re-fork the bytes.
describe("core/i18n-furniture SOURCE_LABELS — single source (Tier 2)", () => {
  it("dw-chart's and map-dw's exported SOURCE_LABELS are the SAME object as core's (re-exported, not re-declared)", () => {
    expect(dwSourceLabels).toBe(core.SOURCE_LABELS);
    expect(mdSourceLabels).toBe(core.SOURCE_LABELS);
  });

  it("carries the exact fr/de/it/en bytes", () => {
    expect(core.SOURCE_LABELS).toEqual({
      fr: "Source :",
      de: "Quelle:",
      it: "Fonte:",
      en: "Source:",
    });
  });
});

describe("core/i18n-furniture parity with dw-chart (canonical)", () => {
  it("localizedSourceViolations matches on a clean patch, every lang", () => {
    for (const lang of LANGS) {
      const spec = { lang, source: { name: "INSEE" } };
      // Build the EXPECTED-clean patch per lang the same way dw-chart's own code would:
      // blank native fields, carry the localized line in notes when non-English.
      const label =
        lang?.split("-")[0] === "fr"
          ? "Source :"
          : lang?.split("-")[0] === "de"
            ? "Quelle:"
            : lang?.split("-")[0] === "it"
              ? "Fonte:"
              : "Source:";
      const isNonEnglish = ["fr", "de", "it"].includes(
        lang?.split("-")[0] ?? "",
      );
      const clean = dwPatch({
        notes: isNonEnglish ? `${label} INSEE` : "",
      });
      expect(normAll(core.localizedSourceViolations(clean, spec))).toEqual(
        normAll(dwViolations(clean, spec)),
      );
    }
  });

  it("localizedSourceViolations matches on a VIOLATING patch (native fields not blanked), every lang", () => {
    for (const lang of LANGS) {
      const spec = { lang, source: { name: "INSEE", url: "https://insee.fr" } };
      const patch = dwPatch({
        sourceName: "INSEE",
        sourceUrl: "https://insee.fr",
      });
      expect(normAll(core.localizedSourceViolations(patch, spec))).toEqual(
        normAll(dwViolations(patch, spec)),
      );
    }
  });

  it("assertLocalizedSourceMetadata throws/passes identically", () => {
    const spec = { lang: "fr", source: { name: "INSEE" } };
    const violating = dwPatch({ sourceName: "INSEE" });
    const clean = dwPatch({ notes: "Source : INSEE" });

    let coreErr: string | undefined;
    let dwErr: string | undefined;
    try {
      core.assertLocalizedSourceMetadata(violating, spec);
    } catch (e) {
      coreErr = (e as Error).message;
    }
    try {
      dwAssert(violating, spec);
    } catch (e) {
      dwErr = (e as Error).message;
    }
    expect(coreErr).toBeDefined();
    expect(norm(coreErr!)).toBe(norm(dwErr!));

    expect(() => core.assertLocalizedSourceMetadata(clean, spec)).not.toThrow();
    expect(() => dwAssert(clean, spec)).not.toThrow();
  });
});

describe("core/i18n-furniture parity with map-dw (mirror, confirmed near-identical)", () => {
  it("localizedSourceViolations matches on a VIOLATING patch, every lang", () => {
    for (const lang of LANGS) {
      const spec = { lang, source: { name: "Eurostat" } };
      const patch = mapPatch({ sourceName: "Eurostat" });
      expect(normAll(core.localizedSourceViolations(patch, spec))).toEqual(
        normAll(mdViolations(patch, spec)),
      );
    }
  });

  it("assertLocalizedSourceMetadata throws identically", () => {
    const spec = { lang: "de", source: { name: "Eurostat" } };
    const violating = mapPatch({ sourceName: "Eurostat" });

    let coreErr: string | undefined;
    let mdErr: string | undefined;
    try {
      core.assertLocalizedSourceMetadata(violating, spec);
    } catch (e) {
      coreErr = (e as Error).message;
    }
    try {
      mdAssert(violating, spec);
    } catch (e) {
      mdErr = (e as Error).message;
    }
    expect(coreErr).toBeDefined();
    expect(norm(coreErr!)).toBe(norm(mdErr!));
  });
});
