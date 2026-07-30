import { describe, it, expect } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve(import.meta.dir, "../scripts/produce-all.mjs");

function fixture(): { dir: string; outDir: string; accepted: string } {
  const dir = mkdtempSync(join(tmpdir(), "splash-menu-precondition-"));
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

describe("produce-all — the ranked menu is a precondition, not a per-proposal verdict", () => {
  it("refuses the whole batch when no menu was ever written, and names the act that resolves it", () => {
    const f = fixture();
    try {
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(p.exitCode).toBe(1);
      const err = p.stderr.toString();
      expect(err).toContain("no ranked list of visuals");
      expect(err).toContain("ranked list");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("produces NOTHING when it refuses — no engine is reached, so there is no half-built artifact", () => {
    const f = fixture();
    try {
      Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(readdirSync(f.outDir)).toEqual([]);
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("a proposal the journalist NAMED still runs with no menu — the direct branch is untouched", () => {
    const f = fixture();
    try {
      writeFileSync(
        f.accepted,
        JSON.stringify([
          {
            id: "p1",
            producer: "chart-native",
            format: "static",
            channel: "article-web",
            skillsInvoked: ["splash:cadrage-direct"],
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
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      // It may still fail further down (no key, no engine in this sandbox) — what it must NOT do
      // is fail on the menu: the refusal this test guards is the one that must not fire.
      expect(p.stderr.toString()).not.toContain("no ranked list of visuals");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });

  it("a malformed accepted.json (not an array) is a clean usage error, not an uncaught TypeError", () => {
    const f = fixture();
    try {
      writeFileSync(f.accepted, JSON.stringify({ id: "p1" }));
      const p = Bun.spawnSync(["bun", CLI, f.accepted, f.outDir, f.dir]);
      expect(p.exitCode).toBe(1);
      const err = p.stderr.toString();
      expect(err).toContain("must hold a JSON array");
      expect(err).not.toContain("TypeError");
    } finally {
      rmSync(f.dir, { recursive: true, force: true });
    }
  });
});
