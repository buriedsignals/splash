import { describe, it, expect } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { checkOutDir, outDirRefusal } from "./path-safety";

const scratch = (): string => mkdtempSync(join(tmpdir(), "host-outdir-"));

const CLI = join(import.meta.dir, "cli.ts");

async function cli(
  args: string[],
  stdin: string,
  cwd?: string,
): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], {
    stdin: new TextEncoder().encode(stdin),
    stdout: "pipe",
    stderr: "pipe",
    ...(cwd ? { cwd } : {}),
  });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return { code: await p.exited, out, err };
}

function renderRequest(outDir: string): string {
  return JSON.stringify({
    engine: "chart-native",
    spec: { nativeType: "bar" },
    format: "static",
    channel: "article-web",
    outDir,
    id: "el1",
  });
}

describe("checkOutDir — the destructive boundary of the façade", () => {
  it("refuses a relative path, because it would resolve against the host's cwd", () => {
    const r = checkOutDir(".");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("absolute");
  });

  it("refuses an empty or non-string outDir", () => {
    expect(checkOutDir("").ok).toBe(false);
    expect(checkOutDir("   ").ok).toBe(false);
  });

  it("refuses a filesystem root and a dangerously shallow path", () => {
    expect(checkOutDir("/").ok).toBe(false);
    expect(checkOutDir("/etc").ok).toBe(false);
    expect(checkOutDir(homedir()).ok).toBe(false);
    expect(checkOutDir(tmpdir()).ok).toBe(false);
  });

  it("refuses an ancestor of the process working directory", () => {
    const r = checkOutDir(join(process.cwd(), ".."));
    expect(r.ok).toBe(false);
  });

  it("accepts a fresh path under a deep enough directory", () => {
    const r = checkOutDir(join(scratch(), "elements", "el1"));
    expect(r.ok).toBe(true);
  });

  it("accepts an existing directory holding only artifacts a produce could have written", () => {
    const dir = join(scratch(), "elements", "el1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "static.png"), "x");
    writeFileSync(join(dir, "config.json"), "{}");
    writeFileSync(join(dir, "native-source.json"), "{}");
    mkdirSync(join(dir, "frames"));
    expect(checkOutDir(dir).ok).toBe(true);
  });

  it("refuses — without deleting — a directory holding entries no produce writes", () => {
    const dir = join(scratch(), "victim");
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "keep.txt"), "important");
    writeFileSync(join(dir, "sub", "deep.txt"), "deep");

    const r = checkOutDir(dir);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("keep.txt");
    // The probe is non-destructive: nothing moved.
    expect(readdirSync(dir).sort()).toEqual(["keep.txt", "sub"]);
    expect(existsSync(join(dir, "sub", "deep.txt"))).toBe(true);
  });

  it("refuses a path that exists and is not a directory", () => {
    const dir = scratch();
    const file = join(dir, "notes.md");
    writeFileSync(file, "hello");
    const r = checkOutDir(file);
    expect(r.ok).toBe(false);
    expect(existsSync(file)).toBe(true);
  });

  it("is not defeated by `..` segments", () => {
    const r = checkOutDir(join(homedir(), "..", ".."));
    expect(r.ok).toBe(false);
  });

  it("is not defeated by a symlink pointing at a protected directory", () => {
    const dir = scratch();
    const link = join(dir, "shortcut");
    symlinkSync(homedir(), link);
    const r = checkOutDir(link);
    expect(r.ok).toBe(false);
  });

  it("resolves before deciding, so a symlinked deep directory is judged on its target", () => {
    const target = join(scratch(), "elements", "el1");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "keep.txt"), "important");
    const link = join(scratch(), "link");
    symlinkSync(target, link);
    const r = checkOutDir(link);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.message).toContain("keep.txt");
    expect(existsSync(join(target, "keep.txt"))).toBe(true);
  });
});

describe("outDirRefusal — a typed invalid-request, never a throw", () => {
  it("refuses a render payload with an unsafe outDir", () => {
    const r = outDirRefusal({ outDir: "." });
    expect(r).toBeDefined();
    expect(r!.ok).toBe(false);
    if (r!.ok) throw new Error("unreachable");
    expect(r!.code).toBe("invalid-request");
  });

  it("stays out of the way of payloads that carry no outDir string", () => {
    expect(outDirRefusal({})).toBeUndefined();
    expect(outDirRefusal({ outDir: 42 })).toBeUndefined();
    expect(outDirRefusal(null)).toBeUndefined();
    expect(outDirRefusal("not an object")).toBeUndefined();
  });
});

describe("the reviewer's reproductions, through the CLI", () => {
  it("an outDir naming a directory of unrelated content is refused, and nothing is deleted", async () => {
    const dir = join(scratch(), "victim");
    mkdirSync(join(dir, "sub"), { recursive: true });
    writeFileSync(join(dir, "keep.txt"), "important");
    writeFileSync(join(dir, "sub", "deep.txt"), "deep");

    const r = await cli(["verb", "render"], renderRequest(dir));
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
    expect(existsSync(join(dir, "keep.txt"))).toBe(true);
    expect(existsSync(join(dir, "sub", "deep.txt"))).toBe(true);
  });

  it('{"outDir":"."} run from a populated directory is refused, and nothing is deleted', async () => {
    const cwd = join(scratch(), "cwd");
    mkdirSync(join(cwd, "sub"), { recursive: true });
    writeFileSync(join(cwd, "keep.txt"), "important");
    writeFileSync(join(cwd, "sub", "deep.txt"), "deep");

    const r = await cli(["verb", "render"], renderRequest("."), cwd);
    expect(r.code).toBe(1);
    const body = JSON.parse(r.out);
    expect(body.ok).toBe(false);
    expect(body.code).toBe("invalid-request");
    expect(body.message).toContain("absolute");
    expect(existsSync(join(cwd, "keep.txt"))).toBe(true);
    expect(existsSync(join(cwd, "sub", "deep.txt"))).toBe(true);
  });
});
