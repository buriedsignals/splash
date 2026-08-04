import { test, expect } from "bun:test";
import { allProducers } from "./registry";
import { GESTURES, NARRATIVE_KINDS, isCameraGesture } from "./gestures";
import "../loop/engines"; // self-registers every engine manifest — without this import
// allProducers() is empty and every test below passes vacuously, guarding nothing.
import { CHART_GESTURES } from "../../skills/chart-native/src/manifest";
import { NATIVE_TYPES } from "../../skills/chart-native/src/native-types";
import { MAP_GESTURES } from "../../skills/map-native/src/manifest";
import { MAP_TYPES } from "../../skills/map-native/src/map-types";

// This file lives under `lib/core`, part of `bun run check`'s `test lib` step — the ONE
// check this repo's own convention already runs permanently red on a named ambient
// failure (an environment-dependent gap unrelated to any change made here; see
// docs/splash/CHANGELOG.md's many "21/22 — test lib" entries). That means a "21/22"
// gate summary is the EXPECTED, healthy result today, and a future failure IN THIS FILE
// changes nothing about that headline count — `test lib` was already the one red check.
// A guard breaking here is indistinguishable, at the summary level, from the ambient
// noise it was already tolerating. Anyone reading only the gate count, not the actual
// failing test names, will not notice. Recorded so it is not silently assumed away.

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
  // A prior version of this test built `ids` from `p.types` and then asserted
  // `ids.has(t.id)` over that SAME array — a tautology, always true regardless of what
  // the manifest declares (proved: renaming "pictogram" to "pictogrma" in
  // chart-native's CHART_GESTURES left this suite 4 pass / 0 fail with `tsc` clean, and
  // silently dropped the declaring-type count 41 → 40). The real bug it needs to catch
  // cannot be seen through `allProducers()` at all: a manifest builds `p.types` via
  // `NATIVE_TYPES.map((t) => ({ id: t.id, ...(CHART_GESTURES[t.id] ? {...} : {}) }))`,
  // so a typo'd key in the RAW gestures record is never read (the lookup only ever
  // asks for a REAL id) and never reaches the registry — the typo'd entry simply
  // vanishes, taking the real type's gestures with it. Checking must happen against
  // the raw per-engine record, before that lossy `.map()` runs.
  for (const key of Object.keys(CHART_GESTURES)) {
    expect(
      NATIVE_TYPES.some((t) => t.id === key),
      `chart-native's CHART_GESTURES has a key "${key}" that matches no NATIVE_TYPES id — ` +
        `a typo here silently drops the real type's gestures and declares nothing for anyone`,
    ).toBe(true);
  }
  for (const key of Object.keys(MAP_GESTURES)) {
    expect(
      (MAP_TYPES as readonly string[]).includes(key),
      `map-native's MAP_GESTURES has a key "${key}" that matches no MAP_TYPES id — ` +
        `a typo here silently drops the real type's gestures and declares nothing for anyone`,
    ).toBe(true);
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
  // "scrolly" was missing from this table entirely — a registered producer
  // (registerProducer({ name: "scrolly", ... })) that this test never looked at, so a
  // bogus type with a gestures block added to its `types` (it registers none today,
  // deliberately — see scrolly/src/manifest.ts's own "no types: scrolly is the shared
  // MECHANISM, not a type owner") would pass this whole suite. Added, pinned false for
  // the same reason dw-chart/map-dw are false: it renders nothing of its own.
  const DECLARES_GESTURES: Record<string, boolean> = {
    "chart-native": true,
    "map-native": true,
    "image-native": true,
    "dw-chart": false,
    "map-dw": false,
    scrolly: false,
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

// The fifth hole: nothing before this test calls `isCameraGesture` at all. A chart type
// can declare a camera gesture and no guard objects — proved: `pie: { reveal: ["fly",
// "jump", "draw", "highlight"] }` in chart-native's manifest leaves the whole suite
// 4 pass / 0 fail, `tsc` clean. gestures.ts's own stated purpose for the camera/data
// split ("Asking a chart to 'fly' is meaningless, and the split is what lets a caller
// refuse that without string-matching a name") is unenforced without this pin.
test("an engine that declares no camera gesture today does not gain one silently", () => {
  // chart-native and image-native render a fixed frame with no camera concept at all
  // (chart-native's own manifest header; image-native has no map/camera anywhere,
  // inventory §6) — pinned at zero. map-native is the one engine with a real camera
  // (jump/hold/push, and — reachability caveat aside — the browser scrolly family's
  // fly), so it is deliberately excluded from this pin rather than asserted either way.
  const NO_CAMERA_GESTURE_ENGINES = ["chart-native", "image-native"];
  for (const name of NO_CAMERA_GESTURE_ENGINES) {
    const producer = allProducers().find((p) => p.name === name);
    expect(producer, `producer "${name}" is registered`).toBeDefined();
    for (const t of producer!.types ?? []) {
      for (const [kind, list] of Object.entries(t.gestures ?? {})) {
        for (const g of list) {
          expect(
            isCameraGesture(g),
            `"${name}"'s type "${t.id}" declares camera gesture "${g}" on "${kind}" — ` +
              `this engine has no camera concept (fixed frame, no map/flyTo/jumpTo). If ` +
              `that changed deliberately, move "${name}" out of NO_CAMERA_GESTURE_ENGINES.`,
          ).toBe(false);
        }
      }
    }
  }
});

// The sixth hole: the "typo'd key" test above (line 49) catches a CHART_GESTURES/
// MAP_GESTURES key that matches no real type id. It does not catch the inverse — a real
// type id with NO key at all. Both manifests build `p.types` by lookup
// (`CHART_GESTURES[t.id] ? {...} : {}` in chart-native's manifest.ts,
// `MAP_GESTURES[id]` in map-native's), so a type simply missing from the raw record
// produces NO `gestures` block for it, and every OTHER guard in this file iterates
// `Object.entries(t.gestures ?? {})` — zero entries, asserting nothing. The
// declaring/silent split test above only catches a WHOLE engine's vocabulary vanishing
// (every type at once); it says nothing about ONE type quietly losing its own entry
// while its siblings keep theirs.
//
// Mutation-verified, both engines (`git diff` confirmed the edit landed before reading
// results): deleting `pictogram: { reveal: ["stagger","highlight"] },` from
// chart-native's CHART_GESTURES left this suite 17 pass / 0 fail, `tsc` clean, and
// silently dropped the declaring-type count 41 → 40. Deleting `route: ROUTE_GESTURES,`
// from map-native's MAP_GESTURES left it 10 pass / 0 fail, map-native silently down to 6
// declaring types.
//
// This matters for sub-project ④: it adds types. A new type registered with no
// vocabulary entry means the storyboard proposer offers nothing for it — green all the
// way, because nothing above ever looks at NATIVE_TYPES/MAP_TYPES itself, only at what
// the (possibly incomplete) gestures record already contains.
test("every NATIVE_TYPES / MAP_TYPES id has a gesture-vocabulary entry — none can go silently missing", () => {
  for (const t of NATIVE_TYPES) {
    expect(
      t.id in CHART_GESTURES,
      `chart-native: type "${t.id}" is in NATIVE_TYPES but CHART_GESTURES declares no ` +
        `entry for it — this type just lost its whole gesture vocabulary`,
    ).toBe(true);
  }
  for (const id of MAP_TYPES) {
    expect(
      id in MAP_GESTURES,
      `map-native: type "${id}" is in MAP_TYPES but MAP_GESTURES declares no entry for ` +
        `it — this type just lost its whole gesture vocabulary`,
    ).toBe(true);
  }
});

// HONEST CEILING of this whole test suite: none of the checks above (nor gestures.test.ts's
// own) can catch a gesture SWAP where both the old and new value are individually valid —
// e.g. `pie: { reveal: ["draw", "highlight"] }` edited to `pie: { reveal: ["grow",
// "highlight"] }`. "grow" is a real, known, non-camera data gesture, so every structural
// check here (closed vocabulary, non-empty kind, known type, declaring/silent split,
// camera pin) stays green even though a pie chart does not grow — it sweeps. Catching that
// requires a semantic oracle (a human, or a render, reading whether the claim matches the
// component), which is exactly the review process the final-fix-report documents, not a
// unit test. Recorded here rather than left implied.
