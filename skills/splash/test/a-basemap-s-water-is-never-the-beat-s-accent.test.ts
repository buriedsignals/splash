/**
 * A BASEMAP'S WATER IS NEVER THE BEAT'S OWN ACCENT, AND THERE IS ONE DEFINITION OF THE PAIR.
 *
 * THE DEFECT, MEASURED COLD ON 2026-09-16. Twelve map beats each carried their own three-line copy
 * of the basemap's tints:
 *
 *     const plateTints = (d) => ({
 *       water: mix(d.ground, d.accent, 0.16),
 *       land:  mix(d.ground, deriveFurniture(d.ground).ink, 0.07),
 *     });
 *
 * The sea tinted with the very accent the marks are drawn in — so the ground FOLLOWS the mark, and
 * no accent can ever be picked out of it. Under a pigment reading that is 0.0° of separation, by
 * construction, in every direction, on every one of the twelve. `shared/map-beat/tints.mjs` had
 * already replaced that formula months earlier, and the twelve never heard: each was a private copy
 * nothing held in step.
 *
 * SO THE RULE IS STRUCTURAL, NOT NUMERIC. A contrast floor cannot catch this — the blue-on-blue
 * river that started the whole repair reads 5.55:1 and clears every floor in the file. What catches
 * it is there being exactly ONE definition of a basemap's pair, in the trunk, that takes the filed
 * water convention and no accent at all. A thirteenth beat cannot be born with the defect unless it
 * first writes its own copy of the function, and that is what goes red here.
 *
 * VERIFIED BY MUTATION, and the mutations are run below rather than described: a beat handed back
 * its own `plateTints`, and a beat that derives a water tint from `accent` under any other name.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Every source file a beat or the machinery is written in — never a render, which is output. */
function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "renders" || entry === "plate" || entry === "fallback")
      continue;
    const at = join(dir, entry);
    if (statSync(at).isDirectory()) sources(at, out);
    else if (/\.(mjs|ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(at);
  }
  return out;
}

const ROOTS = ["proof", "shared", "skills"];
const FILES = ROOTS.flatMap((r) => sources(r));

/** The trunk's own file, which is allowed — and required — to be the one place the pair is decided. */
const TRUNK = "shared/map-beat/tints.mjs";

/** A local definition of the basemap's pair, under whatever name the beat gave it. */
const OWN_DEFINITION = /(?:const|let|var|function)\s+plateTints\b/;

/** A water tint derived from an accent, under any name — the defect itself rather than the shape it
 *  happened to take. Deliberately not anchored on `plateTints`: the twelve would have passed a rule
 *  that was, the moment one of them renamed its helper. */
const WATER_FROM_ACCENT = /\bwater\s*[:=]\s*[^;\n]{0,90}?\baccent\b/;

/** The CODE, without the prose. Every one of the twelve repairs quotes the formula it deleted, in a
 *  comment, so that the next reader knows what was there — and a rule that could not tell a comment
 *  from a line that runs would have reported all twelve as still defective. Stripped rather than
 *  tolerated: a defect hidden inside `/* … *\/` is not a defect this rule needs to allow. */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function offenders(test: RegExp): string[] {
  return FILES.filter((f) => !f.endsWith(TRUNK) && !f.includes(join("root-template", "shared", "map-beat")))
    .filter((f) => test.test(code(f)));
}

describe("a basemap's water", () => {
  it("should be decided in exactly one place, and that place is the trunk", () => {
    expect(offenders(OWN_DEFINITION)).toEqual([]);
    // …and the trunk really does define it, so an empty list can never mean the rule found nothing.
    expect(OWN_DEFINITION.test(readFileSync(TRUNK, "utf8"))).toBe(true);
  });

  it("should never be mixed from the accent the beat's own marks are drawn in", () => {
    expect(offenders(WATER_FROM_ACCENT)).toEqual([]);
  });

  it("should go red when a beat takes its own copy of the pair back (mutation)", () => {
    const mutated = [
      "const plateTints = (d) => ({",
      "  water: mix(d.ground, d.accent, 0.16),",
      "  land: mix(d.ground, deriveFurniture(d.ground).ink, 0.07),",
      "});",
    ].join("\n");
    expect(OWN_DEFINITION.test(mutated)).toBe(true);
    expect(WATER_FROM_ACCENT.test(mutated)).toBe(true);
  });

  it("should go red when the defect is renamed rather than removed (mutation)", () => {
    // The same defect with no `plateTints` anywhere: the structural rule alone would miss it.
    const renamed = "const seaAndLand = (d) => ({ water: mix(d.ground, d.accent, 0.16) });";
    expect(OWN_DEFINITION.test(renamed)).toBe(false);
    expect(WATER_FROM_ACCENT.test(renamed)).toBe(true);
  });
});
