/**
 * A DIRECTION'S COLOUR IS EITHER IN ITS REFERENCE OR DECLARED AS A CHOICE. NEVER NEITHER.
 *
 * THE DEFECT THIS CLOSES, found on 2026-09-08 while auditing the filed directions against records
 * the harvester repair had corrected. Two of the three take a colour the reference does not
 * contain: `rapport` is grounded on `#FFFFFF` where its ProPublica map sits on `#E1E4E6`, and takes
 * an accent a step deeper than the reference's own pale unit blue; `nocturne` takes a luminous mint
 * the Pudding piece does not carry.
 *
 * Both are legitimate design acts, and — to their authors' credit — both said so in a paragraph. So
 * nothing false was ever claimed. What was wrong is that the claim lived only in PROSE: no reader
 * could count how much of the palette was measured and how much was decided, and no test could tell
 * a deliberate choice from a colour that had drifted away from its evidence. When the harvester was
 * repaired and every palette changed, the two cases were indistinguishable until a person read three
 * files and compared them by hand.
 *
 * So the source is now data. Absent, a colour is claimed as MEASURED and this test requires the
 * reference to contain it. `chosen` says a person decided it, and the record is not asked to.
 *
 * Note what this deliberately does NOT do: it does not forbid a chosen colour. A direction that took
 * only what its reference contains would be a copy, and the base exists to compose, not to trace.
 * It forbids a chosen colour that does not say it was chosen.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  readDirection,
  readDirectionFromMarkdown,
} from "../../../scripts/design-base/read-direction.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const BASE = join(ROOT, "docs", "design-base");
const DIRECTIONS = join(BASE, "directions");
const REFS = join(BASE, "references");

const SOURCES = ["measured", "chosen"];

const dirsIn = (p: string) =>
  existsSync(p)
    ? readdirSync(p).filter((n) => statSync(join(p, n)).isDirectory())
    : [];

/** Every reference's measured palette, keyed by id: its ground, and every colour it carries. */
function palettes(): Map<
  string,
  { ground: string | null; colours: Set<string> }
> {
  const out = new Map();
  for (const family of dirsIn(REFS))
    for (const id of dirsIn(join(REFS, family))) {
      const path = join(REFS, family, id, "measured.json");
      if (!existsSync(path)) continue;
      const record = JSON.parse(readFileSync(path, "utf8"));
      const colours = new Set<string>();
      for (const c of [
        ...(record.pixel?.chromatic ?? []),
        ...(record.pixel?.neutral ?? []),
      ])
        colours.add(String(c.hex).toUpperCase());
      out.set(id, {
        ground: record.pixel?.ground?.hex
          ? String(record.pixel.ground.hex).toUpperCase()
          : null,
        colours,
      });
    }
  return out;
}

function directions() {
  if (!existsSync(DIRECTIONS)) return [];
  return readdirSync(DIRECTIONS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ file: f, direction: readDirection(join(DIRECTIONS, f)) }));
}

describe("every filed direction", () => {
  it("should declare, for its ground and its accent, whether it was measured or chosen", () => {
    for (const { file, direction } of directions()) {
      expect(SOURCES, `${file} groundSource`).toContain(direction.groundSource);
      expect(SOURCES, `${file} accentSource`).toContain(direction.accentSource);
    }
  });

  it("should be able to point at a measured ground in its own reference", () => {
    // Findings are COLLECTED, not thrown one at a time. A loop that throws on its first failure
    // reports one direction and hides the rest, which is how the first run of this guard showed
    // `rapport` twice and never reached `nocturne` at all.
    const known = palettes();
    const findings: string[] = [];
    for (const { file, direction } of directions()) {
      if (direction.groundSource !== "measured") continue;
      const reference = known.get(direction.measuredFrom);
      if (!reference) {
        findings.push(`${file} cites ${direction.measuredFrom}, which is not in the corpus`);
        continue;
      }
      if (reference.ground !== String(direction.ground).toUpperCase())
        findings.push(
          `${file} claims a MEASURED ground of ${direction.ground}, but ${direction.measuredFrom} ` +
            `was measured on ${reference.ground} — either the direction drifted from its evidence, ` +
            `or the ground is a choice and the record should say "groundSource: chosen"`,
        );
    }
    expect(findings).toEqual([]);
  });

  it("should be able to point at a measured accent in its own reference", () => {
    const known = palettes();
    const findings: string[] = [];
    for (const { file, direction } of directions()) {
      if (direction.accentSource !== "measured") continue;
      const reference = known.get(direction.measuredFrom);
      if (!reference) {
        findings.push(`${file} cites ${direction.measuredFrom}, which is not in the corpus`);
        continue;
      }
      if (!reference.colours.has(String(direction.accent).toUpperCase()))
        findings.push(
          `${file} claims a MEASURED accent of ${direction.accent}, which ` +
            `${direction.measuredFrom} does not carry — either the direction drifted from its ` +
            `evidence, or the accent is a choice and the record should say "accentSource: chosen"`,
        );
    }
    expect(findings).toEqual([]);
  });

  it("should say in prose why, wherever it chose rather than measured", () => {
    // A one-word field is enough for a machine and not enough for the next designer. The paragraph
    // is what tells them whether the choice can be revisited.
    for (const { file, direction } of directions()) {
      if (
        direction.groundSource === "measured" &&
        direction.accentSource === "measured"
      )
        continue;
      const text = readFileSync(join(DIRECTIONS, file), "utf8");
      expect(
        /## Ground and accent/.test(text),
        `${file} chose a colour and carries no "Ground and accent" section explaining it`,
      ).toBe(true);
    }
  });
});

/**
 * THE DEFAULT IS THE WHOLE RULE, and it is invisible in the corpus.
 *
 * Every filed direction now states its two sources explicitly, so nothing on disk exercises what
 * happens when a record says nothing — and a parser that quietly defaulted to `chosen` would switch
 * the guard above off for every future direction while all three existing ones still passed. That
 * mutation was run and stayed green. This is what catches it.
 *
 * Silence must mean MEASURED, never `chosen`: a default that excuses a colour from its evidence is
 * a base that stops being a base one unstated field at a time.
 */
describe("a direction that says nothing about where its colours came from", () => {
  const SILENT = `# quiet

- name: Quiet
- measuredFrom: some-reference
- ground: #FFFFFF
- accent: #123456
- leadingSource: chosen

| register | family | size | weight | italic | tracking | case | ink | leading |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| display | sans | 24 | 700 | no | 0 | none | ink | 1.0 |
`;

  it("should be read as claiming both were measured", () => {
    const direction = readDirectionFromMarkdown(SILENT, "quiet");
    expect(direction.groundSource).toBe("measured");
    expect(direction.accentSource).toBe("measured");
  });

  it("should still read an explicit source when one is given", () => {
    const direction = readDirectionFromMarkdown(
      SILENT.replace("- accent: #123456", "- accent: #123456\n- accentSource: chosen"),
      "quiet",
    );
    expect(direction.groundSource).toBe("measured");
    expect(direction.accentSource).toBe("chosen");
  });
});
