import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// WIRING, not logic. tests/place-provenance.test.ts proves the confrontation; this proves the
// SPINE performs it — deleting the call from produce-all.mjs leaves the pure tests green and turns
// these red. Same reason produce-all-attestation.test.ts exists: this repo has paid more than once
// for a guard whose verification path avoided the wiring.
const CLI = resolve(import.meta.dir, "../scripts/produce-all.mjs");

const GLACIER = { lon: 7.661000215400804, lat: 45.986011489842674 };

/** The real failing element, reduced: one marker, one beat claiming the summit beside it. Direct
 *  branch, so the ranked-menu precondition is exempt and THIS check is the one under test. */
function fixture(over: Record<string, unknown> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "splash-places-"));
  const outDir = join(dir, "out");
  mkdirSync(outDir, { recursive: true });
  const accepted = join(dir, "accepted.json");
  writeFileSync(
    accepted,
    JSON.stringify([
      {
        id: "cervin",
        producer: "map-native",
        format: "static",
        channel: "article-web",
        confirmedTakeaway: "Le Cervin fond par le sommet.",
        skillsInvoked: ["splash:cadrage-direct"],
        spec: {
          type: "locator",
          title: "Le Cervin",
          markers: [{ ...GLACIER, label: "Cervin" }],
        },
        ...over,
      },
    ]),
  );
  return { dir, outDir, accepted };
}

/** What the sanctioned resolver leaves behind for the lookup that went wrong. */
function writeReceipt(dir: string) {
  writeFileSync(
    join(dir, "places.json"),
    JSON.stringify({
      resolutions: [
        {
          label: "Cervin",
          ...GLACIER,
          resolvedName: "Matterhorngletscher, Zermatt",
          categories: ["glacier"],
        },
      ],
    }),
  );
}

function run(f: { dir: string; outDir: string; accepted: string }) {
  const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
  return { code: p.exitCode, err: p.stderr.toString() };
}

describe("produce-all — a resolution the proposal did not carry stops the batch", () => {
  it("refuses, naming the place and what the run resolved it to", () => {
    const f = fixture();
    try {
      writeReceipt(f.dir);
      const r = run(f);
      expect(r.code).toBe(1);
      expect(r.err).toContain("Cervin");
      expect(r.err).toContain("Matterhorngletscher");
      // A refusal deviates: it names the act that resolves it.
      expect(r.err).toContain("show the journalist what came back");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("lets the run through once the record is carried onto the accepted element", () => {
    const f = fixture({
      resolvedPlaces: [
        {
          label: "Cervin",
          origin: "geocoder",
          ...GLACIER,
          resolvedName: "Matterhorngletscher, Zermatt",
          shownToJournalist: true,
        },
      ],
    });
    try {
      writeReceipt(f.dir);
      const r = run(f);
      // It may still fail further down (no engine key in this sandbox) — what it must NOT do is
      // raise THIS refusal.
      expect(r.err).not.toContain("show the journalist what came back");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("refuses a point map that can account for none of its coordinates, with no receipt at all", () => {
    const f = fixture();
    try {
      const r = run(f);
      expect(r.code).toBe(1);
      expect(r.err).toContain("Cervin");
      expect(r.err).toContain("NOT ONE");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("lets a map whose coordinates came from the newsroom's own file through, said out loud", () => {
    const f = fixture({ coordinatesFromData: true });
    try {
      const r = run(f);
      expect(r.err).not.toContain("NOT ONE");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("says nothing about an element that plots no places", () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-places-"));
    const outDir = join(dir, "out");
    mkdirSync(outDir, { recursive: true });
    const accepted = join(dir, "accepted.json");
    writeFileSync(
      accepted,
      JSON.stringify([
        {
          id: "p1",
          producer: "chart-native",
          format: "static",
          channel: "article-web",
          confirmedTakeaway: "x rises",
          skillsInvoked: ["splash:cadrage-direct"],
          spec: {
            nativeType: "line",
            title: "t",
            altInsight: "a",
            unit: "u",
            data: "x,y\n1,2",
          },
        },
      ]),
    );
    try {
      const r = run({ dir, outDir, accepted });
      expect(r.err).not.toContain("show the journalist what came back");
      expect(r.err).not.toContain("NOT ONE");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
