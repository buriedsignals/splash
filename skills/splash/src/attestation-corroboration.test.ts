import { describe, it, expect } from "bun:test";
import {
  corroborateAttestation,
  attestationRefusal,
  attestationWarnings,
  ATTESTATION_EVIDENCE,
} from "./attestation-corroboration";
import type { AcceptedProposal } from "./producer-spec";

function proposal(over: Partial<AcceptedProposal> = {}): AcceptedProposal {
  return {
    id: "p1",
    producer: "chart-native",
    format: "static",
    confirmedTakeaway: "t",
    spec: {},
    ...over,
  } as AcceptedProposal;
}

/** A fake disk: the set of file names the run directory holds. */
function disk(...names: string[]) {
  const held = new Set(names.map((n) => `/run/${n}`));
  return (p: string) => held.has(p);
}

describe("corroborateAttestation — what the attestation claims, against what the run directory holds", () => {
  it("reports a claim whose artifact is on disk as corroborated", () => {
    const c = corroborateAttestation(
      "/run",
      [proposal({ skillsInvoked: ["splash:cadrage-guided", "suggest-chart"] })],
      disk("candidates.json"),
    );
    expect(c.claimed).toEqual(["suggest-chart"]);
    expect(c.corroborated).toEqual(["suggest-chart"]);
    expect(c.uncorroborated).toEqual([]);
  });

  it("reports a claim whose artifact is absent as uncorroborated", () => {
    const c = corroborateAttestation(
      "/run",
      [
        proposal({
          skillsInvoked: ["splash:cadrage-direct", "suggest-article"],
        }),
      ],
      disk(),
    );
    expect(c.claimed).toEqual(["suggest-article"]);
    expect(c.corroborated).toEqual([]);
    expect(c.uncorroborated).toEqual(["suggest-article"]);
  });

  it("ignores tokens no artifact can corroborate — a branch declaration claims no sub-skill", () => {
    const c = corroborateAttestation(
      "/run",
      [proposal({ skillsInvoked: ["splash:cadrage-direct"] })],
      disk(),
    );
    expect(c.claimed).toEqual([]);
  });

  it("is RUN-level: claims from every proposal are pooled, deduped and sorted", () => {
    const c = corroborateAttestation(
      "/run",
      [
        proposal({
          id: "a",
          skillsInvoked: ["suggest-chart", "suggest-chart"],
        }),
        proposal({ id: "b", skillsInvoked: ["suggest-article"] }),
      ],
      disk("candidates.json"),
    );
    expect(c.claimed).toEqual(["suggest-article", "suggest-chart"]);
    expect(c.corroborated).toEqual(["suggest-chart"]);
    expect(c.uncorroborated).toEqual(["suggest-article"]);
  });

  it("survives an attestation that is not an array (accepted.json is untyped JSON)", () => {
    const c = corroborateAttestation(
      "/run",
      [proposal({ skillsInvoked: "suggest-chart" as unknown as string[] })],
      disk(),
    );
    expect(c.claimed).toEqual([]);
  });
});

describe("attestationRefusal — a claim with NOTHING on disk behind it did not walk this pipeline", () => {
  it("refuses when sub-skills are claimed and not one of their artifacts exists", () => {
    const r = attestationRefusal(
      corroborateAttestation(
        "/run",
        [
          proposal({
            skillsInvoked: [
              "splash:cadrage-direct",
              "suggest-article",
              "suggest-chart",
            ],
          }),
        ],
        disk(),
      ),
    );
    expect(r).not.toBeNull();
    // It names the claims AND the artifacts they owed — a refusal that only says "no" is a wall.
    expect(r!.message).toContain("suggest-article");
    expect(r!.message).toContain("suggest-chart");
    expect(r!.message).toContain("opportunities.json");
    expect(r!.message).toContain("candidates.json");
    expect(r!.route).not.toBeNull();
  });

  it("does NOT refuse when at least one claim is corroborated — the run is walking the pipeline", () => {
    expect(
      attestationRefusal(
        corroborateAttestation(
          "/run",
          [
            proposal({
              skillsInvoked: ["suggest-article", "suggest-chart"],
            }),
          ],
          disk("candidates.json"),
        ),
      ),
    ).toBeNull();
  });

  it("does NOT refuse a run that claims no sub-skill at all — the journalist-named bare-topic run", () => {
    expect(
      attestationRefusal(
        corroborateAttestation(
          "/run",
          [proposal({ skillsInvoked: ["splash:cadrage-direct"] })],
          disk(),
        ),
      ),
    ).toBeNull();
  });

  it("does NOT refuse a legacy proposal carrying no attestation at all", () => {
    expect(
      attestationRefusal(corroborateAttestation("/run", [proposal()], disk())),
    ).toBeNull();
  });
});

describe("attestationWarnings — a partial gap is surfaced, never silent and never fatal", () => {
  it("names the artifact a corroborated run still owes", () => {
    const w = attestationWarnings(
      corroborateAttestation(
        "/run",
        [proposal({ skillsInvoked: ["suggest-article", "suggest-chart"] })],
        disk("candidates.json"),
      ),
    );
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("suggest-article");
    expect(w[0]).toContain("opportunities.json");
  });

  it("says nothing when every claim is corroborated", () => {
    expect(
      attestationWarnings(
        corroborateAttestation(
          "/run",
          [proposal({ skillsInvoked: ["suggest-article", "suggest-chart"] })],
          disk("candidates.json", "opportunities.json"),
        ),
      ),
    ).toEqual([]);
  });

  it("says nothing when NOTHING is corroborated — that case is the refusal above, not a warning", () => {
    expect(
      attestationWarnings(
        corroborateAttestation(
          "/run",
          [proposal({ skillsInvoked: ["suggest-article"] })],
          disk(),
        ),
      ),
    ).toEqual([]);
  });
});

describe("the evidence table", () => {
  it("names, for every corroborable skill, one artifact and the writer that leaves it", () => {
    expect(ATTESTATION_EVIDENCE.length).toBeGreaterThan(0);
    for (const e of ATTESTATION_EVIDENCE) {
      expect(e.skill.length).toBeGreaterThan(0);
      expect(e.artifact.endsWith(".json")).toBe(true);
      expect(e.writes.length).toBeGreaterThan(0);
    }
  });
});
