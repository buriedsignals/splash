import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "../loop/freeze";
import { writeManifest, type RunManifest } from "../loop/manifest";

// SPAWNED, and the whole point is that it is spawned. `draftBeats`/`applyBeats` were reached from
// exactly one place — a proof that calls `produce()` directly — so the two turns were exercised
// while the DRIVER had no `case "draft-beats"` and the façade had no command for the authoring
// turn. A run therefore froze in silence between them: `next` answered `draft-beats` forever and
// nothing anywhere could perform it. A test that called the verbs in process would prove exactly
// what was already true, which is how four rounds of review missed it. This one drives the CLI.
const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin = "",
): Promise<{ code: number; body: Record<string, unknown> }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(p.stdout).text();
  const code = await p.exited;
  return { code, body: JSON.parse(out) };
}

function manifest(dir: string): RunManifest {
  return JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
}

type DraftedBeat = NonNullable<
  RunManifest["elements"][number]["narrative"]
>["beats"][number];

function plan(dir: string): DraftedBeat[] {
  return manifest(dir).elements[0]!.narrative!.beats;
}

// A run standing exactly where the loop used to freeze: a chart-track scrolly the journalist has
// chosen, with no walk drafted for it yet. Seeded on disk rather than driven from `init` because
// what is under test is the two turns, not the offer that reaches them.
function scrollyAwaitingItsWalk(): string {
  const dir = mkdtempSync(join(tmpdir(), "host-author-beats-"));
  const src = join(dir, "seaice.csv");
  writeFileSync(
    src,
    "year,extent\n1979,7.05\n1990,6.24\n2000,6.32\n2007,4.28\n2012,3.57\n2020,3.92\n2025,4.31\n",
  );
  const run: RunManifest = {
    runId: "host-beats",
    schemaVersion: 6,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "NSIDC Sea Ice Index",
        url: "https://nsidc.org/data/seaice_index",
      },
    },
    orient: {
      profile: {
        columns: ["year", "extent"],
        numericColumns: ["year", "extent"],
        rowCount: 7,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway:
            "La banquise arctique de septembre ne s'est jamais reconstituée",
          altInsight:
            "L'étendue minimale de septembre est passée de 7 à 4,3 millions de km² entre 1979 et 2025.",
          unit: "million km²",
        },
        proposal: {
          options: [
            {
              id: "line-scrolly",
              nativeType: "line",
              engine: "chart-native",
              format: "scrolly",
              why: "une série dont la forme se raconte au fil du défilement",
            },
          ],
          excluded: [],
          chosenId: "line-scrolly",
        },
      },
    ],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

// The claims, written from each beat's OWN grounding — the shape a desk sends. Every number in a
// sentence is one the draft already carried, which is what verifyBeats checks.
function walkFor(dir: string): string {
  return JSON.stringify(
    plan(dir).map((b) => ({
      id: b.id,
      role: b.role,
      text: `${b.draftText} — le recul ne s'est jamais inversé.`,
    })),
  );
}

describe("the article branch's two turns, driven through the façade", () => {
  it("advances through draft-beats, stops at the authoring turn, and reaches produce once it is written", async () => {
    const dir = scrollyAwaitingItsWalk();

    // 1. WHERE THE RUN USED TO FREEZE. `next` says draft-beats — and now `advance` performs it.
    expect((await cli(["next", "--run", dir])).body.value).toEqual({
      nextActions: ["draft-beats"],
    });
    const drafted = await cli(["advance", "--run", dir]);
    expect(drafted.code).toBe(0);
    expect(drafted.body.value).toEqual({
      ran: "draft-beats",
      nextActions: ["author-beats"],
    });

    // The walk is on disk, and every claim is UNWRITTEN — the seam's whole point.
    const beats = plan(dir);
    expect(beats.length).toBeGreaterThanOrEqual(3);
    expect(beats.every((b) => b.text === "")).toBe(true);
    expect(beats.every((b) => b.draftText.length > 0)).toBe(true);

    // 2. THE AUTHORING TURN IS THE JOURNALIST'S — `advance` refuses it and NAMES the command
    //    that performs it, which is the difference between a stop and a freeze.
    const stopped = await cli(["advance", "--run", dir]);
    expect(stopped.code).toBe(1);
    expect(stopped.body.code).toBe("step-refused");
    expect(String(stopped.body.message)).toContain("author-beats --run <dir>");
    // Refused, and the run is untouched: still unwritten, still owed.
    expect(plan(dir).every((b) => b.text === "")).toBe(true);

    // 3. THE JOURNALIST WRITES IT.
    const authored = await cli(["author-beats", "--run", dir], walkFor(dir));
    expect(authored.code).toBe(0);
    expect(authored.body.value).toEqual({
      authored: "e1",
      nextActions: ["produce"],
    });

    // 4. …and the run stands at produce — the gate a plan nobody wrote could never reach.
    expect(plan(dir).every((b) => b.text.trim() !== "")).toBe(true);
    expect((await cli(["next", "--run", dir])).body.value).toEqual({
      nextActions: ["produce"],
    });
  }, 60_000);

  it("refuses an invented number in the guard's own words, and writes nothing", async () => {
    const dir = scrollyAwaitingItsWalk();
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const invented = JSON.stringify(
      plan(dir).map((b, i) => ({
        id: b.id,
        role: b.role,
        text:
          i === 0 ? "La banquise a reculé de 61,4 % depuis 1979." : b.draftText,
      })),
    );
    const r = await cli(["author-beats", "--run", dir], invented);
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("61.4");
    // A refused authoring turn leaves the walk exactly as drafted.
    expect(plan(dir).every((b) => b.text === "")).toBe(true);
  }, 60_000);

  it("refuses a plan whose order changed", async () => {
    const dir = scrollyAwaitingItsWalk();
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const reordered = JSON.stringify(
      plan(dir)
        .map((b) => ({ id: b.id, role: b.role, text: b.draftText }))
        .reverse(),
    );
    const r = await cli(["author-beats", "--run", dir], reordered);
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toMatch(/order/i);
  }, 60_000);

  it("refuses a body that is not a list of authored beats", async () => {
    const dir = scrollyAwaitingItsWalk();
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const r = await cli(
      ["author-beats", "--run", dir],
      JSON.stringify([{ id: "beat-1", text: "sans rôle" }]),
    );
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("author-beats reads a LIST");
  }, 60_000);

  it("refuses an element id this run does not hold", async () => {
    const dir = scrollyAwaitingItsWalk();
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const r = await cli(
      ["author-beats", "--run", dir, "--element", "ghost"],
      walkFor(dir),
    );
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain('"e1"');
  }, 60_000);

  it("refuses an empty stdin as a usage problem", async () => {
    const dir = scrollyAwaitingItsWalk();
    const r = await cli(["author-beats", "--run", dir], "");
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
  }, 60_000);
});
