// The migration proof must fail on each way a "pure move" can be impure — otherwise it is a
// rubber stamp on a 1500-line refactor nobody can review by eye.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "verify-phase-split.mjs");

const SOURCE = `# Root

### 1. INPUT
Freeze the article before anything else.

### 2. CADRAGE
Ask the takeaway question, and confirm it back.
NEVER invent a figure the article does not carry.
`;

async function verify(files: string[]) {
  const p = Bun.spawn(["bun", SCRIPT, ...files], {
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

function scene(dests: string[]): string[] {
  const dir = mkdtempSync(join(tmpdir(), "phase-split-"));
  const src = join(dir, "SKILL.before.md");
  writeFileSync(src, SOURCE);
  const paths = dests.map((content, i) => {
    const f = join(dir, `part-${i}.md`);
    writeFileSync(f, content);
    return f;
  });
  return [src, ...paths];
}

describe("verify-phase-split — a pure move, proven", () => {
  it("should accept a split where every rule-bearing line lands exactly once", async () => {
    const r = await verify(
      scene([
        "# Root\n### 1. INPUT\nFreeze the article before anything else.\n",
        "### 2. CADRAGE\nAsk the takeaway question, and confirm it back.\nNEVER invent a figure the article does not carry.\n",
      ]),
    );
    expect(r.code).toBe(0);
    expect(r.out).toContain("pure move");
  });

  it("should REFUSE a move that drops a rule", async () => {
    const r = await verify(
      scene([
        "# Root\n### 1. INPUT\nFreeze the article before anything else.\n",
        "### 2. CADRAGE\nAsk the takeaway question, and confirm it back.\n", // the NEVER line is gone
      ]),
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain("LOST");
    expect(r.out).toContain("NEVER invent a figure");
  });

  // The failure that matters most on this project: the same rule in two files, free to drift.
  it("should REFUSE a move that leaves a rule in two places", async () => {
    const r = await verify(
      scene([
        "# Root\n### 1. INPUT\nFreeze the article before anything else.\nNEVER invent a figure the article does not carry.\n",
        "### 2. CADRAGE\nAsk the takeaway question, and confirm it back.\nNEVER invent a figure the article does not carry.\n",
      ]),
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain("DUPLICATED");
  });

  it("should REFUSE a rule improved along the way", async () => {
    const r = await verify(
      scene([
        "# Root\n### 1. INPUT\nFreeze the article before anything else.\n",
        "### 2. CADRAGE\nAsk the takeaway question, and confirm it back.\nNEVER invent a figure the article does not carry, ever.\n",
      ]),
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain("INVENTED");
  });

  it("should ignore blank lines and code fences, which repeat by nature", async () => {
    const r = await verify(
      scene([
        "# Root\n\n```\n```\n### 1. INPUT\nFreeze the article before anything else.\n",
        "\n```\n```\n\n### 2. CADRAGE\nAsk the takeaway question, and confirm it back.\nNEVER invent a figure the article does not carry.\n",
      ]),
    );
    expect(r.code).toBe(0);
  });

  // Honesty, asserted: a green answer must not read as "the split is good".
  it("should say what it does not prove", async () => {
    const r = await verify(
      scene([
        "# Root\n### 1. INPUT\nFreeze the article before anything else.\n",
        "### 2. CADRAGE\nAsk the takeaway question, and confirm it back.\nNEVER invent a figure the article does not carry.\n",
      ]),
    );
    expect(r.out).toContain("does NOT prove");
  });
});
