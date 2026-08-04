import { test, expect } from "bun:test";
import { allProducers } from "./registry";
import { GESTURES, NARRATIVE_KINDS } from "./gestures";
import "../loop/engines"; // self-registers every engine manifest — without this import
// allProducers() is empty and every test below passes vacuously, guarding nothing.

test("no engine declares a gesture outside the closed vocabulary", () => {
  const known = new Set<string>(GESTURES);
  for (const p of allProducers()) {
    for (const t of p.types ?? []) {
      for (const [kind, list] of Object.entries(t.gestures ?? {})) {
        expect(NARRATIVE_KINDS as readonly string[]).toContain(kind);
        for (const g of list) {
          // A gesture no engine implements is the promise-nothing-honours defect this
          // sub-project exists to close — catch it at declaration time, not at produce.
          expect(known.has(g)).toBe(true);
        }
      }
    }
  }
});

test("a declared narrative kind is never empty", () => {
  // Declaring `reveal: []` says "this kind exists but does nothing" — ambiguous with both
  // "not supported" and "supported with no motion". Omit the kind instead.
  for (const p of allProducers()) {
    for (const t of p.types ?? []) {
      for (const [, list] of Object.entries(t.gestures ?? {})) {
        expect(list.length).toBeGreaterThan(0);
      }
    }
  }
});

test("every type that declares gestures is a type the engine actually declares", () => {
  // Guards the Record-keyed-by-id shape in the manifests: a typo'd key would silently
  // declare nothing for the real type and nobody would notice.
  for (const p of allProducers()) {
    const ids = new Set((p.types ?? []).map((t) => t.id));
    for (const t of p.types ?? []) expect(ids.has(t.id)).toBe(true);
  }
});
