// IMPORTANT-5 — brand-concerns.json gained a READER (review-gate.mjs) but lost two of the three
// concern classes on the way in. produce.mjs used to hand the whole flattened `concerns` list to
// stdout only; once the file appeared it recorded `brandConcerns` alone — the STRUCTURED
// CVD/contrast subset. The label-integrity tripwire (the "Interm." data-shortening class, which
// CLAUDE.md treats as load-bearing) and the mark-contrast advisory reached no persistent sink at
// all, because lib/core/verbs/exec.ts discards produce stdout except on failure. Worse, the write
// was gated on `brandConcerns.length > 0`, so a run whose ONLY finding was a shortened data label
// wrote no file whatsoever.
import { describe, it, expect } from "bun:test";
import {
  runProduceConformance,
  brandConcernsFile,
} from "../src/core/produce-conformance";
import barsSample from "../assets/sample-data/bars.json";

// A label that looks shortened to fit ("Interm.") whose expansion is in the prose — exactly the
// slope incident's shape. No brand colour anywhere, so brandConcerns is empty by construction.
const INTEGRITY_ONLY = {
  ...barsSample,
  title: "Les professions intermédiaires portent la hausse",
  altInsight:
    "Les professions intermédiaires portent la hausse des visites mensuelles.",
  rows: [
    { branch: "Interm.", visits: 10400 },
    { branch: "Riverside", visits: 4200 },
    { branch: "Hilltop", visits: 3100 },
  ],
};

describe("brand-concerns.json carries every concern class, not just the brand one", () => {
  it("surfaces the label-integrity tripwire as an advisory with zero brand concerns", () => {
    const r = runProduceConformance("bar", INTEGRITY_ONLY);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.brandConcerns).toEqual([]);
    // the tripwire fired…
    expect(r.concerns.join(" ")).toContain("truncated data field");
    // …and it is reachable as a first-class field, not only inside the flattened prose.
    expect(r.advisories.join(" ")).toContain("truncated data field");
  });

  it("writes a file for an integrity-ONLY run (the old gate wrote nothing)", () => {
    const r = runProduceConformance("bar", INTEGRITY_ONLY);
    const payload = brandConcernsFile("bar", r);
    expect(payload).not.toBeNull();
    expect(payload!.type).toBe("bar");
    expect(payload!.concerns).toEqual([]);
    expect(payload!.advisories.join(" ")).toContain("truncated data field");
  });

  it("keeps the brand concern in `concerns`, backward-compatible with the reader", () => {
    // A non-Okabe-Ito house amber that fails CVD-safety, kept per policy (b).
    const branded = { ...barsSample, baseColor: "#F5A623", brandExplicit: true };
    const r = runProduceConformance("bar", branded);
    const payload = brandConcernsFile("bar", r);
    expect(payload).not.toBeNull();
    expect(payload!.concerns.length).toBeGreaterThan(0);
    // review-gate.mjs reads `.concerns[].reason` — the shape must not move.
    expect(payload!.concerns[0].reason).toBeString();
  });

  it("writes nothing at all on a clean run", () => {
    const r = runProduceConformance("bar", barsSample);
    expect(r.concerns).toEqual([]);
    expect(brandConcernsFile("bar", r)).toBeNull();
  });
});
