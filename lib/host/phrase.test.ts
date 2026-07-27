import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RunManifest } from "../loop/manifest";

// Spawned only. The point of this command is that `applyPhrasing` — documented as "the one path
// that writes a why" and guarded by verifyOffer — had NO production caller at all, so the
// proposal brain's central promise (explain WHY, in the journalist's language) produced nothing
// on any real path. A test that called it in process would prove exactly what was already true.
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

// A run driven by the façade alone up to a real, un-phrased offer.
async function offered(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "host-phrase-"));
  const csv = join(dir, "premiums.csv");
  writeFileSync(csv, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  expect(
    (
      await cli(
        ["init", "--run", dir],
        JSON.stringify({
          runId: "premiums",
          input: { data: csv },
          sources: {
            mode: "real",
            data: { kind: "local", label: "Relevés cantonaux 2024" },
          },
          elements: [{ id: "el1", requestedFormat: "static" }],
        }),
      )
    ).code,
  ).toBe(0);
  expect((await cli(["advance", "--run", dir])).code).toBe(0); // orient
  expect(
    (
      await cli([
        "confirm-angle",
        "--run",
        dir,
        "--takeaway",
        "Les primes ont augmenté dans les deux cantons",
        "--alt-insight",
        "La prime adulte passe de 449 à 583 francs entre 2015 et 2024.",
        "--unit",
        "CHF",
        "--intent",
        "change-over-time",
      ])
    ).code,
  ).toBe(0);
  expect((await cli(["advance", "--run", dir])).code).toBe(0); // propose
  return dir;
}

// The phrasing a well-behaved host writes: every option, in the offer's order, each mark
// acknowledged, and no number that is not already in that option's own grounding.
function phrasingFor(dir: string): string {
  return JSON.stringify(
    manifest(dir).elements[0]!.proposal!.options.map((o) => ({
      id: o.id,
      why: `Cette forme met en évidence l'écart entre les cantons (${o.nativeType}).`,
      ...(o.readiness ? { markAcknowledged: true } : {}),
    })),
  );
}

describe("phrase: the production caller applyPhrasing never had", () => {
  it("a fresh offer is un-phrased, and the loop says so instead of inviting a blind choice", async () => {
    const dir = await offered();
    expect(
      manifest(dir).elements[0]!.proposal!.options.every((o) => o.why === ""),
    ).toBe(true);
    const next = await cli(["next", "--run", dir]);
    expect((next.body.value as { nextActions: string[] }).nextActions).toEqual([
      "phrase",
    ]);
  });

  it("writes the desk's prose onto the manifest and unblocks the choice", async () => {
    const dir = await offered();
    const r = await cli(["phrase", "--run", dir], phrasingFor(dir));
    expect(r.code).toBe(0);
    expect(r.body.value).toMatchObject({ nextActions: ["choose-form"] });
    const options = manifest(dir).elements[0]!.proposal!.options;
    expect(options.every((o) => o.why.trim() !== "")).toBe(true);
    expect(options[0]!.why).toContain("écart entre les cantons");
  });

  it("advance names the command rather than stalling silently", async () => {
    const dir = await offered();
    const blocked = await cli(["advance", "--run", dir]);
    expect(blocked.code).toBe(1);
    expect(String(blocked.body.message)).toContain("phrase --run");
  });

  // The guard, reached through the façade. It THROWS by design; the façade never throws, so a
  // violation has to arrive as a refusal with the guard's own words.
  it("refuses a phrasing that reordered the offer, and writes nothing", async () => {
    const dir = await offered();
    const before = readFileSync(join(dir, "run.json"));
    const reversed = JSON.parse(phrasingFor(dir)).reverse();
    const r = await cli(["phrase", "--run", dir], JSON.stringify(reversed));
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("order changed");
    expect(readFileSync(join(dir, "run.json"))).toEqual(before);
  });

  it("refuses a phrasing that dropped an option", async () => {
    const dir = await offered();
    const short = JSON.parse(phrasingFor(dir)).slice(0, 1);
    const r = await cli(["phrase", "--run", dir], JSON.stringify(short));
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain("order changed");
  });

  it("refuses a blank why — an option nobody wrote is not shown", async () => {
    const dir = await offered();
    const blanked = JSON.parse(phrasingFor(dir)).map(
      (p: { id: string }, i: number) => (i === 0 ? { ...p, why: "  " } : p),
    );
    const r = await cli(["phrase", "--run", dir], JSON.stringify(blanked));
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain("no why");
  });

  // Claim grounding, end to end: a number the brain never computed cannot reach the journalist.
  it("refuses a number that is in neither the facts nor the sheet", async () => {
    const dir = await offered();
    const invented = JSON.parse(phrasingFor(dir)).map(
      (p: { id: string; why: string }, i: number) =>
        i === 0
          ? { ...p, why: "Les primes ont bondi de 87 % depuis 2015." }
          : p,
    );
    const r = await cli(["phrase", "--run", dir], JSON.stringify(invented));
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain("87");
  });

  it("refuses a phrasing for an id that was not offered", async () => {
    const dir = await offered();
    const ghost = JSON.parse(phrasingFor(dir));
    ghost[0].id = "not-offered";
    const r = await cli(["phrase", "--run", dir], JSON.stringify(ghost));
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain("not-offered");
  });

  it("refuses a body that is not a list of phrasings", async () => {
    const dir = await offered();
    const r = await cli(["phrase", "--run", dir], JSON.stringify({ bar: "x" }));
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
  });

  it("refuses an element id this run does not hold", async () => {
    const dir = await offered();
    const r = await cli(
      ["phrase", "--run", dir, "--element", "ghost"],
      phrasingFor(dir),
    );
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain('"el1"');
  });

  it("refuses an empty stdin as a usage problem", async () => {
    const dir = await offered();
    const r = await cli(["phrase", "--run", dir], "");
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
  });
});
