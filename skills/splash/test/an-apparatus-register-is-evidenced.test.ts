/**
 * A FAMILY'S APPARATUS VOCABULARY IS EVIDENCED, NEVER DECLARED.
 *
 * The core registers are about VOICE and are closed by design. What a family calls its measuring
 * furniture is a claim about published practice, and this repository has now got that wrong twice
 * in the same way:
 *
 *   1. Six registers frozen with `axis` among them — a chart's vocabulary imposed on every family.
 *      `proof/map-quake-symbol/QuakeSymbolStill.tsx` refuted it within minutes: it declares
 *      `LEGEND_LABEL` and `CAPTION` and has no axis at all.
 *   2. The fix invented `map: { legend, place }` and `scrolly: { step }` — read off THAT SAME
 *      COMPONENT. The corpus holds no map reference at all; fifteen references, not one a map.
 *      Inventing a vocabulary ahead of its evidence is the identical mistake one level up.
 *
 * So the table and the corpus are held equal in both directions, exactly as `treatments.mjs` and
 * `docs/design-base/treatments/` are. A register in code with no record is a decision taken without
 * a reference; a record with no code is knowledge that reaches no pixel.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CORE_REGISTERS,
  FAMILY_REGISTERS,
} from "../../../shared/chart-beat/registers.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const BASE = join(ROOT, "docs", "design-base");
const FILED = join(BASE, "registers");

const field = (text: string, key: string) =>
  text.match(new RegExp(`^- ${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? null;
const list = (text: string, key: string) =>
  (field(text, key) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function records() {
  if (!existsSync(FILED)) return [];
  return readdirSync(FILED)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ id: f.replace(/\.md$/, ""), text: readFileSync(join(FILED, f), "utf8") }));
}

/** The publication behind every reference, keyed by id — independence is read off the url. */
function publicationById(): Map<string, string> {
  const refs = join(BASE, "references");
  const out = new Map<string, string>();
  if (!existsSync(refs)) return out;
  for (const family of readdirSync(refs).filter((n) => statSync(join(refs, n)).isDirectory()))
    for (const id of readdirSync(join(refs, family)).filter((n) =>
      statSync(join(refs, family, n)).isDirectory(),
    )) {
      const record = JSON.parse(readFileSync(join(refs, family, id, "measured.json"), "utf8"));
      out.set(id, new URL(record.url).hostname.replace(/^www\./, ""));
    }
  return out;
}

describe("a family's apparatus register", () => {
  it("should exist in code for every filed record, and nowhere else", () => {
    const coded = new Map<string, string[]>();
    for (const [family, registers] of Object.entries(FAMILY_REGISTERS))
      for (const name of Object.keys(registers))
        coded.set(name, [...(coded.get(name) ?? []), family].sort());

    const filed = new Map<string, string[]>();
    for (const { id, text } of records()) filed.set(id, list(text, "families").sort());

    expect([...coded.keys()].sort(), "code holds a register the corpus does not").toEqual(
      [...filed.keys()].sort(),
    );
    for (const [name, families] of filed)
      expect(coded.get(name), `${name} is filed for a different set of families`).toEqual(families);
  });

  it("should derive from the core voice its record names", () => {
    for (const { id, text } of records()) {
      const from = field(text, "derivesFrom");
      expect(CORE_REGISTERS, `${id} derives from "${from}", not a core voice`).toContain(from);
      for (const family of list(text, "families"))
        expect(FAMILY_REGISTERS[family]?.[id], `${id} in ${family}`).toBe(from);
    }
  });

  it("should be backed by two independent publications, like any claim about practice", () => {
    // "Families of this kind call it this" is a claim about what desks do, not a fact the data
    // carries. Two publications is the same floor an imported treatment faces.
    const publications = publicationById();
    for (const { id, text } of records()) {
      const cited = [...new Set([...text.matchAll(/^- evidence:\s*(\S+)/gm)].map((m) => m[1]))];
      for (const ref of cited)
        expect(publications.has(ref), `${id} cites ${ref}, which is not in the corpus`).toBe(true);
      const desks = new Set(cited.map((r) => publications.get(r)).filter(Boolean));
      expect(desks.size, `${id} rests on ${desks.size} publication(s)`).toBeGreaterThanOrEqual(2);
    }
  });

  it("should never be named the same as a core voice", () => {
    for (const registers of Object.values(FAMILY_REGISTERS))
      for (const name of Object.keys(registers))
        expect(CORE_REGISTERS, `${name} shadows a core voice`).not.toContain(name);
  });
});
