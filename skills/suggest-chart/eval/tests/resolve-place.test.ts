// The lookup that already happened in the seam, now leaving a receipt.
//
// suggest-chart/SKILL.md has always told the host to resolve a place with `geocodePlace()` from
// lib/geo/geocode.ts rather than recall a coordinate — real code, running between the suggester's
// in-context output and accepted.json, writing nothing down. That is why "the journalist said the
// point was wrong BEFORE production" could leave no trace: there was nothing to leave it ON.
//
// The network half is covered by lib/geo/geocode.test.ts (and geocode-live.test.ts). What is
// tested here is everything that decides what gets WRITTEN, which is the part the guard reads.
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mergeResolutions,
  noMatchMessage,
  receiptFrom,
  showbackLine,
} from "../../scripts/resolve-place.mjs";

const script = join(import.meta.dir, "../../scripts/resolve-place.mjs");

const GLACIER_HIT = {
  name: "Matterhorngletscher",
  placeName: "Matterhorngletscher, Zermatt",
  lon: 7.661000215400804,
  lat: 45.986011489842674,
  categories: ["glacier"],
  layer: "default" as const,
};

const SUMMIT_HIT = {
  name: "Cervin",
  placeName: "Cervin, Zermatt",
  lon: 7.658602260053158,
  lat: 45.97642633812452,
  categories: ["peak"],
  elevationM: 4478,
  ref: "osm:n26863664",
  layer: "poi" as const,
};

describe("receiptFrom", () => {
  it("records what the geocoder returned, under the label the map will plot", () => {
    const r = receiptFrom(SUMMIT_HIT, { label: "Cervin", query: "Matterhorn" });
    expect(r.label).toBe("Cervin");
    expect(r.lon).toBe(SUMMIT_HIT.lon);
    expect(r.lat).toBe(SUMMIT_HIT.lat);
    expect(r.resolvedName).toBe("Cervin, Zermatt");
    expect(r.categories).toEqual(["peak"]);
    expect(r.elevationM).toBe(4478);
    expect(r.query).toBe("Matterhorn");
  });

  it("omits an elevation the feature does not carry rather than inventing one", () => {
    const r = receiptFrom(GLACIER_HIT, { label: "Cervin", query: "Cervin" });
    expect(r.elevationM).toBeUndefined();
    expect("elevationM" in r).toBe(false);
  });

  it("stamps when the lookup happened", () => {
    const r = receiptFrom(SUMMIT_HIT, { label: "Cervin", query: "Cervin" });
    expect(Number.isNaN(Date.parse(r.resolvedAt))).toBe(false);
  });
});

describe("showbackLine — the sentence a journalist can be wrong about", () => {
  it("names WHAT it resolved to and what kind of thing that is", () => {
    const line = showbackLine(
      receiptFrom(GLACIER_HIT, { label: "Cervin", query: "Cervin" }),
    );
    expect(line).toContain("Cervin");
    expect(line).toContain("Matterhorngletscher, Zermatt");
    expect(line).toContain("glacier");
  });

  it("carries the elevation when the feature has one — the disambiguator between two summits", () => {
    const line = showbackLine(
      receiptFrom(SUMMIT_HIT, { label: "Cervin", query: "Cervin" }),
    );
    expect(line).toContain("4478");
  });

  it("still shows the coordinate, because that is what gets plotted", () => {
    const line = showbackLine(
      receiptFrom(SUMMIT_HIT, { label: "Cervin", query: "Cervin" }),
    );
    expect(line).toContain("7.658");
  });
});

