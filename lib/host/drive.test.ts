import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { advanceRun, chooseFormIn, requestDeliveryIn } from "./drive";
import {
  provenanceHash,
  writeManifest,
  type RunElement,
  type RunManifest,
} from "../loop/manifest";
import { freezeInput } from "../loop/freeze";

function emptyDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

// A run on disk with a frozen input and nothing done yet.
function freshRun(): string {
  const dir = emptyDir("drive-fresh-");
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  const run: RunManifest = {
    runId: "drive",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

// A run standing at the choice: oriented, angled, an offer on the table.
function proposedRun(over: Partial<RunElement> = {}): string {
  const dir = emptyDir("drive-proposed-");
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  const run: RunManifest = {
    runId: "drive-proposed",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    orient: {
      profile: {
        columns: ["canton", "2015", "2024"],
        numericColumns: ["2015", "2024"],
        rowCount: 2,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Premiums rose in both cantons",
          altInsight: "Both cantons' adult premium rose from 2015 to 2024.",
          unit: "CHF",
        },
        proposal: {
          options: [
            {
              id: "slope",
              nativeType: "slope",
              engine: "chart-native",
              format: "static",
              why: "two points, one line each",
            },
          ],
          excluded: [],
        },
        ...over,
      },
    ],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

// A run whose element already carries a (recorded) artifact, so a delivery can be decided on.
function producedRun(): string {
  const dir = proposedRun({
    proposal: {
      options: [
        {
          id: "slope",
          nativeType: "slope",
          engine: "chart-native",
          format: "static",
          why: "two points, one line each",
        },
      ],
      excluded: [],
      chosenId: "slope",
    },
  });
  const path = join(dir, "run.json");
  const run = JSON.parse(readFileSync(path, "utf8")) as RunManifest;
  const el = run.elements[0]!;
  const produced: RunManifest = {
    ...run,
    elements: [
      {
        ...el,
        artifact: {
          path: "elements/e1/static.png",
          sha256: "not-read-by-the-decision",
          provenanceHash: provenanceHash(run, el),
          producedAt: "2026-07-26T00:00:00.000Z",
        },
      },
    ],
  };
  writeManifest(path, produced);
  return dir;
}

function bytes(dir: string): string {
  return readFileSync(join(dir, "run.json"), "utf8");
}

describe("advanceRun — one deterministic step, through the run directory", () => {
  it("runs the step next says is valid and persists it", async () => {
    const dir = freshRun();
    const r = await advanceRun(dir);
    expect(r.ok).toBe(true);
    expect((r as { value: { ran: string } }).value.ran).toBe("orient");
    // Persisted, not just returned: the next invocation is a separate process.
    expect(JSON.parse(bytes(dir)).orient).toBeDefined();
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["confirm-angle"]);
  });

  it("refuses a human turn, naming the command that performs it", async () => {
    const before = proposedRun();
    const r = await advanceRun(before);
    expect(r).toMatchObject({ ok: false, code: "step-refused" });
    // The point of the refusal: a host learns what to do instead, not just that it failed.
    expect((r as { message: string }).message).toContain("choose-form");
    expect(bytes(before)).toBe(bytes(before));
  });

  it("leaves the manifest untouched when there is nothing to run", async () => {
    const dir = proposedRun();
    const before = bytes(dir);
    await advanceRun(dir);
    expect(bytes(dir)).toBe(before);
  });

  it("refuses a run directory that holds no run", async () => {
    const r = await advanceRun(emptyDir("drive-norun-"));
    expect(r).toMatchObject({ ok: false, code: "no-run" });
  });

  it("refuses a manifest written against an older schema rather than migrating it", async () => {
    const dir = emptyDir("drive-stale-");
    writeFileSync(
      join(dir, "run.json"),
      JSON.stringify({ runId: "old", schemaVersion: 3, elements: [] }),
    );
    const r = await advanceRun(dir);
    expect(r).toMatchObject({ ok: false, code: "stale-schema" });
  });
});

describe("chooseFormIn — the journalist's choice, persisted", () => {
  it("writes the chosen id and reports what became valid", () => {
    const dir = proposedRun();
    const r = chooseFormIn(dir, "slope");
    expect(r.ok).toBe(true);
    expect((r as { value: { chosen: string } }).value.chosen).toBe("slope");
    expect(JSON.parse(bytes(dir)).elements[0].proposal.chosenId).toBe("slope");
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["produce"]);
  });

  it("refuses an id that is not in the offer, and writes NOTHING", () => {
    const dir = proposedRun();
    const before = bytes(dir);
    const r = chooseFormIn(dir, "not-offered");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect(bytes(dir)).toBe(before);
  });

  it("refuses a run with no element to decide about", () => {
    const dir = emptyDir("drive-noel-");
    writeManifest(join(dir, "run.json"), {
      runId: "empty",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
    });
    const r = chooseFormIn(dir, "slope");
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });

  it("refuses an unreadable run the same way every other command does", () => {
    expect(chooseFormIn(emptyDir("drive-choose-norun-"), "x")).toMatchObject({
      ok: false,
      code: "no-run",
    });
  });
});

describe("requestDeliveryIn — where it goes, decided and recorded", () => {
  it("derives the destination from the format's genre when none is named", () => {
    const dir = producedRun();
    const r = requestDeliveryIn(dir);
    expect(r.ok).toBe(true);
    // A static image is a FILE genre: the portable package, never a hosted embed.
    expect((r as { value: { requested: string[] } }).value.requested).toEqual([
      "zip",
    ]);
    expect(JSON.parse(bytes(dir)).elements[0].delivery.requested).toEqual([
      "zip",
    ]);
    // And THAT is what makes the deliver step valid — the whole point of the decision.
    expect(
      (r as { value: { nextActions: string[] } }).value.nextActions,
    ).toEqual(["deliver"]);
  });

  it("honours the destinations the journalist named", () => {
    const dir = producedRun();
    const r = requestDeliveryIn(dir, ["embed-s3"]);
    expect(r.ok).toBe(true);
    expect((r as { value: { requested: string[] } }).value.requested).toEqual([
      "embed-s3",
    ]);
  });

  it("refuses a destination this install does not know, and writes NOTHING", () => {
    const dir = producedRun();
    const before = bytes(dir);
    const r = requestDeliveryIn(dir, ["embed-dropbox"]);
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
    expect(bytes(dir)).toBe(before);
  });

  it("refuses before anything has been produced", () => {
    const dir = proposedRun();
    const r = requestDeliveryIn(dir);
    expect(r).toMatchObject({ ok: false, code: "invalid-request" });
  });
});
