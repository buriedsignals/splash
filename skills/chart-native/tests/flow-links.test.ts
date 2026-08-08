// The shared shape of the FLOW family — sankey, chord and arc all read this and nothing
// else, so every rule here is a rule for three types at once.
//
// MUTATION-VERIFIED, one break at a time (`git diff --stat` confirmed each edit landed;
// `git checkout --` restored between them):
//   · falling back to POSITIONAL roles when the headers are unknown (`const sCol = roleOf
//     .get("source") ?? parsed.columns[0]` and the same for target/value) — the one line
//     this file exists to keep out — reddened only "refuses a header outside the contract".
//   · `if (value <= 0)` → `if (value < 0)` reddened only the zero-value test.
//   · dropping the duplicate-pair check reddened only the duplicate test.
//   · `flowColumns` with `Math.min(...)` instead of `Math.max(...)` (shortest path) reddened
//     only "a node sits past the LONGEST path reaching it".
//   · `flowMatrix` writing `m[j][i]` (the transposition that silently reverses every flow)
//     reddened only the direction test.
//   · `flowNodes` returning a sorted set reddened only the first-appearance test.
import { describe, it, expect } from "bun:test";
import { parseCsv } from "../src/csv";
import {
  readFlowLinks,
  flowNodes,
  flowCycle,
  flowSelfLink,
  flowColumns,
  flowMatrix,
  flowTotals,
  FlowShapeError,
} from "../src/flow-links";

const links = (csv: string) => readFlowLinks(parseCsv(csv), "sankey");

const STAGED =
  "source,target,value\nWind,Grid,38\nGas,Grid,30\nGrid,Homes,40\nGrid,Industry,28";

describe("the link-list contract: what it accepts", () => {
  it("reads source,target,value in any column order", () => {
    expect(links("value,source,target\n38,Wind,Grid\n30,Gas,Grid")).toEqual([
      { source: "Wind", target: "Grid", value: 38 },
      { source: "Gas", target: "Grid", value: 30 },
    ]);
  });

  it("reads the same table with French, German and Italian headers", () => {
    const fr = links("source,cible,valeur\nGenève,Vaud,12400");
    const de = links("quelle,ziel,wert\nGenève,Vaud,12400");
    const it = links("origine,destinazione,valore\nGenève,Vaud,12400");
    const expected = [{ source: "Genève", target: "Vaud", value: 12400 }];
    expect(fr).toEqual(expected);
    expect(de).toEqual(expected);
    expect(it).toEqual(expected);
  });

  it("matches header names case- and whitespace-insensitively", () => {
    expect(links(" Source , Target , Value \nA,B,3")).toEqual([
      { source: "A", target: "B", value: 3 },
    ]);
  });
});

