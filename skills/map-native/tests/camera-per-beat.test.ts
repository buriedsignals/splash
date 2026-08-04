import { describe, it, expect } from "bun:test";
import { applyMapArc } from "../src/map-story";
import type { MapArcBeat } from "../src/map-arc";

// ---------------------------------------------------------------------------
// SUB-PROJECT ④(c) — the camera decision moves DOWN to the beat.
//
// `cameraMode` is a GLOBAL knob: pick "guided-tour" and every beat repositions the camera,
// pick "simple" and none of them do. The umbrella spec (2026-08-03 § 5) says the storyboard
// must survive that choice — the global setting becomes the DEFAULT the proposal applies to
// every beat, and the journalist may contradict it beat by beat.
//
// The mechanism is one pure transformation at the single place arc beats become story beats:
// a beat whose movement is "hold" keeps the PREVIOUS beat's frame. Everything downstream —
// camera solutions, cameraForFrame, jumpTo — is untouched, so all seven Story components and
// all seven `stepped` components inherit it without a line of per-component threading.
// ---------------------------------------------------------------------------
const anchorFor = (region: string) => ({
  camera: [0, 0, 1, 1].map((n) => n + region.length) as [
    number,
    number,
    number,
    number,
  ],
  highlight: [region],
  name: region,
  value: "1",
});

const resolve = (region: string) => anchorFor(region);

describe("a beat may hold the camera where the previous beat left it", () => {
  it("holds the previous frame, and does not invent one", () => {
    const arc: MapArcBeat[] = [
      { region: "AAA", text: "first" },
      { region: "BB", text: "second", movement: "hold" },
      { region: "C", text: "third" },
    ];
    const beats = applyMapArc(arc, resolve);
    // The holding beat's camera is the FIRST beat's, byte for byte…
    expect(beats[1]!.camera).toEqual(beats[0]!.camera);
    // …while everything else about it stays its own.
    expect(beats[1]!.callout!.region).toBe("BB");
    expect(beats[1]!.copy).toBe("second");
    // …and the beat after it moves again, from its own anchor.
    expect(beats[2]!.camera).toEqual(anchorFor("C").camera);
  });

  it("holds through a RUN of held beats, never just the one before", () => {
    const arc: MapArcBeat[] = [
      { region: "AAAA", text: "1" },
      { region: "BBB", text: "2", movement: "hold" },
      { region: "CC", text: "3", movement: "hold" },
    ];
    const beats = applyMapArc(arc, resolve);
    expect(beats[1]!.camera).toEqual(beats[0]!.camera);
    expect(beats[2]!.camera).toEqual(beats[0]!.camera);
  });

  it("a beat that says nothing moves, exactly as before — no walk, no change", () => {
    const arc: MapArcBeat[] = [
      { region: "AAAA", text: "1" },
      { region: "BBB", text: "2" },
    ];
    const beats = applyMapArc(arc, resolve);
    expect(beats[0]!.camera).toEqual(anchorFor("AAAA").camera);
    expect(beats[1]!.camera).toEqual(anchorFor("BBB").camera);
  });

  it("an explicit jump moves, like the default", () => {
    const arc: MapArcBeat[] = [
      { region: "AAAA", text: "1" },
      { region: "BBB", text: "2", movement: "jump" },
    ];
    expect(applyMapArc(arc, resolve)[1]!.camera).toEqual(
      anchorFor("BBB").camera,
    );
  });

  it("refuses a hold on the FIRST beat — there is no frame to hold", () => {
    const arc: MapArcBeat[] = [{ region: "AAAA", text: "1", movement: "hold" }];
    expect(() => applyMapArc(arc, resolve)).toThrow(/first/i);
  });
});

import { mapArcErrors } from "../src/map-arc";

describe("the camera word is refused before production, not dropped at the render", () => {
  const REGIONS = ["AAA", "BB", "C"];

  it("accepts the two words it implements", () => {
    expect(
      mapArcErrors(
        [
          { region: "AAA", role: "establish", text: "1" },
          { region: "BB", role: "build", text: "2", movement: "hold" },
          { region: "C", role: "payoff", text: "3", movement: "jump" },
        ] as MapArcBeat[],
        REGIONS,
      ),
    ).toEqual([]);
  });

  it("refuses a word it does not implement, and says what it can do", () => {
    const errs = mapArcErrors(
      [
        { region: "AAA", role: "establish", text: "1" },
        { region: "BB", role: "build", text: "2", movement: "fly" },
        { region: "C", role: "payoff", text: "3" },
      ] as unknown as MapArcBeat[],
      REGIONS,
    );
    expect(errs.join(" ")).toContain("fly");
    expect(errs.join(" ")).toContain("jump");
    expect(errs.join(" ")).toContain("hold");
  });

  it("refuses a hold on the first beat at the gate too, not only at the render", () => {
    const errs = mapArcErrors(
      [
        { region: "AAA", role: "establish", text: "1", movement: "hold" },
        { region: "BB", role: "build", text: "2" },
        { region: "C", role: "payoff", text: "3" },
      ] as MapArcBeat[],
      REGIONS,
    );
    expect(errs.join(" ")).toMatch(/first beat cannot hold/i);
  });
});

import { deriveSymbolStory } from "../src/symbol-story";
import type { SymbolPoint } from "../src/symbol-geo";

// THE WHOLE DERIVATION CHAIN, not just the pure helper. This is what a renderer consumes: the
// component turns each of these beats' `camera` into a MapLibre solution and jumps to it, so a
// hold that survives to here is a hold the reader sees.
//
// Measured rather than assumed after two render attempts failed to DISCRIMINATE: a standard clip
// spends most of its length on the establishing shot and the first reveal, so the frames where a
// later beat's camera would differ fall in the last fraction of a second. The rendered proof of
// (a) and (b) worked because those change the WHOLE frame; a camera decision on beat 3 of 3 does
// not. Recorded as a limit of the instrument, not softened into a claim.
describe("a hold survives the full derivation, to the camera a renderer jumps to", () => {
  const POINTS: SymbolPoint[] = [
    { lon: -0.13, lat: 51.5, value: 296, label: "London" },
    { lon: 12.5, lat: 41.9, value: 67, label: "Rome" },
    { lon: -3.7, lat: 40.4, value: 124, label: "Madrid" },
  ];
  const meta = (arcBeats: unknown) =>
    ({
      title: "t",
      description: "d",
      source: { name: "s" },
      arcBeats,
    }) as never;

  it("the held beat keeps the previous beat's frame; without it, it takes its own", () => {
    const walk = [
      { region: "London", role: "establish", text: "1" },
      { region: "Rome", role: "build", text: "2" },
    ];
    const moved = deriveSymbolStory(POINTS, meta(walk));
    const held = deriveSymbolStory(
      POINTS,
      meta([walk[0], { ...walk[1], movement: "hold" }]),
    );
    const revealsOf = (bs: typeof moved) => bs.filter((b) => b.authored);
    const m = revealsOf(moved);
    const h = revealsOf(held);
    expect(m.length).toBe(2);
    // Rome's own frame is nowhere near London's — that is what makes this discriminating.
    expect(m[1]!.camera).not.toEqual(m[0]!.camera);
    // Held: beat 2 sits exactly where beat 1 left the camera…
    expect(h[1]!.camera).toEqual(h[0]!.camera);
    // …and everything else about beat 2 is untouched: it is the CAMERA that holds, not the beat.
    expect(h[1]!.callout!.region).toBe("Rome");
    expect(h[1]!.copy).toBe(m[1]!.copy);
  });
});
