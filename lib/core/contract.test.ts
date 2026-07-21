import { describe, it, expect } from "bun:test";
import {
  assertDeliveredContract,
  isHostedUrl,
  type DeliveredArtifact,
} from "./contract";
import type { ProducerManifest } from "./registry";

describe("assertDeliveredContract — the single-format produce contract", () => {
  it("passes a valid in-process static artifact (one owned image, form=file)", () => {
    const a: DeliveredArtifact = {
      format: "static",
      form: "file",
      files: ["/out/rents/rents.png"],
      report: {},
    };
    expect(() => assertDeliveredContract(a)).not.toThrow();
  });

  it("passes a native file artifact carrying byproducts beside the deliverable", () => {
    // Natives write config.json / native-source.json into outDir on every produce — the
    // produce-stage contract is lenient about those (unlike the strict export hand-over folder).
    expect(() =>
      assertDeliveredContract({
        format: "static",
        form: "file",
        files: [
          "/out/x/config.json",
          "/out/x/native-source.json",
          "/out/x/static.png",
        ],
        report: {},
      }),
    ).not.toThrow();
  });

  it("passes a valid hosted artifact (Datawrapper embed, form=hosted)", () => {
    expect(() =>
      assertDeliveredContract({
        format: "interactive",
        form: "hosted",
        files: [],
        publicUrl: "https://www.datawrapper.de/_/AbCdE/",
        report: {},
      }),
    ).not.toThrow();
  });

  it("throws on a static artifact with 2 image files (not single-format)", () => {
    expect(() =>
      assertDeliveredContract({
        format: "static",
        form: "file",
        files: ["/out/x/a.png", "/out/x/b.png"],
        report: {},
      }),
    ).toThrow(/exactly one image file/);
  });

  it("throws on a static artifact that includes an .html file", () => {
    expect(() =>
      assertDeliveredContract({
        format: "static",
        form: "file",
        files: ["/out/x/chart.png", "/out/x/interactive.html"],
        report: {},
      }),
    ).toThrow(/must not include an \.html file/);
  });

  it("throws on a hosted artifact with no publicUrl", () => {
    expect(() =>
      assertDeliveredContract({
        format: "interactive",
        form: "hosted",
        files: [],
        report: {},
      }),
    ).toThrow(/resolvable https publicUrl/);
  });

  it("throws on a hosted artifact whose publicUrl is a placeholder", () => {
    expect(() =>
      assertDeliveredContract({
        format: "interactive",
        form: "hosted",
        files: [],
        publicUrl: "https://localhost/x",
        report: {},
      }),
    ).toThrow(/resolvable https publicUrl/);
  });

  it("throws on a video file artifact with no .mp4", () => {
    expect(() =>
      assertDeliveredContract({
        format: "video",
        form: "file",
        files: ["/out/x/still.png"],
        report: {},
      }),
    ).toThrow(/exactly one \.mp4 file/);
  });

  it("passes a native interactive file artifact (interactive.html present beside a review still)", () => {
    expect(() =>
      assertDeliveredContract({
        format: "interactive",
        form: "file",
        files: [
          "/out/x/config.json",
          "/out/x/interactive.html",
          "/out/x/interactive.png",
        ],
        report: {},
      }),
    ).not.toThrow();
  });
});

describe("isHostedUrl", () => {
  it("accepts a real https embed origin", () => {
    expect(isHostedUrl("https://www.datawrapper.de/_/AbCdE/")).toBe(true);
  });
  it("rejects blank / placeholder / non-https", () => {
    expect(isHostedUrl("   ")).toBe(false);
    expect(isHostedUrl("https://placeholder")).toBe(false);
    expect(isHostedUrl("http://foo.example.com/")).toBe(false);
    expect(isHostedUrl(undefined)).toBe(false);
  });
});

describe("manifest.validate — spec-in validation returns errors, never throws", () => {
  it("a manifest's validate(badSpec) returns a non-empty error list (not a throw)", () => {
    const m: ProducerManifest = {
      name: "probe-engine",
      formats: ["static"],
      validate: (spec) =>
        typeof spec === "object" && spec !== null
          ? []
          : ["spec must be an object"],
      execution: "in-process",
      inProcess: async () => ({
        format: "static",
        form: "file",
        files: [],
        report: {},
      }),
    };
    let errors: string[] = [];
    expect(() => {
      errors = m.validate(null);
    }).not.toThrow();
    expect(errors.length).toBeGreaterThan(0);
  });
});
