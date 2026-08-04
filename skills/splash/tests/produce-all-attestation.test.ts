import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// WIRING, not logic. src/attestation-corroboration.test.ts proves the function; this proves the
// SPINE reads it — deleting the call from produce-all.mjs leaves the pure tests green and turns
// these red, which is the only reason this file exists (the repo has paid twice for a guard whose
// verification path avoided the wiring).
const CLI = resolve(import.meta.dir, "../scripts/produce-all.mjs");

/** A proposal the journalist NAMED (direct branch) — so the ranked-menu precondition, which would
 *  otherwise stop the batch first, is exempt and this check is the one under test. It ALSO claims
 *  two sub-skills, which is the E11 shape: a run that announces a pipeline it never walked. */
function fixture(skillsInvoked: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "splash-attestation-"));
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
        skillsInvoked,
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
  return { dir, outDir, accepted };
}

describe("produce-all — an attestation with nothing on disk behind it stops the batch", () => {
  it("refuses when the run says it invoked sub-skills and holds none of their artifacts", () => {
    const f = fixture([
      "splash:cadrage-direct",
      "suggest-article",
      "suggest-chart",
    ]);
    try {
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(p.exitCode).toBe(1);
      const err = p.stderr.toString();
      expect(err).toContain("opportunities.json");
      expect(err).toContain("candidates.json");
      // A refusal deviates: it names the act that resolves it.
      expect(err).toContain(
        "actually invoke the skills this run says it invoked",
      );
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  // NO "produces nothing when it refuses" TEST HERE, deliberately. The refusal does run before
  // any engine (it sits above the produceAll call, beside the menu precondition) — but in a
  // sandbox with no engine keys, production fails anyway, so that assertion stays green with the
  // check deleted. A guard no mutation can redden guards nothing; the refusal's position is
  // carried by the code's order and by the menu-precondition test that already pins that shape.

  it("lets a corroborated attestation through — one artifact present is a run walking the pipeline", () => {
    const f = fixture([
      "splash:cadrage-direct",
      "suggest-article",
      "suggest-chart",
    ]);
    try {
      writeFileSync(join(f.dir, "candidates.json"), JSON.stringify([]));
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      const err = p.stderr.toString();
      // It may still fail further down (no key, no engine in this sandbox) — what it must NOT do
      // is raise THIS refusal.
      expect(err).not.toContain(
        "actually invoke the skills this run says it invoked",
      );
      // The remaining gap is said out loud, and is not fatal.
      expect(err).toContain(
        "opportunities.json is absent from the run directory",
      );
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("says nothing about an attestation that claims no sub-skill — the bare-topic direct run", () => {
    const f = fixture(["splash:cadrage-direct"]);
    try {
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(p.stderr.toString()).not.toContain(
        "actually invoke the skills this run says it invoked",
      );
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });
});
