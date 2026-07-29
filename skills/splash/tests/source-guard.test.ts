import { describe, it, expect } from "bun:test";
import {
  placeholderSourceReason,
  sourceNamePreservedReason,
  sourceUrlFidelityReason,
  droppedSourceHintWarning,
  droppedSourceUrlReason,
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

// DEFECT B — the journalist NAMED a real org, but splash shipped the generic honest-
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

// DEFECT D — the journalist gave a homepage URL (dares.travail-emploi.gouv.fr); splash
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

// D18 — the journalist's CADRAGE Q4 / Gate 2c answer (`SourceAnswer`, distinct from
// `SourceHint`: the article's own naming) had no carrier at all, so the orchestrator recomposed
// `spec.source` by hand and no guard could compare "given" against "absent". A URL that
// DIVERGES is caught by sourceUrlFidelityReason above; a URL that DISAPPEARS is not —
// `sourceUrlFidelityReason` returns null the moment the ship carries no URL at all (the
// "name-only ship" branch), by design, since it compares two URLs. This is the missing
// comparison: what the journalist ANSWERED versus what actually shipped.
describe("droppedSourceUrlReason", () => {
  it("catches a URL the journalist gave that the shipped spec no longer has", () => {
    // The measured failure: the journalist supplied the URL TWICE and `source` shipped with
    // the name alone. sourceUrlFidelityReason returns null on a name-only ship (:152, by
    // design — it compares two URLs). Nothing compared "given" against "absent" until now.
    expect(
      droppedSourceUrlReason(
        { name: "OFS" },
        { name: "OFS", url: "https://www.bfs.admin.ch/x", kind: "public" },
      ),
    ).toContain("https://www.bfs.admin.ch/x");
  });

  it("says nothing when the URL survived", () => {
    expect(
      droppedSourceUrlReason(
        { name: "OFS", url: "https://www.bfs.admin.ch/x" },
        { name: "OFS", url: "https://www.bfs.admin.ch/x", kind: "public" },
      ),
    ).toBeNull();
  });

  it("says nothing for a class whose URL is forbidden", () => {
    // private/synthetic: requirements.ts sets url "forbidden" for these rows. Dropping a URL
    // that was never publishable is CORRECT, not a defect — flagging it would be a false block.
    expect(
      droppedSourceUrlReason(
        { name: "Internal desk figures" },
        {
          name: "Internal desk figures",
          url: "https://intranet/x",
          kind: "private",
        },
      ),
    ).toBeNull();
  });

  it("says nothing when the journalist gave no URL to begin with", () => {
    expect(
      droppedSourceUrlReason({ name: "OFS" }, { name: "OFS", kind: "local" }),
    ).toBeNull();
  });

  it("says nothing when the shipped spec is not an object at all", () => {
    expect(
      droppedSourceUrlReason(null, {
        name: "OFS",
        url: "https://www.bfs.admin.ch/x",
        kind: "public",
      }),
    ).toContain("https://www.bfs.admin.ch/x");
    expect(
      droppedSourceUrlReason(undefined, {
        name: "OFS",
        url: "https://www.bfs.admin.ch/x",
        kind: "public",
      }),
    ).toContain("https://www.bfs.admin.ch/x");
  });

  it("says nothing when there is no answer at all", () => {
    expect(droppedSourceUrlReason({ name: "OFS" }, undefined)).toBeNull();
  });

  it("names the source by name when composing the reason", () => {
    const reason = droppedSourceUrlReason(
      { name: "OFS" },
      { name: "OFS", url: "https://www.bfs.admin.ch/x", kind: "public" },
    );
    expect(reason).toContain("OFS");
  });
});

// Task 17 — one shared placeholder list (lib/core/placeholder-host.ts), the strictest of the
// two independently-maintained lists this guard and lib/core/contract.ts's isHostedUrl used to
// carry. Two lists let two cross-leaks through: `https://data.test/x` passed the old V2
// alternation (contract.ts) but failed this V1 TLD guard; `https://todo.com/x` did the
// opposite. Both must now be rejected AT THIS CALL SITE (placeholderSourceReason), not just in
// the shared module's own unit tests — this is the delegation, verified.
describe("placeholderSourceReason — closes the two cross-leaks via the shared list", () => {
  it("rejects data.test (the leak V1's old TLD-only check missed before .test was a TLD entry)", () => {
    expect(placeholderSourceReason("https://data.test/x")).not.toBeNull();
  });

  it("rejects todo.com (the leak V1's old TLD/domain-only check never covered)", () => {
    expect(placeholderSourceReason("https://todo.com/x")).not.toBeNull();
  });
});
