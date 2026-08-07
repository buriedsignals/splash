// THE OTHER SEAM, CLOSED. These tests are about a run that READ an attribution out of an article
// and then lost it between the analysis and the deliverable.
//
// source-guard.ts's DEFECT B and DEFECT D check `sourceHint` once it is threaded, and their author
// wrote that the threading was prose-enforced "by necessity" — that there was no seam to
// mechanize. That was true of the LLM's in-context ProposalSet and false of the chain: the set is
// handed to a script (save-opportunities.mjs) at the exact step the hint is captured, and that
// script dropped the field. What follows is the confrontation the receipt now makes possible.
import { describe, expect, it } from "bun:test";
import {
  readSourceProvenance,
  sourceProvenanceRefusal,
  sourceProvenanceWarnings,
  type SourceProvenance,
} from "../src/source-provenance";
import type { AcceptedProposal } from "../src/producer-spec";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const QUOTE = "les frontaliers ont presque doublé depuis 2015";

function proposal(over: Partial<AcceptedProposal> = {}): AcceptedProposal {
  return {
    id: "frontaliers",
    producer: "chart-native",
    format: "static",
    confirmedTakeaway: "Les frontaliers ont presque doublé depuis 2015.",
    anchor: { quote: QUOTE },
    spec: {
      nativeType: "line",
      title: "Frontaliers",
      altInsight: "a",
      unit: "u",
      data: "year,n\n2015,40\n2023,73",
      source: { name: "Chiffres tels que rapportés dans cet article" },
    },
    ...over,
  };
}

/** What the sanctioned writer leaves behind when the article named Insee for this claim. */
function receipt(over: Record<string, unknown> = {}): SourceProvenance {
  return {
    present: true,
    opportunities: [
      {
        claim: "Les frontaliers sont passés de 40k à 73k",
        anchorQuote: QUOTE,
        sourceHint: {
          name: "Insee",
          url: "https://www.insee.fr/fr/statistiques/1",
        },
        ...over,
      },
    ],
  };
}

/** The SAME analysis plus one claim the article credited to nobody — which is what an ordinary
 *  article looks like, and what makes these tests test what they say they test.
 *
 *  Found by mutation, not by reading: with the single-opportunity `receipt()` above, disabling L1
 *  outright left every L1 test GREEN, because L3 (every opportunity attributed, no element
 *  carrying one) fires on the same fixture and says something close enough to fool the assertion.
 *  A second, unattributed opportunity makes L3 structurally silent, so a green L1 test can only
 *  mean L1 ran. */
function mixedReceipt(): SourceProvenance {
  return {
    present: true,
    opportunities: [
      ...receipt().opportunities,
      { claim: "Le budget a dépassé de 40 %" },
    ],
  };
}

const NONE: SourceProvenance = { present: false, opportunities: [] };

