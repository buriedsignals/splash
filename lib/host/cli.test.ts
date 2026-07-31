import { describe, it, expect } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeManifest, nextActions, type RunManifest } from "../loop/manifest";
import { freezeInput } from "../loop/freeze";

const CLI = join(import.meta.dir, "cli.ts");

async function run(
  args: string[],
  stdin = "",
): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return { code: await p.exited, out, err };
}

// Runs the CLI through a shell so stdin can be redirected from an arbitrary path — the way a
// host recipe actually invokes it, and the only way to reproduce `< $DIR`.
async function runWithStdinFrom(
  args: string[],
  path: string,
): Promise<{ code: number; out: string; err: string }> {
  const quoted = args.map((a) => `'${a.replaceAll("'", "'\\''")}'`).join(" ");
  const p = Bun.spawn(
    ["sh", "-c", `bun '${CLI}' ${quoted} < '${path.replaceAll("'", "'\\''")}'`],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return { code: await p.exited, out, err };
}

// A real run on disk, current schema, nothing done yet.
function makeRun(): string {
  const dir = mkdtempSync(join(tmpdir(), "cli-run-"));
  const src = join(dir, "src.csv");
  writeFileSync(src, "canton,growth\nGeneva,4.1\nVaud,2.8\n");
  const run: RunManifest = {
    runId: "cli-run",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(dir, src, "data") },
    elements: [{ id: "e1" }],
    events: [],
  };
  writeManifest(join(dir, "run.json"), run);
  return dir;
}

// A stack frame as Bun prints one — "      at fn (/abs/path.ts:1:2)" — matched whether it
// arrives as real newlines (stderr) or JSON-escaped inside a string (stdout). The escaped
// form is the one that matters: a trace smuggled into a `message` is still a trace on stdout.
const STACK_FRAME = /(?:\\n|\n)\s+at \S.*:\d+:\d+/;

describe("the CLI façade — JSON in, JSON out, stable exit codes", () => {
  it("verbs prints the capability declaration in the shared envelope and exits 0", async () => {
    const r = await run(["verbs"]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    // One envelope for every command — `verbs` used to emit a bare object with no `ok`.
    expect(body.ok).toBe(true);
    expect(body.value.contract).toBe("splash-verbs/1");
    expect(body.value.verbs.map((v: { name: string }) => v.name)).toContain(
      "render",
    );
    // Wired to real engines in a process that imports ONLY the façade.
    expect(body.value.vocabulary.engines.length).toBeGreaterThan(0);
  });

  it("an unknown command exits 2 with a JSON error, never a stack trace", async () => {
    const r = await run(["explode"]);
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
    // Pinned exactly, not a substring: the wording — including the full command list — is
    // part of the surface a host reads, not an implementation detail.
    expect(body.message).toBe(
      'unknown command "explode" — expected verbs, state, next, init, advance, ' +
        "suggest-intent, confirm-angle, phrase, choose-form, author-beats, approve, " +
        "request-delivery, verb, newsroom, precheck, present or probe",
    );
    // The real assertion: the DOCUMENT the host reads carries no stack trace either. stderr
    // being empty on this path made the old `r.err` version trivially true.
    expect(r.out).not.toMatch(STACK_FRAME);
    expect(r.out).not.toContain(import.meta.dir);
    expect(r.err).toBe("");
  });

  it("state on a directory with no run exits 2 with a typed refusal", async () => {
    const r = await run([
      "state",
      "--run",
      mkdtempSync(join(tmpdir(), "cli-norun-")),
    ]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("no-run");
  });

  it("a verb outside the closed vocabulary exits 1 with invalid-request", async () => {
    const r = await run(["verb", "fetch-data"], JSON.stringify({}));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
  });

  // `capture` used to answer not-implemented here. The verify layer gave it a body
  // (lib/core/verbs/capture.ts), so an empty payload is now refused for being MALFORMED
  // rather than for the verb not existing — the exit code and the JSON-body contract this
  // test really guards are unchanged.
  it("a declared verb with a malformed payload exits 1 with invalid-request", async () => {
    const r = await run(["verb", "capture"], JSON.stringify({}));
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).code).toBe("invalid-request");
  });

  it("unparseable stdin exits 2, and says so as JSON", async () => {
    const r = await run(["verb", "render"], "{ not json");
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
  });

  it("stdout carries ONLY the JSON document — a host parses it whole", async () => {
    const r = await run(["verbs"]);
    expect(() => JSON.parse(r.out)).not.toThrow();
  });
});

