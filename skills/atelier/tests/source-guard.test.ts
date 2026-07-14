import { describe, it, expect } from "bun:test";
import {
  placeholderSourceReason,
  sourceNamePreservedReason,
  sourceUrlFidelityReason,
  droppedSourceHintWarning,
} from "../src/source-guard";

const FR_FALLBACK = { name: "Chiffres tels que rapportés dans cet article" };
const EN_FALLBACK = { name: "Figures as reported in this article" };

// GUARD 2 (pure core) — a source URL whose host is an RFC 2606 / RFC 6761 reserved
// placeholder domain is a fabricated citation, not a real dataset. Reject it hard.
describe("placeholderSourceReason", () => {
  it("rejects the reserved second-level domains example.com/.org/.net", () => {
    for (const url of [
      "https://example.com",
      "http://example.org/data",
      "https://example.net/table.csv",
    ]) {
      expect(placeholderSourceReason(url)).not.toBeNull();
    }
  });

  it("rejects a subdomain of a reserved example.* domain", () => {
    expect(
      placeholderSourceReason("https://data.example.com/x"),
    ).not.toBeNull();
    expect(placeholderSourceReason("https://www.example.org")).not.toBeNull();
  });

  it("rejects the reserved TLDs .example/.test/.invalid/.localhost", () => {
    for (const url of [
      "https://foo.example",
      "https://dataset.test/page",
      "https://bar.invalid",
      "http://site.localhost/data",
    ]) {
      expect(placeholderSourceReason(url)).not.toBeNull();
    }
  });

  it("rejects a bare localhost host (with or without a port)", () => {
    expect(placeholderSourceReason("http://localhost")).not.toBeNull();
    expect(placeholderSourceReason("http://localhost:3000/x")).not.toBeNull();
  });

  it("rejects a scheme-less placeholder host (e.g. pasted without https://)", () => {
    expect(placeholderSourceReason("example.com/data")).not.toBeNull();
    expect(placeholderSourceReason("foo.test")).not.toBeNull();
  });

  it("names the offending reserved token in the reason", () => {
    expect(placeholderSourceReason("https://example.com")).toContain(
      "example.com",
    );
    expect(placeholderSourceReason("https://x.test")).toContain("test");
  });

  it("PASSES real, specific dataset/page URLs", () => {
    for (const url of [
      "https://ec.europa.eu/eurostat/databrowser/view/env_waspac/default/table",
      "https://www.insee.fr/fr/statistiques/serie/001688527",
      "https://data.gouv.fr/datasets/loyers",
      "https://ourworldindata.org/grapher/co2-emissions",
    ]) {
      expect(placeholderSourceReason(url)).toBeNull();
    }
  });

  it("does NOT false-reject real domains that merely CONTAIN a reserved label", () => {
    // "example" as a non-terminal label of a real registrable domain is fine — only the
    // exact reserved example.com/.org/.net (or the reserved TLDs) are placeholders.
    expect(placeholderSourceReason("https://myexample.com/data")).toBeNull();
    expect(placeholderSourceReason("https://example-data.fr/x")).toBeNull();
    expect(placeholderSourceReason("https://testing.gov.uk/x")).toBeNull();
  });

  it("returns null for an empty or unparseable url (not this guard's concern)", () => {
    expect(placeholderSourceReason("")).toBeNull();
    expect(placeholderSourceReason("   ")).toBeNull();
    expect(placeholderSourceReason("not a url at all")).toBeNull();
  });
});

