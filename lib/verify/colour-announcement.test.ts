import { describe, expect, it } from "bun:test";
import { announcedColourFindings } from "./colour-announcement";

describe("the colour-semantics criterion finally has an emitter", () => {
  it("files a warning for a house colour outside the accessible set, with the way out", () => {
    const f = announcedColourFindings({
      concerns: [
        {
          kind: "cvd",
          colour: "#2E7D57",
          reason: "outside the Okabe-Ito set",
          nearestAccessible: "#009E73",
        },
      ],
    });
    expect(f).toHaveLength(1);
    expect(f[0]!.criterion).toBe("colour-semantics");
    expect(f[0]!.severity).toBe("warning"); // shipped, not blocked (D25)
    expect(f[0]!.evidence.join(" ")).toContain("#009E73");
  });

  it("files a warning when a colour was announced that the type does not paint", () => {
    const f = announcedColourFindings({
      concerns: [],
      announced: "#CC79A7",
      honoured: false,
    });
    expect(f).toHaveLength(1);
    expect(f[0]!.evidence.join(" ")).toContain("#CC79A7");
  });

  it("says nothing when the announcement and the render agree", () => {
    expect(
      announcedColourFindings({
        concerns: [],
        announced: "#CC79A7",
        honoured: true,
      }),
    ).toEqual([]);
  });
});