describe("next — driven through the CLI, not only through its function", () => {
  it("answers the run-level next actions, and nothing else", async () => {
    const dir = makeRun();
    const r = await run(["next", "--run", dir]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(true);
    // The narrow half of `state`: EXACTLY nextActions. A `state`/`next` mis-wiring in
    // cli.ts's ternary would put a whole resume report here (or vice versa) and pass every
    // other test in this file.
    expect(Object.keys(body.value)).toEqual(["nextActions"]);
    expect(body.value.nextActions).toEqual([
      ...nextActions({
        runId: "cli-run",
        schemaVersion: 5,
        route: "embed",
        channel: "article-web",
        input: {},
        elements: [{ id: "e1" }],
        events: [],
      }),
    ]);
  });

  it("state answers the full report on the same run — the two are not interchangeable", async () => {
    const dir = makeRun();
    const s = JSON.parse((await run(["state", "--run", dir])).out);
    const n = JSON.parse((await run(["next", "--run", dir])).out);
    // `route` is part of the report: the run's DECLARED relationship to the text, handed back to
    // the desk that declared it. Reported only — nothing routes on it (lib/loop/manifest.ts).
    expect(Object.keys(s.value).sort()).toEqual(
      ["elements", "inputValidation", "route", "runId"].sort(),
    );
    expect(Object.keys(n.value)).toEqual(["nextActions"]);
  });

  it("refuses an unreadable run the same way state does", async () => {
    const r = await run([
      "next",
      "--run",
      mkdtempSync(join(tmpdir(), "cli-next-norun-")),
    ]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("no-run");
  });
});

describe("argv handling — an unrecognised flag is a usage refusal, not silence", () => {
  it("accepts --run=<dir> as well as --run <dir>", async () => {
    const dir = makeRun();
    // Used to answer "state needs --run <dir>" though --run WAS given.
    const eq = await run(["state", `--run=${dir}`]);
    expect(eq.code).toBe(0);
    expect(JSON.parse(eq.out).ok).toBe(true);
    const space = await run(["state", "--run", dir]);
    expect(JSON.parse(space.out)).toStrictEqual(JSON.parse(eq.out));
  });

  it("refuses an unknown flag rather than ignoring a typo", async () => {
    const r = await run(["state", "--run", makeRun(), "--bogus"]);
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("--bogus");
  });

  it("refuses a flag with no value", async () => {
    const r = await run(["state", "--run"]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("usage");
  });

  it("refuses a positional argument state does not take", async () => {
    const r = await run(["state", makeRun()]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("usage");
  });

  it("refuses a flag on verb rather than ignoring it — verb takes no --run", async () => {
    const r = await run(["verb", "render", "--run", "/x"], JSON.stringify({}));
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("--run");
  });

  it("refuses verbs with any argument at all", async () => {
    const r = await run(["verbs", "--run", "/x"]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("usage");
  });
});

describe("the never-throw boundary — structural, not audited by reading", () => {
  it("stdin redirected from a DIRECTORY is a usage refusal, not an EISDIR stack trace", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cli-eisdir-"));
    const r = await runWithStdinFrom(["verb", "render"], dir);
    // Was: exit 1 (the code that means "the verb was refused"), empty stdout, an EISDIR
    // stack trace on stderr — a host reads 1, parses nothing, and fails opaquely.
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("stdin");
    expect(r.out).not.toMatch(STACK_FRAME);
    expect(r.err).not.toMatch(STACK_FRAME);
  });

  it("every hostile invocation still answers one JSON document and one documented exit code", async () => {
    const populated = join(mkdtempSync(join(tmpdir(), "cli-hostile-")), "kept");
    mkdirSync(populated, { recursive: true });
    writeFileSync(join(populated, "notes.txt"), "not an artifact");

    const cases: { args: string[]; stdin?: string }[] = [
      { args: [] },
      { args: ["explode"] },
      { args: ["--run", "/x"] },
      { args: ["verbs", "extra"] },
      { args: ["state"] },
      { args: ["state", "--run"] },
      { args: ["state", "--run=", "x"] },
      { args: ["next", "--run", "/definitely/not/here"] },
      { args: ["verb"] },
      { args: ["verb", "--run"] },
      { args: ["verb", "render"], stdin: "" },
      { args: ["verb", "render"], stdin: "{ not json" },
      { args: ["verb", "render"], stdin: "[]" },
      { args: ["verb", "render"], stdin: "null" },
      { args: ["verb", "render"], stdin: '"a string"' },
      { args: ["verb", "render"], stdin: JSON.stringify({ outDir: "." }) },
      { args: ["verb", "render"], stdin: JSON.stringify({ outDir: "/" }) },
      {
        args: ["verb", "render"],
        stdin: JSON.stringify({ outDir: populated }),
      },
      { args: ["verb", "capture"], stdin: "{}" },
      // The acting commands join the same invariant: whatever a host throws at them, one JSON
      // document on stdout, nothing on stderr, one of the three documented codes.
      { args: ["advance"] },
      { args: ["advance", "--run"] },
      { args: ["advance", "--run", "/definitely/not/here"] },
      { args: ["choose-form"] },
      { args: ["choose-form", "--run", "/definitely/not/here"] },
      { args: ["choose-form", "--option", "x"] },
      { args: ["request-delivery"] },
      { args: ["request-delivery", "--run", "/definitely/not/here"] },
      { args: ["request-delivery", "--run", "/x", "--to", ""] },
      { args: ["verb", "publish"], stdin: "{}" },
    ];

    // Collected rather than asserted one by one, so a failure names EVERY invocation that
    // broke the invariant instead of stopping at the first.
    const broken: string[] = [];
    for (const c of cases) {
      const label = `${JSON.stringify(c.args)} stdin=${JSON.stringify(c.stdin ?? "")}`;
      const r = await run(c.args, c.stdin ?? "");
      if (![0, 1, 2].includes(r.code))
        broken.push(`${label}: exit ${r.code} is not a documented code`);
      let body: unknown;
      try {
        body = JSON.parse(r.out);
      } catch {
        broken.push(
          `${label}: stdout is not one JSON document (${r.out.slice(0, 80)})`,
        );
        continue;
      }
      if (typeof (body as { ok?: unknown })?.ok !== "boolean")
        broken.push(`${label}: body carries no boolean ok`);
      if (STACK_FRAME.test(r.out))
        broken.push(`${label}: stdout carries a stack trace`);
      if (r.err !== "")
        broken.push(`${label}: stderr is not empty (${r.err.slice(0, 80)})`);
    }
    expect(broken).toEqual([]);
  }, 60_000);
});

describe("what a failure message is allowed to contain", () => {
  it("an engine's own diagnostic reaches the host verbatim, absolute paths included", async () => {
    // Deliberate and documented, not an accident: a `verb render` whose spec the engine
    // cannot build answers engine-failed with the tail of the engine's own stderr, which is
    // a Bun stack trace naming files in this repository. This is a LOCAL-FIRST tool — the
    // paths are the operator's own, and stripping them would leave a host with an opaque
    // failure and nothing to act on. Asserted here so the choice is a contract rather than
    // an oversight, and so the "no stack trace" claims above are scoped to the façade's own
    // refusals, where they are true.
    const outDir = join(mkdtempSync(join(tmpdir(), "cli-badspec-")), "el1");
    const r = await run(
      ["verb", "render"],
      JSON.stringify({
        engine: "chart-native",
        spec: { nativeType: "bar" }, // no data: the engine's own code throws
        format: "static",
        channel: "article-web",
        outDir,
        id: "el1",
      }),
    );
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("engine-failed");
    expect(typeof body.message).toBe("string");
    // Still ONE JSON document on stdout, and nothing on stderr — the façade's own promise
    // holds even while the engine's diagnostic travels inside `message`.
    expect(r.err).toBe("");
  }, 120_000);
});

// --- the acting half of the façade --------------------------------------------------------
//
// Until these commands existed, `next` could answer ["deliver"] and nothing in the façade could
// carry it out: a host could read the loop but never drive it. Everything below goes through a
// spawned process, because the contract being tested is the process's — argv, stdout, exit code.

describe("advance — the façade performs what next says is valid", () => {
  it("runs the deterministic step and reports it, persisting the result", async () => {
    const dir = makeRun();
    expect(JSON.parse((await run(["next", "--run", dir])).out).value).toEqual({
      nextActions: ["orient"],
    });

    const r = await run(["advance", "--run", dir]);
    expect(r.code).toBe(0);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(true);
    expect(body.value.ran).toBe("orient");
    // The state a separate process reads afterwards is the state this one wrote.
    expect(
      JSON.parse((await run(["next", "--run", dir])).out).value.nextActions,
    ).toEqual(body.value.nextActions);
    expect(r.err).toBe("");
  }, 60_000);

  it("refuses a human turn with exit 1, naming the command that performs it", async () => {
    const dir = makeRun();
    await run(["advance", "--run", dir]); // orient
    const r = await run(["advance", "--run", dir]); // now: confirm-angle, a human turn
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("step-refused");
    expect(body.message).toContain("angle");
  }, 60_000);

  it("refuses an unreadable run with exit 2, like every other run-aware command", async () => {
    const r = await run([
      "advance",
      "--run",
      mkdtempSync(join(tmpdir(), "cli-adv-norun-")),
    ]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("no-run");
  });

  it("takes no positional argument and no unknown flag", async () => {
    const dir = makeRun();
    expect((await run(["advance", dir])).code).toBe(2);
    const r = await run(["advance", "--run", dir, "--force"]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).code).toBe("usage");
  });
});

describe("choose-form — the decision, written by the façade", () => {
  it("needs both a run and an option", async () => {
    const dir = makeRun();
    const noOption = await run(["choose-form", "--run", dir]);
    expect(noOption.code).toBe(2);
    expect(JSON.parse(noOption.out).code).toBe("usage");
    const noRun = await run(["choose-form", "--option", "x"]);
    expect(noRun.code).toBe(2);
    expect(JSON.parse(noRun.out).code).toBe("usage");
  });

  it("passes the loop's own refusal through, with exit 1", async () => {
    const dir = makeRun();
    const r = await run(["choose-form", "--run", dir, "--option", "nope"]);
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    // A verb-family code, not a host one: the loop refused, and the answer says so.
    expect(body.code).toBe("invalid-request");
    expect(r.err).toBe("");
  });
});

describe("request-delivery — where it goes, decided through the façade", () => {
  it("refuses before anything is produced, with exit 1", async () => {
    const dir = makeRun();
    const r = await run(["request-delivery", "--run", dir]);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.out).code).toBe("invalid-request");
  });

  it("refuses an empty entry in --to rather than silently dropping it", async () => {
    const dir = makeRun();
    const r = await run(["request-delivery", "--run", dir, "--to", "zip,"]);
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("--to");
  });
});

describe("publish does not go around the loop", () => {
  it("refuses `verb publish` and names the way through", async () => {
    const r = await run(
      ["verb", "publish"],
      JSON.stringify({
        artifactPath: "/tmp/whatever.png",
        id: "el1",
        format: "static",
        metadata: {
          title: "t",
          altText: "a",
          source: "s",
          credit: "c",
          lang: "en",
        },
        settings: { publisherId: "zip" },
        credentials: {},
        outDir: "/tmp/nowhere-at-all",
      }),
    );
    // Exit 2 — a "wrong command" answer, the same family as an unknown command. Nothing was
    // published: the gates publish skips (sign-off, provenance freshness, profile metadata,
    // readiness, genre legality) are all facts about a RUN, which this payload has no way to
    // name.
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("usage");
    expect(body.message).toContain("advance");
    expect(body.message).toContain("request-delivery");
    expect(r.err).toBe("");
  });

  it("still declares publish as implemented, and says which command performs it", async () => {
    const body = JSON.parse((await run(["verbs"])).out);
    const publish = body.value.verbs.find(
      (v: { name: string }) => v.name === "publish",
    );
    expect(publish.implemented).toBe(true);
    expect(publish.hostCommand).toBe("advance");
    // render has no detour, so it declares none.
    expect(
      body.value.verbs.find((v: { name: string }) => v.name === "render")
        .hostCommand,
    ).toBeUndefined();
    expect(body.value.errorCodes.host).toContain("step-refused");
  });
});

describe("approve — the human gate at the process edge", () => {
  it("needs --run, like every other acting command", async () => {
    const r = await run(["approve"]);
    expect(r.code).toBe(2);
    const body = JSON.parse(r.out);
    expect(body).toMatchObject({ ok: false, code: "usage" });
    expect(body.message).toContain("--run <dir>");
  });

  it("refuses an unreadable run with exit 2", async () => {
    const r = await run([
      "approve",
      "--run",
      mkdtempSync(join(tmpdir(), "cli-approve-norun-")),
    ]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out)).toMatchObject({ ok: false, code: "no-run" });
  });

  it("treats an EMPTY stdin as an empty ceremony, not as a usage error", async () => {
    // The one document on this surface a command may legitimately be given none of: a visual
    // with nothing open to acknowledge is approved without a ceremony.
    const dir = mkdtempSync(join(tmpdir(), "cli-approve-empty-"));
    const src = join(dir, "src.csv");
    writeFileSync(src, "a,b\n1,2\n");
    writeManifest(join(dir, "run.json"), {
      runId: "approve-empty",
      schemaVersion: 5,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(dir, src, "data") },
      elements: [{ id: "e1" }],
      events: [],
    } as RunManifest);
    const r = await run(["approve", "--run", dir], "");
    // Refused because there is nothing produced to approve — NOT because stdin was empty.
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body).toMatchObject({ ok: false, code: "invalid-request" });
    expect(body.message).not.toMatch(/stdin/i);
  });

  it("refuses a ceremony that is not JSON, with exit 2", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cli-approve-badjson-"));
    const r = await run(["approve", "--run", dir], "{not json");
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out)).toMatchObject({ ok: false, code: "usage" });
  });

  it("refuses an unknown flag rather than ignoring it", async () => {
    const r = await run(["approve", "--run", "/tmp", "--sign-it"]);
    expect(r.code).toBe(2);
    expect(JSON.parse(r.out).message).toContain("--sign-it");
  });
});
