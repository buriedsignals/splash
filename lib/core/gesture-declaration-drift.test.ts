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

// The three tests above catch a MALFORMED declaration (unknown gesture, unknown kind, an
// empty kind) but none of them catch a MISSING one: dropping an engine's whole `gestures:`
// block leaves every `t.gestures ?? {}` iterating zero entries, and an empty loop body
// asserts nothing — every test above stays green. Measured directly (Task 5 mutation-verify):
// `types: MAP_TYPES.map((id) => ({ id, gestures: MAP_GESTURES[id] }))` collapsed to
// `types: MAP_TYPES.map((id) => ({ id }))` in skills/map-native/src/manifest.ts left the
// whole suite passing, 0 fail.
//
// This is a PIN on today's deliberate shape (2026-08-03 gesture-vocabulary plan, Task 4), not
// a law: chart-native, map-native and image-native declare motion because they render their
// own frames; dw-chart and map-dw declare none because they delegate rendering to Datawrapper
// and own no motion of their own (both manifests say so explicitly, inline). It is EXPECTED
// to need editing — sub-project ④ (spec 2026-08-03 §7) will deliberately grow or shrink this
// table as engines/formats gain or lose motion. Edit the table below when that happens; do
// not delete this test because it became inconvenient — that is exactly how the drift this
// sub-project exists to close gets back in.
test("the declaring/silent split between engines is pinned — a whole engine losing (or gaining) its vocabulary is caught", () => {
  const DECLARES_GESTURES: Record<string, boolean> = {
    "chart-native": true,
    "map-native": true,
    "image-native": true,
    "dw-chart": false,
    "map-dw": false,
  };
  for (const [name, expected] of Object.entries(DECLARES_GESTURES)) {
    const producer = allProducers().find((p) => p.name === name);
    expect(producer, `producer "${name}" is registered`).toBeDefined();
    const declaresAny = (producer!.types ?? []).some(
      (t) => t.gestures != null && Object.keys(t.gestures).length > 0,
    );
    expect(
      declaresAny,
      expected
        ? `"${name}" declared a gesture vocabulary before — it declares NONE now. Did a whole engine's "gestures:" block get dropped?`
        : `"${name}" was deliberately gesture-silent (delegates rendering, owns no motion) — it now declares one. If this is intentional (sub-project ④), update DECLARES_GESTURES above; if not, it is a stray declaration.`,
    ).toBe(expected);
  }
});