describe("the link-list contract: what it refuses, and by name", () => {
  it("refuses a header outside the contract instead of guessing positionally", () => {
    // The columns are in the RIGHT ORDER and of the right types — a positional reader would
    // sail through and draw a picture. Only the names are the newsroom's own.
    let err: unknown;
    try {
      links("pays,region,montant\nGenève,Vaud,12400");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(FlowShapeError);
    const msg = (err as Error).message;
    expect(msg).toContain("pays");
    expect(msg).toContain("region");
    expect(msg).toContain("montant");
    expect(msg).toContain("source, target, value");
    expect(msg).toContain("cible");
  });

  it("refuses a fourth column rather than silently collapsing the dimension it carries", () => {
    // `year` is exactly what makes two rows share a pair — dropping it would double-count.
    expect(() =>
      links("source,target,value,year\nA,B,3,2024\nA,B,4,2025"),
    ).toThrow(/"year" is not part of the flow contract/);
  });

  it("refuses a missing role, naming the columns it did get", () => {
    expect(() => links("source,value\nA,3")).toThrow(/no target column/);
  });

  it("refuses two columns claiming one role", () => {
    expect(() => links("source,quelle,target,value\nA,B,C,3")).toThrow(
      /both name the source/,
    );
  });

  it("refuses a non-numeric value, naming the row and the pair", () => {
    expect(() => links("source,target,value\nA,B,n/a")).toThrow(
      /row 1 \("A" → "B"\) has a non-numeric value "n\/a"/,
    );
  });

  it("refuses a zero or negative flow rather than drawing nothing for it", () => {
    expect(() => links("source,target,value\nA,B,3\nB,C,0")).toThrow(
      /row 2 \("B" → "C"\) has value 0/,
    );
    expect(() => links("source,target,value\nA,B,-5")).toThrow(/has value -5/);
  });

  it("refuses two rows describing one pair, naming both rows", () => {
    expect(() => links("source,target,value\nA,B,3\nC,D,1\nA,B,4")).toThrow(
      /rows 1 and 3 both describe "A" → "B"/,
    );
  });

  it("refuses a link with an unnamed end", () => {
    expect(() => links("source,target,value\nA,,3")).toThrow(
      /row 1 has an empty target/,
    );
  });
});

describe("the derivations every mark sits on are stable, never random", () => {
  it("orders nodes by FIRST APPEARANCE — the order the journalist's own rows fix", () => {
    expect(flowNodes(links(STAGED))).toEqual([
      "Wind",
      "Grid",
      "Gas",
      "Homes",
      "Industry",
    ]);
    // …and reordering the rows reorders the nodes, which is the point: for `arc`, this IS
    // the editorial choice, and it is one the journalist makes in their spreadsheet.
    expect(
      flowNodes(links("source,target,value\nGas,Grid,30\nWind,Grid,38")),
    ).toEqual(["Gas", "Grid", "Wind"]);
  });

  it("is a pure function of the CSV — two reads give an identical picture", () => {
    const a = links(STAGED);
    const b = links(STAGED);
    expect(flowNodes(a)).toEqual(flowNodes(b));
    expect([...flowColumns(a)]).toEqual([...flowColumns(b)]);
    expect(flowMatrix(a, flowNodes(a))).toEqual(flowMatrix(b, flowNodes(b)));
  });

  it("totals each node's in and out flow", () => {
    const t = flowTotals(links(STAGED));
    expect(t.in.get("Grid")).toBe(68);
    expect(t.out.get("Grid")).toBe(68);
    expect(t.in.get("Wind")).toBeUndefined();
  });
});

describe("the stage layering a sankey draws in columns", () => {
  it("puts a node with no incoming link in column 0 and each other one stage past its feed", () => {
    const cols = flowColumns(links(STAGED));
    expect(cols.get("Wind")).toBe(0);
    expect(cols.get("Gas")).toBe(0);
    expect(cols.get("Grid")).toBe(1);
    expect(cols.get("Homes")).toBe(2);
  });

  it("a node sits past the LONGEST path reaching it, so no ribbon ever points backwards", () => {
    // Homes is fed BOTH directly by Wind (which would put it in column 1) and through the
    // Grid (column 2). The shortest-path answer draws the Grid→Homes ribbon right-to-left.
    const cols = flowColumns(
      links("source,target,value\nWind,Grid,38\nGrid,Homes,30\nWind,Homes,8"),
    );
    expect(cols.get("Homes")).toBe(2);
    expect(cols.get("Homes")!).toBeGreaterThan(cols.get("Grid")!);
  });
});

describe("cycles and self-links — the shapes a flow cannot be", () => {
  it("finds a directed cycle and returns the path that closes it", () => {
    const c = flowCycle(links("source,target,value\nA,B,3\nB,C,2\nC,A,1"));
    expect(c).toEqual(["A", "B", "C", "A"]);
  });

  it("finds no cycle in a staged flow", () => {
    expect(flowCycle(links(STAGED))).toBeNull();
  });

  it("reports a self-link as its own link, and as a one-node cycle", () => {
    const l = links("source,target,value\nA,A,3\nA,B,2");
    expect(flowSelfLink(l)).toEqual({ source: "A", target: "A", value: 3 });
    expect(flowCycle(l)).toEqual(["A", "A"]);
  });
});

describe("the matrix a chord draws", () => {
  it("puts the flow at [from][to] — the transposition that reverses a picture", () => {
    const l = links(
      "source,target,value\nRiverside,Hillcrest,32\nHillcrest,Riverside,30",
    );
    const labels = ["Riverside", "Hillcrest"];
    expect(flowMatrix(l, labels)).toEqual([
      [0, 32],
      [30, 0],
    ]);
  });

  it("leaves an absent pair at zero", () => {
    const l = links("source,target,value\nA,B,3");
    expect(flowMatrix(l, ["A", "B", "C"])).toEqual([
      [0, 3, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });
});
