// Form d — "straight into your article" — as the JOURNALIST's path reaches it.
//
// The adapter that performs the insertion is covered in lib/delivery/adapters/*; what this file
// holds is the half that was actually missing. `embed-cms` has been implemented, measured and
// announced at INPUT since 2026-07-27, and in all that time no journalist could choose it: the
// EXPORT menu offered a/b/c and nothing routed to it. A capability nobody can pick is not a
// capability, so these tests are about REACHABILITY, and about the two refusals that keep the
// new reach from being dangerous.
import { describe, it, expect, afterEach } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { canonicalJson } from "../src/canonical-json.ts";

const scriptPath = join(import.meta.dir, "export-code.mjs");

function parseFormsProposal(stdout: string) {
  const marker = "EXPORT_FORMS_JSON ";
  const line = stdout.split("\n").find((l) => l.startsWith(marker));
  if (!line)
    throw new Error("no EXPORT_FORMS_JSON block in stdout:\n" + stdout);
  return JSON.parse(line.slice(marker.length));
}

function writeChainFixture(
  dir: string,
  id: string,
  producer: string,
  spec: unknown,
): string {
  writeFileSync(
    join(dir, "accepted.json"),
    JSON.stringify([
      {
        id,
        producer,
        format: "interactive",
        spec,
        confirmedTakeaway: "Test takeaway for " + id,
      },
    ]),
  );
  writeFileSync(
    join(dir, "candidates.json"),
    JSON.stringify({ candidates: [{ type: "bar", producer }] }),
  );
  return createHash("sha256").update(canonicalJson(spec)).digest("hex");
}

/** A produced chart-native interactive, plus the provenance chain the export gate reads. */
function setup() {
  const outDir = mkdtempSync(join(tmpdir(), "splash-cms-out-"));
  writeFileSync(join(outDir, "interactive.html"), "<html>interactive</html>");
  writeFileSync(join(outDir, "config.json"), JSON.stringify({ title: "T" }));
  writeFileSync(
    join(outDir, "native-source.json"),
    JSON.stringify({ type: "bar" }),
  );
  const spec = { nativeType: "bar", title: "Test", id: "p1" };
  const acceptedConfigHash = writeChainFixture(outDir, "p1", "chart-native", spec);
  const resultsPath = join(outDir, "report.json");
  writeFileSync(
    resultsPath,
    JSON.stringify({
      results: [
        {
          id: "p1",
          producer: "chart-native",
          format: "interactive",
          status: "produced",
          reviewed: true,
          renderApproved: true,
          acceptedConfigHash,
          metadata: { title: "Les primes", lang: "fr" },
        },
      ],
    }),
  );
  return { outDir, resultsPath };
}

const dirs: string[] = [];
function exportDir() {
  const d = join(import.meta.dir, `export-cms-${dirs.length}-${process.pid}`);
  mkdirSync(d, { recursive: true });
  dirs.push(d);
  return d;
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function run(args: string[]) {
  return execFileSync("bun", [scriptPath, ...args], { encoding: "utf8" });
}

describe("export-code — form d is REACHABLE from the journalist's menu", () => {
  it("should offer the CMS form in the proposal, flagged as needing an article", () => {
    const { outDir, resultsPath } = setup();
    const out = run([
      outDir,
      exportDir(),
      "--results",
      resultsPath,
      "--id",
      "p1",
    ]);
    const proposal = parseFormsProposal(out);
    expect(proposal.forms.d).toBeDefined();
    // The one thing no script can derive, declared so the orchestrator ASKS instead of guessing.
    expect(proposal.forms.d.needsArticle).toBe(true);
    expect(proposal.forms.d.deliver).toContain("--form cms");
    expect(proposal.forms.d.deliver).toContain("<slug>");
  });

  it("should say WHY it is unavailable when the newsroom's CMS is not configured", () => {
    // Unconfigured is the default state of a fresh install, and it must read as a
    // prerequisite (like a missing engine key), never as a capability that does not exist.
    const { outDir, resultsPath } = setup();
    const out = run([
      outDir,
      exportDir(),
      "--results",
      resultsPath,
      "--id",
      "p1",
    ]);
    const d = parseFormsProposal(out).forms.d;
    if (d.available === false) {
      expect(d.reason.length).toBeGreaterThan(0);
      expect(out).toContain("d)");
    } else {
      // A machine that HAS the route configured still gets the offer, with no reason attached.
      expect(d.reason).toBeUndefined();
    }
  });
});

describe("export-code — form d refuses rather than invents", () => {
  it("should REFUSE --form cms with no --article, naming the journalist's decision", () => {
    const { outDir, resultsPath } = setup();
    let stderr = "";
    try {
      run([
        outDir,
        exportDir(),
        "--results",
        resultsPath,
        "--id",
        "p1",
        "--form",
        "cms",
      ]);
      throw new Error("expected a refusal");
    } catch (e) {
      stderr = ((e as { stderr?: Buffer }).stderr ?? "").toString();
    }
    expect(stderr).toContain("--article");
    expect(stderr.toLowerCase()).toContain("never choose");
  });

  it("should REFUSE the proposal's unreplaced <slug> placeholder", () => {
    // The failure this catches is an orchestrator relaying the deliver command verbatim
    // without ever asking. Writing into an article literally named "<slug>" is the kind of
    // thing that only fails once, on someone else's CMS.
    const { outDir, resultsPath } = setup();
    let stderr = "";
    try {
      run([
        outDir,
        exportDir(),
        "--results",
        resultsPath,
        "--id",
        "p1",
        "--form",
        "cms",
        "--article",
        "<slug>",
      ]);
      throw new Error("expected a refusal");
    } catch (e) {
      const err = e as { stderr?: Buffer; stdout?: Buffer };
      stderr = `${(err.stderr ?? "").toString()}${(err.stdout ?? "").toString()}`;
    }
    expect(stderr).toContain("placeholder");
  });
});
