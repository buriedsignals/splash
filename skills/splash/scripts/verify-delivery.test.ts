// « Est-ce que ça vient vraiment de Splash ? » — the one command a journalist can run on a file
// they were handed (registry E11).
//
// THE CASE THIS ANSWERS, observed on 2026-08-03: a host model called `suggest_article` as if it
// were a tool, failed, enabled the host's own charting extension instead, drew a bar in the chat
// and announced « Le visuel est prêt ». No exports/, no producer, no gate, no owned file. NO CODE
// OF THIS REPOSITORY RAN — so no guard of this repository could object. A control on the spine
// only fires if the spine turns.
//
// WHAT THIS COMMAND IS, therefore: not a guard, a QUESTION the journalist can ask afterwards, and
// the answer is read off the disk rather than off anybody's word. It is the honest half of E11 —
// the other half is that a chat-drawn picture has no path to point it at, which is exactly the
// signal it gives.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "verify-delivery.mjs");

async function verify(target: string): Promise<{ code: number; out: string }> {
  const p = Bun.spawn(["bun", SCRIPT, target], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
    p.exited,
  ]);
  return { code, out: out + err };
}

/** A run directory as the producers really leave it. */
function realRun(): { runDir: string; artifact: string } {
  const runDir = mkdtempSync(join(tmpdir(), "splash-run-"));
  writeFileSync(
    join(runDir, "accepted.json"),
    JSON.stringify({
      id: "budget-2026",
      skillsInvoked: ["suggest-article", "suggest-chart"],
    }),
  );
  writeFileSync(join(runDir, "candidates.json"), "[]");
  writeFileSync(join(runDir, "opportunities.json"), "[]");
  writeFileSync(join(runDir, "report.json"), JSON.stringify({ ok: true }));
  writeFileSync(
    join(runDir, "decisions.jsonl"),
    '{"id":"cadrage-confirmed"}\n{"id":"format-pinned"}\n',
  );
  const out = join(runDir, "output", "budget-2026");
  mkdirSync(out, { recursive: true });
  const artifact = join(out, "budget-2026.png");
  writeFileSync(artifact, "not really a png");
  return { runDir, artifact };
}

describe("verify-delivery — what stands behind this file", () => {
  it("should find the run from the artifact the journalist was handed, not only from the run dir", async () => {
    const { artifact } = realRun();
    const r = await verify(artifact);
    expect(r.code).toBe(0);
    expect(r.out).toContain("budget-2026");
  });

  it("should name the markers it actually read, so the answer can be checked", async () => {
    const { runDir } = realRun();
    const r = await verify(runDir);
    expect(r.out).toContain("accepted.json");
    expect(r.out).toContain("decisions.jsonl");
  });

  it("should report the sub-skills the disk CORROBORATES, not the ones the run claimed", async () => {
    const runDir = mkdtempSync(join(tmpdir(), "splash-run-"));
    // Claims two, and only one left its artifact behind.
    writeFileSync(
      join(runDir, "accepted.json"),
      JSON.stringify({
        id: "half",
        skillsInvoked: ["suggest-article", "suggest-chart"],
      }),
    );
    writeFileSync(join(runDir, "candidates.json"), "[]");
    const r = await verify(runDir);
    expect(r.out).toContain("suggest-chart");
    // The uncorroborated one is named as such rather than silently listed as done.
    expect(r.out.toLowerCase()).toContain("uncorroborated");
  });

  // THE CASE THAT MATTERS. A picture drawn in a chat leaves nothing, so there is nothing to walk
  // up from — and the command says so plainly instead of finding something reassuring.
  it("should refuse plainly when NOTHING of this repository ran", async () => {
    const bare = mkdtempSync(join(tmpdir(), "not-splash-"));
    const stray = join(bare, "chart.png");
    writeFileSync(stray, "drawn in a chat");
    const r = await verify(stray);
    expect(r.code).not.toBe(0);
    expect(r.out.toLowerCase()).toContain("no splash run");
  });

  it("should refuse a path that does not exist rather than answering about nothing", async () => {
    const r = await verify(join(tmpdir(), "definitely-absent-1234", "x.png"));
    expect(r.code).not.toBe(0);
  });

  // HONESTY, asserted: the command must state its own limit in its own output. It reads files;
  // it cannot prove nobody wrote them by hand. A verification that oversells itself is the same
  // defect as the attestation it exists to check.
  it("should state what it does NOT prove", async () => {
    const { runDir } = realRun();
    const r = await verify(runDir);
    expect(r.out.toLowerCase()).toMatch(/does not prove|ne prouve pas/);
  });
});
