/**
 * A TREATMENT APPLIES TO THE DATA SHAPE IT CLAIMS, AND SAYS WHICH REGISTER IT WRITES INTO.
 *
 * The registry here carries exactly the treatments filed under `docs/design-base/treatments/`, and
 * that correspondence is itself tested below: a treatment in the code with no filed evidence is a
 * design decision somebody took without a reference, which is the whole thing this base exists to
 * stop. A filed treatment with no code is knowledge that never reached a pixel, which is how the
 * predecessor branch died.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TREATMENTS,
  beatFacts,
  applicableTreatments,
} from "../../../shared/chart-beat/treatments.mjs";
import { REGISTERS } from "../../../shared/chart-beat/registers.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const FILED = join(ROOT, "docs", "design-base", "treatments");

/** A short series with a comparison set, and a long one without: the two shapes the filed
 *  treatments actually discriminate between. */
const THREE_MARKS = [
  { key: "no", label: "Norway", value: 8 },
  { key: "dk", label: "Denmark", value: 10 },
  { key: "se", label: "Sweden", value: 15 },
];
const SEVENTY_FIVE = Array.from({ length: 75 }, (_, i) => ({
  key: String(1950 + i),
  label: String(1950 + i),
  value: 10 + i * 0.3,
}));

describe("treatment applicability", () => {
  it("should offer the printed value only where every mark can carry one", () => {
    expect(
      applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id),
    ).toContain("value-on-the-mark");
    // Seventy-five annual readings cannot each hold a label without collision, and a treatment
    // that claimed otherwise would hand the arbiter seventy-five requests to drop.
    expect(
      applicableTreatments(beatFacts(SEVENTY_FIVE)).map((t) => t.id),
    ).not.toContain("value-on-the-mark");
  });

  it("should offer the neutral comparison only when the beat actually carries one", () => {
    const withContext = beatFacts(THREE_MARKS, {
      comparisonSet: ["Chechnya", "Vietnam"],
    });
    expect(applicableTreatments(withContext).map((t) => t.id)).toContain(
      "context-in-neutral-at-the-subject-scale",
    );
    expect(
      applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id),
    ).not.toContain("context-in-neutral-at-the-subject-scale");
  });

  it("should offer the depicting mark only when the beat supplies one", () => {
    const drawn = beatFacts(THREE_MARKS, {
      unitMark: "<path d='M0 0 L10 10' />",
    });
    expect(applicableTreatments(drawn).map((t) => t.id)).toContain(
      "mark-depicts-its-subject",
    );
    // There is no drawing of a megatonne. Without a supplied mark the treatment does not apply,
    // and the encoding falls back to a plain unit shape.
    expect(
      applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id),
    ).not.toContain("mark-depicts-its-subject");
  });

  it("should offer the accent rule on every beat, because it is a floor rather than an option", () => {
    for (const facts of [beatFacts(THREE_MARKS), beatFacts(SEVENTY_FIVE)])
      expect(applicableTreatments(facts).map((t) => t.id)).toContain(
        "accent-marks-the-thread",
      );
  });

  it("should name, for every offered treatment, a register that exists", () => {
    const facts = beatFacts(THREE_MARKS, {
      comparisonSet: ["Vietnam"],
      unitMark: "<circle r='3' />",
    });
    const offered = applicableTreatments(facts);
    expect(offered.length).toBeGreaterThan(0);
    for (const treatment of offered) {
      expect(treatment.draws.length, treatment.id).toBeGreaterThan(0);
      for (const register of treatment.draws)
        expect(REGISTERS, treatment.id).toContain(register);
    }
  });

  it("should return treatments in a stable order, highest priority first", () => {
    const facts = beatFacts(THREE_MARKS, {
      comparisonSet: ["Vietnam"],
      unitMark: "<circle r='3' />",
    });
    const priorities = applicableTreatments(facts).map((t) => t.priority);
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities);
  });

  it("should hold exactly the treatments the corpus has filed, in both directions", () => {
    if (!existsSync(FILED)) return;
    const filed = readdirSync(FILED)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();
    const coded = TREATMENTS.map((t) => t.id).sort();
    // A treatment in code with no filed evidence is a decision taken without a reference.
    // A filed treatment with no code is knowledge that never reached a pixel.
    expect(coded).toEqual(filed);
  });

  it("should agree with each filed record about which registers it writes into", () => {
    if (!existsSync(FILED)) return;
    for (const treatment of TREATMENTS) {
      const record = readFileSync(join(FILED, `${treatment.id}.md`), "utf8");
      const declared = (record.match(/^- draws:\s*(.+)$/m)?.[1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      expect(declared, treatment.id).toEqual([...treatment.draws].sort());
    }
  });
});