describe("noMatchMessage — a refusal that says what it saw", () => {
  it("refuses to approximate a summit and lists what came back instead", () => {
    const m = noMatchMessage("Cervin", "peak", [GLACIER_HIT]);
    expect(m).toContain("Cervin");
    expect(m).toContain("Matterhorngletscher");
    expect(m).toContain("glacier");
    // The part a generic "matched nothing usable" cannot say, and the part that stops the next
    // person plotting the glacier anyway: WHY the coordinate that came back is not the summit.
    expect(m).toContain("CENTROID");
    expect(m).toContain("1063");
  });

  it("says plainly when nothing at all came back", () => {
    expect(noMatchMessage("Nowhereberg", undefined, [])).toContain("nothing");
  });
});

describe("mergeResolutions — a re-lookup replaces, it does not accumulate", () => {
  const first = receiptFrom(GLACIER_HIT, { label: "Cervin", query: "Cervin" });
  const second = receiptFrom(SUMMIT_HIT, { label: "Cervin", query: "Cervin" });

  it("keeps one entry per label, the latest winning", () => {
    const merged = mergeResolutions([first], second);
    expect(merged).toHaveLength(1);
    expect(merged[0].lon).toBe(SUMMIT_HIT.lon);
  });

  it("keeps other labels untouched", () => {
    const aletsch = receiptFrom(
      { ...GLACIER_HIT, placeName: "Aletschgletscher", lon: 8.07, lat: 46.45 },
      { label: "Aletsch", query: "Aletsch" },
    );
    const merged = mergeResolutions([aletsch, first], second);
    expect(merged.map((r) => r.label).sort()).toEqual(["Aletsch", "Cervin"]);
  });
});

// --- the CLI's own refusals, which need no network to reach ---------------------------------
describe("the CLI refuses before it writes", () => {
  function run(args: string[]) {
    try {
      execFileSync("bun", [script, ...args], {
        encoding: "utf8",
        stdio: "pipe",
      });
      return { code: 0, err: "" };
    } catch (e: unknown) {
      const err = e as { status?: number; stderr?: string };
      return { code: err.status ?? -1, err: err.stderr ?? "" };
    }
  }

  it("refuses a run directory that does not exist, rather than creating one nobody reads", () => {
    const r = run([
      join(tmpdir(), "no-such-run-dir-splash"),
      "--place",
      "Cervin",
    ]);
    expect(r.code).not.toBe(0);
    expect(r.err).toContain("does not exist");
  });

  it("refuses with no place to look up", () => {
    const dir = mkdtempSync(join(tmpdir(), "resolve-"));
    try {
      const r = run([dir, "--place", "  "]);
      expect(r.code).not.toBe(0);
      expect(existsSync(join(dir, "places.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses an --expect it cannot hold the geocoder to", () => {
    const dir = mkdtempSync(join(tmpdir(), "resolve-"));
    try {
      const r = run([dir, "--place", "Cervin", "--expect", "castle"]);
      expect(r.code).not.toBe(0);
      expect(r.err).toContain("peak");
      expect(existsSync(join(dir, "places.json"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// --- writing, with the network stubbed out ---------------------------------------------------
describe("writeReceipt", () => {
  it("writes the run's receipt beside accepted.json, readable by the guard", async () => {
    const { writeReceipt } = await import("../../scripts/resolve-place.mjs");
    const dir = mkdtempSync(join(tmpdir(), "resolve-"));
    try {
      const entry = receiptFrom(SUMMIT_HIT, {
        label: "Cervin",
        query: "Cervin",
      });
      writeReceipt(dir, entry);
      const written = JSON.parse(
        readFileSync(join(dir, "places.json"), "utf8"),
      );
      expect(written.resolutions).toHaveLength(1);
      expect(written.resolutions[0].label).toBe("Cervin");

      // A second lookup for the same place replaces its entry rather than doubling it.
      writeReceipt(
        dir,
        receiptFrom(GLACIER_HIT, { label: "Cervin", query: "Cervin" }),
      );
      const again = JSON.parse(readFileSync(join(dir, "places.json"), "utf8"));
      expect(again.resolutions).toHaveLength(1);
      expect(again.resolutions[0].lon).toBe(GLACIER_HIT.lon);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
