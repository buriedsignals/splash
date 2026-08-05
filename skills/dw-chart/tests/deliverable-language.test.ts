// A FRENCH JOURNEY MUST NOT PRODUCE AN ENGLISH CHART (registry E18).
//
// Observed at the render on 2026-08-05, on the B1 host run: a journey conducted entirely in French,
// whose title carries the French confirmed takeaway, shipped `28,400,000` and « Created with
// Datawrapper ». Datawrapper localises numbers and dates from the chart's `language` field, and
// everything downstream of that field already existed and had been verified LIVE against the API
// (`dwLocale`, the `language` patch in produce.ts). The one missing link was upstream: `spec.lang`
// is documented as "set by the suggester from the article language" and NOTHING set it.
//
// A prose claim naming a producer that does not exist — the same defect this project found twice
// the day before (lib/core/motion.ts naming a client that never imported it).
//
// The fix belongs to the PRODUCER, not to the prose: an orchestrator that must remember to thread a
// language will forget it, exactly as it forgot here. The install already knows what language the
// newsroom delivers in, so the producer asks.
import { describe, it, expect } from "bun:test";
import { specToMetadata } from "../src/spec-to-metadata";
import { resolveDeliverableLang } from "../src/deliverable-lang";
import type { ChartSpec } from "../src/chart-spec";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = {
  type: "d3-bars",
  title: "Les charges de personnel absorbent la moitié du budget",
  data: [
    { poste: "Personnel", montant: 28400000 },
    { poste: "Dette", montant: 2400000 },
  ],
  source: { name: "Ville d'Annemasse" },
} as unknown as ChartSpec;

/** An install whose newsroom profile declares a delivery language. */
function installDeclaring(lang: string): string {
  const root = mkdtempSync(join(tmpdir(), "dw-lang-install-"));
  writeFileSync(
    join(root, "NEWSROOM-PROFILE.md"),
    `---\npalette:\n  - "#d5121e"\nsource:\n  name: "Test"\nlang: "${lang}"\n---\n\n# Newsroom profile\n`,
  );
  return root;
}

describe("the deliverable's language reaches Datawrapper", () => {
  it("should carry an explicit spec language through to the DW locale", () => {
    const patch = specToMetadata({ ...BASE, lang: "fr" } as ChartSpec);
    expect(patch.language).toBe("fr-FR");
  });

  // THE DEFECT: with no lang on the spec, the chart was created with no language at all, so
  // Datawrapper fell back to en-US and a French journey shipped English separators.
  it("should fall back to the INSTALL's delivery language when the spec names none", () => {
    expect(resolveDeliverableLang(undefined, installDeclaring("fr"))).toBe("fr");
  });

  it("should let an explicit spec language win over the install's", () => {
    expect(resolveDeliverableLang("de", installDeclaring("fr"))).toBe("de");
  });

  // An install that declares nothing falls to the HOUSE RULE, not to a guess: "a newsroom that set
  // no deliverable language works in the language it reads" (lib/newsroom/language.ts), whose own
  // default is English. Sending Datawrapper an explicit "en" is the same rendering as its implicit
  // default, so nothing changes for such an install — what changes is that the answer now has a
  // stated source instead of being an accident of an unset field.
  //
  // My first version of this case expected `undefined`, and the code was right where the test was
  // wrong. Recorded rather than quietly rewritten: it is the same reflex this file exists to
  // correct — asserting what I assumed instead of what the system says.
  it("should fall back to the house rule, not to a guess, when nothing is declared", () => {
    const bare = mkdtempSync(join(tmpdir(), "dw-lang-bare-"));
    expect(resolveDeliverableLang(undefined, bare)).toBe("en");
  });

  // The case that MUST stay undefined, and it is one this resolver INTRODUCED: a hand-edited
  // profile can hold anything. Measured while writing it — a malformed NEWSROOM-PROFILE.md yields
  // the string "[unclosed", which would have been sent to Datawrapper as the chart's locale.
  // Refusing an ill-formed tag keeps DW's own default, which is the outcome this resolver is
  // trying to improve on, never a worse one.
  it("should refuse an ill-formed tag rather than ship it as a locale", () => {
    const bad = mkdtempSync(join(tmpdir(), "dw-lang-bad-"));
    writeFileSync(
      join(bad, "NEWSROOM-PROFILE.md"),
      "---\nlang: [unclosed\n  : : :\n---\n\n# Newsroom profile\n",
    );
    expect(resolveDeliverableLang(undefined, bad)).toBeUndefined();
    expect(resolveDeliverableLang("not a tag at all", bad)).toBeUndefined();
  });
});
