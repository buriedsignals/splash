import { describe, it, expect } from "bun:test";
import {
  registerProducer,
  getProducer,
  allProducers,
  producerForFormat,
  type ProducerManifest,
} from "./registry";
import "../loop/engines"; // self-registers every engine manifest

describe("producer registry", () => {
  it("registers and retrieves a manifest with no other edits", () => {
    registerProducer({
      name: "fake-engine",
      formats: ["static"],
      validate: (spec) =>
        typeof spec === "object" && spec !== null ? [] : ["not an object"],
      execution: "in-process",
      inProcess: async () => ({
        format: "static",
        form: "file",
        files: [],
        report: {},
      }),
    });
    expect(getProducer("fake-engine")?.formats).toEqual(["static"]);
    expect(allProducers().some((m) => m.name === "fake-engine")).toBe(true);
  });

  it("returns undefined for an unregistered name", () => {
    expect(getProducer("does-not-exist")).toBeUndefined();
  });

  it("rejects a duplicate registration (guards against double-import)", () => {
    const m: ProducerManifest = {
      name: "dup-engine",
      formats: ["static"],
      validate: () => [],
      execution: "in-process",
      inProcess: async () => ({
        format: "static",
        form: "file",
        files: [],
        report: {},
      }),
    };
    registerProducer(m);
    expect(() => registerProducer(m)).toThrow(/already registered/);
  });

  it("rejects a subprocess manifest missing its subprocess config", () => {
    expect(() =>
      registerProducer({
        name: "bad-subprocess",
        formats: ["static"],
        validate: () => [],
        execution: "subprocess",
      }),
    ).toThrow(/subprocess/);
  });

  it("rejects an in-process manifest missing its inProcess fn", () => {
    expect(() =>
      registerProducer({
        name: "bad-inprocess",
        formats: ["static"],
        validate: () => [],
        execution: "in-process",
      }),
    ).toThrow(/inProcess/);
  });

  it("delegates validation to the manifest's own validate fn (error strings)", () => {
    registerProducer({
      name: "validating-engine",
      formats: ["static"],
      validate: (spec) =>
        (spec as { ok?: boolean })?.ok ? [] : ["ok flag required"],
      execution: "in-process",
      inProcess: async () => ({
        format: "static",
        form: "file",
        files: [],
        report: {},
      }),
    });
    const m = getProducer("validating-engine")!;
    expect(m.validate({ ok: true })).toEqual([]);
    expect(m.validate({ ok: false })).toEqual(["ok flag required"]);
  });

  // "One file adds an engine" proof: registering a single manifest is the ONLY touch
  // point needed to make a new engine dispatchable — the registry surfaces exactly the
  // fields dispatch reads (execution + subprocess script/skill/channel), with no
  // engine-specific dispatch code imported here. adapters.ts routes purely from this data.
  it("a freshly-registered subprocess engine exposes everything dispatch reads, from data alone", () => {
    registerProducer({
      name: "new-native-engine",
      formats: ["static", "video"],
      validate: () => [],
      execution: "subprocess",
      subprocess: {
        scriptPath: "/skills/new-native-engine/scripts/produce.mjs",
        skillDir: "/skills/new-native-engine",
        threadsChannel: true,
      },
    });
    const m = getProducer("new-native-engine")!;
    // These four reads are precisely what adapters.ts's isFileBased / SCRIPT / SKILL_DIR
    // / channelEnvFor consume — proving dispatch is now data-driven, not switch-driven.
    expect(m.execution).toBe("subprocess");
    expect(m.subprocess?.scriptPath).toBe(
      "/skills/new-native-engine/scripts/produce.mjs",
    );
    expect(m.subprocess?.skillDir).toBe("/skills/new-native-engine");
    expect(m.subprocess?.threadsChannel).toBe(true);
  });
});

it("scrolly is built by the scrolly producer hosting the engine's track", () => {
  expect(producerForFormat("chart-native", "scrolly")).toBe("scrolly");
  expect(producerForFormat("map-native", "scrolly")).toBe("scrolly");
});

it("an engine that declares the format builds it itself — image-native is not redirected", () => {
  expect(producerForFormat("image-native", "scrolly")).toBe("image-native");
});

it("every other pairing is the identity", () => {
  expect(producerForFormat("chart-native", "video")).toBe("chart-native");
  expect(producerForFormat("map-dw", "static")).toBe("map-dw");
  expect(producerForFormat("unknown-engine", "static")).toBe("unknown-engine");
  // THE IDENTITY, and now genuinely so. This line asserted "scrolly" until 2026-07-28, with a
  // comment saying it documented current behaviour rather than a design choice: the redirect
  // fired on `format === "scrolly"` alone, with no check that the engine hosts a scrolly track.
  // Measured consequence — a dw-chart `d3-bars` scrolly was OFFERED unmarked, composed a
  // chart-native spec no mapper knows, passed validation (nativeSpecErrors swallows
  // UnsupportedNativeType) and threw at BUILD; and a map-dw choropleth scrolly silently became a
  // MapLibre map. FORMAT_HOST now names the engines skills/scrolly actually hosts.
  expect(producerForFormat("dw-chart", "scrolly")).toBe("dw-chart");
  expect(producerForFormat("map-dw", "scrolly")).toBe("map-dw");
  // An engine nobody registered is unchanged: no host claims it, so it keeps its own name.
  expect(producerForFormat("crayon", "scrolly")).toBe("crayon");
});
