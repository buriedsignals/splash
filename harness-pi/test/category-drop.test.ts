import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error untyped kit module
import { assertNoCategoryDropped } from "../craft/_shared/guards.mjs";

const rows = [
  ["France", "Nuclear", 60000],
  ["France", "Hydro", 25000],
  ["France", "Solar", 12000],
  ["United Kingdom", "Nuclear", 9000],
  ["United Kingdom", "Wind", 40000],
  ["Germany", "Nuclear", 12000],
  ["Germany", "Solar", 23000],
  ["Spain", "Nuclear", 7000],
  ["Spain", "Wind", 32000],
  ["Norway", "Hydro", 31000],
];

function story(subject: string) {
  const root = mkdtempSync(join(tmpdir(), "category-drop-"));
  const here = join(root, "beats", "1");
  mkdirSync(here, { recursive: true });
  writeFileSync(
    join(root, "STORYBOARD.md"),
    `---\nsubject: "${subject}"\nclaimColumn: capacity_mw\n---\n`,
  );
  writeFileSync(
    join(here, "data.json"),
    JSON.stringify({
      columns: [
        { name: "country", type: "text" },
        { name: "fuel", type: "text" },
        { name: "capacity_mw", type: "number" },
      ],
      rows,
    }),
  );
  return here;
}

const sums = (skip: string) => {
  const by = new Map<string, number>();
  for (const [c, f, v] of rows)
    if (f !== skip)
      by.set(c as string, (by.get(c as string) ?? 0) + (v as number));
  return [...by].map(([name, value]) => ({ name, value }));
};

// gx-proportional-symbol web (12B, 2026-11-14): the beat listed six low-carbon fuels without Nuclear, under a
// storyboard whose subject names the nuclear plants — France drew 34 GW where data.json holds 97.
describe("assertNoCategoryDropped", () => {
  it("should refuse symbols that leave out every row of one category", () => {
    expect(() =>
      assertNoCategoryDropped(
        sums("Nuclear"),
        story("Les grandes centrales, et le nucléaire"),
        "",
      ),
    ).toThrow(/fuel "Nuclear"/);
  });

  it("should name the drawn and the held total of one place in the refusal", () => {
    expect(() =>
      assertNoCategoryDropped(
        sums("Nuclear"),
        story("Les grandes centrales"),
        "",
      ),
    ).toThrow(/France draws 37000 where data\.json holds 97000/);
  });

  it("should pass symbols that sum every row", () => {
    expect(() =>
      assertNoCategoryDropped(sums(""), story("Les grandes centrales"), ""),
    ).not.toThrow();
  });

  it("should pass symbols drawn at another power of ten", () => {
    const gw = sums("").map((s) => ({ ...s, value: s.value / 1000 }));
    expect(() =>
      assertNoCategoryDropped(gw, story("Les grandes centrales"), ""),
    ).not.toThrow();
  });

  it("should pass a left-out category the plate states when the subject does not name it", () => {
    expect(() =>
      assertNoCategoryDropped(
        sums("Nuclear"),
        story("Les renouvelables"),
        "hors nucléaire",
      ),
    ).not.toThrow();
  });

  it("should refuse a stated left-out category the subject names", () => {
    expect(() =>
      assertNoCategoryDropped(
        sums("Nuclear"),
        story("Les centrales, et le nucléaire"),
        "hors nucléaire",
      ),
    ).toThrow(/subject names it/);
  });

  it("should refuse nameless symbols whose total leaves out one category", () => {
    const nameless = rows.filter((r) => r[1] !== "Nuclear").map((r) => ({ value: r[2] as number }));
    expect(() => assertNoCategoryDropped(nameless, story("Les grandes centrales"), "")).toThrow(/fuel "Nuclear"/);
  });
});
