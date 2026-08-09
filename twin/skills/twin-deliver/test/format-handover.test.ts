import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatHandover } from "../scripts/format-handover.mjs";

const VALID = {
  genre: "static",
  files: ["/tmp/story/export/still.svg", "/tmp/story/export/still.png"],
  placement: "after the paragraph that first states the divergence, full width",
  alt: "Three sponsors account for more of the melt than the Games themselves.",
  credit: "Source: SGR / New Weather Institute, Olympics Torched (2026)",
  caveat:
    "One report's figures; the third row is a subtraction, not a measurement.",
};

describe("formatHandover — what the journalist reads", () => {
  it("should name each file by basename and say what it is for", () => {
    const doc = formatHandover(VALID);
    expect(doc).toContain("`still.svg`");
    expect(doc).toContain("the one to give the CMS");
    expect(doc).toContain("`still.png`");
    // Never the absolute path of the machine that built it — that means nothing in a newsroom.
    expect(doc).not.toContain("/tmp/story/export");
  });

  it("should read back the placement, the alt, the credit and the caveat", () => {
    const doc = formatHandover(VALID);
    for (const value of [
      VALID.placement,
      VALID.alt,
      VALID.credit,
      VALID.caveat,
    ]) {
      expect(doc).toContain(value);
    }
  });

  it("should render without a caveat, since 'none' is a legitimate answer to the limits question", () => {
    const doc = formatHandover({ ...VALID, caveat: undefined });
    expect(doc).toContain(VALID.credit);
    expect(doc).not.toContain("does not show");
  });

  for (const field of ["placement", "alt", "credit"]) {
    it(`should refuse to render at all when ${field} is missing, rather than leave a blank where it goes`, () => {
      expect(() => formatHandover({ ...VALID, [field]: "" })).toThrow(field);
    });
  }

  it("should refuse to render before anything has been delivered", () => {
    expect(() => formatHandover({ ...VALID, files: [] })).toThrow(
      /before anything has been delivered/,
    );
  });
});

// The journalist never reads about us. The run's closing message was four fifths internals -- three
// paragraphs naming our own files and their defects, written to a journalist -- and at one point
// the journalist was asked to arbitrate an internal defect with options naming two of our modules.
// A prose rule is this project's softest surface, so the rule is a throw.
describe("formatHandover — a maintainer-facing sentence cannot pass through it", () => {
  it("should throw when a caveat names one of our modules", () => {
    expect(() =>
      formatHandover({
        ...VALID,
        caveat:
          "The grounding check in ground-claim.mjs could not place the total, so this was overridden.",
      }),
    ).toThrow(/never into a delivered/);
  });

  it("should throw when a placement names one of our paths", () => {
    expect(() =>
      formatHandover({
        ...VALID,
        placement: "wherever skills/twin-chart-beat renders it",
      }),
    ).toThrow(/NOTES-FOR-MAINTAINER/);
  });

  it("should say where such a sentence belongs instead, so the refusal is actionable", () => {
    expect(() =>
      formatHandover({ ...VALID, alt: "see where.mjs for the phase" }),
    ).toThrow(/NOTES-FOR-MAINTAINER\.md/);
  });

  // THE PARAMETER SET IS THE FIRST HALF OF THE ANSWER, and nothing else guards it. The throw above
  // catches a maintainer-facing sentence arriving through a field that exists; it cannot catch
  // somebody ADDING a `notes` field and rendering whatever they like into it — which is the exact
  // change this design exists to prevent, and which stayed green until this case existed. So the
  // declared parameter list is pinned by name: widen it and this reddens, naming what appeared.
  it("should accept exactly these parameters and no free-text field", () => {
    const source = readFileSync(
      join(import.meta.dirname, "..", "scripts", "format-handover.mjs"),
      "utf8",
    );
    const signature = /export function formatHandover\(\{([^}]*)\}\)/.exec(source);
    expect(signature).not.toBeNull();
    const declared = signature![1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .sort();
    expect(declared).toEqual(
      ["alt", "caveat", "credit", "files", "genre", "placement"].sort(),
    );
  });

  it("should let a clean hand-over through carrying no path and no module of ours", () => {
    const doc = formatHandover(VALID);
    expect(doc).not.toMatch(/\bskills\//);
    expect(doc).not.toMatch(/\.(mjs|mts|cjs|cts|tsx|jsx)\b/);
  });

  // The accepted cost, stated rather than discovered: a caveat naming a SOURCE MODULE is refused
  // even when it reads as editorial. No real caveat names one — a caveat is about the DATA — and
  // this pair of cases is where that line sits.
  it("should refuse a caveat that names a source module, even phrased editorially", () => {
    expect(() =>
      formatHandover({
        ...VALID,
        caveat:
          "The totals come from the derivation in totals.ts, not from the publisher.",
      }),
    ).toThrow();
  });

  it("should let a caveat naming the journalist's OWN data file through — that is their material, not ours", () => {
    const doc = formatHandover({
      ...VALID,
      caveat: "Derived from olympics.csv, not from the publisher's own totals.",
    });
    expect(doc).toContain("olympics.csv");
  });
});