// DEFECT B — the journalist NAMED a real org, but atelier shipped the generic honest-
// fallback ("Chiffres tels que rapportés dans cet article" / "Figures as reported in this
// article"), DISCARDING the named org. Gate 2c is prose-only and binary; nothing
// mechanically preserves a name-only third state. This guard is the teeth: given the
// captured org-name hint, a shipped source that collapses a named org to the generic
// fallback fails hard. (Real cases: inflation-trend-line = INSEE, renouvelables = REN/DGEG.)
describe("sourceNamePreservedReason", () => {
  it("FAILS when the article named INSEE but the ship is the FR generic fallback", () => {
    expect(
      sourceNamePreservedReason({ source: FR_FALLBACK }, { name: "INSEE" }),
    ).not.toBeNull();
  });

  it("FAILS when the article named REN / DGEG (with URL) but the ship is the FR generic fallback", () => {
    expect(
      sourceNamePreservedReason(
        { source: FR_FALLBACK },
        { name: "REN / DGEG", url: "https://www.ren.pt" },
      ),
    ).not.toBeNull();
  });

  it("FAILS on the EN generic-fallback variant too", () => {
    expect(
      sourceNamePreservedReason({ source: EN_FALLBACK }, { name: "Eurostat" }),
    ).not.toBeNull();
  });

  it("names both the discarded org and the generic fallback in the reason", () => {
    const reason = sourceNamePreservedReason(
      { source: FR_FALLBACK },
      { name: "INSEE" },
    );
    expect(reason).toContain("INSEE");
    expect(reason).toContain("Chiffres tels que rapportés dans cet article");
  });

  it("PASSES when the named org is KEPT name-only (the legitimate third state b)", () => {
    // Article named INSEE, no precise URL → shipping name-only "INSEE" is allowed.
    expect(
      sourceNamePreservedReason(
        { source: { name: "INSEE" } },
        { name: "INSEE" },
      ),
    ).toBeNull();
  });

  it("PASSES when the named org is kept with a specific URL (state a)", () => {
    expect(
      sourceNamePreservedReason(
        {
          source: {
            name: "INSEE",
            url: "https://www.insee.fr/fr/statistiques/serie/001688527",
          },
        },
        { name: "INSEE" },
      ),
    ).toBeNull();
  });

  it("PASSES (no fire) when the article named NO org — the generic fallback is legitimate", () => {
    expect(
      sourceNamePreservedReason({ source: FR_FALLBACK }, undefined),
    ).toBeNull();
    expect(sourceNamePreservedReason({ source: FR_FALLBACK }, {})).toBeNull();
    expect(
      sourceNamePreservedReason({ source: FR_FALLBACK }, { name: "   " }),
    ).toBeNull();
  });

  it("PASSES when the hint itself IS the generic fallback (not a real org)", () => {
    expect(
      sourceNamePreservedReason(
        { source: FR_FALLBACK },
        { name: FR_FALLBACK.name },
      ),
    ).toBeNull();
  });

  it("does not fire when the shipped name is neither the generic fallback nor absent", () => {
    // A different named org shipped (name-only state b) — not this guard's concern.
    expect(
      sourceNamePreservedReason(
        { source: { name: "Banque de France" } },
        { name: "INSEE" },
      ),
    ).toBeNull();
  });
});

// DEFECT D — the journalist gave a homepage URL (dares.travail-emploi.gouv.fr); atelier
// UPGRADED it to a specific /sites/default/files/...pdf it admitted it could not confirm,
// and shipped it definitively. Given the captured provided URL, the shipped source URL
// must equal it (or an in-turn explicitly-confirmed subpath, which the hint would carry) —
// a silent upgrade to a deeper, unconfirmed path fails.
describe("sourceUrlFidelityReason", () => {
  const PROVIDED = "dares.travail-emploi.gouv.fr";
  const UPGRADED =
    "https://dares.travail-emploi.gouv.fr/sites/default/files/bae651843fdf63f94f1577a2c2c8b957/Dares_Analyses.pdf";

  it("FAILS when the ship upgraded the provided homepage to a deeper, unconfirmed path", () => {
    expect(
      sourceUrlFidelityReason(
        { source: { name: "Dares", url: UPGRADED } },
        { url: PROVIDED },
      ),
    ).not.toBeNull();
  });

  it("names both the shipped URL and the provided URL in the reason", () => {
    const reason = sourceUrlFidelityReason(
      { source: { name: "Dares", url: UPGRADED } },
      { url: PROVIDED },
    );
    expect(reason).toContain(UPGRADED);
    expect(reason).toContain(PROVIDED);
  });

  it("PASSES when the shipped URL equals the provided URL exactly", () => {
    const url = "https://www.insee.fr/fr/statistiques/serie/001688527";
    expect(
      sourceUrlFidelityReason({ source: { name: "INSEE", url } }, { url }),
    ).toBeNull();
  });

  it("PASSES when the ship keeps the provided homepage as-is (only trailing-slash/scheme differ)", () => {
    expect(
      sourceUrlFidelityReason(
        {
          source: {
            name: "Dares",
            url: "https://dares.travail-emploi.gouv.fr/",
          },
        },
        { url: PROVIDED },
      ),
    ).toBeNull();
  });

  it("PASSES (no fire) when no provided URL was captured", () => {
    expect(
      sourceUrlFidelityReason(
        { source: { name: "Dares", url: UPGRADED } },
        { name: "Dares" },
      ),
    ).toBeNull();
    expect(
      sourceUrlFidelityReason(
        { source: { name: "Dares", url: UPGRADED } },
        undefined,
      ),
    ).toBeNull();
  });

  it("PASSES (no fire) when the ship carries NO url (name-only) — not this guard's concern", () => {
    expect(
      sourceUrlFidelityReason({ source: { name: "Dares" } }, { url: PROVIDED }),
    ).toBeNull();
  });
});

