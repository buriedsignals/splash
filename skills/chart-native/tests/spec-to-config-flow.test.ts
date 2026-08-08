// The FLOW family's mappers: one link list in, three different pictures out — and three
// different refusals, which are the part worth testing. All three forms can be DRAWN from any
// link list; two of the three drawings would be wrong, and nothing in the data says which.
//
// These run through `specToNativeConfig`, not the mappers directly, because that is the path
// the gate takes: `nativeSpecErrors` calls it and returns the thrown message verbatim to the
// journalist (manifest.ts → validate-gate.ts). A refusal that is not reachable from here is a
// refusal nobody ever reads.
//
// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed;
// `git checkout --` restored between them):
//   · deleting the `flowCycle` guard in the sankey mapper → only the cycle tests red; the
//     config it then produced put the looping node in a column BEFORE its own feeder.
//   · `SANKEY_CONSERVATION_TOLERANCE` 0.005 → 1 (i.e. anything goes) → only the conservation
//     tests red.
//   · dropping the `rampNodes` ceiling (`origins.length <= SANKEY_MAX_RAMP_NODES ? … : []`,
//     replaced by `origins`) → only the seven-origins test red, and the produce guard's own
//     "> 6 ribbon colours" violation fired underneath it.
//   · deleting the chord `!flowCycle(links)` guard → only the staged-pipeline test red (and
//     the produce guard's own matrix-level twin fired underneath it).
//   · chord ordering by `nodes.indexOf` instead of by total → only the ring-order test red.
//   · deleting the arc `flowSelfLink` guard → only the self-link test red.
//   · `ARC_MAX_NODES` 14 → 99 → only the crowded-baseline test red.
import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";
import { runProduceConformance } from "../src/core/produce-conformance";

const spec = (nativeType: string, data: string): NativeSpec => ({
  nativeType,
  title: "Le réseau redistribue tout ce que les cinq sources y injectent",
  unit: "part de l'électricité, 2025 (% du total)",
  source: { name: "Office fédéral de l'énergie" },
  data,
  lang: "fr",
  altInsight: "L'éolien fournit 38 % de l'électricité du réseau, le gaz 30 %.",
});

const cfg = (nativeType: string, data: string) =>
  specToNativeConfig(spec(nativeType, data)).config as Record<string, any>;

const STAGED =
  "source,target,value\n" +
  "Éolien,Réseau,38\nGaz,Réseau,30\nSolaire,Réseau,16\n" +
  "Réseau,Ménages,40\nRéseau,Industrie,28\nRéseau,Services,16";

