/**
 * TWO COPIES OF ONE REVEAL, held byte-identical.
 *
 * A route beat draws its line by RE-GENERATING the path from the samples the reader has reached —
 * `chart-video`'s own mechanism, carried back into `scrolly` on 2026-08-20. It replaced a dash whose
 * offset ran to zero, which is correct only while the pattern is computed in the space the path's
 * length lives in; a camera scale moves that space, and the beat where that happened took six hours
 * and five wrong diagnoses to diagnose. Re-generating the path cannot have the defect: there is no
 * pattern to compute in the wrong space, and no `pathLength={1}` discipline for a future author to
 * remember.
 *
 * WHY A COPY AND NOT AN IMPORT, since this tree already carries `#shared/*` for exactly that. A
 * scrolly's driver is INLINED INTO THE DELIVERED PAGE AS SOURCE TEXT — that is what makes the page
 * self-contained, which is the vehicle's whole contract — so it cannot import anything at runtime.
 * A copy is the only shape available, and an unwalked copy is the silent divergence copies are
 * supposed to be paying for.
 *
 * Nothing in these three declarations is beat-specific: no path, no data, no threshold. A copy that
 * differs at all differs by accident. The doc comments are compared too, because they carry the
 * defect that earned the mechanism, and a copy that kept the code and dropped the reasoning is a
 * rule the next author will delete.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/** The beats whose reveal this is. Discovered would be better; there is no attribute to discover on
 *  — so the list is named here, and `route-reveal-is-not-a-dash` below is what catches a THIRD beat
 *  that reveals a route without joining it. */
const DRIVERS = [
  "proof/mapmore-scrolly-danube/route-drive.mjs",
  "proof/mapmore-scrolly-route-access/route-drive.mjs",
];

/** A declaration's doc comment and body, as written. */
function declaration(
  source: string,
  name: string,
  kind: "const" | "function",
): string {
  const at =
    kind === "const"
      ? source.indexOf(`const ${name} =`)
      : source.indexOf(`export function ${name}(`);
  expect(`declares ${name}: ${at >= 0}`).toBe(`declares ${name}: true`);
  const comment = source.lastIndexOf("/**", at);
  const end =
    kind === "const"
      ? source.indexOf("\n", at)
      : source.indexOf("\n}\n", at) + 2;
  return source.slice(comment, end);
}

describe("every route reveal in this tree is the same reveal", () => {
  const sources = DRIVERS.map((path) => ({
    path,
    text: readFileSync(join(TWIN, path), "utf8"),
  }));

  for (const [name, kind] of [
    ["at1", "const"],
    ["routePath", "function"],
    ["drawnSoFar", "function"],
  ] as const) {
    it(`carries one ${name}, byte for byte`, () => {
      const [first, ...rest] = sources;
      const canonical = declaration(first.text, name, kind);
      // Non-vacuity: a declaration this reader failed to find would compare "" to "" and pass.
      expect(canonical.length).toBeGreaterThan(200);
      for (const other of rest)
        expect(`${other.path}\n${declaration(other.text, name, kind)}`).toBe(
          `${other.path}\n${canonical}`,
        );
    });
  }

  it("reveals by redrawing, with no dash left in any of them", () => {
    for (const { path, text } of sources) {
      // The attribute, not the word: every one of these files DISCUSSES the dash it replaced, at
      // length and on purpose, so a text search for "dash" would fail on its own history.
      const code = text
        .split("\n")
        .filter((line) => !/^\s*(\*|\/\/)/.test(line))
        .join("\n");
      expect(
        `${path}: ${/strokeDashoffset|stroke-dashoffset/.test(code)}`,
      ).toBe(`${path}: false`);
    }
  });

  it("draws the same picture in both, on the same uneven route", () => {
    // The property that makes these one decision and not two functions that agree today: given the
    // same samples and the same cumulative lengths, both return the same points — including the cut
    // through the middle of a long segment, which is where an index walk and a length walk differ.
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [9, 0],
      [10, 0],
    ];
    const cum = [0, 0.1, 0.9, 1];
    const drawn = sources.map(async ({ path }) => {
      const module = await import(join(TWIN, path));
      return module.routePath(module.drawnSoFar(points, cum, 0.5));
    });
    return Promise.all(drawn).then((paths) => {
      expect(paths[0]).toBe("M0 0L1 0L5 0");
      for (const path of paths) expect(path).toBe(paths[0]);
    });
  });
});
