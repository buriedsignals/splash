import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    expect(text).toContain("newsroom-charter");
    expect(text).toContain("Something else — give me the two hex codes");
    expect(text).not.toMatch(/recommended/);
  });
});

// A LIMIT THE JOURNALIST CAN ACT ON BELONGS IN THE DOCUMENT THE JOURNALIST READS, not in a field
// only a caller sees — the rule `formatTypefaceProposal` already follows for `sampleLimit`. Round
// six, beat AD: the surface was known at gate 2b and the proposal never mentioned it, so a
// near-black full-bleed ground and a 2.20:1 accent were recommended for a printed page.
describe("formatProposal — the surface", () => {
  const HOUSE = {
    name: "Buried Signals",
    brandColor: "#D4A853",
    accents: "#5B8A8A",
    ground: "#16191B",
  };

  it("should print what was measured and what could not be, when no surface was stated", () => {
    const text = formatProposal(proposePalette({ newsroom: HOUSE, subject: "łóżka" }));
    expect(text).toContain("Where this lands");
    expect(text).toMatch(/NOT STATED/);
    expect(text).toContain('surface: "print"');
  });

  it("should print the sheet as the ground it measured on, for a print delivery", () => {
    const text = formatProposal(
      proposePalette({ newsroom: HOUSE, subject: "łóżka", surface: "print" }),
    );
    expect(text).toContain("Where this lands");
    expect(text).toMatch(/SHEET/);
    expect(text).toMatch(/FAILS the 3:1 floor/);
  });
});

describe("formatProposal — nothing to propose, said honestly", () => {
  it("should not claim the file is absent when nothing looked for it", () => {
    const text = formatProposal(proposePalette({ subject: "le prix du logement" }));
    expect(text).not.toContain("There is no `NEWSROOM.md`");
    expect(text).toContain("No newsroom profile was passed");
  });

  it("should name the complete NEWSROOM.md that was there all along", () => {
    const root = mkdtempSync(join(tmpdir(), "palette-fmt-"));
    try {
      writeFileSync(
        join(root, "NEWSROOM.md"),
        '---\nname: Buried Signals\nbrandColor: "#D4A853"\nground: "#16191B"\n---\n',
      );
      const text = formatProposal(
        proposePalette({ subject: "le prix du logement", from: root, stopAt: root }),
      );
      expect(text).toContain(join(root, "NEWSROOM.md"));
      expect(text).toContain("was not read");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