describe("readSourceProvenance", () => {
  it("reports absent when the run directory holds no analysis", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-"));
    try {
      expect(readSourceProvenance(dir).present).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reads what the article named, and what it explicitly named nobody for", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-"));
    try {
      writeFileSync(
        join(dir, "opportunities.json"),
        JSON.stringify({
          opportunities: [
            {
              claim: "c1",
              anchor: { quote: QUOTE, paragraphIndex: 3 },
              sourceHint: { name: "Insee" },
            },
            { claim: "c2", noSourceNamed: true },
          ],
        }),
      );
      const p = readSourceProvenance(dir);
      expect(p.present).toBe(true);
      expect(p.opportunities).toHaveLength(2);
      expect(p.opportunities[0].sourceHint).toEqual({ name: "Insee" });
      expect(p.opportunities[0].anchorQuote).toBe(QUOTE);
      expect(p.opportunities[1].sourceHint).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("treats an unparseable receipt as absent rather than as a silent pass", () => {
    const dir = mkdtempSync(join(tmpdir(), "opps-"));
    try {
      writeFileSync(join(dir, "opportunities.json"), "{ not json");
      expect(readSourceProvenance(dir).present).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// --- L1: THE DROPPED THREAD, joined by the anchor the placement thread already carries. -------
describe("an attribution the article gave and the proposal did not carry", () => {
  it("refuses, naming the organisation the article named and the passage it read it from", () => {
    const r = sourceProvenanceRefusal([proposal()], mixedReceipt());
    expect(r).not.toBeNull();
    expect(r!.message).toContain("Insee");
    // L1's OWN sentence, not one L3 could also produce: it quotes the joined passage and names
    // the element. Asserting the distinguishing words is what keeps this a test OF L1.
    expect(r!.message).toContain(QUOTE);
    expect(r!.message).toContain("frontaliers");
    expect(r!.message).not.toContain("NOT ONE");
  });

  it("passes once the hint is carried onto the accepted element", () => {
    expect(
      sourceProvenanceRefusal(
        [
          proposal({
            sourceHint: {
              name: "Insee",
              url: "https://www.insee.fr/fr/statistiques/1",
            },
          }),
        ],
        mixedReceipt(),
      ),
    ).toBeNull();
  });

  it("says nothing when the article named nobody for this claim", () => {
    expect(
      sourceProvenanceRefusal([proposal()], {
        present: true,
        opportunities: [{ claim: "c", anchorQuote: QUOTE }],
      }),
    ).toBeNull();
  });

  it("says nothing at all when no analysis was persisted", () => {
    expect(sourceProvenanceRefusal([proposal()], NONE)).toBeNull();
  });
});

// --- L2: THE INVENTED ATTRIBUTION. The way out of L1 that must not be cheaper than the fix. ----
describe("a hint the article never gave", () => {
  it("refuses an organisation that appears nowhere in the analysis", () => {
    const r = sourceProvenanceRefusal(
      [proposal({ sourceHint: { name: "Eurostat" } })],
      receipt(),
    );
    expect(r).not.toBeNull();
    expect(r!.message).toContain("Eurostat");
  });

  it("refuses a URL bolted onto a name the article gave without one", () => {
    const r = sourceProvenanceRefusal(
      [
        proposal({
          sourceHint: {
            name: "Insee",
            url: "https://www.insee.fr/fr/statistiques/deep/unconfirmed.pdf",
          },
        }),
      ],
      {
        present: true,
        opportunities: [
          { claim: "c", anchorQuote: QUOTE, sourceHint: { name: "Insee" } },
        ],
      },
    );
    expect(r).not.toBeNull();
    expect(r!.message).toContain("unconfirmed.pdf");
  });

  // PARTIAL THREADING IS ITS OWN DODGE, and it is DEFECT D's. Guard D compares the shipped URL
  // against `hint.url` and returns null the moment the hint has none — so carrying the NAME and
  // quietly leaving the URL behind satisfies L1, passes DEFECT B, and disarms DEFECT D. Refused
  // for the same reason the whole seam is: what the article gave has to arrive intact.
  it("refuses a hint that carries the name and drops the URL the article gave with it", () => {
    const r = sourceProvenanceRefusal(
      [proposal({ sourceHint: { name: "Insee" } })],
      mixedReceipt(),
    );
    expect(r).not.toBeNull();
    expect(r!.message).toContain("insee.fr");
  });

  it("refuses a URL-only hint the analysis never recorded", () => {
    const r = sourceProvenanceRefusal(
      [proposal({ sourceHint: { url: "https://example.org/invented" } })],
      mixedReceipt(),
    );
    expect(r).not.toBeNull();
    expect(r!.message).toContain("example.org/invented");
  });

  it("accepts the URL the article itself gave", () => {
    expect(
      sourceProvenanceRefusal(
        [
          proposal({
            sourceHint: {
              name: "Insee",
              url: "https://www.insee.fr/fr/statistiques/1",
            },
          }),
        ],
        receipt(),
      ),
    ).toBeNull();
  });
});

// --- L3: TOTAL ABSENCE. The dodge L1 alone leaves open — drop the anchor, kill the join. -------
describe("a delivery that carries none of the attributions the analysis captured", () => {
  it("refuses when every opportunity named a source and no element carries one", () => {
    const r = sourceProvenanceRefusal(
      [proposal({ anchor: undefined, freeStanding: true })],
      receipt(),
    );
    expect(r).not.toBeNull();
    expect(r!.message).toContain("NOT ONE");
  });

  it("stays silent when the analysis itself recorded a claim the article did not attribute", () => {
    expect(
      sourceProvenanceRefusal(
        [proposal({ anchor: undefined, freeStanding: true })],
        {
          present: true,
          opportunities: [
            { claim: "c1", sourceHint: { name: "Insee" } },
            { claim: "c2" },
          ],
        },
      ),
    ).toBeNull();
  });
});

describe("sourceProvenanceWarnings", () => {
  it("flags the element that dropped its hint while its siblings kept theirs", () => {
    const w = sourceProvenanceWarnings(
      [
        proposal({
          id: "a",
          sourceHint: {
            name: "Insee",
            url: "https://www.insee.fr/fr/statistiques/1",
          },
        }),
        proposal({ id: "b" }),
      ],
      receipt(),
    );
    expect(w.join(" ")).toContain("b");
  });

  it("says nothing when every element accounts for its attribution", () => {
    expect(
      sourceProvenanceWarnings(
        [
          proposal({
            sourceHint: {
              name: "Insee",
              url: "https://www.insee.fr/fr/statistiques/1",
            },
          }),
        ],
        receipt(),
      ),
    ).toEqual([]);
  });
});