// ---------------------------------------------------------------------------- SANKEY
describe("sankey — a quantity through stages", () => {
  it("lays the origins in stage 0, the hub in 1 and the destinations in 2", () => {
    const c = cfg("sankey", STAGED);
    const col = Object.fromEntries(
      (c.nodes as any[]).map((n) => [n.id, n.column]),
    );
    expect(col["Éolien"]).toBe(0);
    expect(col["Réseau"]).toBe(1);
    expect(col["Ménages"]).toBe(2);
    expect(c.links).toHaveLength(6);
  });

  it("orders each stage by the quantity through it, largest first — derived, never random", () => {
    const c = cfg("sankey", STAGED);
    const stage0 = (c.nodes as any[])
      .filter((n) => n.column === 0)
      .map((n) => n.id);
    expect(stage0).toEqual(["Éolien", "Gaz", "Solaire"]);
    // …and the same CSV read twice gives the identical picture.
    expect(cfg("sankey", STAGED).nodes).toEqual(c.nodes);
  });

  it("colours the ORIGINS so a ribbon is traceable, and nothing downstream", () => {
    const c = cfg("sankey", STAGED);
    expect(c.rampNodes).toEqual(["Éolien", "Gaz", "Solaire"]);
    const hub = (c.nodes as any[]).find((n) => n.id === "Réseau");
    expect(hub.category).toBeUndefined();
  });

  it("goes fully neutral past six origins rather than giving two of them one hue", () => {
    const seven = [
      "source,target,value",
      ...["A", "B", "C", "D", "E", "F", "G"].map((n) => `${n},Hub,10`),
      "Hub,Out,70",
    ].join("\n");
    const c = cfg("sankey", seven);
    expect(c.rampNodes).toEqual([]);
    expect((c.nodes as any[]).every((n) => n.category === undefined)).toBe(
      true,
    );
    // and the guard on the produced config agrees there is no over-long ramp
    expect(runProduceConformance("sankey", c).violations).toEqual([]);
  });

  it("REFUSES a cycle, naming the loop and offering the two repairs", () => {
    let msg = "";
    try {
      cfg(
        "sankey",
        "source,target,value\nRéseau,Stockage,12\nStockage,Réseau,10\nRéseau,Ménages,40",
      );
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain("loops back on itself");
    expect(msg).toContain("Réseau → Stockage → Réseau");
    expect(msg).toContain("chord");
  });

  it("REFUSES a self-link the same way (the one-node case of the same fact)", () => {
    expect(() =>
      cfg("sankey", "source,target,value\nRéseau,Réseau,5\nRéseau,Ménages,40"),
    ).toThrow(/loops back on itself/);
  });

  it("REFUSES a stage that loses quantity — the error the picture cannot show", () => {
    // The hub takes 84 and passes on 60. The geometry would draw it solid at 84, with thinner
    // ribbons leaving: a fifth of the quantity gone, and nothing on screen saying so.
    let msg = "";
    try {
      cfg(
        "sankey",
        "source,target,value\nÉolien,Réseau,38\nGaz,Réseau,46\nRéseau,Ménages,40\nRéseau,Industrie,20",
      );
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('"Réseau" does not conserve the flow');
    expect(msg).toContain("84");
    expect(msg).toContain("60");
    expect(msg).toContain("Losses");
  });

  it("…and the explicit loss node is the repair, so it produces", () => {
    const c = cfg(
      "sankey",
      "source,target,value\nÉolien,Réseau,38\nGaz,Réseau,46\n" +
        "Réseau,Ménages,40\nRéseau,Industrie,20\nRéseau,Pertes,24",
    );
    expect((c.nodes as any[]).map((n) => n.id)).toContain("Pertes");
    expect(runProduceConformance("sankey", c).violations).toEqual([]);
  });

  it("tolerates a rounding crumb, since real flow tables are rounded", () => {
    // 33.3 + 33.3 + 33.3 = 99.9 out of 100 in — 0.1 %, under the half-percent tolerance.
    expect(() =>
      cfg(
        "sankey",
        "source,target,value\nTotal,Réseau,100\nRéseau,A,33.3\nRéseau,B,33.3\nRéseau,C,33.3",
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------- CHORD
// Deliberately NOT in size order: the smallest pair is written first, so a ring ordered by the
// rows' own sequence and a ring ordered by total come out different — which is what makes the
// ordering test able to fail.
const EXCHANGE =
  "source,target,value\n" +
  "Eastgate,Northbank,18\nNorthbank,Eastgate,16\n" +
  "Riverside,Hillcrest,32\nHillcrest,Riverside,30\nRiverside,Eastgate,12";

describe("chord — exchange within one set", () => {
  it("puts each flow at [from][to], the transposition that would reverse the picture", () => {
    const c = cfg("chord", EXCHANGE);
    const i = (c.labels as string[]).indexOf("Riverside");
    const j = (c.labels as string[]).indexOf("Hillcrest");
    expect(c.matrix[i][j]).toBe(32);
    expect(c.matrix[j][i]).toBe(30);
  });

  it("orders the ring by total, largest first — derived and stable", () => {
    const c = cfg("chord", EXCHANGE);
    expect(c.labels).toEqual([
      "Riverside", // 32+12 out, 30 in = 74
      "Hillcrest", // 30 out, 32 in = 62
      "Eastgate", // 18 out, 16+12 in = 46
      "Northbank", // 16 out, 18 in = 34
    ]);
    expect(cfg("chord", EXCHANGE).labels).toEqual(c.labels);
  });

  it("REFUSES a staged pipeline — the ring is one set, not two", () => {
    let msg = "";
    try {
      cfg("chord", STAGED);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain("nothing in this table flows BOTH WAYS");
    expect(msg).toContain("sankey");
  });

  it("…and the produce guard says the same of a hand-built staged matrix", () => {
    // The gate refusal is only half: a config assembled by hand never passes through the
    // mapper. The matrix-level twin reads the same fact off what actually renders.
    const staged = {
      ...cfg("chord", EXCHANGE),
      labels: ["Source", "Hub", "Sink"],
      matrix: [
        [0, 10, 0],
        [0, 0, 10],
        [0, 0, 0],
      ],
    };
    expect(runProduceConformance("chord", staged).violations.join(" ")).toContain(
      "flows both ways",
    );
  });

  it("REFUSES more than eight entities, naming them and the repair", () => {
    const nine = [
      "source,target,value",
      ...["B", "C", "D", "E", "F", "G", "H", "I"].map((n) => `A,${n},5`),
      "B,A,4",
    ].join("\n");
    let msg = "";
    try {
      cfg("chord", nine);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain("9 entities");
    expect(msg).toContain('"Other"');
  });
});

// ---------------------------------------------------------------------------- ARC
const SPECTRUM =
  "source,target,value\n" +
  "Les Verts,POP,14\nPOP,PS,9\nPS,PLR,18\nPLR,UDC,8\nUDC,PDC,12\nLes Verts,PS,6";

describe("arc — relationships along one ordered axis", () => {
  it("takes the baseline order from the journalist's own rows, left to right", () => {
    const c = cfg("arc", SPECTRUM);
    expect((c.nodes as any[]).map((n) => n.id)).toEqual([
      "Les Verts",
      "POP",
      "PS",
      "PLR",
      "UDC",
      "PDC",
    ]);
    // …so reordering the spreadsheet reorders the axis, and nothing else does.
    const flipped = cfg(
      "arc",
      "source,target,value\nPDC,UDC,12\nUDC,PLR,8\nPLR,PS,18",
    );
    expect((flipped.nodes as any[]).map((n) => n.id)).toEqual([
      "PDC",
      "UDC",
      "PLR",
      "PS",
    ]);
  });

  it("declares no groups — a link list names links, never a node's bloc", () => {
    const c = cfg("arc", SPECTRUM);
    expect((c.nodes as any[]).every((n) => n.group === undefined)).toBe(true);
  });

  it("keeps a cycle: an arc is undirected, so going round is not an error", () => {
    expect(() =>
      cfg("arc", "source,target,value\nA,B,3\nB,C,2\nC,A,1"),
    ).not.toThrow();
  });

  it("REFUSES a self-link — it would have no width and vanish silently", () => {
    let msg = "";
    try {
      cfg("arc", "source,target,value\nPS,PS,4\nPS,PLR,18");
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('"PS" links to itself');
    expect(msg).toContain("vanish");
    expect(msg).toContain("chord");
  });

  it("REFUSES a baseline crowded past what can be labelled", () => {
    const many = [
      "source,target,value",
      ...Array.from({ length: 15 }, (_, i) => `N${i},N${i + 1},5`),
    ].join("\n");
    expect(() => cfg("arc", many)).toThrow(/nodes on one baseline/);
  });

  it("…and refuses FEWER nodes when the names themselves are too long", () => {
    // The count is only the ceiling. Whether THESE names fit is a layout fact, measured on the
    // baseline the component draws: fourteen "N0"s are fine and ten long party names are not.
    // Both are refused at the GATE, where the journalist can still change the table — the
    // produce guard re-measures the same thing on the artifact, through the same function.
    const long = (n: number) =>
      [
        "source,target,value",
        ...Array.from(
          { length: n - 1 },
          (_, i) => `Sozialdemokratische Partei ${i},Sozialdemokratische Partei ${i + 1},5`,
        ),
      ].join("\n");
    const short = (n: number) =>
      [
        "source,target,value",
        ...Array.from({ length: n - 1 }, (_, i) => `N${i},N${i + 1},5`),
      ].join("\n");
    expect(() => cfg("arc", short(14))).not.toThrow();
    let msg = "";
    try {
      cfg("arc", long(10));
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain("names this long cannot be labelled");
    expect(msg).toContain("Sozialdemokratische Partei");
    expect(msg).toMatch(/needs \d+px and the baseline leaves \d+px/);
    // …and it is genuinely about the NAMES, not the count: same ten nodes, short names, fine.
    expect(() => cfg("arc", short(10))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------- SHARED
describe("all three read the SAME table, and refuse the same non-tables", () => {
  for (const type of ["sankey", "chord", "arc"]) {
    it(`${type} refuses a newsroom's own column names rather than reading them positionally`, () => {
      expect(() => cfg(type, "de,vers,montant\nA,B,3\nB,A,2")).toThrow(
        /not part of the flow contract/,
      );
    });

    it(`${type} refuses a table that is not a link list at all`, () => {
      // The shape gate fires before the mapper: two columns is a category+value CSV.
      expect(() => cfg(type, "commune,valeur\nGenève,12\nVaud,9")).toThrow(
        /expects a flow CSV/,
      );
    });
  }
});