// OBSERVABILITY (not a guard — a non-blocking render-gate warning). Threading sourceHint from
// suggest-article's ProposalSet onto accepted.json is PROSE-ENFORCED by necessity (there is no
// script that transforms the in-context ProposalSet into accepted.json — the orchestrator LLM
// assembles it, exactly like `channel` / `confirmedTakeaway`). So a DROPPED hint silently disarms
// the named-org guard: with no captured name to compare against, a named org collapsed to the
// generic fallback sails through. This warning makes that disarm VISIBLE — it fires when the ship
// is the generic fallback yet no org-name hint was threaded, EXCEPT for prose/none provenance
// (where the generic fallback is documented-legitimate — SKILL.md Gate 2c — so a warning is noise).
describe("droppedSourceHintWarning", () => {
  it("WARNS when a table-provenance ship uses the generic fallback with no name hint", () => {
    expect(
      droppedSourceHintWarning({ source: FR_FALLBACK }, undefined, "table"),
    ).not.toBeNull();
    expect(
      droppedSourceHintWarning({ source: EN_FALLBACK }, {}, "table"),
    ).not.toBeNull();
    // a URL-only hint still leaves the NAME dimension uncaptured → guard B is disarmed.
    expect(
      droppedSourceHintWarning(
        { source: FR_FALLBACK },
        { url: "https://x.gouv.fr" },
        "table",
      ),
    ).not.toBeNull();
  });

  it("WARNS when provenance is ABSENT (defaults to table)", () => {
    expect(
      droppedSourceHintWarning({ source: FR_FALLBACK }, undefined, undefined),
    ).not.toBeNull();
  });

  it("is SUPPRESSED for prose/none provenance (generic fallback is legitimate there)", () => {
    expect(
      droppedSourceHintWarning({ source: FR_FALLBACK }, undefined, "prose"),
    ).toBeNull();
    expect(
      droppedSourceHintWarning({ source: FR_FALLBACK }, undefined, "none"),
    ).toBeNull();
  });

  it("does NOT warn when a name hint WAS threaded (guard B already covers that case)", () => {
    expect(
      droppedSourceHintWarning(
        { source: FR_FALLBACK },
        { name: "INSEE" },
        "table",
      ),
    ).toBeNull();
  });

  it("does NOT warn when the ship is a real named source (not the generic fallback)", () => {
    expect(
      droppedSourceHintWarning(
        { source: { name: "INSEE" } },
        undefined,
        "table",
      ),
    ).toBeNull();
  });

  it("does NOT warn when there is no shippable source name at all", () => {
    expect(droppedSourceHintWarning({}, undefined, "table")).toBeNull();
    expect(
      droppedSourceHintWarning(
        { source: { url: "https://x" } },
        undefined,
        "table",
      ),
    ).toBeNull();
  });

  it("points at sourceHint + accepted.json and flags the disarmed guard in the message", () => {
    const w = droppedSourceHintWarning(
      { source: FR_FALLBACK },
      undefined,
      "table",
    );
    expect(w).toContain("sourceHint");
    expect(w).toContain("accepted.json");
  });
});
