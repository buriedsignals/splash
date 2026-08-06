import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve(import.meta.dir, "./cli.ts");
const SAMPLES = resolve(
  import.meta.dir,
  "../../skills/map-native/assets/sample-data",
);

type Answer = {
  ok: boolean;
  code?: string;
  message?: string;
  value?: {
    type?: string;
    readable?: boolean;
    readFrom?: string;
    marks?: number;
    why?: string;
    carriers?: { kind: string; why: string }[];
    notOffered?: { kind: string; why: string }[];
  };
};

function ask(configPath: string): { status: number; body: Answer } {
  const r = spawnSync("bun", [CLI, "sweep-carriers", "--config", configPath], {
    encoding: "utf8",
  });
  return { status: r.status ?? -1, body: JSON.parse(r.stdout) as Answer };
}

/** A config on disk, the way a proposal would hand one over. */
function configFile(name: string, body: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "sweep-carriers-"));
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(body));
  return path;
}

describe("the sweep-carriers command — what this map's data can drive", () => {
  it("answers a real choropleth from its own rows, and exits 0", () => {
    const { status, body } = ask(join(SAMPLES, "choropleth.json"));
    expect(status).toBe(0);
    expect(body.ok).toBe(true);
    expect(body.value?.type).toBe("choropleth");
    expect(body.value?.readable).toBe(true);
    expect(body.value?.readFrom).toBe("rows");
    // The sample carries a share per country: a threshold can fall through them, a line can
    // sweep across the regions themselves, and the walk's own order is always available.
    expect(body.value?.carriers?.map((c) => c.kind)).toEqual([
      "threshold",
      "space",
      "order",
    ]);
    // Every `why` is a sentence to say to a journalist, never a token.
    for (const c of body.value!.carriers!)
      expect(c.why.length).toBeGreaterThan(20);
  });

  // The point of the command: the carriers a config cannot drive are NAMED, with the reason
  // that would be said out loud. A capability that vanishes silently is one nobody argues with.
  it("names the carriers this data cannot drive, each with its own reason", () => {
    const { body } = ask(join(SAMPLES, "choropleth.json"));
    const missing = body.value?.notOffered ?? [];
    expect(missing.map((c) => c.kind).sort()).toEqual(["route", "time"]);
    expect(missing.find((c) => c.kind === "time")?.why).toContain("no date");
    // Between them, the two lists account for every carrier there is.
    expect((body.value?.carriers?.length ?? 0) + missing.length).toBe(5);
  });

  it("offers the geographic sweep on a point map, which carries coordinates", () => {
    const { body } = ask(join(SAMPLES, "symbol.json"));
    expect(body.value?.type).toBe("symbol");
    expect(body.value?.readFrom).toBe("points");
    expect(body.value?.marks).toBe(6);
    expect(body.value?.carriers?.map((c) => c.kind)).toEqual([
      "threshold",
      "space",
      "order",
    ]);
  });

  it("offers no threshold on a locator, whose markers carry no value by design", () => {
    const { body } = ask(join(SAMPLES, "locator-few.json"));
    expect(body.value?.carriers?.map((c) => c.kind)).toEqual([
      "space",
      "order",
    ]);
    expect(
      body.value?.notOffered?.find((c) => c.kind === "threshold")?.why,
    ).toContain("no number");
  });

  // The clock is offered off a DECLARED column, never off a column that happens to look like
  // dates: a carrier read from a guess is one the render may not be able to drive.
  it("offers the clock when the config declares its temporal column, and not otherwise", () => {
    const rows = [
      { code: "NOR", share: 99, year: 2019 },
      { code: "SWE", share: 68, year: 2021 },
    ];
    const base = {
      basemap: "world",
      regionKey: "code",
      valueField: "share",
      rows,
    };

    const undeclared = ask(configFile("no-time.json", base));
    expect(undeclared.body.value?.carriers?.map((c) => c.kind)).not.toContain(
      "time",
    );

    const declared = ask(
      configFile("time.json", { ...base, timeField: "year" }),
    );
    expect(declared.body.value?.carriers?.map((c) => c.kind)).toEqual([
      "time",
      "threshold",
      "space",
      "order",
    ]);
  });

  it("reads a date string as well as a year, in a declared temporal column", () => {
    const { body } = ask(
      configFile("dates.json", {
        basemap: "world",
        regionKey: "code",
        valueField: "share",
        timeField: "when",
        rows: [
          { code: "NOR", share: 99, when: "2019-03-01" },
          { code: "SWE", share: 68, when: "2021-11-14" },
        ],
      }),
    );
    expect(body.value?.carriers?.map((c) => c.kind)).toContain("time");
  });

  // `Number("n/a")` is NaN and `typeof NaN === "number"`, so a column of blanks and dashes would
  // otherwise offer a threshold with nothing to fall through.
  it("does not read an unparseable value as a number", () => {
    const { body } = ask(
      configFile("dirty.json", {
        basemap: "world",
        regionKey: "code",
        valueField: "share",
        rows: [
          { code: "NOR", share: "n/a" },
          { code: "SWE", share: "" },
        ],
      }),
    );
    expect(body.value?.carriers?.map((c) => c.kind)).not.toContain("threshold");
    expect(
      body.value?.notOffered?.find((c) => c.kind === "threshold")?.why,
    ).toContain("no number");
  });

  // Two types keep their marks out of the file. Answering with a list assembled from whatever
  // else the config carries would be a guess; the reason is the answer.
  it("says WHY a route cannot be read here, instead of guessing", () => {
    const { status, body } = ask(join(SAMPLES, "route.json"));
    expect(status).toBe(0);
    expect(body.ok).toBe(true);
    expect(body.value?.type).toBe("route");
    expect(body.value?.readable).toBe(false);
    expect(body.value?.why).toContain("territories");
    expect(body.value?.carriers).toBeUndefined();
  });

  it("says WHY a hex grid cannot be read here", () => {
    const { body } = ask(join(SAMPLES, "hex-grid-count.json"));
    expect(body.value?.readable).toBe(false);
    expect(body.value?.why).toContain("cells");
  });

  // A file that is not a map at all is an INPUT problem, not an answer about a map.
  it("refuses a config that is not a map-native one, exit 2", () => {
    const { status, body } = ask(
      configFile("chart.json", { type: "bar", rows: [] }),
    );
    expect(status).toBe(2);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("not a map-native config");
  });

  it("refuses an unreadable path as a usage error, never a stack trace", () => {
    const { status, body } = ask(join(tmpdir(), "no-such-sweep-config.json"));
    expect(status).toBe(2);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("could not read");
    expect(body.message).not.toMatch(/\n\s+at \S/);
  });

  it("needs --config, and refuses an unknown flag", () => {
    const bare = spawnSync("bun", [CLI, "sweep-carriers"], {
      encoding: "utf8",
    });
    expect(bare.status).toBe(2);
    expect((JSON.parse(bare.stdout) as Answer).message).toContain("--config");

    const bogus = spawnSync("bun", [CLI, "sweep-carriers", "--bogus", "x"], {
      encoding: "utf8",
    });
    expect(bogus.status).toBe(2);
    expect((JSON.parse(bogus.stdout) as Answer).code).toBe("usage");
  });

  // Read-only, like its two sisters: it is asked one turn before a journalist is offered a
  // choice, and it must be safe to ask at any moment.
  it("writes nothing beside the config it reads", () => {
    const path = configFile("readonly.json", {
      basemap: "world",
      regionKey: "code",
      valueField: "share",
      rows: [{ code: "NOR", share: 99 }],
    });
    const before = spawnSync("ls", ["-1", resolve(path, "..")], {
      encoding: "utf8",
    }).stdout;
    ask(path);
    const after = spawnSync("ls", ["-1", resolve(path, "..")], {
      encoding: "utf8",
    }).stdout;
    expect(after).toBe(before);
  });
});
