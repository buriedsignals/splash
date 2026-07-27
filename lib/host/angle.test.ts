import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { parseManifest, provenanceHash, writeManifest } from "../loop/manifest";

// Spawned only: `confirm-angle` exists so a host outside JavaScript can answer the one human
// turn the façade could previously only NAME.
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

const TAKEAWAY = "Les primes ont augmenté dans les six cantons";
const ALT = "La prime adulte passe de 449 à 583 francs entre 2015 et 2024.";
// What the journalist wants the figure to SHOW — declared, not read out of TAKEAWAY's wording.
const INTENT = "change-over-time";

async function initialised(elements?: unknown[]): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), "host-angle-"));
  const csv = join(dir, "premiums.csv");
  writeFileSync(csv, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  const r = await cli(
    ["init", "--run", dir],
    JSON.stringify({
      runId: "premiums",
      input: { data: csv },
      sources: {
        mode: "real",
        data: { kind: "local", label: "Relevés cantonaux 2024" },
      },
      ...(elements ? { elements } : {}),
    }),
  );
  expect(r.code).toBe(0);
  return dir;
}

function manifest(dir: string): Record<string, any> {
  return JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
}

describe("confirm-angle: the human turn the façade could only name", () => {
  it("records the parts and reports what became valid", async () => {
    const dir = await initialised();
    expect((await cli(["advance", "--run", dir])).code).toBe(0); // orient
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      INTENT,
    ]);
    expect(r.code).toBe(0);
    expect(r.body.value).toMatchObject({
      confirmed: "el1",
      nextActions: ["propose"],
    });
    expect(manifest(dir).elements[0].angle).toEqual({
      confirmedTakeaway: TAKEAWAY,
      altInsight: ALT,
      unit: "CHF",
      intent: INTENT,
    });
  });

  // THE SLICE'S OWN REFUSAL. The intent used to be guessed from --takeaway by a keyword pass
  // that answered nothing on ordinary French claims, so the offer was ordered by fit and
  // readiness alone with the run saying nothing. It is now one of the angle's declared parts,
  // and it is refused absent like the other three.
  it("refuses a missing --intent, and points at the command that asks it editorially", async () => {
    const dir = await initialised();
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
    ]);
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
    expect(String(r.body.message)).toContain("--intent");
    // Never "pick one of: deviation, correlation, …" — a journalist is not asked in machine ids.
    expect(String(r.body.message)).toContain("suggest-intent");
  });

  it("refuses an intent outside the vocabulary, listing what it accepts", async () => {
    const dir = await initialised();
    expect((await cli(["advance", "--run", dir])).code).toBe(0); // orient
    const before = readFileSync(join(dir, "run.json"));
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      "pie-chart",
    ]);
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("part-to-whole");
    expect(readFileSync(join(dir, "run.json"))).toEqual(before);
  });

  it("carries an emphasis when the journalist names one", async () => {
    const dir = await initialised();
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      INTENT,
      "--emphasis",
      "Genève",
    ]);
    expect(r.code).toBe(0);
    expect(manifest(dir).elements[0].angle.emphasis).toBe("Genève");
  });

  // A missing FLAG is a malformed command line (2); a blank VALUE is a well-formed request the
  // loop declined (1). The same split every other acting command draws.
  it("refuses a missing --takeaway as a usage problem", async () => {
    const dir = await initialised();
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      INTENT,
    ]);
    expect(r.code).toBe(2);
    expect(r.body.code).toBe("usage");
    expect(String(r.body.message)).toContain("--takeaway");
  });

  it("refuses a blank alt text as a refusal, and leaves the run byte-identical", async () => {
    const dir = await initialised();
    const before = readFileSync(join(dir, "run.json"));
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      "   ",
      "--unit",
      "CHF",
      "--intent",
      INTENT,
    ]);
    expect(r.code).toBe(1);
    expect(r.body.code).toBe("invalid-request");
    expect(String(r.body.message)).toContain("1.1.1");
    expect(readFileSync(join(dir, "run.json"))).toEqual(before);
  });

  it("refuses an element id this run does not hold, listing the ones it does", async () => {
    const dir = await initialised([{ id: "web" }, { id: "social" }]);
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--element",
      "print",
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      INTENT,
    ]);
    expect(r.code).toBe(1);
    expect(String(r.body.message)).toContain('"web"');
    expect(String(r.body.message)).toContain('"social"');
  });

  it("says nothing about staleness when nothing has been produced", async () => {
    const dir = await initialised();
    expect((await cli(["advance", "--run", dir])).code).toBe(0);
    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      TAKEAWAY,
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      INTENT,
    ]);
    expect("staled" in (r.body.value as object)).toBe(false);
  });

  // The parked residual of the parity spec ("nothing warns the host that its decision cancels
  // finished work"), closed for this decision: re-confirming is legitimate, and it SAYS what it
  // invalidated. Built with writeManifest rather than a real produce — this asserts the warning,
  // not the renderer, and lib/host/journey.test.ts drives the real one.
  it("warns when a re-confirmed angle stales a produced artifact", async () => {
    const dir = await initialised();
    expect((await cli(["advance", "--run", dir])).code).toBe(0); // orient
    expect(
      (
        await cli([
          "confirm-angle",
          "--run",
          dir,
          "--takeaway",
          TAKEAWAY,
          "--alt-insight",
          ALT,
          "--unit",
          "CHF",
          "--intent",
          INTENT,
        ])
      ).code,
    ).toBe(0);

    const run = manifest(dir);
    const png = join(dir, "static.png");
    writeFileSync(png, "not really a png, but bytes with a hash");
    run.elements[0].proposal = {
      options: [{ id: "bar", nativeType: "bar", why: "une barre se compare" }],
      excluded: [],
      chosenId: "bar",
    };
    run.elements[0].artifact = {
      path: "static.png",
      sha256: Buffer.from(sha256(readFileSync(png))).toString("hex"),
      provenanceHash: provenanceHash(
        parseManifest(run),
        parseManifest(run).elements[0]!,
      ),
      producedAt: new Date().toISOString(),
    };
    writeManifest(join(dir, "run.json"), parseManifest(run));

    const r = await cli([
      "confirm-angle",
      "--run",
      dir,
      "--takeaway",
      "Genève est le canton le plus cher",
      "--alt-insight",
      ALT,
      "--unit",
      "CHF",
      "--intent",
      INTENT,
    ]);
    expect(r.code).toBe(0);
    expect(r.body.value).toMatchObject({ staled: true });
  });

  it("names the command in advance's refusal instead of saying no command exists", async () => {
    const dir = await initialised();
    expect((await cli(["advance", "--run", dir])).code).toBe(0); // orient
    const blocked = await cli(["advance", "--run", dir]);
    expect(blocked.code).toBe(1);
    expect(String(blocked.body.message)).toContain("confirm-angle --run");
    expect(String(blocked.body.message)).not.toContain("no façade command");
  });
});
