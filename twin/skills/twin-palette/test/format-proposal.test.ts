import { describe, it, expect } from "bun:test";
import { proposePalette } from "../scripts/palette.mjs";
import { formatProposal } from "../scripts/format-proposal.mjs";

const HEIDI = { name: "Heidi.news", brandColor: "#0B7A75", ground: "#FFFFFF" };
const FAILING = {
  name: "a newsroom whose brand is a bright yellow",
  brandColor: "#F2C744",
  ground: "#FFFFFF",
};

describe("formatProposal — the passing case", () => {
  const text = formatProposal(
    proposePalette({ newsroom: HEIDI, subject: "la part du solaire" }),
  );

  it("should say it is proposing, not reporting a decision", () => {
    expect(text).toMatch(/PROPOSED, not applied/);
  });

  it("should carry both options, each with its provenance, its reasoning and its measured ratio", () => {
    expect(text).toContain("Heidi.news's house colours");
    expect(text).toContain("renewable generation convention");
    expect(text).toContain("NEWSROOM.md — brandColor: #0B7A75");
    expect(text).toContain("references/subject-conventions.md — renewables");
    expect(text).toMatch(/Measured: \*\*5\.18:1\*\*/);
  });

  it("should mark the recommendation — the subject convention, when one matched", () => {
    expect(text).toMatch(/convention\*\* — \*\*recommended\*\*/);
  });

  // A one-option proposal with no explanation reads as a tool with nothing to say. The run
  // produced exactly that: the subject matched none of the four conventions, one option appeared,
  // and why was left for the operator to say out of band.
  it("should say out loud when no convention applies to the subject", () => {
    const noMatch = formatProposal(
      proposePalette({ newsroom: HEIDI, subject: "les glaciers et les sponsors des JO" }),
    );
    expect(noMatch).toContain("No convention applies to this subject");
    expect(noMatch).toContain("house colours");
  });

  it("should end in an answerable question that includes the escape branch", () => {
    expect(text).toContain("## Your answer");
    expect(text).toContain("Something else — give me the two hex codes");
  });

  it("should say plainly that nothing renders until the answer is recorded", () => {
    expect(text).toMatch(/refuses to render/);
  });
});

describe("formatProposal — the failing case", () => {
  const text = formatProposal(
    proposePalette({ newsroom: FAILING, subject: "le prix du logement" }),
  );

  it("should show the brand colour as it is, and name the failure", () => {
    expect(text).toContain("#F2C744");
    expect(text).toMatch(/FAILS the 3:1 floor/);
    expect(text).toContain("SC 1.4.11");
  });

  it("should offer the remedy as an offer — never as a substitution", () => {
    expect(text).toMatch(/Nearest variant that would clear it/);
    expect(text).toMatch(/Offered, not applied/);
  });

  it("should list the adjusted variant among the answers, since one was offered", () => {
    expect(text).toMatch(/\*\*the adjusted variant\*\*/);
  });
});

describe("formatProposal — nothing to propose", () => {
  const text = formatProposal(
    proposePalette({ subject: "le prix du logement" }),
  );

  it("should refuse to invent a palette and point at the two real ways forward", () => {
    expect(text).toContain("## Nothing to propose");
    expect(text).toContain("twin-newsroom-charter");
    expect(text).toContain("Something else — give me the two hex codes");
    expect(text).not.toMatch(/recommended/);
  });
});
